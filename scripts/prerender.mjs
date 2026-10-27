import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { blogArticles } from "../data/blogArticles.ts";
import toolSEOData from "../config/toolSEOData.ts";

const SITE_URL = "https://lakpdf.com";
const DIST_DIR = path.join(process.cwd(), "dist");
const BASE_HTML_PATH = path.join(DIST_DIR, "index.html");

if (!fs.existsSync(BASE_HTML_PATH)) {
  console.error("[prerender] dist/index.html does not exist! Please run vite build first.");
  process.exit(1);
}

const baseHtml = fs.readFileSync(BASE_HTML_PATH, "utf8");

// Shared Navigation Header for Prerendered Shell
const renderHeader = () => `
  <header style="background:#ffffff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:40;padding:12px 16px;">
    <div style="max-width:1152px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:16px;">
      <a href="/" style="display:flex;align-items:center;gap:10px;text-decoration:none;">
        <img src="/logo-80x80.png" alt="LAK PDF Logo" width="36" height="36" style="width:36px;height:36px;object-fit:contain;" />
        <span style="font-weight:900;font-size:1.5rem;color:#0f172a;letter-spacing:-0.02em;">LAK <span style="color:#e5323f;">PDF</span></span>
      </a>
      <nav style="display:flex;align-items:center;gap:18px;font-size:0.875rem;font-weight:600;">
        <a href="/tools" style="color:#475569;text-decoration:none;">All Tools</a>
        <a href="/blog" style="color:#475569;text-decoration:none;">Guides & Blog</a>
        <a href="/about" style="color:#475569;text-decoration:none;">About Us</a>
        <a href="/contact" style="color:#475569;text-decoration:none;">Contact</a>
      </nav>
    </div>
  </header>
`;

// Shared Footer for Prerendered Shell
const renderFooter = () => `
  <footer style="background:#0f172a;color:#94a3b8;padding:48px 16px 32px;margin-top:64px;border-top:1px solid #1e293b;font-size:0.875rem;">
    <div style="max-width:1152px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:32px;margin-bottom:32px;">
      <div>
        <h4 style="color:#ffffff;font-size:1rem;margin-bottom:12px;font-weight:700;">LAK PDF</h4>
        <p style="line-height:1.6;font-size:0.8125rem;">Free, privacy-first client-side PDF utility platform. 100% in-browser WebAssembly processing with zero server document storage.</p>
      </div>
      <div>
        <h4 style="color:#ffffff;font-size:0.875rem;margin-bottom:12px;font-weight:700;">Popular PDF Tools</h4>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.8125rem;">
          <li><a href="/merge" style="color:#cbd5e1;text-decoration:none;">Merge PDF</a></li>
          <li><a href="/compress" style="color:#cbd5e1;text-decoration:none;">Compress PDF</a></li>
          <li><a href="/pdf-to-word" style="color:#cbd5e1;text-decoration:none;">PDF to Word</a></li>
          <li><a href="/split" style="color:#cbd5e1;text-decoration:none;">Split PDF</a></li>
          <li><a href="/ocr-pdf" style="color:#cbd5e1;text-decoration:none;">OCR PDF</a></li>
          <li><a href="/govt-exam-resizer" style="color:#cbd5e1;text-decoration:none;">Govt Exam Resizer</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:#ffffff;font-size:0.875rem;margin-bottom:12px;font-weight:700;">Knowledge & Support</h4>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.8125rem;">
          <li><a href="/blog" style="color:#cbd5e1;text-decoration:none;">PDF Engineering Blog</a></li>
          <li><a href="/learn-pdf" style="color:#cbd5e1;text-decoration:none;">Learn PDF Hub</a></li>
          <li><a href="/about" style="color:#cbd5e1;text-decoration:none;">About LAK PDF</a></li>
          <li><a href="/contact" style="color:#cbd5e1;text-decoration:none;">Contact Helpdesk</a></li>
        </ul>
      </div>
      <div>
        <h4 style="color:#ffffff;font-size:0.875rem;margin-bottom:12px;font-weight:700;">Legal & Privacy</h4>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.8125rem;">
          <li><a href="/privacy-policy" style="color:#cbd5e1;text-decoration:none;">Privacy Policy</a></li>
          <li><a href="/terms-of-service" style="color:#cbd5e1;text-decoration:none;">Terms of Service</a></li>
          <li><a href="/disclaimer" style="color:#cbd5e1;text-decoration:none;">Disclaimer</a></li>
          <li><a href="/sitemap" style="color:#cbd5e1;text-decoration:none;">HTML Sitemap</a></li>
        </ul>
      </div>
    </div>
    <div style="max-width:1152px;margin:0 auto;padding-top:24px;border-top:1px solid #1e293b;text-align:center;font-size:0.75rem;color:#64748b;">
      <p>© ${new Date().getFullYear()} LAK PDF. All rights reserved. Processed locally in your browser.</p>
    </div>
  </footer>
`;

/**
 * Builds full HTML for a given page route
 */
function buildPageHtml({
  route,
  title,
  description,
  keywords,
  contentHtml,
  schemaJson,
}) {
  const canonicalUrl = `${SITE_URL}${route === "/" ? "" : route}`;
  let html = baseHtml;

  // 1. Replace Title
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);

  // 2. Replace Meta Description
  html = html.replace(
    /<meta name="description"[\s\S]*?\/>/i,
    `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
  );

  // 3. Replace Canonical Link
  html = html.replace(
    /<link rel="canonical"[\s\S]*?\/>/i,
    `<link rel="canonical" href="${canonicalUrl}" />`
  );

  // 4. Update OpenGraph Tags
  html = html.replace(
    /<meta property="og:title"[\s\S]*?\/>/i,
    `<meta property="og:title" content="${title.replace(/"/g, '&quot;')}" />`
  );
  html = html.replace(
    /<meta property="og:description"[\s\S]*?\/>/i,
    `<meta property="og:description" content="${description.replace(/"/g, '&quot;')}" />`
  );
  html = html.replace(
    /<meta property="og:url"[\s\S]*?\/>/i,
    `<meta property="og:url" content="${canonicalUrl}" />`
  );

  // 5. Update Keywords if present
  if (keywords) {
    html = html.replace(
      /<meta name="keywords"[\s\S]*?\/>/i,
      `<meta name="keywords" content="${keywords.replace(/"/g, '&quot;')}" />`
    );
  }

  // 6. Inject Schema JSON-LD if provided
  if (schemaJson) {
    const schemaTag = `\n  <script type="application/ld+json">\n${JSON.stringify(schemaJson, null, 2)}\n  </script>`;
    html = html.replace("</head>", `${schemaTag}\n</head>`);
  }

  // 7. Replace the inside of <div id="root">
  const fullBody = `
    <div class="prerendered-page-shell" style="min-height:100vh;display:flex;flex-direction:column;background:#f8fafc;color:#0f172a;font-family:Inter,system-ui,-apple-system,sans-serif;">
      ${renderHeader()}
      <main style="flex:1;max-width:1024px;width:100%;margin:0 auto;padding:40px 16px;">
        ${contentHtml}
      </main>
      ${renderFooter()}
    </div>
  `;

  const rootStart = '<div id="root">';
  const rootEndMarker = '<!-- Auto-recovery for stale cached Service Workers';
  const startIdx = html.indexOf(rootStart);
  const endMarkerIdx = html.indexOf(rootEndMarker);

  if (startIdx !== -1 && endMarkerIdx !== -1) {
    const beforeMarker = html.slice(0, endMarkerIdx);
    const lastDivIdx = beforeMarker.lastIndexOf('</div>');
    if (lastDivIdx > startIdx) {
      html = html.slice(0, startIdx) + `<div id="root">${fullBody}</div>\n\n  ` + html.slice(endMarkerIdx);
    }
  }

  // Also replace body noscript block with semantic version for search bots
  const bodyMarker = '<!-- SEO fallback for no-JS crawlers -->';
  const bodyMarkerIdx = html.indexOf(bodyMarker);
  if (bodyMarkerIdx !== -1) {
    const nsStartIdx = html.indexOf('<noscript>', bodyMarkerIdx);
    const nsEndIdx = html.indexOf('</noscript>', nsStartIdx);
    if (nsStartIdx !== -1 && nsEndIdx !== -1) {
      const noscriptContent = `<noscript>
    <div style="font-family:sans-serif;max-width:900px;margin:0 auto;padding:20px">
      <h1>${title}</h1>
      <p>${description}</p>
      <div style="margin-top:20px;">
        ${contentHtml}
      </div>
    </div>
  </noscript>`;
      html = html.slice(0, nsStartIdx) + noscriptContent + html.slice(nsEndIdx + '</noscript>'.length);
    }
  }

  return html;
}

