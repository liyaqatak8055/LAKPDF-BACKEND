import { test, expect } from '@playwright/test';
import path from 'path';

test('Redact PDF tool - Multi-page, drag-to-move, cut/delete, and export', async ({ page }) => {
  test.setTimeout(45000);
  
  // 1. Navigate to /redact-pdf
  await page.goto('/redact-pdf', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await expect(page.locator('h1')).toContainText(/Redact/i);

  // 2. Upload multipage PDF
  const multiPdfPath = path.resolve('tmp/multipage.pdf');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(multiPdfPath);

  // 3. Verify ALL pages are visible simultaneously
  await expect(page.locator('#pdf-page-1')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#pdf-page-2')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('text=2 Pages')).toBeVisible();

  // 4. Draw a redaction box on Page 1
  const page1Overlay = page.locator('#pdf-page-1 .pdf-page-overlay');
  const box1 = await page1Overlay.boundingBox();
  expect(box1).not.toBeNull();
  if (box1) {
    const startX = box1.x + 50;
    const startY = box1.y + 60;
    const endX = box1.x + 250;
    const endY = box1.y + 120;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
  }

  await page.waitForTimeout(500);
  const redactBox = page.locator('.redact-box').first();
  await expect(redactBox).toBeVisible();
  await expect(page.locator('text=1 Boxes Total')).toBeVisible();

  // Capture screenshot of multi-page view with active selected box & handles
  await page.screenshot({ path: '/Users/liyaqatkhan/.gemini/antigravity-ide/brain/adfbe187-6fb8-4b9a-923a-2cf5305738a4/multipage_redact_workspace.png', fullPage: false });

  // 5. Test moving / dragging the box up and down
  const initialBoxRect = await redactBox.boundingBox();
  expect(initialBoxRect).not.toBeNull();
  if (initialBoxRect) {
    // Click and drag center of box downwards by 40px
    const fromX = initialBoxRect.x + initialBoxRect.width / 2;
    const fromY = initialBoxRect.y + initialBoxRect.height / 2;
    const toY = fromY + 40;

    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.mouse.move(fromX, toY, { steps: 5 });
    await page.mouse.up();

    await page.waitForTimeout(300);
    const movedBoxRect = await redactBox.boundingBox();
    expect(movedBoxRect).not.toBeNull();
    if (movedBoxRect) {
      expect(movedBoxRect.y).toBeGreaterThan(initialBoxRect.y + 20);
    }
  }

  // 6. Test Cut / Delete button
  const deleteBtn = page.locator('.redact-delete-btn').first();
  await expect(deleteBtn).toBeVisible();
  await deleteBtn.click();
  await page.waitForTimeout(400);

  // Box should now be completely deleted
  await expect(page.locator('.redact-box')).toHaveCount(0);
  await expect(page.locator('text=0 Boxes Total')).toBeVisible();

  // 7. Draw a new box on Page 1 & Page 2, and apply redaction
  if (box1) {
    await page.mouse.move(box1.x + 50, box1.y + 60);
    await page.mouse.down();
    await page.mouse.move(box1.x + 200, box1.y + 110, { steps: 5 });
    await page.mouse.up();
  }

  await page.waitForTimeout(500);
  await expect(page.locator('text=1 Boxes Total')).toBeVisible();

  // 8. Apply Permanent Redaction and verify download
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  const applyBtn = page.locator('button:has-text("Apply & Download Redacted PDF")');
  await expect(applyBtn).toBeEnabled();
  await applyBtn.click();

  const download = await downloadPromise;
  const suggestedFilename = download.suggestedFilename();
  expect(suggestedFilename).toContain('-redacted.pdf');
});
