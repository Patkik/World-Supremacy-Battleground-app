const assert = require('node:assert/strict');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const routes = [
  ['/app/consents', 'Consent and waivers', '/app/support'],
  ['/app/dependents', 'Guardian dependents', '/app/support'],
  ['/app/entries/example/music?event=local-rehearsal', 'Performance music', '/app/support'],
  ['/admin/ph/events/local-rehearsal/music', 'Event music', '/admin/ph/support'],
];
(async () => {
  const browser = await chromium.launch({headless:true});
  try {
    for (const width of [390, 1365]) {
      const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      await context.route('https://**', route => route.abort());
      const page = await context.newPage();
      const errors = [];
      const mutations = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', req => { if (!['GET','HEAD'].includes(req.method())) mutations.push(req.url()); });
      for (const [path, title, help] of routes) {
        await page.goto(`http://localhost:3100${path}`, {waitUntil:'networkidle', timeout:90000});
        const main = page.locator('main#main-content');
        await main.getByRole('heading', {name:title, exact:true}).waitFor();
        await main.getByRole('heading', {name:'Not available yet', exact:true}).waitFor();
        assert.equal(await main.locator('input, textarea, select, button, form').count(), 0, path);
        assert.equal(await main.getByRole('link', {name:'Contact support'}).getAttribute('href'), help, path);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `${path} overflows at ${width}`);
      }
      await page.goto('http://localhost:3100/app/entries/example/music?event=local-rehearsal');
      assert.equal(await page.locator('main').getByRole('link',{name:'Back',exact:true}).getAttribute('href'), '/app/entries/example?event=local-rehearsal');
      assert.deepEqual(errors, []);
      assert.deepEqual(mutations, []);
      await context.close();
    }
    console.log('PASS: four remaining unavailable workflows show honest state, no data-entry or submission controls, correct links, no mutations or overflow at desktop and mobile widths.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
