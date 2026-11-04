const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3100';
const poster = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360"><rect width="480" height="360" fill="#16161a"/></svg>';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  mkdirSync('.workspace/entrance-checks', { recursive: true });
  try {
    for (const width of [1440, 320]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'no-preference' });
      await context.route('https://www.youtube.com/iframe_api', route => route.abort());
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('https://i.ytimg.com/**', async route => { await gate; await route.fulfill({ contentType: 'image/svg+xml', body: poster }); });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('.landing-entrance[open]').waitFor();
      const start = Date.now();
      await page.waitForFunction(() => document.querySelector('.entrance-progress').getAttribute('aria-valuenow') === '3');
      const line = page.locator('[data-hero-line]').first();
      const position = await line.evaluate(el => getComputedStyle(el).transform);
      await page.waitForTimeout(250);
      assert.equal(await line.evaluate(el => getComputedStyle(el).transform), position, 'hero remains held behind loader');
      assert.notEqual(position, 'none');
      assert.equal(await page.locator('.entrance-progress').getAttribute('aria-valuenow'), '3', 'pending image never claims completed loading');
      await page.screenshot({ path: `.workspace/entrance-checks/loading-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      release();
      await page.waitForSelector('[data-entrance="complete"]');
      assert.ok(Date.now() - start >= 1000, 'warm readiness does not cut the dance phrase short');
      await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-hero-line]')).transform === 'none');
      await page.waitForTimeout(1300);
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.style.overflow), '');
      await page.getByRole('link', { name: 'Find an event', exact: true }).first().click();
      await page.waitForURL('**/events');
      assert.equal(await page.locator('.landing-entrance').count(), 0);
      await context.close();
    }

    // A stalled asset must remain incomplete and navigation must still be available.
    for (const mode of ['skip', 'timeout', 'reduced', 'saved-off', 'no-js']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 },
        reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'no-js' });
      await context.route('https://www.youtube.com/iframe_api', route => route.abort());
      if (mode === 'saved-off') await context.addInitScript(() => sessionStorage.setItem('wsb-motion-paused', 'true'));
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      await context.route('https://i.ytimg.com/**', async route => {
        if (mode === 'skip' || mode === 'timeout') await gate;
        await route.fulfill({ contentType: 'image/svg+xml', body: poster });
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      if (mode === 'no-js') {
        assert.equal(await page.locator('dialog[open]').isVisible(), false);
        assert.ok(await page.getByRole('heading', { name: 'Find your street dance event.' }).isVisible());
      } else {
        if (mode === 'skip') { await page.locator('dialog[data-managed="true"]').waitFor(); await page.keyboard.press('Escape'); }
        await page.waitForSelector('[data-entrance="complete"]', { timeout: 12000 });
        if (mode === 'reduced' || mode === 'saved-off') {
          assert.equal(await page.locator('[data-hero-line]').first().evaluate(el => getComputedStyle(el).transform), 'none');
        }
        assert.equal(await page.locator('dialog[open]').count(), 0);
      }
      release();
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: truthful pending-image progress, held hero, complete dance phrase, desktop/320px, handoff, route cleanup, Escape, timeout, reduced motion, saved motion off and no-JS access.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
