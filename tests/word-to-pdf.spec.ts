import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test("Word to PDF conversion - strict 1:1 page mapping, no overflow blank pages", async ({ page }) => {
  test.setTimeout(60000);

  // 1. Navigate to /word-to-pdf
  await page.goto("/word-to-pdf", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Verify header
  await expect(page.locator("h1")).toContainText(/Word to PDF/i);

  // 2. Upload user-exact-doc.docx (2 pages)
  const sampleDocx = path.resolve("tmp/user-exact-doc.docx");
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(sampleDocx);

  // 3. Verify file card appears with convert button
  await expect(page.locator("text=user-exact-doc.docx")).toBeVisible({ timeout: 5000 });
  const convertBtn = page.locator('button:has-text("Convert to PDF")');
  await expect(convertBtn).toBeVisible();

  // 4. Click Convert to PDF and wait for download
  const downloadPromise = page.waitForEvent("download", { timeout: 30000 });
  await convertBtn.click();

  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  expect(filename).toContain(".pdf");

  // Save downloaded PDF
  const downloadPath = path.resolve("tmp/output-user-exact.pdf");
  await download.saveAs(downloadPath);
  expect(fs.existsSync(downloadPath)).toBe(true);

  // Verify EXACT page count with pdfjs-dist: 2-page DOCX MUST BE 2-page PDF
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const data = new Uint8Array(fs.readFileSync(downloadPath));
  const doc = await pdfjsLib.getDocument({ data }).promise;

  console.log("Converted PDF page count for 2-page document:", doc.numPages);
  expect(doc.numPages).toBe(2);

  // Verify success status in UI
  await expect(page.locator("text=PDF ready & downloaded automatically!")).toBeVisible({ timeout: 10000 });

  // Take screenshot of success state
  await page.screenshot({
    path: "/Users/liyaqatkhan/.gemini/antigravity-ide/brain/adfbe187-6fb8-4b9a-923a-2cf5305738a4/word_to_pdf_success.png",
    fullPage: false,
  });
});
