import fs from "node:fs";
import path from "node:path";

const SITE_URL = "https://lakpdf.com";

const staticPaths = [
  "/",
  "/tools",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/disclaimer",
  "/learn-pdf",
  "/blog",
];

const toolPaths = [
  "/merge",
  "/split",
  "/compress",
  "/organize-pdf",
  "/img-to-pdf",
  "/pdf-to-img",
  "/compress-img",
  "/advance-compress-img",
  "/convert",
  "/pdf-to-word",
  "/pdf-to-powerpoint",
  "/word-to-pdf",
  "/powerpoint-to-pdf",
  "/rotate",
  "/page-number",
  "/watermark",
  "/crop-pdf",
  "/scan-pdf",
  "/sign-pdf",
  "/ocr-pdf",
  "/compare-pdf",
  "/delete-page",
  "/summarizer-qa",
  "/detect-duplicates",
  "/ai-pdf-to-mcq",
  "/pdf-editor",
  "/ai-interview-generator",
];

const toolNamesForBlogGuides = [
  "Merge PDF",
  "Split PDF",
  "Compress PDF",
  "Organize PDF",
  "Image to PDF",
  "PDF to Image",
  "Compress Image",
  "Compress Image to 50kb",
  "Convert PDF",
  "PDF to Word",
  "PDF to PowerPoint",
  "Word to PDF",
  "PowerPoint to PDF",
  "Rotate PDF",
  "Add Page Numbers",
  "Watermark PDF",
  "Crop PDF",
  "Scan to PDF",
  "Sign PDF",
  "OCR PDF",
  "Compare PDF",
  "Delete Pages",
  "Ai Summarizer",
  "Detect Duplicates",
  "AI PDF to MCQ",
  "PDF Editor",
  "AI Interview Generator",
];

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const blogGuidePaths = toolNamesForBlogGuides.map(
  (name) => `/blog/${slugify(name)}-step-by-step-guide`
);

const paths = [...new Set([...staticPaths, ...toolPaths, ...blogGuidePaths])];

const today = new Date().toISOString().slice(0, 10);

const getPriority = (urlPath) => {
  if (urlPath === "/") return "1.0";
  if (urlPath === "/tools") return "0.9";
  if (toolPaths.includes(urlPath)) return "0.8";
  if (urlPath.startsWith("/blog/")) return "0.6";
  return "0.5";
};

const getChangefreq = (urlPath) => {
  if (urlPath === "/" || urlPath === "/tools") return "daily";
  if (toolPaths.includes(urlPath)) return "weekly";
  if (urlPath.startsWith("/blog/")) return "monthly";
  return "monthly";
};

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...paths.map((urlPath) =>
    [
      `  <url>`,
      `    <loc>${SITE_URL}${urlPath}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      `    <changefreq>${getChangefreq(urlPath)}</changefreq>`,
      `    <priority>${getPriority(urlPath)}</priority>`,
      `  </url>`,
    ].join("\n")
  ),
  "</urlset>",
  "",
].join("\n");

const outputPath = path.join(process.cwd(), "public", "sitemap.xml");
fs.writeFileSync(outputPath, xml, "utf8");

console.log(`Generated sitemap: ${outputPath}`);
console.log(`Total URLs: ${paths.length}`);
