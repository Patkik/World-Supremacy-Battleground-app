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
      await page.waitForFunction(() => document.querySelector('.entrance-progress').getAttribute('aria-valuenow') === '3');
      const line = page.locator('[data-hero-line]').first();
      const position = await line.evaluate(el => getComputedStyle(el).transform);
      const dancer = page.locator('.entrance-dancer video');
      await page.waitForFunction(() => document.querySelector('.entrance-dancer video')?.currentTime > 0.15);
      const readFrame = video => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        canvas.getContext('2d').drawImage(video, 0, 0, 32, 32);
        return canvas.toDataURL();
      };
      const firstPose = await dancer.evaluate(readFrame);
      await page.waitForTimeout(250);
      assert.notEqual(await dancer.evaluate(readFrame), firstPose, 'decoded dance poses change while the page loads');
      assert.equal(await line.evaluate(el => getComputedStyle(el).transform), position, 'hero remains held behind loader');
      assert.notEqual(position, 'none');
      assert.equal(await page.locator('.entrance-progress').getAttribute('aria-valuenow'), '3', 'pending image never claims completed loading');
      await page.screenshot({ path: `.workspace/entrance-checks/loading-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await dancer.evaluate(video => {
        window.danceEnded = false;
        video.addEventListener('ended', () => { window.danceEnded = true; }, { once: true });
      });
      release();
      await page.waitForSelector('[data-entrance="complete"]');
      assert.equal(await page.evaluate(() => window.danceEnded), true, 'the full dance phrase ends before the hero starts');
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
    for (const mode of ['skip', 'timeout', 'reduced', 'saved-off', 'save-data', 'video-error', 'video-stall', 'no-js']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 },
        reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference', javaScriptEnabled: mode !== 'no-js' });
      await context.route('https://www.youtube.com/iframe_api', route => route.abort());
      if (mode === 'saved-off') await context.addInitScript(() => sessionStorage.setItem('wsb-motion-paused', 'true'));
      if (mode === 'save-data') await context.addInitScript(() => {
        const connection = Object.assign(new EventTarget(), { saveData: true });
        Object.defineProperty(navigator, 'connection', { value: connection });
      });
      let release;
      const gate = new Promise(resolve => { release = resolve; });
      let videoRequested = false;
      await context.route('**/entrance-dancer.mp4', async route => {
        videoRequested = true;
        if (mode === 'video-stall') await gate;
        if (mode === 'video-stall' || mode === 'video-error') await route.abort();
        else await route.continue();
      });
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
        const timeout = ['video-error', 'video-stall'].includes(mode) ? 3500 : 12000;
        await page.locator('[data-entrance="complete"]').waitFor({ timeout }).catch(error => {
          throw new Error(`Entrance did not complete in ${mode} mode`, { cause: error });
        });
        if (mode === 'reduced' || mode === 'saved-off') {
          assert.equal(await page.locator('[data-hero-line]').first().evaluate(el => getComputedStyle(el).transform), 'none');
        }
        assert.equal(await page.locator('dialog[open]').count(), 0);
      }
      if (['reduced', 'saved-off', 'save-data', 'no-js'].includes(mode)) {
        assert.equal(videoRequested, false, `${mode} does not fetch the dance video`);
      }
      if (['video-stall', 'video-error'].includes(mode)) assert.equal(videoRequested, true);
      release();
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log('PASS: decoded dance frames, full phrase before hero, desktop/320px, accurate progress, cleanup, Escape, readiness timeout, motion and data preferences, media failure/stall, and no-JS access.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
