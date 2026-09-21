async function testBackend() {
  const baseUrl = 'http://localhost:8787';
  console.log('Testing Backend API Endpoints on', baseUrl);

  const endpoints = [
    { name: 'Health Check', url: `${baseUrl}/api/health`, method: 'GET', expectedStatus: 200 },
    { name: 'Auth Status (Unauthenticated/Unconfigured)', url: `${baseUrl}/api/auth/me`, method: 'GET', expectedStatus: [200, 401, 503] },
    { name: 'Interview Analyze Validation Check', url: `${baseUrl}/api/interview/analyze-resume`, method: 'POST', body: {}, expectedStatus: 400 },
    { name: 'Interview Generate Validation Check', url: `${baseUrl}/api/interview/generate-questions`, method: 'POST', body: {}, expectedStatus: 400 },
    { name: 'Interview Evaluate Validation Check', url: `${baseUrl}/api/interview/evaluate-answer`, method: 'POST', body: {}, expectedStatus: 400 },
    { name: 'Interview Mock Simulation Check', url: `${baseUrl}/api/interview/mock`, method: 'POST', body: { action: 'start', candidateName: 'Priya', role: 'Frontend Developer' }, expectedStatus: [200, 429, 503] },
    { name: 'AI Ask Validation Check', url: `${baseUrl}/api/ai/ask`, method: 'POST', body: {}, expectedStatus: 400 },
  ];

  let passed = 0;
  for (const ep of endpoints) {
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const opts = {
        method: ep.method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (ep.body) opts.body = JSON.stringify(ep.body);

      const res = await fetch(ep.url, opts);
      const ok = Array.isArray(ep.expectedStatus) ? ep.expectedStatus.includes(res.status) : res.status === ep.expectedStatus;
      if (ok) {
        console.log(`✓ ${ep.name} passed (HTTP ${res.status})`);
        passed++;
      } else {
        console.error(`✗ ${ep.name} failed: expected ${ep.expectedStatus}, got ${res.status}`);
      }
    } catch (err) {
      console.error(`✗ ${ep.name} error:`, err.message);
    }
  }

  console.log(`\nBackend API Audit: ${passed}/${endpoints.length} endpoints passed.`);
  if (passed === endpoints.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

testBackend();
