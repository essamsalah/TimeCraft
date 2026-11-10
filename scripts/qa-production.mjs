import { chromium } from 'playwright';

const url = process.argv[2] ?? 'https://127.0.0.1:4185/timecraft-mr/';
const allowLocalCertificate = ['127.0.0.1', 'localhost'].includes(new URL(url).hostname);
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (let attempt = 0; attempt < 3; attempt++) {
    const context = await browser.newContext({ ignoreHTTPSErrors: allowLocalCertificate });
    const page = await context.newPage();
    const failures = [], errors = [], remote = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === new URL(url).origin) return route.continue();
      remote.push(route.request().url());
      return route.abort();
    });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(response.url()); });
    const start = performance.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    const facts = await page.evaluate(() => ({
      secureContext: isSecureContext,
      scene: performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/scenes/timecraft-studio.iwsdk.scene.json')),
      canvas: !!document.querySelector('canvas'),
      panel: performance.getEntriesByType('resource').some(entry => entry.name.endsWith('/ui/studio.uikitml')),
      audio: performance.getEntriesByType('resource').filter(entry => entry.name.endsWith('.wav')).length,
    }));
    results.push({ networkIdleMs: Math.round(performance.now() - start), ...facts, failures, errors, remote });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify({ url, results }, null, 2));
if (results.some(r => !r.secureContext || !r.scene || !r.canvas || !r.panel || r.audio < 4 || r.failures.length || r.errors.length || r.remote.length)) process.exitCode = 1;
