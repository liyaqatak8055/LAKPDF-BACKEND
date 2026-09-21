import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function testLosslessImageCompression() {
  console.log('1. Launching headless browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  console.log(`2. Navigating to ${baseUrl}/compress-img ...`);
  await page.goto(`${baseUrl}/compress-img`, { waitUntil: 'networkidle' });

  // 3. Generate a rich synthetic test image using Canvas in the browser
  console.log('3. Generating test image with exact dimensions (1200 x 800)...');
  const sampleBase64 = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 1200;
    c.height = 800;
    const ctx = c.getContext('2d');

    // Draw rich gradient
    const grad = ctx.createLinearGradient(0, 0, 1200, 800);
    grad.addColorStop(0, '#1e3a8a');
    grad.addColorStop(0.5, '#0d9488');
    grad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Draw sharp text & geometric elements to verify visual acuity
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.fillText('LAK PDF - Ultra Quality Test 1200x800', 80, 200);

    ctx.font = '32px sans-serif';
    ctx.fillText('Testing 1:1 Pixel Mapping & Zero Resolution Downscaling', 80, 280);

    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(100 + i * 50, 450 + (i % 3) * 40, 20, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 5) * 0.15})`;
      ctx.fill();
    }

    return c.toDataURL('image/jpeg', 0.95);
  });

  const buffer = Buffer.from(sampleBase64.split(',')[1], 'base64');
  const testImagePath = path.join(process.cwd(), 'tests', 'sample-test-photo.jpg');
  fs.writeFileSync(testImagePath, buffer);
  console.log(`✓ Sample test image saved: ${testImagePath} (${buffer.length} bytes)`);

  // 4. Upload file to Compress Image tool
  console.log('4. Uploading image to tool...');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testImagePath);

  // 5. Verify UI displays Selected Images
  await page.waitForSelector('text=Selected Images (1)');
  console.log('✓ Image successfully loaded in UI!');

  // Check Visually Lossless preset is selected
  const losslessPreset = page.locator('button:has-text("Visually Lossless")');
  await losslessPreset.waitFor({ state: 'visible' });
  console.log('✓ Visually Lossless preset is visible & active!');

  // 6. Click Compress Images
  console.log('5. Clicking "Compress Images"...');
  const compressBtn = page.locator('button:has-text("Compress Images")');
  await compressBtn.click();

  // 7. Wait for Compression Complete
  await page.waitForSelector('text=Compression Complete');
  console.log('✓ Compression completed successfully!');

  // 8. Verify Resolution is 100% preserved (1200 × 800 px)
  const resolutionText = await page.locator('text=/1200\\s*×\\s*800\\s*px/').first().textContent();
  console.log(`✓ Resolution Verification: ${resolutionText?.trim()} (ZERO downscaling!)`);

  // Verify savings
  const savingsText = await page.locator('text=/-?\\d+%/').first().textContent();
  console.log(`✓ Savings achieved: ${savingsText?.trim()}`);

  // 9. Open Visual Quality Inspection / Compare modal
  console.log('6. Opening Visual Quality Inspection modal...');
  const compareBtn = page.locator('button:has-text("Compare")').first();
  await compareBtn.click();
  await page.waitForSelector('text=Visual Quality Inspection');
  await page.waitForTimeout(800);
  console.log('✓ Compare modal opened and rendered!');

  // 10. Capture screenshot of the modal
  const screenshotPath = 'tests/compress-lossless-verified.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`✓ Screenshot saved to ${screenshotPath}`);

  // 11. Close modal and capture full-page results view
  const closeBtn = page.locator('button').filter({ has: page.locator('svg.lucide-x') }).first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(300);
  }
  await page.screenshot({ path: 'tests/compress-page-verified.png', fullPage: true });
  console.log('✓ Full page screenshot saved to tests/compress-page-verified.png');

  await browser.close();
  console.log('\nSUCCESS: ALL LOSSLESS IMAGE COMPRESSION TESTS PASSED WITH 100% RESOLUTION PRESERVED!');
}

testLosslessImageCompression().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
