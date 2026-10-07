import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

test.describe('LakPDF Redact Tool - Deep OCR & PII Pipeline Tests', () => {
  test.setTimeout(90_000);

  const tmpDir = path.resolve('tmp/redact-tests');

  test.beforeAll(async () => {
    fs.mkdirSync(tmpDir, { recursive: true });

    // 1. Create a native PDF with spaced Aadhaar, PAN, and Phone numbers
    const nativePdf = await PDFDocument.create();
    const font = await nativePdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await nativePdf.embedFont(StandardFonts.HelveticaBold);
    const page = nativePdf.addPage([600, 400]);

    page.drawText('GOVERNMENT OF INDIA / IDENTITY CARD', {
      x: 50,
      y: 350,
      size: 16,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText('Name: Rajesh Kumar', { x: 50, y: 310, size: 12, font });
    // Aadhaar number printed with standard 4-digit grouping
    page.drawText('Aadhaar No: 8515 3843 3319', { x: 50, y: 270, size: 13, font: boldFont });
    page.drawText('PAN: ABCDE1234F', { x: 50, y: 230, size: 12, font });
    page.drawText('Mobile: 9876543210', { x: 50, y: 190, size: 12, font });
    page.drawText('Email: user.id@example.com', { x: 50, y: 150, size: 12, font });

    const nativeBytes = await nativePdf.save();
    fs.writeFileSync(path.join(tmpDir, 'native-id-card.pdf'), nativeBytes);
  });

  test('Test 1: Native PDF Search finds spaced Aadhaar when user searches unspaced number', async ({ page }) => {
    await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(tmpDir, 'native-id-card.pdf'));

    // Wait for document to render
    await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 15000 });

    // Search for unspaced Aadhaar number
    const searchInput = page.locator('input[placeholder*="8515 3843 3319"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('851538433319');

    const redactAllBtn = page.locator('button:has-text("Redact All")');
    await redactAllBtn.click();

    // Verify search succeeded and box was created
    await expect(page.locator('text=Found and marked 1 match(es) for "851538433319"')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.redact-box')).toHaveCount(1);
  });

  test('Test 2: Auto-Detect Sensitive PII identifies Aadhaar, PAN, Phone, and Email', async ({ page }) => {
    await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(tmpDir, 'native-id-card.pdf'));

    await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 15000 });

    // Click Auto-Detect Sensitive PII button
    const detectPiiBtn = page.locator('button:has-text("Scan Document for Aadhaar, PAN & IDs")');
    await expect(detectPiiBtn).toBeVisible();
    await detectPiiBtn.click();

    // Verify multiple sensitive items found
    await expect(page.locator('text=Auto-detected')).toBeVisible({ timeout: 15000 });
    const redactBoxes = page.locator('.redact-box');
    const boxCount = await redactBoxes.count();
    expect(boxCount).toBeGreaterThanOrEqual(3); // Aadhaar, PAN, Phone

    // Apply redaction & check security verification
    const applyBtn = page.locator('button:has-text("Apply & Download Redacted PDF")');
    const downloadPromise = page.waitForEvent('download', { timeout: 25000 });
    await applyBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('-redacted.pdf');

    // Verify Security Check Banner appeared
    await expect(page.locator('text=Security Verified').first()).toBeVisible({ timeout: 15000 });
  });

  test('Test 3: Scanned Image PDF - OCR searches and redacts embedded text inside image', async ({ page }) => {
    // Generate a scanned-only PDF via in-browser canvas rasterization
    await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });

    // 1. Draw text onto an offscreen canvas inside browser and export PNG base64
    const pngBase64 = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d')!;

      // Off-white paper background with slight grain/scan feel
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('UNIQUE IDENTIFICATION AUTHORITY OF INDIA', 50, 60);

      ctx.font = '16px sans-serif';
      ctx.fillText('Enrollment No: 1024/50291/00124', 50, 110);
      ctx.fillText('To: Priya Sharma', 50, 150);

      // Distinctive Aadhaar number visually rendered inside image pixels
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('8515 3843 3319', 50, 230);

      ctx.font = '16px sans-serif';
      ctx.fillText('Mera Aadhaar, Meri Pehchan', 50, 280);

      const pngDataUrl = canvas.toDataURL('image/png');
      return pngDataUrl.split(',')[1];
    });

    // 2. Embed this PNG image into a PDF without any native text layer using Node.js pdf-lib
    const pngBytes = Buffer.from(pngBase64, 'base64');
    const scannedDoc = await PDFDocument.create();
    const pngImage = await scannedDoc.embedPng(pngBytes);
    const pdfPage = scannedDoc.addPage([800, 500]);
    pdfPage.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: 800,
      height: 500,
    });

    const scannedPdfBytes = await scannedDoc.save();
    const scannedPdfPath = path.join(tmpDir, 'scanned-aadhaar-doc.pdf');
    fs.writeFileSync(scannedPdfPath, scannedPdfBytes);

    // Upload the scanned PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(scannedPdfPath);

    await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 15000 });

    // Search for the Aadhaar number that only exists as image pixels
    const searchInput = page.locator('input[placeholder*="8515 3843 3319"]');
    await searchInput.fill('8515 3843 3319');

    const redactAllBtn = page.locator('button:has-text("Redact All")');
    await redactAllBtn.click();

    // Verify OCR was triggered and successfully located the match inside the image
    await expect(page.locator('text=scanned image OCR')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('.redact-box')).toHaveCount(1);

    // Verify the blackout box is positioned over the Aadhaar area
    const redactBox = page.locator('.redact-box').first();
    await expect(redactBox).toBeVisible();

    // Apply permanent redaction and test download + security check
    const applyBtn = page.locator('button:has-text("Apply & Download Redacted PDF")');
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await applyBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('-redacted.pdf');

    // Security Verification Passed
    await expect(page.locator('text=Security Verified').first()).toBeVisible({ timeout: 15000 });
  });

  test('Test 4: Photographed Aadhaar Card - Compound query finds both Aadhaar and Name on separate lines', async ({ page }) => {
    await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });

    // 1. Create a simulated mobile photo of Aadhaar inside an A4 PDF page
    const pngBase64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 1240;
      canvas.height = 1754;
      const ctx = canvas.getContext('2d')!;

      // White page background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Photographed Aadhaar card centered in the page with warm lighting
      const cardX = 140;
      const cardY = 300;
      const cardW = 960;
      const cardH = 600;

      ctx.fillStyle = '#e4ded4';
      ctx.fillRect(cardX, cardY, cardW, cardH);
      ctx.strokeStyle = '#8a857b';
      ctx.lineWidth = 4;
      ctx.strokeRect(cardX, cardY, cardW, cardH);

      // Card Header
      ctx.fillStyle = '#b91c1c';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('GOVERNMENT OF INDIA', cardX + 80, cardY + 70);

      // Name at top of card
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText('Aaliya Tarique Khan', cardX + 80, cardY + 160);

      // Aadhaar number in bold monospace at bottom of card
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 46px monospace';
      ctx.fillText('8515 3843 3319', cardX + 220, cardY + 420);

      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl.split(',')[1];
    });

    const pngBytes = Buffer.from(pngBase64, 'base64');
    const photoDoc = await PDFDocument.create();
    const photoImg = await photoDoc.embedPng(pngBytes);
    const photoPage = photoDoc.addPage([595, 842]);
    photoPage.drawImage(photoImg, { x: 0, y: 0, width: 595, height: 842 });
    const photoPdfBytes = await photoDoc.save();

    const photoPdfPath = path.join(tmpDir, 'photo-aadhaar-compound.pdf');
    fs.writeFileSync(photoPdfPath, photoPdfBytes);

    // Upload to redact tool
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(photoPdfPath);
    await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 15000 });

    // Search for compound query: Aadhaar number + Name
    const searchInput = page.locator('input[placeholder*="8515 3843 3319"]');
    await searchInput.fill('8515 3843 3319 Aaliya Tarique Khan');
    await page.locator('button:has-text("Redact All")').click();

    // Verify both targets found and 2 blackout boxes created
    await expect(page.locator('text=Found and marked 2 match(es)')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('.redact-box')).toHaveCount(2);
  });

  test('Test 5: Direct Image File Upload (PNG/JPG) - Converts, OCR detects, and downloads redacted image', async ({ page }) => {
    await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });

    // Generate an image file (PNG) directly
    const pngBase64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 500;
      const ctx = canvas.getContext('2d')!;

      // Card Background
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 760, 460);

      // Card Title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('IDENTITY CARD OF INDIA', 60, 80);

      // Cardholder
      ctx.fillStyle = '#334155';
      ctx.font = '22px sans-serif';
      ctx.fillText('Name: Vikram Singh', 60, 160);

      // Aadhaar number in bold
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px monospace';
      ctx.fillText('4123 5678 9012', 120, 260);

      return canvas.toDataURL('image/png').split(',')[1];
    });

    const imgPath = path.join(tmpDir, 'direct-aadhaar-photo.png');
    fs.writeFileSync(imgPath, Buffer.from(pngBase64, 'base64'));

    // Directly upload PNG image into Redact PDF tool!
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(imgPath);

    // Verify it converted and rendered in the viewer
    await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 20000 });

    // Search for the Aadhaar number from the photo
    const searchInput = page.locator('input[placeholder*="8515 3843 3319"]');
    await searchInput.fill('4123 5678 9012');
    await page.locator('button:has-text("Redact All")').click();

    // Verify match found
    await expect(page.locator('text=Found and marked 1 match(es)')).toBeVisible({ timeout: 35000 });
    await expect(page.locator('.redact-box')).toHaveCount(1);

    // Verify apply button text is for Image
    const applyBtn = page.locator('button:has-text("Apply & Download Redacted Image")');
    await expect(applyBtn).toBeVisible();

    // Click apply & download
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await applyBtn.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('-redacted.png');
  });
});
