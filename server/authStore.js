import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { createHash, randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { OAuth2Client } from "google-auth-library";

const NODE_ENV = String(process.env.NODE_ENV || "development").toLowerCase();
const IS_PRODUCTION = NODE_ENV === "production";

const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || "lakpdf").trim();
const MONGODB_CONNECT_TIMEOUT_MS = Math.max(2_000, Number(process.env.MONGODB_CONNECT_TIMEOUT_MS || 8_000));
const JWT_SECRET = String(process.env.JWT_SECRET || "").trim();
const JWT_ACCESS_EXPIRES_IN = String(process.env.JWT_ACCESS_EXPIRES_IN || "15m").trim();
const JWT_REFRESH_EXPIRES_IN = String(process.env.JWT_REFRESH_EXPIRES_IN || "30d").trim();
const ACCESS_COOKIE_MAX_AGE_MS = Math.max(60_000, Number(process.env.ACCESS_COOKIE_MAX_AGE_MS || 15 * 60 * 1000));
const REFRESH_COOKIE_MAX_AGE_MS = Math.max(60_000, Number(process.env.REFRESH_COOKIE_MAX_AGE_MS || 30 * 24 * 60 * 60 * 1000));
const AUTH_BCRYPT_ROUNDS = Math.max(8, Number(process.env.AUTH_BCRYPT_ROUNDS || 10));
const FREE_SUMMARY_LIMIT_PER_DAY = Math.max(1, Number(process.env.FREE_SUMMARY_LIMIT_PER_DAY || 3));
const REFRESH_SESSION_LIMIT = Math.max(1, Number(process.env.REFRESH_SESSION_LIMIT || 5));

const SMTP_HOST = String(process.env.SMTP_HOST || "").trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";
const SMTP_USER = String(process.env.SMTP_USER || "").trim();
const SMTP_PASS = String(process.env.SMTP_PASS || "").trim();
const SMTP_FROM = String(process.env.SMTP_FROM || "noreply@lakpdf.com").trim();
const GOOGLE_CLIENT_ID = String(process.env.GOOGLE_CLIENT_ID || "").trim();

const ACCESS_COOKIE_NAME = "lakpdf_access";
const REFRESH_COOKIE_NAME = "lakpdf_refresh";

