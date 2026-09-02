import "./env.js";

const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const aiProvider = String(process.env.AI_PROVIDER || "openrouter").toLowerCase();

const providerKeyByName = {
  openrouter: "OPENROUTER_API_KEY",
  groq: "GROQ_API_KEY",
  deepinfra: "DEEPINFRA_API_KEY",
};
const providerKey = providerKeyByName[aiProvider] || "OPENROUTER_API_KEY";
const requiredVars = ["PORT", providerKey];
const requiredProdVars = [
  "MONGODB_URI",
  "JWT_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
];
const recommendedProdVars = ["ALLOWED_ORIGINS"];

const isPlaceholder = (value = "") => {
  const v = String(value).trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes("your_") ||
    v.includes("replace_") ||
    v.includes("changeme") ||
    v.includes("example")
  );
};

const missingRequired = [];
const weakValues = [];

for (const key of requiredVars) {
  const value = process.env[key];
  if (!value) {
    missingRequired.push(key);
    continue;
  }
  if (isPlaceholder(value)) {
    weakValues.push(key);
  }
}

if (isProduction) {
  for (const key of requiredProdVars) {
    const value = process.env[key];
    if (!value) {
      missingRequired.push(key);
      continue;
    }
    if (isPlaceholder(value)) {
      weakValues.push(key);
    }
  }
}

const port = Number(process.env.PORT);
if (!Number.isFinite(port) || port < 1 || port > 65535) {
  missingRequired.push("PORT(valid 1-65535)");
}

const missingRecommended = [];
if (isProduction) {
  for (const key of recommendedProdVars) {
    const value = process.env[key];
    if (!value || isPlaceholder(value)) {
      missingRecommended.push(key);
    }
  }
}

if (missingRequired.length > 0 || (isProduction && weakValues.length > 0)) {
  console.error("[ENV CHECK] Failed.");
  if (missingRequired.length > 0) {
    console.error(`Missing required: ${missingRequired.join(", ")}`);
  }
  if (weakValues.length > 0) {
    console.error(`Invalid placeholder values: ${weakValues.join(", ")}`);
  }
  process.exit(1);
}

if (missingRecommended.length > 0) {
  console.warn(`[ENV CHECK] Recommended for production: ${missingRecommended.join(", ")}`);
}

console.log("[ENV CHECK] OK");
