const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const ensureApiSuffix = (value: string) => {
  const normalized = trimTrailingSlash(String(value || "").trim());
  if (!normalized) return "";
  return /\/api$/i.test(normalized) ? normalized : `${normalized}/api`;
};
const isLocalHost = (host: string) => /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(String(host || "").trim());

const getDefaultApiBase = () => {
  // Always use same-origin /api; Netlify proxy handles routing to Render backend
  return "/api";
};

const getRuntimeApiBase = () => {
  const directBase = String(import.meta.env.VITE_API_BASE_URL || "").trim();
  const directUrl = String(import.meta.env.VITE_API_URL || "").trim();
  const allowCrossOriginDev = String(import.meta.env.VITE_ALLOW_CROSS_ORIGIN_DEV || "").trim() === "true";

  if (typeof window !== "undefined" && isLocalHost(window.location.hostname) && !allowCrossOriginDev) {
    return "/api";
  }

  if (directBase) return trimTrailingSlash(directBase);
  if (directUrl) return ensureApiSuffix(directUrl);
  return getDefaultApiBase();
};

export const API_BASE_URL = trimTrailingSlash(
  getRuntimeApiBase()
);
