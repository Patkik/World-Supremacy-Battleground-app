const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const base = `http://localhost:${settings.WSB_WEB_PORT || 3100}`;
async function main() {
  const browser = await chromium.launch({ headless: true });
  mkdirSync('.workspace/docker-checks', { recursive: true });
  try {
    for (const viewport of [{ width: 1365, height: 960 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.route('https://**', route => route.abort());
      const errors = [];
      const page = await context.newPage();
      console.log(`Checking ${viewport.width}px browser…`);
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => errors.push(error.message));
      page.on('requestfailed', request => { if (request.url().startsWith('http://localhost:')) console.log(`Request failed: ${request.method()} ${request.url().split('?')[0]}`); });
      async function login(name) {
        await page.goto(`${base}/sign-in`, { waitUntil: 'networkidle', timeout: 120000 });
        await page.getByLabel('Email address', { exact: true }).fill(`${name}@ph.wsb.test`);
        await page.getByLabel('Password', { exact: true }).fill(settings.WSB_TEST_PASSWORD);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        try { await page.waitForURL('**/workspaces'); }
        catch (error) { console.log(`Sign-in error: ${await page.getByRole('alert').allTextContents()}`); throw error; }
        await page.getByText('Assigned role:', { exact: false }).waitFor();
        const signed = await page.evaluate(() => JSON.parse(sessionStorage.getItem('wsb-local-signed-session')));
        assert.ok(signed?.token);
        assert.equal(signed.uid, `local-ph-${name}`);
      }
      await login('manager');
      await page.goto(`${base}/app/crews`);
      await page.getByRole('heading', { name: 'Local ready crew', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Local payment crew', exact: true }).waitFor();
      await page.goto(`${base}/app/entries/local-entry-ready?event=local-rehearsal`);
      await page.getByText('Status:', { exact: false }).filter({ hasText: 'approved' }).waitFor();
      await page.goto(`${base}/app/entries/local-entry-draft/checkout?event=local-rehearsal`);
      await page.getByLabel('Bank or cash receipt reference').waitFor();
      assert.deepEqual(await page.locator('.form-error').allTextContents(), []);
      await page.goto(`${base}/workspaces`);
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.getByRole('link', { name: 'Sign in to continue', exact: true }).waitFor();
      assert.equal(await page.evaluate(() => sessionStorage.getItem('wsb-local-signed-session')), null);

      await login('judge1');
      await page.goto(`${base}/console/local-rehearsal/judge`);
      await page.locator('a[href="/console/local-rehearsal/judge/local-entry-ready"]').click();
      await page.getByRole('checkbox').check();
      await page.getByLabel('Choreography', { exact: true }).fill('18.25');
      await page.getByLabel('Musicality', { exact: true }).fill('18');
      await page.getByLabel('Execution', { exact: true }).fill('18');
      await page.getByLabel('Stage presence', { exact: true }).fill('18');
      await page.getByLabel('Entertainment', { exact: true }).fill('18');
      await page.getByRole('button', { name: 'Save device draft', exact: true }).click();
      await page.getByText('Draft saved on this device. It has not been submitted.', { exact: true }).waitFor();
      await context.setOffline(true);
      await page.getByRole('button', { name: 'Review score', exact: true }).click();
      await page.getByRole('button', { name: 'Queue score', exact: true }).click();
      await page.getByText('Queued on this device. Waiting for a server receipt.', { exact: true }).waitFor();
      assert.equal(await page.getByText('Accepted by server · Receipt', { exact: false }).count(), 0);
      await context.setOffline(false);
      await page.getByRole('button', { name: 'Sync saved scores', exact: true }).click();
      await page.getByText('Accepted by server · Receipt', { exact: false }).waitFor();
      assert.deepEqual(await page.locator('.form-error').allTextContents(), []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);

      await page.goto(`${base}/workspaces`);
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.getByRole('link', { name: 'Sign in to continue', exact: true }).waitFor();
      await login('director');
      await page.goto(`${base}/admin/ph/events/local-rehearsal/results`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Results publication', exact: true }).waitFor();
      await page.locator('section.panel').first().waitFor();
      assert.equal(await page.getByRole('button', { name: 'Emergency Rollback' }).count(), 0);
      assert.equal(await page.getByText('Afterhours Collective (88.33)', { exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      await page.screenshot({ path: `.workspace/docker-checks/results-${viewport.width}.png`, fullPage: true });
      assert.deepEqual(errors, [], 'no browser exceptions');
      console.log(`PASS ${viewport.width}px: signed manager/judge/director sessions, scoped reads, offline queue, accepted score receipt and live results publication desk.`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
