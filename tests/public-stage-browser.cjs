// Run against the built web app; every event response is synthetic and intercepted.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3131';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [390, 1365]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = []; page.on('pageerror', error => errors.push(error.message));
      let requests = 0;
      await page.route('**/v1/events/synthetic-stage/live', route => {
        requests++;
        const body = requests === 2 ? { published: true, performers: null } : {
          published: true, event: 'Synthetic event', chapter: 'Synthetic chapter', held: false,
          performers: [{ crew: requests > 2 ? 'Recovered crew' : 'Confirmed crew', division: 'Open' }], updated_at: requests,
        };
        return route.fulfill({ json: body });
      });
      await page.goto(`${base}/arena-live/synthetic-stage`);
      await page.getByRole('heading', { name: 'Confirmed crew' }).waitFor();
      await page.getByText('Reconnecting automatically.', { exact: false }).waitFor({ timeout: 15000 });
      assert.equal(await page.getByRole('heading', { name: 'Confirmed crew' }).count(), 1);
      await page.getByRole('heading', { name: 'Recovered crew' }).waitFor({ timeout: 20000 });
      assert.deepEqual(errors, []);
      await page.close();
      process.stdout.write(`Stage recovery passed at ${width}px\n`);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