const ADMIN_EMAILS = String(process.env.ADMIN_EMAIL || process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@lakpdf.com,khanliyaqat825@gmail.com")
  .toLowerCase()
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const isAdminEmail = (email = "") => ADMIN_EMAILS.includes(String(email).trim().toLowerCase());

let mongoClient = null;
let db = null;
let dbConnectPromise = null;
let transporter = null;
let googleOauthClient = null;

const nowIsoDate = () => new Date().toISOString().slice(0, 10);

const buildFallbackAvatar = (name = "", email = "") => {
  const label = String(name || email || "User").trim();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}&background=EEF2FF&color=334155&size=160`;
};

const resolveAvatar = (userDoc = {}) => {
  const direct =
    String(
      userDoc?.avatar ||
        userDoc?.photoUrl ||
        userDoc?.photoURL ||
        userDoc?.picture ||
        userDoc?.image ||
        ""
    ).trim();
  if (direct) return direct;
  return buildFallbackAvatar(userDoc?.name, userDoc?.email);
};

const sanitizeUser = (userDoc) => {
  const email = String(userDoc?.email || "").toLowerCase();
  const directRole = String(userDoc?.role || "").toLowerCase();
  const role = directRole === "admin" || isAdminEmail(email) ? "admin" : "user";
  const status = String(userDoc?.status || (userDoc?.disabled ? "disabled" : "active")).toLowerCase();

  return {
    id: String(userDoc?._id || ""),
    name: String(userDoc?.name || ""),
    email,
    role,
    status: status === "disabled" ? "disabled" : "active",
    avatar: resolveAvatar(userDoc),
    provider: userDoc?.googleSub ? "google" : "email",
    joinedAt: userDoc?.createdAt || null,
    createdAt: userDoc?.createdAt || null,
    updatedAt: userDoc?.updatedAt || null,
  };
};

const isAuthConfigured = () => Boolean(MONGODB_URI && JWT_SECRET);

const isSmtpConfigured = () => Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && Number.isFinite(SMTP_PORT));
const isGoogleAuthConfigured = () => Boolean(GOOGLE_CLIENT_ID);

const createDbUnavailableError = (reason = "") => {
  const message = String(reason || "Unable to connect to MongoDB.");
  return new Error(`DATABASE_UNAVAILABLE: ${message}`);
};

const isDatabaseUnavailableError = (error) =>
  String(error instanceof Error ? error.message : error || "")
    .toUpperCase()
    .includes("DATABASE_UNAVAILABLE");

const getTransporter = () => {
  if (!isSmtpConfigured()) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
  return transporter;
};

const getGoogleOauthClient = () => {
  if (!isGoogleAuthConfigured()) return null;
  if (googleOauthClient) return googleOauthClient;
  googleOauthClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  return googleOauthClient;
};

const ensureDb = async () => {
  if (db) return db;
  if (!MONGODB_URI) throw new Error("MONGODB_URI is not configured");
  if (dbConnectPromise) return dbConnectPromise;

  dbConnectPromise = (async () => {
    try {
      mongoClient = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: MONGODB_CONNECT_TIMEOUT_MS,
        connectTimeoutMS: MONGODB_CONNECT_TIMEOUT_MS,
      });
      await mongoClient.connect();
      db = mongoClient.db(MONGODB_DB_NAME);
      await db.command({ ping: 1 });

      await Promise.all([
        db.collection("users").createIndex({ email: 1 }, { unique: true }),
        db.collection("password_reset_tokens").createIndex({ email: 1, createdAt: -1 }),
        db.collection("password_reset_tokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("usage_daily").createIndex({ userId: 1, day: 1 }, { unique: true }),
        db.collection("auth_sessions").createIndex({ userId: 1, createdAt: -1 }),
        db.collection("auth_sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
        db.collection("auth_sessions").createIndex({ sid: 1 }, { unique: true }),
      ]);

      return db;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error || "Unknown MongoDB error");
      db = null;
      dbConnectPromise = null;
      if (mongoClient) {
        await mongoClient.close().catch(() => {});
      }
      mongoClient = null;
      throw createDbUnavailableError(reason);
    }
  })();

  return dbConnectPromise;
};

const hashToken = (token = "") => createHash("sha256").update(String(token)).digest("hex");

const validateEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim().toLowerCase());
const validatePassword = (value = "") => String(value).length >= 6;

const createAccessToken = (user) => {
  const email = String(user.email || "").toLowerCase();
  const directRole = String(user.role || "").toLowerCase();
  const role = directRole === "admin" || isAdminEmail(email) ? "admin" : "user";

  return jwt.sign(
    {
      uid: String(user._id || user.id),
      email: user.email,
      name: user.name,
      role,
      type: "access",
    },
    JWT_SECRET,
    { expiresIn: JWT_ACCESS_EXPIRES_IN }
  );
};

const createRefreshToken = (user, sid) =>
  jwt.sign(
    {
      uid: String(user._id || user.id),
      sid,
      type: "refresh",
    },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );

const parseAuthToken = (authorizationHeader = "") => {
  const raw = String(authorizationHeader || "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return "";
  return raw.slice(7).trim();
};

const verifyToken = (token = "") => {
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
};

const trimUserAgent = (userAgent = "") => String(userAgent || "").slice(0, 300);
const trimIp = (ip = "") => String(ip || "").slice(0, 80);

const createSession = async ({ user, ip, userAgent }) => {
  const database = await ensureDb();
  const sid = randomUUID();
  const refreshToken = createRefreshToken(user, sid);
  const refreshHash = hashToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(Date.now() + REFRESH_COOKIE_MAX_AGE_MS);

  await database.collection("auth_sessions").insertOne({
    sid,
    userId: String(user._id || user.id),
    refreshHash,
    createdAt: now,
    updatedAt: now,
    expiresAt,
    ip: trimIp(ip),
    userAgent: trimUserAgent(userAgent),
  });

  await database.collection("auth_sessions").deleteMany({
    userId: String(user._id || user.id),
    sid: { $nin: (await database.collection("auth_sessions").find({ userId: String(user._id || user.id) }, { projection: { sid: 1 }, sort: { createdAt: -1 }, limit: REFRESH_SESSION_LIMIT }).toArray()).map((s) => s.sid) },
  });

  const accessToken = createAccessToken(user);
  return { accessToken, refreshToken };
};

const createAuthPayload = async ({ user, ip, userAgent }) => {
  const tokens = await createSession({ user, ip, userAgent });
  return {
    user: sanitizeUser(user),
    ...tokens,
  };
};

const getUserFromAuth = async ({ authorizationHeader = "", cookies = {} } = {}) => {
  const tokenFromCookie = String(cookies?.[ACCESS_COOKIE_NAME] || "").trim();
  const tokenFromHeader = parseAuthToken(authorizationHeader);
  const token = tokenFromCookie || tokenFromHeader;
  const payload = verifyToken(token);
  if (!payload?.uid || payload?.type !== "access") return null;

  const database = await ensureDb();
  let user;
  try {
    user = await database.collection("users").findOne({ _id: new ObjectId(String(payload.uid)) });
  } catch {
    return null;
  }
  if (!user) return null;
  if (user.status === "disabled" || user.disabled) return null;
  return sanitizeUser(user);
};

const registerUser = async ({ name = "", email = "", password = "", ip = "", userAgent = "" }) => {
  const normalizedName = String(name).trim();
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password);

  if (!normalizedName || normalizedName.length < 2) throw new Error("Name must be at least 2 characters");
  if (!validateEmail(normalizedEmail)) throw new Error("Invalid email address");
  if (!validatePassword(normalizedPassword)) throw new Error("Password must be at least 6 characters");

  const database = await ensureDb();
  const users = database.collection("users");
  const existing = await users.findOne({ email: normalizedEmail });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(normalizedPassword, AUTH_BCRYPT_ROUNDS);
  const now = new Date();
  const role = isAdminEmail(normalizedEmail) ? "admin" : "user";
  const { insertedId } = await users.insertOne({
    name: normalizedName,
    email: normalizedEmail,
    passwordHash,
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const user = { _id: insertedId, name: normalizedName, email: normalizedEmail, role, status: "active" };
  return createAuthPayload({ user, ip, userAgent });
};

const loginUser = async ({ email = "", password = "", ip = "", userAgent = "" }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password);

  if (!validateEmail(normalizedEmail) || !normalizedPassword) {
    throw new Error("Invalid email or password");
  }

  const database = await ensureDb();
  const user = await database.collection("users").findOne({ email: normalizedEmail });
  if (!user?.passwordHash) throw new Error("Invalid email or password");

  if (user.status === "disabled" || user.disabled) {
    throw new Error("Account is disabled. Please contact support.");
  }

  const ok = await bcrypt.compare(normalizedPassword, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  if (isAdminEmail(normalizedEmail) && user.role !== "admin") {
    await database.collection("users").updateOne({ _id: user._id }, { $set: { role: "admin", updatedAt: new Date() } });
    user.role = "admin";
  }

  return createAuthPayload({ user, ip, userAgent });
};

const loginAdminUser = async ({ email = "", password = "", ip = "", userAgent = "" }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password);

  if (!validateEmail(normalizedEmail) || !normalizedPassword) {
    throw new Error("Invalid email or password");
  }

  const database = await ensureDb();
  let user = await database.collection("users").findOne({ email: normalizedEmail });

  if (!user) {
    if (isAdminEmail(normalizedEmail)) {
      const passwordHash = await bcrypt.hash(normalizedPassword, AUTH_BCRYPT_ROUNDS);
      const now = new Date();
      const { insertedId } = await database.collection("users").insertOne({
        name: "Administrator",
        email: normalizedEmail,
        passwordHash,
        role: "admin",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
      user = { _id: insertedId, name: "Administrator", email: normalizedEmail, role: "admin", status: "active" };
      return createAuthPayload({ user, ip, userAgent });
    }
    throw new Error("Invalid email or password");
  }

  if (user.status === "disabled" || user.disabled) {
    throw new Error("Account is disabled. Please contact support.");
  }

  if (!user.passwordHash) {
    throw new Error("Password login is not enabled for this account.");
  }

  const ok = await bcrypt.compare(normalizedPassword, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  const isUserAdmin = String(user.role || "").toLowerCase() === "admin" || isAdminEmail(normalizedEmail);
  if (!isUserAdmin) {
    throw new Error("FORBIDDEN_NOT_ADMIN: Access denied. Admin privileges required.");
  }

  if (user.role !== "admin") {
    await database.collection("users").updateOne({ _id: user._id }, { $set: { role: "admin", updatedAt: new Date() } });
    user.role = "admin";
  }

  return createAuthPayload({ user, ip, userAgent });
};

const loginWithGoogle = async ({ idToken = "", ip = "", userAgent = "" }) => {
  const token = String(idToken || "").trim();
  if (!token) throw new Error("Google token is required");
  const client = getGoogleOauthClient();
  if (!client) throw new Error("Google auth is not configured on server.");

  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = String(payload?.email || "").trim().toLowerCase();
  const name = String(payload?.name || "").trim();
  const emailVerified = Boolean(payload?.email_verified);
  const googleSub = String(payload?.sub || "").trim();
  const avatar = String(payload?.picture || "").trim();

  if (!email || !emailVerified) throw new Error("Google account email is not verified.");
  if (!googleSub) throw new Error("Invalid Google token subject.");

  const database = await ensureDb();
  const users = database.collection("users");
  const now = new Date();
  let user = await users.findOne({ email });

  if (!user) {
    const fallbackName = name || email.split("@")[0] || "Google User";
    const { insertedId } = await users.insertOne({
      name: fallbackName,
      email,
      googleSub,
      avatar,
      createdAt: now,
      updatedAt: now,
    });
    user = {
      _id: insertedId,
      name: fallbackName,
      email,
      googleSub,
      avatar,
      createdAt: now,
      updatedAt: now,
    };
  } else {
    const updates = {};
    if (!user.name && name) updates.name = name;
    if (!user.googleSub) updates.googleSub = googleSub;
    if (!user.avatar && avatar) updates.avatar = avatar;
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = now;
      await users.updateOne({ _id: user._id }, { $set: updates });
      user = { ...user, ...updates };
    }
  }

  return createAuthPayload({ user, ip, userAgent });
};

const refreshAuth = async ({ refreshToken = "", ip = "", userAgent = "" }) => {
  const payload = verifyToken(refreshToken);
  if (!payload?.uid || !payload?.sid || payload?.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  const database = await ensureDb();
  const session = await database.collection("auth_sessions").findOne({ sid: String(payload.sid), userId: String(payload.uid) });
  if (!session) throw new Error("Session expired");
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await database.collection("auth_sessions").deleteOne({ _id: session._id });
    throw new Error("Session expired");
  }

  const incomingHash = hashToken(refreshToken);
  if (incomingHash !== String(session.refreshHash || "")) {
    await database.collection("auth_sessions").deleteOne({ _id: session._id });
    throw new Error("Session invalidated");
  }

  const user = await database.collection("users").findOne({ _id: new ObjectId(String(payload.uid)) });
  if (!user) {
    await database.collection("auth_sessions").deleteOne({ _id: session._id });
    throw new Error("User not found");
  }

  await database.collection("auth_sessions").deleteOne({ _id: session._id });
  return createAuthPayload({ user, ip, userAgent });
};

const revokeRefreshSession = async (refreshToken = "") => {
  const payload = verifyToken(refreshToken);
  if (!payload?.sid || !payload?.uid) return;
  const database = await ensureDb();
  await database.collection("auth_sessions").deleteOne({ sid: String(payload.sid), userId: String(payload.uid) });
};

const deleteAccount = async ({ userId = "" } = {}) => {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) throw new Error("User id is required");

  let objectId;
  try {
    objectId = new ObjectId(normalizedUserId);
  } catch {
    throw new Error("Invalid user id");
  }

  const database = await ensureDb();
  const user = await database.collection("users").findOne(
    { _id: objectId },
    { projection: { _id: 1, email: 1 } }
  );
  if (!user?._id) throw new Error("User not found");

  const userIdString = String(user._id);
  const email = String(user.email || "").trim().toLowerCase();

  await Promise.all([
    database.collection("users").deleteOne({ _id: objectId }),
    database.collection("auth_sessions").deleteMany({ userId: userIdString }),
    database.collection("usage_daily").deleteMany({ userId: userIdString }),
    email ? database.collection("password_reset_tokens").deleteMany({ email }) : Promise.resolve(),
  ]);

  return { ok: true };
};

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashPasswordResetOtp = (email = "", otp = "") => hashToken(`otp:${String(email).trim().toLowerCase()}:${String(otp).trim()}`);

const sendResetOtpEmail = async ({ toEmail, otp }) => {
  const tx = getTransporter();
  if (!tx) {
    console.warn("[AUTH OTP] SMTP not configured. Password reset OTP email was not sent.");
    return;
  }

  await tx.sendMail({
    from: SMTP_FROM,
    to: toEmail,
    subject: "LakPDF Password Reset OTP",
    text: `Your LakPDF password reset OTP is ${otp}. It expires in 15 minutes.`,
    html: `<p>Your LakPDF password reset OTP is <b>${otp}</b>.</p><p>This code expires in 15 minutes.</p>`,
  });
};

const requestPasswordReset = async ({ email = "" }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  if (!validateEmail(normalizedEmail)) throw new Error("Invalid email address");

  const database = await ensureDb();
  const user = await database.collection("users").findOne({ email: normalizedEmail });
  if (!user) return { ok: true };

  const otp = generateOtp();
  const now = new Date();
  await database.collection("password_reset_tokens").insertOne({
    email: normalizedEmail,
    otpHash: hashPasswordResetOtp(normalizedEmail, otp),
    createdAt: now,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
  });

  try {
    await sendResetOtpEmail({ toEmail: normalizedEmail, otp });
  } catch (error) {
    console.error("[AUTH OTP] Failed to send reset OTP email:", error);
  }

  return { ok: true };
};

const resetPassword = async ({ email = "", otp = "", newPassword = "" }) => {
  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedOtp = String(otp).trim();
  const normalizedPassword = String(newPassword);

  if (!validateEmail(normalizedEmail)) throw new Error("Invalid email address");
  if (!/^\d{6}$/.test(normalizedOtp)) throw new Error("Invalid or expired OTP");
  if (!validatePassword(normalizedPassword)) throw new Error("Password must be at least 6 characters");

  const database = await ensureDb();
  const existingUser = await database.collection("users").findOne(
    { email: normalizedEmail },
    { projection: { _id: 1 } }
  );
  if (!existingUser?._id) throw new Error("User not found");

  const tokenDoc = await database.collection("password_reset_tokens").findOne(
    { email: normalizedEmail, otpHash: hashPasswordResetOtp(normalizedEmail, normalizedOtp) },
    { sort: { createdAt: -1 } }
  );

  if (!tokenDoc || new Date(tokenDoc.expiresAt).getTime() < Date.now()) {
    throw new Error("Invalid or expired OTP");
  }

  const passwordHash = await bcrypt.hash(normalizedPassword, AUTH_BCRYPT_ROUNDS);
  const update = await database.collection("users").updateOne(
    { email: normalizedEmail },
    { $set: { passwordHash, updatedAt: new Date() } }
  );

  if (!update.matchedCount) throw new Error("User not found");

  await database.collection("password_reset_tokens").deleteMany({ email: normalizedEmail });
  await database.collection("auth_sessions").deleteMany({ userId: String(existingUser._id) });
};

const getSummaryUsage = async (userId) => {
  const database = await ensureDb();
  const day = nowIsoDate();
  const doc = await database.collection("usage_daily").findOne({ userId: String(userId), day });
  const used = Number(doc?.summaryCount || 0);
  const remaining = Math.max(0, FREE_SUMMARY_LIMIT_PER_DAY - used);

  return {
    day,
    used,
    remaining,
    limit: FREE_SUMMARY_LIMIT_PER_DAY,
  };
};

const consumeSummaryUsage = async (userId) => {
  const database = await ensureDb();
  const day = nowIsoDate();
  const usage = await getSummaryUsage(userId);

  if (usage.used >= FREE_SUMMARY_LIMIT_PER_DAY) {
    return { allowed: false, ...usage };
  }

  await database.collection("usage_daily").updateOne(
    { userId: String(userId), day },
    {
      $inc: { summaryCount: 1 },
      $set: { updatedAt: new Date() },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  const updated = await getSummaryUsage(userId);
  return { allowed: true, ...updated };
};

const listUsers = async (limit = 100) => {
  const database = await ensureDb();
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 100));
  const docs = await database
    .collection("users")
    .find(
      {},
      {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          disabled: 1,
          createdAt: 1,
          updatedAt: 1,
        },
        sort: { createdAt: -1 },
        limit: safeLimit,
      }
    )
    .toArray();

  return docs.map(sanitizeUser);
};

const listUsersPaginated = async ({ page = 1, limit = 20, search = "", role = "" } = {}) => {
  const database = await ensureDb();
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const query = {};
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    query.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
    ];
  }
  if (role && (role === "admin" || role === "user")) {
    query.role = role;
  }

  const [total, docs] = await Promise.all([
    database.collection("users").countDocuments(query),
    database.collection("users")
      .find(query, {
        projection: {
          _id: 1,
          name: 1,
          email: 1,
          role: 1,
          status: 1,
          disabled: 1,
          googleSub: 1,
          createdAt: 1,
          updatedAt: 1,
        },
        sort: { createdAt: -1 },
        skip,
        limit: safeLimit,
      })
      .toArray(),
  ]);

  const users = docs.map(sanitizeUser);
  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
};

const updateUserRole = async (userId, newRole) => {
  const normalizedId = String(userId || "").trim();
  const role = String(newRole || "").toLowerCase();
  if (!normalizedId) throw new Error("User ID is required");
  if (role !== "admin" && role !== "user") throw new Error("Invalid role. Must be 'admin' or 'user'");

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID");
  }

  const database = await ensureDb();
  const result = await database.collection("users").updateOne(
    { _id: objectId },
    { $set: { role, updatedAt: new Date() } }
  );

  if (!result.matchedCount) throw new Error("User not found");
  const user = await database.collection("users").findOne({ _id: objectId });
  return sanitizeUser(user);
};

const updateUserStatus = async (userId, status) => {
  const normalizedId = String(userId || "").trim();
  const newStatus = String(status || "").toLowerCase();
  if (!normalizedId) throw new Error("User ID is required");
  if (newStatus !== "active" && newStatus !== "disabled") throw new Error("Invalid status. Must be 'active' or 'disabled'");

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID");
  }

  const database = await ensureDb();
  const result = await database.collection("users").updateOne(
    { _id: objectId },
    { $set: { status: newStatus, disabled: newStatus === "disabled", updatedAt: new Date() } }
  );

  if (!result.matchedCount) throw new Error("User not found");

  if (newStatus === "disabled") {
    await database.collection("auth_sessions").deleteMany({ userId: normalizedId });
  }

  const user = await database.collection("users").findOne({ _id: objectId });
  return sanitizeUser(user);
};

const updateAdminPassword = async (userId, currentPassword, newPassword) => {
  const normalizedId = String(userId || "").trim();
  const currPass = String(currentPassword || "");
  const newPass = String(newPassword || "");

  if (!normalizedId) throw new Error("User ID is required");
  if (!validatePassword(newPass)) throw new Error("New password must be at least 6 characters");

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID");
  }

  const database = await ensureDb();
  const user = await database.collection("users").findOne({ _id: objectId });
  if (!user) throw new Error("User not found");

  if (user.passwordHash) {
    const ok = await bcrypt.compare(currPass, user.passwordHash);
    if (!ok) throw new Error("Incorrect current password");
  }

  const passwordHash = await bcrypt.hash(newPass, AUTH_BCRYPT_ROUNDS);
  await database.collection("users").updateOne(
    { _id: objectId },
    { $set: { passwordHash, updatedAt: new Date() } }
  );

  return { ok: true };
};

const getAdminStats = async () => {
  const database = await ensureDb();
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    adminUsers,
    activeSessions,
    newUsers24h,
    newUsers7d,
    newUsers30d,
  ] = await Promise.all([
    database.collection("users").countDocuments({}),
    database.collection("users").countDocuments({ role: "admin" }),
    database.collection("auth_sessions").countDocuments({ expiresAt: { $gt: now } }),
    database.collection("users").countDocuments({ createdAt: { $gte: oneDayAgo } }),
    database.collection("users").countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
    database.collection("users").countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
  ]);

  return {
    totalUsers,
    adminUsers,
    activeSessions,
    newUsers24h,
    newUsers7d,
    newUsers30d,
  };
};

const createUserByAdmin = async ({ name, email, password, role = "user", status = "active" }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = String(name || "").trim() || "User";
  const normalizedRole = role === "admin" ? "admin" : "user";
  const normalizedStatus = status === "disabled" ? "disabled" : "active";

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Valid email is required");
  }
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  const database = await ensureDb();
  const existing = await database.collection("users").findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error("A user with this email address already exists.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();
  const result = await database.collection("users").insertOne({
    name: normalizedName,
    email: normalizedEmail,
    passwordHash,
    role: normalizedRole,
    status: normalizedStatus,
    disabled: normalizedStatus === "disabled",
    createdAt: now,
    updatedAt: now,
  });

  const created = await database.collection("users").findOne({ _id: result.insertedId });
  return sanitizeUser(created);
};

const updateUserByAdmin = async (userId, { name, email, role, status }) => {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) throw new Error("User ID is required");

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID format");
  }

  const database = await ensureDb();
  const updateFields = { updatedAt: new Date() };

  if (name !== undefined) updateFields.name = String(name).trim();
  if (email !== undefined) {
    const normEmail = normalizeEmail(email);
    if (!normEmail || !normEmail.includes("@")) throw new Error("Invalid email format");
    updateFields.email = normEmail;
  }
  if (role !== undefined && (role === "admin" || role === "user")) {
    updateFields.role = role;
  }
  if (status !== undefined && (status === "active" || status === "disabled")) {
    updateFields.status = status;
    updateFields.disabled = status === "disabled";
  }

  const result = await database.collection("users").findOneAndUpdate(
    { _id: objectId },
    { $set: updateFields },
    { returnDocument: "after" }
  );

  const doc = result && (result.value || result);
  if (!doc) throw new Error("User not found");
  return sanitizeUser(doc);
};

const resetUserPasswordByAdmin = async (userId, newPassword) => {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) throw new Error("User ID is required");
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID format");
  }

  const database = await ensureDb();
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const result = await database.collection("users").findOneAndUpdate(
    { _id: objectId },
    { $set: { passwordHash, updatedAt: new Date() } },
    { returnDocument: "after" }
  );

  const doc = result && (result.value || result);
  if (!doc) throw new Error("User not found");

  // Revoke active sessions for that user
  await database.collection("auth_sessions").deleteMany({ userId: normalizedId });
  return { ok: true, message: "User password reset successfully" };
};

const deleteUserByAdmin = async (userId) => {
  const normalizedId = String(userId || "").trim();
  if (!normalizedId) throw new Error("User ID is required");

  let objectId;
  try {
    objectId = new ObjectId(normalizedId);
  } catch {
    throw new Error("Invalid User ID format");
  }

  const database = await ensureDb();
  const result = await database.collection("users").deleteOne({ _id: objectId });
  if (result.deletedCount === 0) throw new Error("User not found or already deleted");

  // Clean up sessions & usage records
  await Promise.all([
    database.collection("auth_sessions").deleteMany({ userId: normalizedId }),
    database.collection("summary_usages").deleteMany({ userId: normalizedId }),
    database.collection("password_resets").deleteMany({ userId: normalizedId }),
  ]);

  return { ok: true, message: "User account deleted successfully" };
};

const getAllUsersForExport = async () => {
  const database = await ensureDb();
  const docs = await database
    .collection("users")
    .find({}, {
      projection: {
        _id: 1,
        name: 1,
        email: 1,
        role: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      sort: { createdAt: -1 },
    })
    .toArray();

  return docs.map((doc) => ({
    id: String(doc._id),
    name: doc.name || "",
    email: doc.email || "",
    role: doc.role || "user",
    status: doc.status || (doc.disabled ? "disabled" : "active"),
    createdAt: doc.createdAt ? doc.createdAt.toISOString() : "",
    updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : "",
  }));
};

const getDatabaseStats = async () => {
  const database = await ensureDb();
  const startTime = Date.now();
  const ping = await database.command({ ping: 1 });
  const latencyMs = Date.now() - startTime;

  const collections = await database.listCollections().toArray();
  const statsList = await Promise.all(
    collections.map(async (col) => {
      const count = await database.collection(col.name).estimatedDocumentCount();
      return { name: col.name, count };
    })
  );

  return {
    connected: true,
    ping: ping.ok === 1 ? "OK" : "DEGRADED",
    latencyMs,
    dbName: database.databaseName,
    collections: statsList,
    totalCollections: collections.length,
  };
};

const getCookieOptions = () => ({
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax",
  path: "/",
});

export const authStore = {
  isAuthConfigured,
  isSmtpConfigured,
  isGoogleAuthConfigured,
  isDatabaseUnavailableError,
  ensureDb,
  parseAuthToken,
  verifyToken,
  getUserFromAuth,
  registerUser,
  loginUser,
  loginAdminUser,
  loginWithGoogle,
  refreshAuth,
  revokeRefreshSession,
  deleteAccount,
  requestPasswordReset,
  resetPassword,
  getSummaryUsage,
  consumeSummaryUsage,
  listUsers,
  listUsersPaginated,
  updateUserRole,
  updateUserStatus,
  createUserByAdmin,
  updateUserByAdmin,
  resetUserPasswordByAdmin,
  deleteUserByAdmin,
  getAllUsersForExport,
  getDatabaseStats,
  updateAdminPassword,
  getAdminStats,
  summaryLimitPerDay: FREE_SUMMARY_LIMIT_PER_DAY,
  cookies: {
    accessName: ACCESS_COOKIE_NAME,
    refreshName: REFRESH_COOKIE_NAME,
    accessMaxAgeMs: ACCESS_COOKIE_MAX_AGE_MS,
    refreshMaxAgeMs: REFRESH_COOKIE_MAX_AGE_MS,
    getCookieOptions,
  },
};
