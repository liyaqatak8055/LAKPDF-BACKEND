import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const rootDir = process.cwd();
const nodeEnv = String(process.env.NODE_ENV || "development").toLowerCase();

// Load order: base -> mode specific -> local override (dev only).
// Never override already-exported shell variables in production.
const envFiles = [".env", `.env.${nodeEnv}`];
if (nodeEnv !== "production") {
  envFiles.push(".env.local");
}

for (const file of envFiles) {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) continue;
  dotenv.config({
    path: fullPath,
    override: false,
  });
}
