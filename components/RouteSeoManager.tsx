import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  ROUTE_SEO,
  TOOL_JSON_LD,
  SITE_URL,
  upsertMeta,
  upsertProperty,
  upsertCanonical,
  upsertJsonLd,
} from "../config/seoRoutes";

export const RouteSeoManager: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    const routeSeo = ROUTE_SEO[pathname];
    if (!routeSeo) return;

    // Title + description
    document.title = routeSeo.title;
    upsertMeta("description", routeSeo.description);
    upsertCanonical(`${SITE_URL}${routeSeo.canonicalPath}`);

    // Open Graph tags (for WhatsApp, Facebook, LinkedIn)
    upsertProperty("og:title", routeSeo.title);
    upsertProperty("og:description", routeSeo.description);
    upsertProperty("og:url", `${SITE_URL}${routeSeo.canonicalPath}`);
    upsertProperty("og:type", "website");

    // Twitter card tags
    upsertMeta("twitter:title", routeSeo.title);
    upsertMeta("twitter:description", routeSeo.description);
    upsertMeta("twitter:card", "summary_large_image");

    // Per-tool JSON-LD structured data
    const toolLd = TOOL_JSON_LD[pathname];
    if (toolLd) {
      upsertJsonLd("tool-page", toolLd);
    }
  }, [pathname]);

  return null;
};
