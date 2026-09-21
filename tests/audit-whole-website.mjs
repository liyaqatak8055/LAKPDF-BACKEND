import { chromium } from 'playwright';

const ROUTES_TO_AUDIT = [
  '/',
  '/dashboard',
  '/profile',
  '/tools',
  '/all-tools',
  '/merge',
  '/split',
  '/compress',
  '/compress-pdf',
  '/compress-pdf-to-100kb',
  '/compress-pdf-to-200kb',
  '/compress-pdf-to-500kb',
  '/organize-pdf',
  '/img-to-pdf',
  '/pdf-to-img',
  '/compress-img',
  '/advance-compress-img',
  '/make-ppt',
  '/passport-photo-maker',
  '/redact-pdf',
  '/convert',
  '/pdf-to-word',
  '/pdf-to-powerpoint',
  '/word-to-pdf',
  '/powerpoint-to-pdf',
  '/rotate',
  '/page-number',
  '/watermark',
  '/crop-pdf',
  '/scan-pdf',
  '/sign-pdf',
  '/ocr-pdf',
  '/compare-pdf',
  '/delete-page',
  '/protect-pdf',
  '/unlock-pdf',
  '/summarizer-qa',
  '/ai-pdf-to-mcq',
  '/ai-interview-generator',
  '/pdf-editor',
  '/ai-edit-pdf',
  '/pdf-to-text',
  '/detect-duplicates',
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-service',
  '/disclaimer',
  '/learn-pdf',
  '/blog',
  '/blog/how-to-compress-pdf-without-losing-quality'
];

async function runAudit() {
  console.log(`Starting comprehensive audit across ${ROUTES_TO_AUDIT.length} pages...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errorsFound = [];

  page.on('pageerror', (err) => {
    errorsFound.push({ type: 'UNCAUGHT_PAGE_ERROR', url: page.url(), message: err.message });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out non-fatal or expected external analytics/telemetry errors if any
      if (!text.includes('Failed to load resource') || text.includes('localhost')) {
        errorsFound.push({ type: 'CONSOLE_ERROR', url: page.url(), message: text });
      }
    }
  });

  let auditedCount = 0;
  for (const route of ROUTES_TO_AUDIT) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const fullUrl = `${baseUrl}${route}`;
    try {
      const res = await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      if (!res || res.status() >= 400) {
        errorsFound.push({ type: 'HTTP_STATUS_ERROR', url: fullUrl, status: res ? res.status() : 'no response' });
      }

      await page.waitForTimeout(400);

      // Check for ErrorBoundary crash in DOM
      const hasCrashBoundary = await page.locator('text=Something went wrong').isVisible().catch(() => false);
      if (hasCrashBoundary) {
        const errorText = await page.locator('text=Something went wrong').textContent().catch(() => '');
        errorsFound.push({ type: 'REACT_ERROR_BOUNDARY', url: fullUrl, message: errorText });
      }

      // Check root has content
      const rootHtml = await page.evaluate(() => document.getElementById('root')?.innerHTML || '');
      if (!rootHtml.trim()) {
        errorsFound.push({ type: 'BLANK_PAGE', url: fullUrl, message: 'Root element is empty' });
      }

      auditedCount++;
      process.stdout.write(`[${auditedCount}/${ROUTES_TO_AUDIT.length}] Audited ${route}\n`);
    } catch (err) {
      errorsFound.push({ type: 'NAVIGATION_TIMEOUT_OR_FAIL', url: fullUrl, message: err.message });
    }
  }

  await browser.close();

  console.log('\n================ AUDIT SUMMARY ================');
  console.log(`Total Pages Audited: ${auditedCount}`);
  console.log(`Total Anomalies / Errors Found: ${errorsFound.length}`);
  if (errorsFound.length > 0) {
    console.log(JSON.stringify(errorsFound, null, 2));
  } else {
    console.log('✓ ALL ROUTES RENDERED CLEANLY WITH ZERO CRASHES OR BLANK SCREENS!');
  }

  return errorsFound;
}

runAudit().then((errors) => {
  if (errors.some(e => e.type === 'UNCAUGHT_PAGE_ERROR' || e.type === 'REACT_ERROR_BOUNDARY' || e.type === 'BLANK_PAGE')) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}).catch((err) => {
  console.error('Audit fatal failure:', err);
  process.exit(1);
});
