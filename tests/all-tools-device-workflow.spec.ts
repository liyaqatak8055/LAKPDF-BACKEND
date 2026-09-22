import path from "node:path";
import { expect, test } from "@playwright/test";

const samplePdf1 = path.join(process.cwd(), "tmp", "test-suite", "attachment-1page.pdf");
const samplePdf3 = path.join(process.cwd(), "tmp", "test-suite", "document-3pages.pdf");
const sampleJpg = path.join(process.cwd(), "public", "founder.jpg");
const samplePng = path.join(process.cwd(), "public", "og-image.png");
const sampleDocx = path.join(process.cwd(), "tmp", "test-suite", "sample.docx");
const samplePptx = path.join(process.cwd(), "tmp", "test-suite", "sample.pptx");

// Helper to catch and filter runtime errors
function setupErrorListener(page: any, pageErrors: string[]) {
  page.on("pageerror", (err: any) => {
    const msg = err?.message || String(err);
    if (!/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(msg)) {
      pageErrors.push(msg);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Core PDF Tools Workflows
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Core PDF Tools Workflows", () => {
  test("Merge PDF: uploads multiple PDFs, merges and prepares download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/merge", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([samplePdf1, samplePdf3]);

    await expect(page.getByText("File preview · 2 selected")).toBeVisible({ timeout: 15_000 });

    const mergeBtn = page.getByRole("button", { name: "Merge PDF", exact: true });
    await expect(mergeBtn).toBeEnabled({ timeout: 10_000 });
    await mergeBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Split PDF: uploads PDF, splits all pages and creates ZIP/download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/split", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    // Wait for thumbnail load
    await expect(page.getByText(/document-3pages\.pdf/i)).toBeVisible({ timeout: 15_000 });

    const splitBtn = page.getByRole("button", { name: /split to zip/i });
    await expect(splitBtn).toBeEnabled({ timeout: 15_000 });
    await splitBtn.click();

    await expect(page.getByRole("button", { name: /download zip/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Compress PDF: uploads PDF, runs level compression and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/compress", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    await expect(page.getByText(/document-3pages\.pdf/i)).toBeVisible({ timeout: 15_000 });

    const compressBtn = page.getByRole("button", { name: "Compress PDF", exact: true });
    await expect(compressBtn).toBeEnabled({ timeout: 10_000 });
    await compressBtn.click();

    await expect(page.getByRole("button", { name: "Download PDF", exact: true })).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Rotate PDF: uploads PDF, rotates pages, saves and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/rotate", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    await expect(page.getByRole("button", { name: /rotate right/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: /rotate right/i }).click();

    const applyBtn = page.getByRole("button", { name: /apply & download/i });
    await expect(applyBtn).toBeEnabled({ timeout: 10_000 });
    await applyBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Add Page Numbers: uploads PDF, processes numbers and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/page-number", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const addBtn = page.getByRole("button", { name: /add page numbers/i });
    await expect(addBtn).toBeVisible({ timeout: 15_000 });
    await addBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Watermark PDF: uploads PDF, inputs watermark text and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/watermark", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const textInput = page.locator('input[placeholder*="CONFIDENTIAL" i], input[type="text"]').first();
    await expect(textInput).toBeVisible({ timeout: 15_000 });
    await textInput.fill("LAK CONFIDENTIAL");

    const watermarkBtn = page.getByRole("button", { name: /add watermark/i });
    await expect(watermarkBtn).toBeEnabled({ timeout: 10_000 });
    await watermarkBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Crop PDF: uploads PDF, renders crop canvas and crops successfully", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/crop-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });

    const cropBtn = page.getByRole("button", { name: /crop & save pdf/i });
    await expect(cropBtn).toBeEnabled({ timeout: 10_000 });
    await cropBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Delete Page: uploads PDF, selects page 1 to delete and produces download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/delete-page", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    const inputPages = page.locator('input[placeholder*="page numbers" i]');
    await expect(inputPages).toBeVisible({ timeout: 15_000 });
    await inputPages.fill("1");

    const deleteBtn = page.getByRole("button", { name: /delete 1 page/i });
    await expect(deleteBtn).toBeEnabled({ timeout: 10_000 });
    await deleteBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Protect PDF: uploads PDF, sets password and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/protect-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const passInputs = page.locator('input[type="password"]');
    await expect(passInputs.first()).toBeVisible({ timeout: 15_000 });
    await passInputs.first().fill("SecurePass123!");
    await passInputs.nth(1).fill("SecurePass123!");

    const protectBtn = page.getByRole("button", { name: "Protect PDF", exact: true });
    await expect(protectBtn).toBeEnabled({ timeout: 10_000 });
    await protectBtn.click();

    await expect(page.getByRole("button", { name: /download protected pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Organize PDF: uploads PDF, reverses page order, saves and downloads", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/organize-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    // Wait for pages to load
    await expect(page.getByRole("button", { name: /reverse/i })).toBeVisible({ timeout: 20_000 });
    await page.getByRole("button", { name: /reverse/i }).click();

    const saveBtn = page.getByRole("button", { name: /save pdf/i });
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
    await saveBtn.click();

    await expect(page.getByRole("button", { name: /download pdf/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Detect Duplicate Pages: uploads multi-page PDF and runs analysis", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/detect-duplicates", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    // Auto-analysis runs
    await expect(page.getByText(/analysis complete|duplicate|unique pages/i).first()).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("PDF Editor: uploads PDF, renders canvas, saves changes and triggers download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/pdf-editor", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=Choose PDF File").first()).toBeVisible({ timeout: 15_000 });

    const samplePdf = path.join(process.cwd(), "tmp", "sample.pdf");
    await page.setInputFiles('input[type="file"][accept="application/pdf"]', samplePdf);

    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 25_000 });
    const saveBtn = page.getByRole("button", { name: "Export PDF" });
    await expect(saveBtn).toBeVisible({ timeout: 25_000 });
    await saveBtn.click();

    expect(pageErrors).toEqual([]);
  });

  test("OCR PDF: uploads PDF, starts OCR scanning and renders engine status", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/ocr-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const scanBtn = page.getByRole("button", { name: /start ocr scanning/i });
    await expect(scanBtn).toBeVisible({ timeout: 15_000 });
    await scanBtn.click();

    await expect(page.getByText(/initializing|recognizing|ocr/i).first()).toBeVisible({ timeout: 30_000 });
    expect(pageErrors).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Image & Conversion Tools Workflows
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Image & Conversion Tools Workflows", () => {
  test("Image to PDF: uploads JPG/PNG, converts to PDF and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/img-to-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([sampleJpg, samplePng]);

    await expect(page.getByText(/founder\.jpg/i)).toBeVisible({ timeout: 15_000 });

    const convertBtn = page.getByRole("button", { name: /convert to pdf/i });
    await expect(convertBtn).toBeVisible({ timeout: 10_000 });
    await convertBtn.click();

    await expect(page.getByRole("button", { name: /download (pdf|all)/i })).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("PDF to JPG: uploads PDF, converts pages to images and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/pdf-to-img", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const convertBtn = page.getByRole("button", { name: /convert to jpg/i });
    await expect(convertBtn).toBeVisible({ timeout: 15_000 });
    await convertBtn.click();

    await expect(page.getByRole("button", { name: /download (jpg|zip)/i })).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Compress Image: uploads JPG, compresses and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/compress-img", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(sampleJpg);

    const compressBtn = page.getByRole("button", { name: /compress image/i });
    await expect(compressBtn).toBeVisible({ timeout: 15_000 });
    await compressBtn.click();

    await expect(page.getByRole("button", { name: /download/i })).toBeVisible({ timeout: 15_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Advance Compress Image: uploads JPG, sets target 50KB and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/advance-compress-img", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: "attached", timeout: 15_000 });
    await fileInput.setInputFiles(sampleJpg);

    const compressBtn = page.getByRole("button", { name: /compress now/i });
    await expect(compressBtn).toBeVisible({ timeout: 15_000 });
    await compressBtn.click();

    await expect(page.getByRole("button", { name: /download/i }).first()).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Convert PDF: uploads PDF, converts to images and enables download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/convert", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const convertBtn = page.getByRole("button", { name: /pdf to jpg/i });
    await expect(convertBtn).toBeVisible({ timeout: 15_000 });
    await convertBtn.click();

    await expect(page.getByRole("button", { name: /download/i })).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Word to PDF: uploads DOCX, converts and triggers download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/word-to-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(sampleDocx);

    const convertBtn = page.getByRole("button", { name: /convert to pdf/i });
    await expect(convertBtn).toBeVisible({ timeout: 15_000 });
    await convertBtn.click();

    await expect(page.getByText(/pdf ready|download/i).first()).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("PowerPoint to PDF: uploads PPTX, converts and triggers download", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/powerpoint-to-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePptx);

    const convertBtn = page.getByRole("button", { name: /convert to pdf/i });
    await expect(convertBtn).toBeVisible({ timeout: 15_000 });
    await convertBtn.click();

    await expect(page.getByText(/pdf ready|download/i).first()).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("PDF to PowerPoint: uploads PDF, converts and downloads PPTX", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/pdf-to-powerpoint", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    const convertBtn = page.getByRole("button", { name: /convert to pptx/i });
    await expect(convertBtn).toBeVisible({ timeout: 15_000 });
    await convertBtn.click();

    await expect(page.getByText(/powerpoint ready|download/i).first()).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("PDF to Word: uploads PDF, converts and downloads Word DOCX", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/pdf-to-word", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    // Check if auto-converted or convert button appears
    const convertBtn = page.getByRole("button", { name: /convert to word/i });
    if (await convertBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await convertBtn.click();
    }

    await expect(page.getByText(/word document ready|conversion complete|download/i).first()).toBeVisible({ timeout: 25_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Scan to PDF: uploads photos and generates scanned PDF", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/scan-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([sampleJpg]);

    const saveBtn = page.getByRole("button", { name: /save as pdf|download/i });
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();

    await expect(page.getByText(/scanned pdf generated|download/i).first()).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });

  test("Sign PDF: uploads PDF, types signature, saves and downloads", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/sign-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    // Choose Type signature mode
    const typeTab = page.getByRole("button", { name: "Type", exact: true });
    if (await typeTab.isVisible()) {
      await typeTab.click();
      const input = page.locator('input[placeholder*="type your name" i]');
      await input.fill("John Doe");
      await page.getByRole("button", { name: /generate typed signature/i }).click();
    } else {
      await page.getByRole("button", { name: /use this/i }).click();
    }

    // Click on canvas to place signature
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible({ timeout: 15_000 });
    await canvas.click({ position: { x: 100, y: 100 } });

    const saveBtn = page.getByRole("button", { name: /save & download/i });
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 });
    await saveBtn.click();

    expect(pageErrors).toEqual([]);
  });

  test("Compare PDF: uploads 2 PDFs and displays comparison canvas", async ({ page }) => {
    const pageErrors: string[] = [];
    setupErrorListener(page, pageErrors);

    await page.goto("/compare-pdf", { waitUntil: "domcontentloaded" });
    // Upload File 1
    await page.locator('input[type="file"]').first().setInputFiles(samplePdf1);
    await page.waitForTimeout(500);
    // Upload File 2 (now the first input in the DOM because File 1 replaced its input with preview)
    await page.locator('input[type="file"]').first().setInputFiles(samplePdf3);

    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 20_000 });
    expect(pageErrors).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Multi-Device Viewport & Layout Responsiveness Checks
// ─────────────────────────────────────────────────────────────────────────────

test.describe("Multi-Device Responsive Layout Audits", () => {
  const devicesToTest = [
    { name: "Mobile (iPhone 13)", width: 390, height: 844 },
    { name: "Mobile Compact (iPhone SE)", width: 375, height: 667 },
    { name: "Tablet Portrait (iPad)", width: 768, height: 1024 },
    { name: "Laptop (1366x768)", width: 1366, height: 768 },
    { name: "PC / Desktop (1920x1080)", width: 1920, height: 1080 },
  ];

  const pagesToCheck = [
    "/",
    "/tools",
    "/merge",
    "/split",
    "/compress",
    "/img-to-pdf",
    "/pdf-to-img",
    "/compress-img",
    "/pdf-to-word",
    "/word-to-pdf",
    "/rotate",
    "/page-number",
    "/watermark",
    "/crop-pdf",
    "/scan-pdf",
    "/sign-pdf",
    "/pdf-editor",
    "/detect-duplicates",
    "/protect-pdf"
  ];

  for (const device of devicesToTest) {
    test(`No horizontal scroll overflow on ${device.name}`, async ({ page }) => {
      await page.setViewportSize({ width: device.width, height: device.height });

      for (const route of pagesToCheck) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(200);

        // Verify root is visible and no uncaught crash
        await expect(page.locator("#root")).toBeVisible();

        // Check horizontal overflow
        const hasHorizontalScroll = await page.evaluate(() => {
          const doc = document.documentElement;
          return doc.scrollWidth > window.innerWidth + 4;
        });

        expect(
          hasHorizontalScroll,
          `Horizontal overflow detected on ${route} at ${device.name} (${device.width}px)`
        ).toBeFalsy();
      }
    });
  }
});
