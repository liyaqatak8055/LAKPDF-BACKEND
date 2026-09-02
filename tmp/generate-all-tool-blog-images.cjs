const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const base = 'http://127.0.0.1:4173';
const root = process.cwd();
const outRoot = path.join(root, 'public', 'blog-images', 'tools');
const samplePdf = path.join(root, 'tmp', 'sample.pdf');
const sampleImage = path.join(root, 'public', 'favicon-512x512.png');

const toolPaths = [
  '/merge','/split','/compress','/organize-pdf','/img-to-pdf','/pdf-to-img','/compress-img','/advance-compress-img',
  '/convert','/pdf-to-word','/pdf-to-powerpoint','/word-to-pdf','/powerpoint-to-pdf','/rotate','/page-number','/watermark',
  '/crop-pdf','/scan-pdf','/sign-pdf','/ocr-pdf','/compare-pdf','/delete-page','/summarizer-qa',
  '/detect-duplicates','/ai-translator','/ai-pdf-to-mcq','/ai-interview-generator','/ai-numerical-solver','/ai-study-planner','/ai-neet-test','/edit-pdf'
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const route of toolPaths) {
    const key = route.replace(/^\//, '').replace(/[^a-z0-9-]/gi, '-');
    const dir = path.join(outRoot, key);
    fs.mkdirSync(dir, { recursive: true });

    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(dir, 'step-1-visit-homepage.jpg'), type: 'jpeg', quality: 72, fullPage: false });

    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(dir, 'step-2-upload-pdf.jpg'), type: 'jpeg', quality: 72, fullPage: false });

    const fileInput = page.locator('input[type="file"]');
    const hasInput = await fileInput.count();
    if (hasInput > 0) {
      const accept = (await fileInput.first().getAttribute('accept')) || '';
      const choosePdf = /pdf/i.test(accept) || accept.trim() === '';
      const fileToUse = choosePdf ? samplePdf : sampleImage;
      try {
        await fileInput.first().setInputFiles(fileToUse);
        await page.waitForTimeout(900);
      } catch {}
    }
    await page.screenshot({ path: path.join(dir, 'step-3-click-process.jpg'), type: 'jpeg', quality: 72, fullPage: false });

    const actionLabels = [
      'Compress PDF','Merge PDF','Split PDF','Convert PDF','Start Test Now','Generate','Translate','Compare PDF','Sign PDF',
      'Download','Open Tool','Generate MCQ Test','Generate Plan'
    ];
    let clicked = false;
    for (const label of actionLabels) {
      const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
      if (await btn.count()) {
        try {
          await btn.click({ timeout: 1200 });
          clicked = true;
          break;
        } catch {}
      }
    }
    if (!clicked) {
      const genericBtn = page.locator('button').first();
      if (await genericBtn.count()) {
        try { await genericBtn.click({ timeout: 800 }); } catch {}
      }
    }
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(dir, 'step-4-download-file.jpg'), type: 'jpeg', quality: 72, fullPage: false });

    await page.close();
    console.log(`Captured: ${route}`);
  }

  await browser.close();
})();