/**
 * Saves HTML and compressed versions
 */
function savePrerenderedFile(routePath, htmlContent) {
  const cleanRoute = routePath.replace(/^\/+/, "").replace(/\/+$/, "");
  const targetDir = cleanRoute ? path.join(DIST_DIR, cleanRoute) : DIST_DIR;
  const targetFile = cleanRoute ? path.join(targetDir, "index.html") : path.join(DIST_DIR, "index.html");

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  fs.writeFileSync(targetFile, htmlContent, "utf8");

  // Generate .gz and .br
  try {
    const buf = Buffer.from(htmlContent, "utf8");
    fs.writeFileSync(`${targetFile}.gz`, zlib.gzipSync(buf));
    fs.writeFileSync(`${targetFile}.br`, zlib.brotliCompressSync(buf));
  } catch (err) {
    console.warn(`[prerender] Compression warning for ${routePath}:`, err.message);
  }
}

console.log("[prerender] Starting static HTML generation for AdSense & SEO...");

// ==========================================
// 1. PRIVACY POLICY
// ==========================================
const privacyPolicyHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#ecfdf5;color:#047857;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Privacy-First Architecture
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">Privacy Policy</h1>
    <p style="color:#64748b;font-size:0.875rem;margin-bottom:28px;">Last Updated & Verified: October 2026 | Effective Date: September 2024</p>
    
    <div style="background:#f0fdf4;border-left:4px solid:#10b981;padding:16px;border-radius:8px;margin-bottom:32px;">
      <h3 style="font-size:1rem;font-weight:700;color:#065f46;margin-bottom:4px;">Zero Server Document Storage Guarantee</h3>
      <p style="font-size:0.875rem;color:#047857;line-height:1.6;margin:0;">At LAK PDF, your files are processed directly in your browser's local memory via WebAssembly (Wasm). Your documents are <strong>NEVER</strong> uploaded, stored, copied, or transmitted to any remote servers.</p>
    </div>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">1. Introduction & Overview</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">LAK PDF (https://lakpdf.com) provides free, secure, browser-based online tools to merge, compress, convert, edit, and manipulate PDF and image files. We operate under a strict "privacy-by-design" philosophy. This Privacy Policy details our data collection policies, advertising partner disclosures, and your privacy rights under global regulations including GDPR and CCPA.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">2. How Documents Are Processed (Client-Side Processing)</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Unlike conventional PDF conversion websites that force users to upload documents to external cloud servers, LAK PDF executes operations locally within the client browser using WebAssembly. This means:</p>
      <ul style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li>Your files never leave your computer, laptop, tablet, or smartphone.</li>
        <li>We cannot read, index, inspect, or retain your sensitive contracts, medical records, invoices, or personal identity documents.</li>
        <li>Once you close your browser tab, all temporary file cache is immediately wiped from your device RAM.</li>
      </ul>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">3. Information We Collect</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">We collect minimal, non-personally identifiable technical analytics to ensure site uptime, monitor performance, and prevent bot abuse:</p>
      <ul style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li>Browser type, screen resolution, operating system, and device category.</li>
        <li>Aggregate page visits and performance timing metrics (Core Web Vitals).</li>
        <li>Referrer URLs and anonymized country-level geographic location.</li>
      </ul>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">4. Google AdSense & Third-Party Advertising Disclosures</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">To provide free PDF utilities without charging subscription fees or hiding features behind paywalls, LAK PDF displays advertisements through <strong>Google AdSense</strong>. Please read these mandatory disclosures regarding advertising cookies:</p>
      <ul style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li>Third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites across the Internet.</li>
        <li>Google's use of advertising cookies enables it and its partners to serve personalized ads based on your visits to our site and/or other sites on the web.</li>
        <li><strong>Managing and Opting Out of Cookies:</strong> Users may opt out of personalized advertising by visiting Google's official Ads Settings portal: <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600;">https://adssettings.google.com/</a>.</li>
        <li>Alternatively, users can opt out of third-party advertising cookies by visiting the Network Advertising Initiative (NAI) or <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" style="color:#2563eb;font-weight:600;">www.aboutads.info/choices/</a>.</li>
      </ul>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">5. Information We NEVER Collect</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">We strictly DO NOT collect or store:</p>
      <ul style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li>Government identification numbers (PAN, Aadhaar, SSN, Passport details).</li>
        <li>Credit card, bank, or payment details (our tools are 100% free).</li>
        <li>The contents, text, photos, or metadata inside your processed files.</li>
      </ul>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">6. Contact Details & Privacy Officer</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">If you have any questions or concerns regarding this Privacy Policy or document security practices, please reach out to our privacy desk:</p>
      <p style="font-size:0.9375rem;color:#0f172a;font-weight:600;margin-top:8px;">Email: <a href="mailto:liyaqatk960@gmail.com" style="color:#2563eb;">liyaqatk960@gmail.com</a></p>
      <p style="font-size:0.9375rem;color:#0f172a;">Website: <a href="https://lakpdf.com" style="color:#2563eb;">https://lakpdf.com</a></p>
    </section>
  </article>
`;

savePrerenderedFile(
  "/privacy-policy",
  buildPageHtml({
    route: "/privacy-policy",
    title: "Privacy Policy – Client-Side Data Protection & Ad Disclosures | LAK PDF",
    description: "Official Privacy Policy for LAK PDF. Learn about our 100% client-side WebAssembly document processing, zero server file storage, and Google AdSense cookie disclosures.",
    keywords: "lakpdf privacy policy, client side pdf, zero file storage, adsense privacy policy, gdpr pdf tools",
    contentHtml: privacyPolicyHtml,
  })
);

// ==========================================
// 2. TERMS OF SERVICE
// ==========================================
const termsHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#eff6ff;color:#1d4ed8;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      User Agreement & Legal Terms
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">Terms of Service</h1>
    <p style="color:#64748b;font-size:0.875rem;margin-bottom:28px;">Last Updated: October 2026 | Effective Date: September 2024</p>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">1. Agreement to Terms</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">By accessing or using LAK PDF (https://lakpdf.com), you acknowledge and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must discontinue use of the platform immediately.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">2. Permitted Use & Intellectual Property</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">LAK PDF tools are provided 100% free of charge for personal, academic, and lawful commercial use. You retain 100% full legal ownership, copyright, and title to all documents processed on our platform. LAK PDF claims zero ownership or licensing rights over your uploaded materials.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">3. Prohibited Activities</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Users agree not to use LAK PDF to:</p>
      <ul style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li>Process unlawful, defamatory, infringing, or malicious content.</li>
        <li>Automate abusive traffic or denial-of-service attacks against the infrastructure.</li>
        <li>Attempt to decompile, reverse-engineer, or scrape proprietary components for malicious purposes.</li>
      </ul>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">4. Advertising Disclosures (Google AdSense)</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">To sustain free servers, continuous software updates, and high-speed delivery without paywalls, LAK PDF displays advertising supplied by Google AdSense and accredited ad networks. We do not endorse or guarantee the products or services advertised by third parties.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">5. Limitation of Liability & Disclaimers</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">All tools are provided on an "AS-IS" and "AS-AVAILABLE" basis without warranties of any kind. While our WebAssembly processing engine is designed for high accuracy and standards compliance, LAK PDF is not liable for data loss or formatting discrepancies resulting from file corruption or browser incompatibilities.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">6. Contact Information</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">For legal inquiries or questions concerning our Terms of Service, contact: <a href="mailto:liyaqatk960@gmail.com" style="color:#2563eb;font-weight:600;">liyaqatk960@gmail.com</a>.</p>
    </section>
  </article>
`;

savePrerenderedFile(
  "/terms-of-service",
  buildPageHtml({
    route: "/terms-of-service",
    title: "Terms of Service – Permitted Use & Ownership Rights | LAK PDF",
    description: "Terms of Service for LAK PDF. Understand permitted personal and commercial uses, user document ownership guarantees, and acceptable use guidelines.",
    keywords: "lakpdf terms of service, user agreement, terms of use, legal notices",
    contentHtml: termsHtml,
  })
);

// ==========================================
// 3. ABOUT US
// ==========================================
const aboutHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#dc2626;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Engineering Document Freedom
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">About LAK PDF</h1>
    <p style="color:#64748b;font-size:0.9375rem;margin-bottom:28px;">Democratizing high-performance document tools with 100% privacy and zero subscription barriers.</p>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">Our Mission</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">LAK PDF was founded to fix a massive flaw in the digital document industry: almost all online PDF converters upload sensitive user documents (passports, tax filings, legal agreements) to mysterious third-party cloud servers, charge expensive monthly subscriptions, and introduce queue delays. We built LAK PDF to prove that document manipulation can be 100% client-side, instant, and completely free.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">Core Architecture: Client-Side WebAssembly</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">By compiling high-performance C++ and Rust libraries into WebAssembly (Wasm), LAK PDF executes complex operations—such as PDF merging, AES-256 encryption, image compression, and OCR text extraction—directly inside your device's browser sandbox. Files never touch our backend, ensuring absolute privacy and zero risk of data breaches.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">Meet the Founder & Engineering Team</h2>
      <div style="display:flex;align-items:center;gap:20px;background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;margin-top:16px;">
        <img src="/founder.jpg" alt="Leyaquat Ali Khan - Founder LAK PDF" width="80" height="80" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;" />
        <div>
          <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Leyaquat Ali Khan</h3>
          <p style="font-size:0.8125rem;color:#e5323f;font-weight:600;margin:0 0 8px;">Founder & Lead Systems Architect</p>
          <p style="font-size:0.875rem;color:#475569;margin:0;line-height:1.5;">Full-stack software engineer specialized in client-side WebAssembly, high-throughput document processing engines, and ISO 32000 PDF standards.</p>
        </div>
      </div>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">Commitment to Transparency & Free Access</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">LAK PDF offers 30+ document and image tools with zero subscription paywalls, watermarks, or sign-up mandates. We fund our high-speed global hosting infrastructure through Google AdSense advertisements, keeping the software completely accessible for students, job applicants, and professionals worldwide.</p>
    </section>

    <section>
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">Get in Touch</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Have feedback, partnership ideas, or feature suggestions? Visit our <a href="/contact" style="color:#2563eb;font-weight:600;">Contact Page</a> or email us directly at <a href="mailto:liyaqatk960@gmail.com" style="color:#2563eb;font-weight:600;">liyaqatk960@gmail.com</a>.</p>
    </section>
  </article>
`;

savePrerenderedFile(
  "/about",
  buildPageHtml({
    route: "/about",
    title: "About Us – Mission, Client-Side Security & Story | LAK PDF",
    description: "Learn about LAK PDF, our mission to democratize document manipulation, our 100% browser-based WebAssembly architecture, and the team behind the platform.",
    keywords: "about lakpdf, Leyaquat Ali Khan, client side pdf, secure pdf tools, free online pdf",
    contentHtml: aboutHtml,
  })
);

// ==========================================
// 4. CONTACT US
// ==========================================
const contactHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#f0fdf4;color:#16a34a;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Helpdesk & Direct Support
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">Contact Support & Help Desk</h1>
    <p style="color:#64748b;font-size:0.9375rem;margin-bottom:28px;">Have a question, encountered an unexpected file behavior, or need a custom government exam preset? Our core engineering team is here to assist.</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:24px;margin-bottom:32px;">
      <div style="background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:8px;">📧 Direct Email Support</h3>
        <p style="font-size:0.875rem;color:#475569;margin-bottom:12px;line-height:1.6;">Send us an email for general inquiries, bug reports, or feature requests. We aim to reply to all inquiries within 6-12 hours.</p>
        <a href="mailto:liyaqatk960@gmail.com" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#ffffff;border-radius:8px;font-weight:600;font-size:0.875rem;text-decoration:none;">Email: liyaqatk960@gmail.com</a>
      </div>
      <div style="background:#f8fafc;padding:24px;border-radius:12px;border:1px solid #e2e8f0;">
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:8px;">🔒 Document Privacy Notice</h3>
        <p style="font-size:0.875rem;color:#475569;line-height:1.6;margin:0;">When reporting a conversion or formatting issue, <strong>never attach sensitive documents</strong>. Describe your browser version, file type, and the approximate file size. All your documents remain local to your computer.</p>
      </div>
    </div>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:16px;">Frequently Asked Questions (Support FAQ)</h2>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <h4 style="font-weight:700;color:#0f172a;margin:0 0 6px;">Are my documents safe when I contact support?</h4>
          <p style="font-size:0.875rem;color:#475569;margin:0;line-height:1.5;">Yes. LAK PDF operates client-side. We do not require or ask for your confidential documents. You only share what you choose to write in your email inquiry.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <h4 style="font-weight:700;color:#0f172a;margin:0 0 6px;">Can I request a new tool or specific government exam preset?</h4>
          <p style="font-size:0.875rem;color:#475569;margin:0;line-height:1.5;">Yes! We actively build tools based on user feedback. If you need a specific dimension preset for UPSC, SSC, IBPS, or state exams, let us know.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
          <h4 style="font-weight:700;color:#0f172a;margin:0 0 6px;">Is LAK PDF completely free for commercial and office use?</h4>
          <p style="font-size:0.875rem;color:#475569;margin:0;line-height:1.5;">Yes. All tools on LAK PDF are 100% free for students, teachers, businesses, and government job aspirants without any subscription fees or hidden costs.</p>
        </div>
      </div>
    </section>
  </article>
`;

savePrerenderedFile(
  "/contact",
  buildPageHtml({
    route: "/contact",
    title: "Contact Support & Help Desk | LAK PDF",
    description: "Get in touch with LAK PDF support for technical assistance, bug reports, feature requests, or partnership inquiries. We reply within 6-12 hours.",
    keywords: "contact lakpdf, lakpdf support, email liyaqatk960@gmail.com, pdf helpdesk",
    contentHtml: contactHtml,
  })
);

// ==========================================
// 5. DISCLAIMER
// ==========================================
const disclaimerHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#fffbeb;color:#b45309;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Legal Notice & Disclosures
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">Website & Services Disclaimer</h1>
    <p style="color:#64748b;font-size:0.875rem;margin-bottom:28px;">Last Updated: October 2026</p>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">1. General Utility Purpose</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">The tools and utilities provided on LAK PDF (https://lakpdf.com) are intended for convenience, personal productivity, and workflow automation. LAK PDF is not a legal, judicial, or certified document verification authority. Users are solely responsible for ensuring that documents processed on this platform satisfy the requirements of their intended recipients, institutions, or official portals.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">2. Government Form & Exam Resizer Notice</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Our government exam presets (UPSC, SSC, IBPS, State PSCs) are engineered according to officially published recruitment notification dimensions and file sizes. However, candidate guidelines change periodically. Candidates must review official commission guidelines prior to final submission. LAK PDF assumes no liability for application rejections arising from recruitment portal errors.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">3. Advertising & Google AdSense Disclosures</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">This website displays advertisements provided by Google AdSense and third-party advertising partners. Advertisements are generated automatically based on user cookie preferences and browsing context. LAK PDF does not endorse, verify, or guarantee any external products, claims, or services depicted in third-party advertisements.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">4. Trademarks & Brand Attribution</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Adobe, Acrobat, Word, PowerPoint, Excel, and other product names mentioned are trademarks or registered trademarks of their respective holders. Their reference on this website does not imply affiliation, sponsorship, or endorsement.</p>
    </section>
  </article>
`;

savePrerenderedFile(
  "/disclaimer",
  buildPageHtml({
    route: "/disclaimer",
    title: "Disclaimer & Legal Notices | LAK PDF",
    description: "Official legal disclaimer and advertising disclosures for LAK PDF. Understand document processing scope, accuracy advisories, and trademark notices.",
    keywords: "lakpdf disclaimer, adsense disclosure, legal notices, trademark disclaimer",
    contentHtml: disclaimerHtml,
  })
);

// ==========================================
// 5.5 ALL TOOLS DIRECTORY (/tools & /all-tools)
// ==========================================
const toolsDirectoryHtml = `
  <div style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#dc2626;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Free Online PDF Tools Suite
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">All Free PDF & Image Tools</h1>
    <p style="font-size:1rem;color:#475569;line-height:1.6;margin-bottom:32px;">Everyday document workflows made instant, 100% private, and completely free in your browser with zero signup.</p>

    <!-- Categories -->
    <div style="display:flex;flex-direction:column;gap:36px;">
      <!-- Organize & Structure -->
      <div>
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">📁 Organize & Structure</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
          <a href="/merge" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Merge PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Combine multiple PDF files into one clean document.</p>
          </a>
          <a href="/split" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Split PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Extract individual pages or separate PDF files.</p>
          </a>
          <a href="/organize-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Organize PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Reorder, rotate, and arrange pages via drag-and-drop.</p>
          </a>
          <a href="/rotate" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Rotate PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Rotate upside-down or sideways pages permanently.</p>
          </a>
          <a href="/crop-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Crop PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Crop PDF margins and remove unwanted borders.</p>
          </a>
          <a href="/delete-page" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Delete Pages</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Remove unnecessary or blank pages from documents.</p>
          </a>
        </div>
      </div>

      <!-- Compression & Sizing -->
      <div>
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">🗜️ Compression & Sizing</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
          <a href="/compress" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Compress PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Reduce PDF size for email, WhatsApp, and portals.</p>
          </a>
          <a href="/compress-pdf-to-100kb" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Compress to 100KB</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Target exact 100KB limit for government portals.</p>
          </a>
          <a href="/compress-pdf-to-200kb" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Compress to 200KB</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Target 200KB size for job and university applications.</p>
          </a>
          <a href="/compress-img" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Compress Image</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Reduce JPG/PNG image file size with sharp clarity.</p>
          </a>
        </div>
      </div>

      <!-- Format Conversion -->
      <div>
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">🔄 Conversion Suite</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
          <a href="/pdf-to-word" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">PDF to Word</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Convert PDF into editable Microsoft Word DOCX.</p>
          </a>
          <a href="/word-to-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Word to PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Convert DOCX files into universally readable PDF.</p>
          </a>
          <a href="/img-to-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Image to PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Convert JPG, PNG, and photos into a PDF document.</p>
          </a>
          <a href="/pdf-to-img" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">PDF to Image</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Extract pages as crisp JPG images.</p>
          </a>
          <a href="/make-ppt" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Make PPT</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Turn PDFs and images into PowerPoint presentation slides.</p>
          </a>
        </div>
      </div>

      <!-- Sarkari Exam & Biometrics -->
      <div>
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">🇮🇳 Sarkari Exam & Photo Resizers</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
          <a href="/govt-exam-resizer" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Govt Exam Resizer</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Preset photo & signature sizing for UPSC, SSC, IBPS, and State PSCs.</p>
          </a>
          <a href="/passport-photo-maker" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Passport Photo Maker</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">ICAO 9303 compliant biometric photo generator with 4x6 print sheets.</p>
          </a>
        </div>
      </div>

      <!-- Security & PDF Manipulation -->
      <div>
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">🔒 Security & Privacy</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(260px, 1fr));gap:16px;">
          <a href="/protect-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Protect PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Add AES-256 encryption password to sensitive documents.</p>
          </a>
          <a href="/unlock-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Unlock PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Remove passwords and security restrictions from owned PDFs.</p>
          </a>
          <a href="/redact-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Redact PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Permanently sanitize Aadhaar, PAN, and confidential data.</p>
          </a>
          <a href="/sign-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
            <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Sign PDF</h3>
            <p style="font-size:0.8125rem;color:#64748b;margin:0;">Draw or upload digital signatures to PDF forms.</p>
          </a>
        </div>
      </div>
    </div>
  </div>
`;

savePrerenderedFile(
  "/tools",
  buildPageHtml({
    route: "/tools",
    title: "All Free PDF & Image Tools | LAK PDF",
    description: "Explore all 30+ free online PDF and image utilities: merge, compress, convert, edit, sign, OCR, and resize with 100% browser-based privacy.",
    keywords: "pdf tools list, free online pdf tools, merge compress convert pdf, lakpdf all tools",
    contentHtml: toolsDirectoryHtml,
  })
);

savePrerenderedFile(
  "/all-tools",
  buildPageHtml({
    route: "/all-tools",
    title: "All Free PDF & Image Tools | LAK PDF",
    description: "Explore all 30+ free online PDF and image utilities: merge, compress, convert, edit, sign, OCR, and resize with 100% browser-based privacy.",
    keywords: "pdf tools list, free online pdf tools, merge compress convert pdf, lakpdf all tools",
    contentHtml: toolsDirectoryHtml,
  })
);

// ==========================================
// 5.6 LEARN PDF HUB (/learn-pdf)
// ==========================================
const learnPdfHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <div style="display:inline-block;padding:4px 12px;background:#eff6ff;color:#1d4ed8;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
      Educational Resource
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">Learn PDF Workflows & Best Practices</h1>
    <p style="color:#64748b;font-size:0.9375rem;margin-bottom:28px;">A comprehensive handbook on mastering digital document organization, lossless compression, encryption, and conversion.</p>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">1. The Golden Rule of Document Preparation</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">Before sending a PDF for academic admissions, government jobs, or corporate client reviews, follow this 4-step sequence:</p>
      <ol style="font-size:0.9375rem;line-height:1.7;color:#334155;padding-left:24px;margin-top:8px;">
        <li><strong>Audit Page Structure:</strong> Remove blank pages and orient rotated pages upright using <a href="/organize-pdf" style="color:#2563eb;">Organize PDF</a>.</li>
        <li><strong>Optimize File Size:</strong> Compress images inside the document to fit email or portal limits using <a href="/compress" style="color:#2563eb;">Compress PDF</a>.</li>
        <li><strong>Verify Readability:</strong> Ensure fine print and signatures remain crisp at 100% zoom.</li>
        <li><strong>Secure Confidential Data:</strong> Apply AES-256 encryption password with <a href="/protect-pdf" style="color:#2563eb;">Protect PDF</a> when transmitting sensitive data.</li>
      </ol>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">2. How to Compress Without Losing Sharpness</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">PDF compression operates by removing redundant font descriptors and downsampling embedded raster photographs. To retain maximum sharpness on text documents with charts, use LAK PDF's <em>Recommended Compression</em> mode which preserves vector typography while drastically compressing background images.</p>
    </section>

    <section style="margin-bottom:32px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:12px;">3. PDF to Word vs. OCR Text Extraction</h2>
      <p style="font-size:0.9375rem;line-height:1.7;color:#334155;">If your document was originally created digitally (from Word or Google Docs), use <a href="/pdf-to-word" style="color:#2563eb;">PDF to Word</a> to reconstruct formatting into editable DOCX. If your PDF is a photo of a printed paper, use <a href="/ocr-pdf" style="color:#2563eb;">OCR PDF</a> to extract the text using neural character recognition.</p>
    </section>
  </article>
`;

savePrerenderedFile(
  "/learn-pdf",
  buildPageHtml({
    route: "/learn-pdf",
    title: "Learn PDF Workflows & Best Practices | LAK PDF",
    description: "Comprehensive guide to practical PDF workflows: merge, split, compress, convert, edit, and quality checks before sharing.",
    keywords: "learn pdf, pdf tutorial, how to compress pdf, pdf best practices",
    contentHtml: learnPdfHtml,
  })
);

// ==========================================
// 5.7 HTML SITEMAP DIRECTORY (/sitemap)
// ==========================================
const sitemapHtml = `
  <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:12px;line-height:1.2;">LAK PDF Website Sitemap</h1>
    <p style="color:#64748b;font-size:0.9375rem;margin-bottom:28px;">Complete directory of tools, in-depth guides, company information, and legal disclosures.</p>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:28px;">
      <div>
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:12px;border-bottom:2px solid #f1f5f9;padding-bottom:6px;">Core PDF Tools</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          <li><a href="/merge" style="color:#2563eb;text-decoration:none;">Merge PDF</a></li>
          <li><a href="/split" style="color:#2563eb;text-decoration:none;">Split PDF</a></li>
          <li><a href="/compress" style="color:#2563eb;text-decoration:none;">Compress PDF</a></li>
          <li><a href="/organize-pdf" style="color:#2563eb;text-decoration:none;">Organize PDF</a></li>
          <li><a href="/delete-page" style="color:#2563eb;text-decoration:none;">Delete Pages</a></li>
          <li><a href="/rotate" style="color:#2563eb;text-decoration:none;">Rotate PDF</a></li>
          <li><a href="/crop-pdf" style="color:#2563eb;text-decoration:none;">Crop PDF</a></li>
          <li><a href="/sign-pdf" style="color:#2563eb;text-decoration:none;">Sign PDF</a></li>
          <li><a href="/pdf-editor" style="color:#2563eb;text-decoration:none;">PDF Editor</a></li>
        </ul>
      </div>

      <div>
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:12px;border-bottom:2px solid #f1f5f9;padding-bottom:6px;">Conversion Suite</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          <li><a href="/pdf-to-word" style="color:#2563eb;text-decoration:none;">PDF to Word</a></li>
          <li><a href="/word-to-pdf" style="color:#2563eb;text-decoration:none;">Word to PDF</a></li>
          <li><a href="/img-to-pdf" style="color:#2563eb;text-decoration:none;">Image to PDF</a></li>
          <li><a href="/pdf-to-img" style="color:#2563eb;text-decoration:none;">PDF to Image</a></li>
          <li><a href="/make-ppt" style="color:#2563eb;text-decoration:none;">Make PPT</a></li>
          <li><a href="/ocr-pdf" style="color:#2563eb;text-decoration:none;">OCR PDF</a></li>
          <li><a href="/pdf-to-text" style="color:#2563eb;text-decoration:none;">PDF to Text</a></li>
        </ul>
      </div>

      <div>
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:12px;border-bottom:2px solid #f1f5f9;padding-bottom:6px;">Knowledge & Engineering Blog</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          <li><a href="/blog" style="color:#2563eb;text-decoration:none;">Blog Hub</a></li>
          <li><a href="/blog/upsc-ssc-photo-signature-resizer-guide" style="color:#2563eb;text-decoration:none;">UPSC & SSC Photo Resizer Guide</a></li>
          <li><a href="/blog/client-side-wasm-vs-cloud-pdf-security" style="color:#2563eb;text-decoration:none;">Client-Side Wasm Security Guide</a></li>
          <li><a href="/blog/iso-32000-aes-256-pdf-encryption-guide" style="color:#2563eb;text-decoration:none;">AES-256 PDF Encryption Guide</a></li>
          <li><a href="/blog/permanent-pdf-redaction-remove-pii" style="color:#2563eb;text-decoration:none;">Permanent PDF Redaction Guide</a></li>
          <li><a href="/blog/lossless-vs-lossy-pdf-compression" style="color:#2563eb;text-decoration:none;">Lossless vs Lossy Compression</a></li>
          <li><a href="/blog/icao-9303-biometric-passport-photo-standard" style="color:#2563eb;text-decoration:none;">ICAO 9303 Passport Standards</a></li>
        </ul>
      </div>

      <div>
        <h3 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin-bottom:12px;border-bottom:2px solid #f1f5f9;padding-bottom:6px;">Company & Legal Policies</h3>
        <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;font-size:0.875rem;">
          <li><a href="/about" style="color:#2563eb;text-decoration:none;">About Us</a></li>
          <li><a href="/contact" style="color:#2563eb;text-decoration:none;">Contact Support</a></li>
          <li><a href="/privacy-policy" style="color:#2563eb;text-decoration:none;">Privacy Policy</a></li>
          <li><a href="/terms-of-service" style="color:#2563eb;text-decoration:none;">Terms of Service</a></li>
          <li><a href="/disclaimer" style="color:#2563eb;text-decoration:none;">Disclaimer</a></li>
        </ul>
      </div>
    </div>
  </article>
`;

savePrerenderedFile(
  "/sitemap",
  buildPageHtml({
    route: "/sitemap",
    title: "Sitemap - Directory of All Tools & Pages | LAKPDF",
    description: "Explore the complete sitemap of LAKPDF. Access all free PDF utilities, Sarkari exam photo and signature resizers, AI document engines, and step-by-step guides.",
    keywords: "lakpdf sitemap, all pdf tools, site directory",
    contentHtml: sitemapHtml,
  })
);

// ==========================================
// 6. BLOG HUB (/blog)
// ==========================================
const blogArticlesListHtml = `
  <div style="margin-bottom:32px;">
    <div style="display:inline-block;padding:4px 12px;background:#eff6ff;color:#1d4ed8;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:12px;">
      Knowledge Hub & Engineering Guides
    </div>
    <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:8px;">LAK PDF Knowledge Hub & Guides</h1>
    <p style="font-size:1rem;color:#64748b;max-width:720px;line-height:1.6;">Authoritative in-depth guides on PDF security, ICAO passport photo specifications, UPSC/SSC document resizing, client-side encryption, and OCR technology.</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));gap:24px;">
    ${blogArticles
      .map(
        (article) => `
      <article style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:24px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;">
            <span style="font-size:0.75rem;font-weight:700;color:#2563eb;background:#eff6ff;padding:4px 10px;border-radius:999px;">${article.category}</span>
            <span style="font-size:0.75rem;color:#94a3b8;">${article.readTime}</span>
          </div>
          <h2 style="font-size:1.1875rem;font-weight:700;color:#0f172a;line-height:1.4;margin-bottom:8px;">
            <a href="/blog/${article.slug}" style="color:#0f172a;text-decoration:none;">${article.title}</a>
          </h2>
          <p style="font-size:0.875rem;color:#64748b;line-height:1.6;margin-bottom:16px;">${article.excerpt}</p>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;padding-top:16px;border-top:1px solid #f1f5f9;margin-bottom:12px;">
            <img src="${article.author.avatar}" alt="${article.author.name}" width="32" height="32" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />
            <div>
              <div style="font-size:0.8125rem;font-weight:700;color:#0f172a;">${article.author.name}</div>
              <div style="font-size:0.6875rem;color:#94a3b8;">${article.date}</div>
            </div>
          </div>
          <a href="/blog/${article.slug}" style="display:inline-block;color:#2563eb;font-weight:600;font-size:0.875rem;text-decoration:none;">Read Full Guide →</a>
        </div>
      </article>
    `
      )
      .join("")}
  </div>
`;

savePrerenderedFile(
  "/blog",
  buildPageHtml({
    route: "/blog",
    title: "LAK PDF Knowledge Hub & Guides – Expert Document Engineering",
    description: "Authoritative in-depth guides on PDF security, ICAO passport photo specifications, UPSC/SSC document resizing, client-side encryption, and OCR.",
    keywords: "pdf guides, upsc photo resizer guide, client side pdf security, aes-256 encryption, redact aadhaar, lakpdf blog",
    contentHtml: blogArticlesListHtml,
  })
);

// ==========================================
// 7. ALL 8 BLOG POST ARTICLES (/blog/:slug)
// ==========================================
for (const article of blogArticles) {
  const articleHtml = `
    <article style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <a href="/blog" style="color:#2563eb;font-size:0.875rem;font-weight:600;text-decoration:none;">← Back to All Guides</a>
          <span style="color:#cbd5e1;">·</span>
          <span style="font-size:0.75rem;font-weight:700;color:#2563eb;background:#eff6ff;padding:3px 10px;border-radius:999px;">${article.category}</span>
          <span style="color:#cbd5e1;">·</span>
          <span style="font-size:0.75rem;color:#64748b;">${article.readTime}</span>
        </div>
        <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;line-height:1.25;margin-bottom:16px;">${article.title}</h1>
        <p style="font-size:1.125rem;color:#475569;line-height:1.6;margin-bottom:20px;">${article.excerpt}</p>
        
        <div style="display:flex;align-items:center;gap:12px;padding:16px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
          <img src="${article.author.avatar}" alt="${article.author.name}" width="44" height="44" style="width:44px;height:44px;border-radius:50%;object-fit:cover;" />
          <div>
            <div style="font-size:0.9375rem;font-weight:700;color:#0f172a;">${article.author.name}</div>
            <div style="font-size:0.75rem;color:#64748b;">${article.author.role} · Published ${article.date} · Updated ${article.updatedDate}</div>
          </div>
        </div>
      </div>

      <!-- Table of Contents -->
      ${
        article.tableOfContents && article.tableOfContents.length > 0
          ? `
        <div style="background:#f1f5f9;padding:20px;border-radius:12px;margin-bottom:32px;">
          <h3 style="font-size:0.9375rem;font-weight:700;color:#0f172a;margin:0 0 12px;">Table of Contents</h3>
          <ul style="list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px;">
            ${article.tableOfContents
              .map(
                (toc) => `
              <li><a href="#${toc.id}" style="color:#2563eb;font-size:0.875rem;text-decoration:none;">${toc.title}</a></li>
            `
              )
              .join("")}
          </ul>
        </div>
      `
          : ""
      }

      <!-- Sections -->
      ${article.sections
        .map(
          (sec) => `
        <section id="${sec.id}" style="margin-bottom:36px;">
          <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:14px;padding-top:12px;border-top:1px solid #f1f5f9;">${sec.heading}</h2>
          ${sec.paragraphs.map((p) => `<p style="font-size:0.9375rem;line-height:1.75;color:#334155;margin-bottom:14px;">${p}</p>`).join("")}
          
          ${
            sec.callout
              ? `
            <div style="background:#f0fdf4;border-left:4px solid #10b981;padding:16px;border-radius:8px;margin:16px 0;">
              <h4 style="font-size:0.9375rem;font-weight:700;color:#065f46;margin:0 0 4px;">${sec.callout.title}</h4>
              <p style="font-size:0.875rem;color:#047857;margin:0;line-height:1.6;">${sec.callout.text}</p>
            </div>
          `
              : ""
          }

          ${
            sec.table
              ? `
            <div style="overflow-x:auto;margin:20px 0;">
              <table style="width:100%;border-collapse:collapse;font-size:0.875rem;border:1px solid #e2e8f0;">
                <thead>
                  <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                    ${sec.table.headers.map((h) => `<th style="padding:10px 14px;text-align:left;font-weight:700;color:#0f172a;">${h}</th>`).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${sec.table.rows
                    .map(
                      (row) => `
                    <tr style="border-bottom:1px solid #e2e8f0;">
                      ${row.map((cell) => `<td style="padding:10px 14px;color:#334155;">${cell}</td>`).join("")}
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
            </div>
          `
              : ""
          }

          ${
            sec.bulletPoints && sec.bulletPoints.length > 0
              ? `
            <ul style="padding-left:24px;margin:14px 0;font-size:0.9375rem;line-height:1.75;color:#334155;">
              ${sec.bulletPoints.map((bp) => `<li>${bp}</li>`).join("")}
            </ul>
          `
              : ""
          }
        </section>
      `
        )
        .join("")}

      <!-- FAQs -->
      ${
        article.faqs && article.faqs.length > 0
          ? `
        <section style="margin-top:40px;padding-top:24px;border-top:2px solid #e2e8f0;">
          <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:16px;">Frequently Asked Questions</h2>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${article.faqs
              .map(
                (faq) => `
              <div style="border:1px solid #e2e8f0;border-radius:10px;padding:16px;">
                <h3 style="font-size:1rem;font-weight:700;color:#0f172a;margin:0 0 6px;">${faq.question}</h3>
                <p style="font-size:0.875rem;color:#475569;margin:0;line-height:1.6;">${faq.answer}</p>
              </div>
            `
              )
              .join("")}
          </div>
        </section>
      `
          : ""
      }

      <!-- Interactive Tool CTA -->
      <div style="margin-top:40px;background:linear-gradient(135deg, #1e293b, #0f172a);color:#ffffff;padding:28px;border-radius:16px;text-align:center;">
        <h3 style="font-size:1.25rem;font-weight:700;margin:0 0 8px;">Try the Free Tool on LAK PDF</h3>
        <p style="font-size:0.875rem;color:#94a3b8;margin:0 0 16px;">Execute this workflow right now in your browser with 100% privacy and zero signup.</p>
        <a href="${article.toolPath}" style="display:inline-block;padding:12px 24px;background:#e5323f;color:#ffffff;font-weight:700;border-radius:8px;text-decoration:none;">Open ${article.toolName} →</a>
      </div>
    </article>
  `;

  savePrerenderedFile(
    `/blog/${article.slug}`,
    buildPageHtml({
      route: `/blog/${article.slug}`,
      title: `${article.metaTitle || article.title}`,
      description: article.excerpt,
      keywords: article.tags.join(", "),
      contentHtml: articleHtml,
      schemaJson: {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.excerpt,
        datePublished: article.date,
        dateModified: article.updatedDate,
        author: {
          "@type": "Person",
          name: article.author.name,
          jobTitle: article.author.role,
        },
        publisher: {
          "@type": "Organization",
          name: "LAK PDF",
          url: "https://lakpdf.com",
        },
      },
    })
  );
}

// ==========================================
// 8. ALL 51 TOOL PAGES FROM toolSEOData.ts
// ==========================================
for (const [toolRoute, seoData] of Object.entries(toolSEOData)) {
  const toolName = toolRoute
    .replace(/^\//, "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  const toolHtml = `
    <div style="background:#ffffff;padding:40px;border-radius:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
      <div style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#dc2626;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:16px;">
        100% Free · Client-Side Processing
      </div>
      <h1 style="font-size:2.25rem;font-weight:800;color:#0f172a;margin-bottom:14px;line-height:1.2;">${toolName} Online Free</h1>
      <p style="font-size:1rem;color:#475569;line-height:1.7;margin-bottom:28px;">${seoData.intro}</p>

      <!-- How to use -->
      <section style="margin-bottom:32px;">
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;">How to use ${toolName} online:</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
          ${seoData.howToUse
            .map(
              (step, i) => `
            <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
              <div style="font-size:0.75rem;font-weight:800;color:#2563eb;margin-bottom:4px;">STEP ${i + 1}</div>
              <h3 style="font-size:0.9375rem;font-weight:700;color:#0f172a;margin:0 0 4px;">${step.step}</h3>
              <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">${step.detail}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      <!-- Key Benefits -->
      <section style="margin-bottom:32px;">
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;">Why use LAK PDF ${toolName}?</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
          ${seoData.benefits
            .map(
              (b) => `
            <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
              <h3 style="font-size:0.9375rem;font-weight:700;color:#0f172a;margin:0 0 4px;">${b.title}</h3>
              <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">${b.description}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      <!-- FAQs -->
      <section style="margin-bottom:28px;">
        <h2 style="font-size:1.375rem;font-weight:700;color:#0f172a;margin-bottom:16px;">Frequently Asked Questions</h2>
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${seoData.faqs
            .map(
              (faq) => `
            <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
              <h3 style="font-size:0.9375rem;font-weight:700;color:#0f172a;margin:0 0 4px;">${faq.question}</h3>
              <p style="font-size:0.8125rem;color:#475569;margin:0;line-height:1.5;">${faq.answer}</p>
            </div>
          `
            )
            .join("")}
        </div>
      </section>

      <div style="font-size:0.75rem;color:#94a3b8;">Last updated: ${seoData.lastUpdated} · Verified for ISO-32000 compatibility</div>
    </div>
  `;

  savePrerenderedFile(
    toolRoute,
    buildPageHtml({
      route: toolRoute,
      title: `${toolName} Online Free | LAK PDF`,
      description: seoData.intro.slice(0, 160),
      keywords: `${toolName.toLowerCase()}, free pdf tools, online pdf, lakpdf`,
      contentHtml: toolHtml,
    })
  );
}

// ==========================================
// 9. HOMEPAGE PRERENDER (/)
// ==========================================
const homepageHtml = `
  <div style="background:#ffffff;padding:32px 24px;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:32px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
    <div style="text-align:center;max-width:800px;margin:0 auto 36px;">
      <div style="display:inline-block;padding:4px 12px;background:#fef2f2;color:#dc2626;border-radius:999px;font-size:0.75rem;font-weight:700;margin-bottom:12px;">
        100% Free · Client-Side Processing · No Signup
      </div>
      <h1 style="font-size:2.5rem;font-weight:900;color:#0f172a;line-height:1.2;margin-bottom:12px;">Finish Everyday PDF Work in <span style="color:#e5323f;">Seconds</span></h1>
      <p style="font-size:1.125rem;color:#475569;line-height:1.6;">Merge, compress, convert, split, and edit PDFs quickly with fast, browser-based tools. 100% private with zero document uploads.</p>
    </div>

    <!-- Popular Tools -->
    <div style="margin-bottom:48px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">Most Popular Free Tools</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:16px;">
        <a href="/merge" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Merge PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Combine multiple PDF files into one clean document.</p>
        </a>
        <a href="/split" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Split PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Extract pages or split large documents into individual files.</p>
        </a>
        <a href="/compress" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Compress PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Reduce PDF file size securely to 100KB, 200KB or 500KB.</p>
        </a>
        <a href="/pdf-to-word" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">PDF to Word</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Convert PDF into editable Microsoft Word DOCX documents.</p>
        </a>
        <a href="/word-to-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Word to PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Convert DOCX files into universally readable standard PDF.</p>
        </a>
        <a href="/img-to-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Image to PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Convert JPG, PNG, and photos into a share-ready PDF.</p>
        </a>
        <a href="/sign-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">Sign PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Sign PDF documents online and add digital signatures.</p>
        </a>
        <a href="/ocr-pdf" style="text-decoration:none;background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;display:block;">
          <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:0 0 6px;">OCR PDF</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Extract searchable text from scanned paper documents and receipts.</p>
        </a>
      </div>
    </div>

    <!-- Featured Engineering Guides & Knowledge Hub -->
    <div style="margin-bottom:48px;">
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #f1f5f9;padding-bottom:8px;margin-bottom:16px;">
        <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin:0;">Featured Guides & Knowledge Hub</h2>
        <a href="/blog" style="color:#2563eb;font-weight:600;font-size:0.875rem;text-decoration:none;">View all guides →</a>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:20px;">
        ${blogArticles.slice(0, 6).map((art) => `
          <article style="background:#f8fafc;padding:20px;border-radius:12px;border:1px solid #e2e8f0;display:flex;flex-direction:column;justify-content:space-between;">
            <div>
              <span style="font-size:0.75rem;font-weight:700;color:#2563eb;background:#eff6ff;padding:3px 8px;border-radius:999px;">${art.category}</span>
              <h3 style="font-size:1.05rem;font-weight:700;color:#0f172a;margin:10px 0 6px;">
                <a href="/blog/${art.slug}" style="color:#0f172a;text-decoration:none;">${art.title}</a>
              </h3>
              <p style="font-size:0.8125rem;color:#64748b;line-height:1.6;margin:0 0 12px;">${art.excerpt}</p>
            </div>
            <a href="/blog/${art.slug}" style="color:#2563eb;font-size:0.8125rem;font-weight:600;text-decoration:none;">Read Full Guide →</a>
          </article>
        `).join("")}
      </div>
    </div>

    <!-- How to use -->
    <div style="margin-bottom:48px;">
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">How to Use LAK PDF Tools</h2>
      <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:16px;">
        <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:0.75rem;font-weight:800;color:#2563eb;margin-bottom:4px;">STEP 1</div>
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Choose a Tool</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Select from 30+ tools including Merge, Compress, Convert, or Govt Exam Resizer.</p>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:0.75rem;font-weight:800;color:#2563eb;margin-bottom:4px;">STEP 2</div>
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Upload & Arrange</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Drag and drop your files. Reorder pages and preview live in your browser.</p>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:0.75rem;font-weight:800;color:#2563eb;margin-bottom:4px;">STEP 3</div>
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Apply Settings</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Customize compression levels, target KB limits, or conversion options.</p>
        </div>
        <div style="background:#f8fafc;padding:16px;border-radius:12px;border:1px solid #e2e8f0;">
          <div style="font-size:0.75rem;font-weight:800;color:#2563eb;margin-bottom:4px;">STEP 4</div>
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Instant Download</h3>
          <p style="font-size:0.8125rem;color:#64748b;margin:0;line-height:1.5;">Process locally via WebAssembly and download files immediately with zero wait.</p>
        </div>
      </div>
    </div>

    <!-- FAQ Section -->
    <div>
      <h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:16px;border-bottom:2px solid #f1f5f9;padding-bottom:8px;">Frequently Asked Questions</h2>
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Are LAK PDF tools completely free to use?</h3>
          <p style="font-size:0.8125rem;color:#475569;margin:0;line-height:1.5;">Yes. All core PDF and image tools are 100% free with no registration required, no subscription paywalls, and no watermarks.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Is my data safe when using LAK PDF?</h3>
          <p style="font-size:0.8125rem;color:#475569;margin:0;line-height:1.5;">Yes. All core document operations run directly in your browser using client-side WebAssembly. Your confidential documents are never uploaded to our servers.</p>
        </div>
        <div style="border:1px solid #e2e8f0;border-radius:8px;padding:14px;">
          <h3 style="font-size:0.95rem;font-weight:700;color:#0f172a;margin:0 0 4px;">Can I use LAK PDF on mobile phones?</h3>
          <p style="font-size:0.8125rem;color:#475569;margin:0;line-height:1.5;">Yes. LAK PDF is fully responsive and optimized for mobile devices, iPhones, Android smartphones, and tablets.</p>
        </div>
      </div>
    </div>
  </div>
`;

savePrerenderedFile(
  "/",
  buildPageHtml({
    route: "/",
    title: "LAKPDF - Free Online PDF Tools | Merge, Compress, Convert PDF",
    description: "LAKPDF is a free online PDF tools website to merge, compress, convert, edit and manage PDF files securely. No signup required. Works on all devices.",
    keywords: "merge pdf online free, compress pdf, convert pdf to word, pdf to jpg, word to pdf, split pdf, sign pdf online, pdf editor, compress image, jpg to pdf, pdf tools free",
    contentHtml: homepageHtml,
  })
);

console.log("[prerender] Successfully generated static pre-rendered HTML for homepage, legal pages, blogs, and tools!");
