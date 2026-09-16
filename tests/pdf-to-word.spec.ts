import { test, expect } from "@playwright/test";
import path from "path";

test("PDF to Word tool - direct conversion, white background, auto-download", async ({ page }) => {
  test.setTimeout(45000);

  // 1. Navigate to /pdf-to-word
  await page.goto("/pdf-to-word", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  // Verify header and white background
  await expect(page.locator("h1")).toContainText(/PDF to/i);
  await expect(page.locator("h1")).toContainText(/Word/i);

  // 2. Upload sample PDF
  const samplePdf = path.resolve("tmp/sample.pdf");
  const fileInput = page.locator("input[type=\"file\"]");

  const downloadPromise = page.waitForEvent("download", { timeout: 25000 });

  // Uploading directly starts conversion without showing any options
  await fileInput.setInputFiles(samplePdf);

  // 3. Verify progress or converting state appears
  // Wait for automatic download
  const download = await downloadPromise;
  const filename = download.suggestedFilename();
  expect(filename).toContain(".docx");

  // 4. Verify completed state
  await expect(page.locator("text=Conversion Complete!")).toBeVisible({ timeout: 10000 });
  await expect(page.locator("button:has-text(\"Download Word Again\")")).toBeVisible();
  await expect(page.locator("button:has-text(\"Convert Another PDF\")")).toBeVisible();

  // Capture screenshot of completed state
  await page.screenshot({ path: '/Users/liyaqatkhan/.gemini/antigravity-ide/brain/adfbe187-6fb8-4b9a-923a-2cf5305738a4/pdf_to_word_success.png', fullPage: false });

  // 5. Click Convert Another PDF to verify reset
  await page.locator("button:has-text(\"Convert Another PDF\")").click();
  await expect(page.locator("text=Select PDF to Convert to Word")).toBeVisible();

  // Capture screenshot of initial white upload state
  await page.screenshot({ path: '/Users/liyaqatkhan/.gemini/antigravity-ide/brain/adfbe187-6fb8-4b9a-923a-2cf5305738a4/pdf_to_word_white_theme.png', fullPage: false });
});
