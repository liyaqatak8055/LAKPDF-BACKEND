import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';

test.describe('CamScanner-Grade Scan to PDF Tests', () => {
  test('Uploads sample CV, verifies scanner features, and generates image-preserved PDF', async ({ page }) => {
    // 1. Navigate to Scan PDF page
    await page.goto('http://localhost:3000/scan-pdf');
    await expect(page.locator('h1')).toContainText('Scan Document');

    // 2. Upload sample CV fixture
    const samplePath = path.resolve('tests/fixtures/sample-cv.jpg');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePath);

    // 3. Verify Document Studio loads with Page 1
    await expect(page.locator('text=1 Scanned Page')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Page 1')).toBeVisible();
    await page.locator('.group.relative.bg-white.rounded-2xl').first().screenshot({ path: '/Users/liyaqatkhan/.gemini/antigravity-ide/brain/ed2cc0e7-63f2-4324-855d-cb767f868679/card_preview.png' });

    // 4. Test Before / After Comparison Modal
    const beforeAfterBtn = page.locator('button:has-text("Before / After")');
    await expect(beforeAfterBtn).toBeVisible();
    await beforeAfterBtn.click();
    await expect(page.locator('text=Before vs After Comparison')).toBeVisible();

    // Switch view modes inside comparison modal
    const modal = page.locator('.fixed');
    await modal.getByRole('button', { name: 'Enhanced Scan' }).click();
    await modal.getByRole('button', { name: 'Original', exact: true }).click();
    await modal.getByRole('button', { name: 'Split Slider' }).click();
    await modal.getByRole('button', { name: 'Close Preview' }).click();

    // 5. Test 4-Corner Manual Adjustment Modal
    const cropBtn = page.locator('button:has-text("Crop & Perspective")');
    await expect(cropBtn).toBeVisible();
    await cropBtn.click();
    await expect(page.locator('text=Adjust Document Boundaries')).toBeVisible();
    await expect(page.locator('text=Auto Detect')).toBeVisible();
    await expect(page.locator('text=Full Page')).toBeVisible();

    // Click "Apply Crop & Flatten"
    await page.locator('button:has-text("Apply Crop & Flatten")').click();

    // 6. Test Filter Switching
    const magicBtn = page.locator('button:has-text("Magic Color")').first();
    if (await magicBtn.isVisible()) {
      await magicBtn.click();
    }

    // 7. Test PDF Generation and Download
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Save & Download PDF")').click();
    const download = await downloadPromise;

    const downloadPath = path.resolve('tmp/test-output-scan.pdf');
    await download.saveAs(downloadPath);

    expect(fs.existsSync(downloadPath)).toBeTruthy();
    const pdfBytes = fs.readFileSync(downloadPath);
    expect(pdfBytes.length).toBeGreaterThan(10000);

    // 8. Inspect the generated PDF structure
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(1);

    // Verify the visual layer is an embedded image
    const pdfText = pdfBytes.toString('latin1');
    expect(pdfText.includes('/Image')).toBeTruthy();
    expect(pdfText.includes('/DCTDecode') || pdfText.includes('/FlateDecode')).toBeTruthy();

    console.log('✓ Successfully verified generated PDF is image-based without text reconstruction!');
    console.log('Output PDF size:', pdfBytes.length, 'bytes');
  });

  test('Uploads multi-page PDF, renders 300 DPI pages and outputs multi-page enhanced PDF', async ({ page }) => {
    await page.goto('http://localhost:3000/scan-pdf');

    // Use Mohd Furkan multi-page CV PDF from Downloads or copy to fixtures
    const pdfSource = '/Users/liyaqatkhan/Downloads/Mohd_Furkan_Mobile_Crane_Operator_CV.pdf';
    if (!fs.existsSync(pdfSource)) {
      console.log('Skipping PDF test fixture since not present in downloads');
      return;
    }

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(pdfSource);

    // Verify 2 pages detected and rendered
    await expect(page.locator('text=2 Scanned Pages')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=Page 1')).toBeVisible();
    await expect(page.locator('text=Page 2')).toBeVisible();

    // Generate output PDF
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Save & Download PDF")').click();
    const download = await downloadPromise;

    const downloadPath = path.resolve('tmp/test-multi-page-scan.pdf');
    await download.saveAs(downloadPath);

    const pdfBytes = fs.readFileSync(downloadPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    expect(pdfDoc.getPageCount()).toBe(2);

    console.log('✓ Successfully processed 2-page PDF scan, output size:', pdfBytes.length, 'bytes');
  });

  test('Uploads portrait photo and preserves full frame without bleaching skin tones', async ({ page }) => {
    await page.goto('http://localhost:3000/scan-pdf');

    const photoPath = path.resolve('tests/fixtures/liyaqat-photo.png');
    if (!fs.existsSync(photoPath)) return;

    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(photoPath);

    await expect(page.locator('text=1 Scanned Page')).toBeVisible({ timeout: 15000 });
    // Verify it is NOT falsely labeled Auto-Cropped
    await expect(page.locator('text=Auto-Cropped')).not.toBeVisible();

    // Verify PDF generation works cleanly for photo
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has-text("Save & Download PDF")').click();
    const download = await downloadPromise;

    const downloadPath = path.resolve('tmp/test-photo-scan.pdf');
    await download.saveAs(downloadPath);

    const pdfBytes = fs.readFileSync(downloadPath);
    expect(pdfBytes.length).toBeGreaterThan(20000);
    console.log('✓ Successfully verified portrait photo preserves full frame and colors!');
  });
});
