import { chromium } from 'playwright';

async function measure() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-features=NetworkService,NetworkServiceInProcess']
  });

  // Mobile emulation (Moto G4 / standard Lighthouse mobile viewport & throttling)
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
    isMobile: true,
  });

  const page = await context.newPage();
  const client = await context.newCDPSession(page);

  // Enable performance monitoring
  await client.send('Performance.enable');

  const targetUrl = process.env.TARGET_URL || 'http://localhost:3000/';
  console.log(`Navigating to ${targetUrl} (Production Build) with mobile throttling...`);
  // Emulate mobile slow CPU and 4G network as Lighthouse does:
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // ~1.6 Mbps
    uploadThroughput: 750 * 1024 / 8,         // ~750 Kbps
    latency: 150                              // 150ms
  });

  const start = Date.now();
  await page.goto(targetUrl, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000); // Allow LCP and observers to settle

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const result = {};

      const navEntries = performance.getEntriesByType('navigation');
      if (navEntries.length > 0) {
        const nav = navEntries[0];
        result.ttfb = nav.responseStart - nav.requestStart;
        result.domInteractive = nav.domInteractive;
        result.domContentLoaded = nav.domContentLoadedEventEnd;
        result.load = nav.loadEventEnd;
      }

      const paintEntries = performance.getEntriesByType('paint');
      for (const p of paintEntries) {
        if (p.name === 'first-paint') result.fp = p.startTime;
        if (p.name === 'first-contentful-paint') result.fcp = p.startTime;
      }

      // Check long tasks
      let totalLongTaskDuration = 0;
      let longTaskCount = 0;
      const longTasks = performance.getEntriesByType('longtask') || [];
      for (const lt of longTasks) {
        totalLongTaskDuration += lt.duration;
        longTaskCount++;
      }
      result.longTaskCount = longTaskCount;
      result.totalLongTaskDuration = totalLongTaskDuration;

      // Resources loaded
      const resources = performance.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').pop().split('?')[0],
        duration: Math.round(r.duration),
        transferSize: r.transferSize,
        initiatorType: r.initiatorType
      }));
      result.heavyResources = resources.filter(r => r.duration > 150 || (r.transferSize && r.transferSize > 50000));

      resolve(result);
    });
  });

  const perfMetrics = await client.send('Performance.getMetrics');
  const cdpMetrics = {};
  for (const m of perfMetrics.metrics) {
    cdpMetrics[m.name] = m.value;
  }

  console.log('\n=== PERFORMANCE METRICS (Mobile 4x CPU Throttling + 4G) ===');
  console.log(`TTFB: ${Math.round(metrics.ttfb)} ms`);
  console.log(`FCP: ${Math.round(metrics.fcp)} ms`);
  console.log(`DOM Content Loaded: ${Math.round(metrics.domContentLoaded)} ms`);
  console.log(`Load Event: ${Math.round(metrics.load)} ms`);
  console.log(`JS Heap Used: ${(cdpMetrics.JSHeapUsedSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Task Duration: ${cdpMetrics.TaskDuration ? cdpMetrics.TaskDuration.toFixed(2) : 0} s`);
  console.log(`Script Duration: ${cdpMetrics.ScriptDuration ? cdpMetrics.ScriptDuration.toFixed(2) : 0} s`);
  console.log(`Layout Duration: ${cdpMetrics.LayoutDuration ? cdpMetrics.LayoutDuration.toFixed(2) : 0} s`);
  console.log(`Long Tasks Count: ${metrics.longTaskCount}, Duration: ${Math.round(metrics.totalLongTaskDuration)} ms`);

  console.log('\nHeavy Resources on Initial Page Load:');
  console.table(metrics.heavyResources);

  await browser.close();
}

measure().catch(console.error);
