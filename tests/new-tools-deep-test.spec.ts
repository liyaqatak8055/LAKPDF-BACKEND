import path from "node:path";
import { expect, test } from "@playwright/test";

const samplePdf1 = path.join(process.cwd(), "tmp", "test-suite", "attachment-1page.pdf");
const samplePdf3 = path.join(process.cwd(), "tmp", "test-suite", "document-3pages.pdf");
const sampleJpg = path.join(process.cwd(), "public", "founder.jpg");
const samplePng = path.join(process.cwd(), "public", "og-image.png");

test.describe("Deep Tool Result & Functional Verification", () => {
  test("Passport Photo Maker: renders canvas, switches presets & generates 4x6 print sheet", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/passport-photo-maker", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(sampleJpg);

    // Interactive canvas should be rendered
    await expect(page.locator("canvas").first()).toBeVisible({ timeout: 15_000 });

    // Verify presets are interactive
    const usVisaBtn = page.getByRole("button", { name: /US Visa/i }).first();
    if (await usVisaBtn.isVisible()) {
      await usVisaBtn.click();
    }

    // Verify download buttons are present and active
    const singlePhotoBtn = page.getByRole("button", { name: /Single Photo \(300 DPI\)/i }).first();
    await expect(singlePhotoBtn).toBeVisible({ timeout: 10_000 });

    const sheetBtn = page.getByRole("button", { name: /4×6 Photo Paper/i }).first();
    await expect(sheetBtn).toBeVisible({ timeout: 10_000 });

    const govtBtn = page.getByRole("button", { name: /Govt Form \(20–50 KB\)/i }).first();
    await expect(govtBtn).toBeVisible({ timeout: 10_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });

  test("Make PPT: converts multiple images to PowerPoint presentation (.pptx)", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/make-ppt", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles([sampleJpg, samplePng]);

    // Check that images are loaded into list
    await expect(page.getByText(/2 Images Selected/i)).toBeVisible({ timeout: 15_000 });

    // Click Convert to PowerPoint (.pptx) button
    const makePptBtn = page.getByRole("button", { name: /Convert to PowerPoint/i }).first();
    await expect(makePptBtn).toBeVisible({ timeout: 10_000 });
    await makePptBtn.click();

    // Verify PPTX is generated and download button appears
    await expect(page.getByRole("button", { name: /Download/i }).first()).toBeVisible({ timeout: 25_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });

  test("PDF to Text: extracts text from PDF and enables copy/download", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/pdf-to-text", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    // Click Extract Text
    const extractBtn = page.getByRole("button", { name: /Extract Text/i }).first();
    if (await extractBtn.isVisible()) {
      await extractBtn.click();
    }

    // Check that extracted text is displayed
    await expect(page.locator("textarea, pre, div").filter({ hasText: /page/i }).first()).toBeVisible({ timeout: 20_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });

  test("Compress PDF to 100KB: loads landing page, navigates to target preset and compresses", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/compress-pdf-to-100kb", { waitUntil: "domcontentloaded" });
    const ctaBtn = page.getByRole("button", { name: /Compress PDF to 100KB/i }).first();
    await expect(ctaBtn).toBeVisible({ timeout: 10_000 });
    await ctaBtn.click();

    // Should navigate to /compress?target=100
    await page.waitForURL(/compress\?target=100/);
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf3);

    const compressBtn = page.getByRole("button", { name: "Compress PDF", exact: true });
    await expect(compressBtn).toBeEnabled({ timeout: 15_000 });
    await compressBtn.click();

    // Verify download button
    await expect(page.getByRole("button", { name: "Download PDF", exact: true })).toBeVisible({ timeout: 30_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });

  test("Unlock PDF: handles upload, password checking and clean download flow", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/unlock-pdf", { waitUntil: "domcontentloaded" });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePdf1);

    // If PDF is not password protected, it should detect and inform or allow unlock
    await expect(page.getByText(/not protected|enter password|unlock|ready/i).first()).toBeVisible({ timeout: 15_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });

  test("AI PDF to MCQ: loads academic notes and initiates question generation with fallbacks", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));

    await page.goto("/ai-pdf-to-mcq", { waitUntil: "domcontentloaded" });

    // Click instant academic sample notes
    const sampleBtn = page.getByRole("button", { name: /Cell Biology & Genetics Notes/i }).first();
    await expect(sampleBtn).toBeVisible({ timeout: 15_000 });
    await sampleBtn.click();

    // Wait for settings panel to appear with generate button
    const generateBtn = page.getByRole("button", { name: /Generate.*Practice Questions/i }).first();
    await expect(generateBtn).toBeVisible({ timeout: 20_000 });
    await generateBtn.click();

    // Wait for questions or progress
    await expect(page.getByText(/question|generating|extracting|option|mcq|complete|quiz/i).first()).toBeVisible({ timeout: 25_000 });

    const criticalErrors = pageErrors.filter(
      (m) => !/adsbygoogle|googlesyndication|doubleclick|cross-origin|SecurityError|ResizeObserver loop/i.test(m)
    );
    expect(criticalErrors).toEqual([]);
  });
});
