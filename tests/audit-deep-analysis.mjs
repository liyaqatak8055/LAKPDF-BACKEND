import { chromium } from "playwright";
import fs from "fs";

const BASE_URL = process.env.BASE_URL || "http://localhost:3001";

// List of all known application routes to inspect
const routes = [
  "/",
  "/dashboard",
  "/profile",
  "/tools",
  "/all-tools",
  "/merge",
  "/split",
  "/compress",
  "/compress-pdf",
  "/compress-pdf-to-100kb",
  "/compress-pdf-to-200kb",
  "/compress-pdf-to-500kb",
  "/organize-pdf",
  "/img-to-pdf",
  "/pdf-to-img",
  "/compress-img",
  "/advance-compress-img",
  "/make-ppt",
  "/passport-photo-maker",
  "/redact-pdf",
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
  "/protect-pdf",
  "/unlock-pdf",
  "/summarizer-qa",
  "/ai-pdf-to-mcq",
  "/ai-interview-generator",
  "/pdf-editor",
  "/ai-edit-pdf",
  "/pdf-to-text",
  "/detect-duplicates",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/disclaimer",
  "/learn-pdf",
  "/blog",
  "/blog/lossless-vs-lossy-pdf-compression"
];

async function runDeepAudit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const auditReport = {
    seo: {
      missingTitle: [],
      missingDescription: [],
      missingCanonical: [],
      missingH1: [],
      multipleH1: [],
      routesWithoutSchema: []
    },
    accessibility: {
      imagesWithoutAlt: [],
      buttonsWithoutAriaOrText: [],
      inputsWithoutLabel: []
    },
    brokenLinks: [],
    internalLinksChecked: new Set(),
    warnings: []
  };

  console.log(`Starting Deep Audit on ${routes.length} routes...`);

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const url = `${BASE_URL}${route}`;

    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
      // Wait slightly for react-helmet-async
      await page.waitForTimeout(600);

      // --- SEO CHECKS ---
      const title = await page.title();
      if (!title || title.trim() === "" || title.includes("undefined")) {
        auditReport.seo.missingTitle.push({ route, title });
      }

      const description = await page.$eval('meta[name="description"]', el => el.getAttribute('content')).catch(() => null);
      if (!description || description.trim() === "") {
        auditReport.seo.missingDescription.push({ route });
      }

      const canonical = await page.$eval('link[rel="canonical"]', el => el.getAttribute('href')).catch(() => null);
      if (!canonical) {
        auditReport.seo.missingCanonical.push({ route });
      }

      const h1Count = await page.$$eval('h1', els => els.length);
      if (h1Count === 0) {
        auditReport.seo.missingH1.push({ route });
      } else if (h1Count > 1) {
        auditReport.seo.multipleH1.push({ route, count: h1Count });
      }

      const schemaExists = await page.$eval('script[type="application/ld+json"]', el => !!el.textContent).catch(() => false);
      if (!schemaExists) {
        auditReport.seo.routesWithoutSchema.push(route);
      }

      // --- ACCESSIBILITY CHECKS ---
      const imagesNoAlt = await page.$$eval('img:not([alt]), img[alt=""]', els => {
        return els.map(img => ({
          src: img.getAttribute('src'),
          id: img.id,
          className: img.className
        }));
      });
      if (imagesNoAlt.length > 0) {
        // filter out purely decorative icons if aria-hidden="true"
        const realImagesNoAlt = await page.$$eval('img:not([alt]):not([aria-hidden="true"])', els => els.length);
        if (realImagesNoAlt > 0) {
          auditReport.accessibility.imagesWithoutAlt.push({ route, count: realImagesNoAlt });
        }
      }

      const badButtons = await page.$$eval('button', buttons => {
        let count = 0;
        for (const btn of buttons) {
          const text = (btn.innerText || btn.textContent || "").trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledBy = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");
          if (!text && !ariaLabel && !ariaLabelledBy && !title) {
            count++;
          }
        }
        return count;
      });
      if (badButtons > 0) {
        auditReport.accessibility.buttonsWithoutAriaOrText.push({ route, count: badButtons });
      }

      const unlabelledInputs = await page.$$eval('input:not([type="hidden"]):not([type="file"])', inputs => {
        let count = 0;
        for (const input of inputs) {
          const id = input.id;
          const hasLabel = id ? !!document.querySelector(`label[for="${id}"]`) : false;
          const hasAria = input.getAttribute("aria-label") || input.getAttribute("aria-labelledby");
          const hasParentLabel = !!input.closest("label");
          if (!hasLabel && !hasAria && !hasParentLabel) {
            count++;
          }
        }
        return count;
      });
      if (unlabelledInputs > 0) {
        auditReport.accessibility.inputsWithoutLabel.push({ route, count: unlabelledInputs });
      }

      // Check all on-page internal links
      const hrefs = await page.$$eval('a[href]', anchors => anchors.map(a => a.getAttribute('href')));
      for (const href of hrefs) {
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          continue;
        }
        if (href.startsWith('/') && !auditReport.internalLinksChecked.has(href)) {
          auditReport.internalLinksChecked.add(href);
        }
      }

    } catch (err) {
      auditReport.warnings.push({ route, error: err.message });
    }

    if ((i + 1) % 10 === 0 || i === routes.length - 1) {
      console.log(`[${i + 1}/${routes.length}] Checked ${route}`);
    }
  }

  // Check unique internal links found
  console.log(`\nVerifying all discovered internal links (${auditReport.internalLinksChecked.size} unique links)...`);
  for (const link of auditReport.internalLinksChecked) {
    try {
      const res = await page.goto(`${BASE_URL}${link}`, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (!res || res.status() >= 400) {
        auditReport.brokenLinks.push({ link, status: res ? res.status() : "FAILED" });
      }
    } catch (e) {
      auditReport.brokenLinks.push({ link, error: e.message });
    }
  }

  await browser.close();

  // Convert Set for JSON output
  auditReport.totalInternalLinksChecked = auditReport.internalLinksChecked.size;
  delete auditReport.internalLinksChecked;

  fs.writeFileSync("tests/audit-deep-results.json", JSON.stringify(auditReport, null, 2));
  console.log("\nDeep Audit Finished! Saved to tests/audit-deep-results.json");
}

runDeepAudit().catch(console.error);
