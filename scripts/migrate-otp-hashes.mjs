import "../server/env.js";
import { MongoClient } from "mongodb";
import { createHash } from "node:crypto";

const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const MONGODB_DB_NAME = String(process.env.MONGODB_DB_NAME || "lakpdf").trim();

if (!MONGODB_URI) {
  console.error("[OTP MIGRATION] Missing MONGODB_URI. Aborting.");
  process.exit(1);
}

const hashOtp = (email = "", otp = "") =>
  createHash("sha256")
    .update(`otp:${String(email).trim().toLowerCase()}:${String(otp).trim()}`)
    .digest("hex");

const client = new MongoClient(MONGODB_URI, {
  maxPoolSize: 5,
  serverSelectionTimeoutMS: 10_000,
});

try {
  await client.connect();
  const db = client.db(MONGODB_DB_NAME);
  const tokens = db.collection("password_reset_tokens");

  const legacyDocs = await tokens
    .find(
      {
        otp: { $type: "string" },
        $or: [{ otpHash: { $exists: false } }, { otpHash: "" }],
      },
      { projection: { _id: 1, email: 1, otp: 1 } }
    )
    .toArray();

  let converted = 0;
  let removedInvalid = 0;
  const ops = [];

  for (const doc of legacyDocs) {
    const email = String(doc?.email || "").trim().toLowerCase();
    const otp = String(doc?.otp || "").trim();
    if (!email || !otp) {
      ops.push({
        deleteOne: {
          filter: { _id: doc._id },
        },
      });
      removedInvalid += 1;
      continue;
    }
    ops.push({
      updateOne: {
        filter: { _id: doc._id },
        update: {
          $set: { otpHash: hashOtp(email, otp), updatedAt: new Date() },
          $unset: { otp: "" },
        },
      },
    });
    converted += 1;
  }

  if (ops.length > 0) {
    await tokens.bulkWrite(ops, { ordered: false });
  }

  const cleanupResult = await tokens.updateMany(
    { otp: { $exists: true } },
    { $unset: { otp: "" }, $set: { updatedAt: new Date() } }
  );

  await tokens.createIndex({ otpHash: 1 });

  console.log("[OTP MIGRATION] Done.");
  console.log(`[OTP MIGRATION] Legacy records scanned: ${legacyDocs.length}`);
  console.log(`[OTP MIGRATION] Converted to otpHash: ${converted}`);
  console.log(`[OTP MIGRATION] Removed invalid legacy records: ${removedInvalid}`);
  console.log(`[OTP MIGRATION] Additional plaintext otp fields removed: ${cleanupResult.modifiedCount}`);
} catch (error) {
  console.error("[OTP MIGRATION] Failed:", error);
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
