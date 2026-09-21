import { test, expect } from '@playwright/test';
import path from 'path';

test('Verify PDF compression tiers produce distinct results', async ({ page }) => {
  await page.goto('http://localhost:3000/compress');

  const samplePath = path.resolve('tmp/test-196k.pdf');

  // Helper to test compression with a given tier
  async function testTier(tierName: string) {
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles(samplePath);

    // Wait for the options to show
    const optionBtn = page.locator(`h5:has-text("${tierName}")`).first();
    await expect(optionBtn).toBeVisible();
    await optionBtn.click();

    // Click "Compress PDF"
    await page.locator('button:has-text("Compress PDF")').click();

    // Wait for completion modal
    await expect(page.locator('.rounded-xl.bg-white:has-text("Result")')).toBeVisible({ timeout: 25000 });

    // Extract result size text
    const resultText = await page.locator('.rounded-xl.bg-white:has-text("Result") p.font-bold').innerText();
    console.log(`[Tier: ${tierName}] Result size: ${resultText}`);

    // Click "Compress Another File" to reset
    await page.locator('button:has-text("Compress Another File")').click();
    await page.waitForTimeout(500);

    return resultText;
  }

  const losslessResult = await testTier('Lossless Optimisation');
  const recommendedResult = await testTier('Recommended (Crystal Clear)');
  const extremeResult = await testTier('Extreme Compression');

  console.log('--- SUMMARY OF TIERS ---');
  console.log('Lossless:    ', losslessResult);
  console.log('Recommended: ', recommendedResult);
  console.log('Extreme:     ', extremeResult);

  // Assert that results are distinct
  expect(losslessResult).not.toEqual(recommendedResult);
  expect(recommendedResult).not.toEqual(extremeResult);
  expect(losslessResult).not.toEqual(extremeResult);
});
