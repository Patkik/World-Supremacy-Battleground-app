const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'playwright');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const base = `http://localhost:${settings.WSB_WEB_PORT || 3100}`;
const judgeAccount = process.env.WSB_DOCKER_BROWSER_JUDGE || 'judge1';
const viewportWidth = process.env.WSB_DOCKER_BROWSER_VIEWPORT;
const viewports = viewportWidth ? [{ width: Number(viewportWidth), height: 844 }] : [{ width: 1365, height: 960 }, { width: 390, height: 844 }];
if (viewports.some(viewport => ![390, 1365].includes(viewport.width))) throw new Error('WSB_DOCKER_BROWSER_VIEWPORT must be 390 or 1365');
async function savedScoreSnapshot(page, event, entryId) {
  return page.evaluate(({ event, entryId }) => new Promise((resolve, reject) => {
    const request = indexedDB.open('wsb-judge-outbox-v1', 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('operations', 'readonly');
      const read = transaction.objectStore('operations').getAll();
      transaction.oncomplete = () => {
        db.close();
        resolve(read.result.filter(item => item.event === event && item.entryId === entryId).map(item => ({ state: item.state, criteria: item.command?.criteria, operation_id: item.command?.operation_id })));
      };
      transaction.onerror = transaction.onabort = () => { db.close(); reject(transaction.error); };
    };
  }), { event, entryId });
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  mkdirSync('.workspace/docker-checks', { recursive: true });
  try {
    for (const viewport of viewports) {
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
      const buildResponse = await page.request.get(`${base}/build-id`);
      assert.equal(buildResponse.status(), 200, 'signed offline recovery browser checks require a production build with an available /build-id');
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

      await login(judgeAccount);
      await page.goto(`${base}/offline`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Prepare this trusted device', exact: true }).click();
      await page.getByText(/Offline workspace prepared\./).waitFor();
      await page.goto(`${base}/console/local-rehearsal/judge`);
      await page.getByRole('button', { name: 'Refresh assignments', exact: true }).waitFor();
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Refresh assignments' && !button.disabled));
      // This case exercises queue/reconnect on the stable synthetic assignment.
      // The all-role demo separately checks the paginated assignment desk.
      await page.goto(`${base}/console/local-rehearsal/judge/local-entry-ready`);
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
      const queuedSnapshot = await savedScoreSnapshot(page, 'local-rehearsal', 'local-entry-ready');
      assert.ok(queuedSnapshot.some(item => item.state === 'queued' && item.criteria?.choreography === 18.25), `score is queued in device storage: ${JSON.stringify(queuedSnapshot)}`);
      await page.goto(`${base}/offline`, { waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { name: 'Offline judging workspace', exact: true }).waitFor();
      await page.getByLabel('Event ID', { exact: true }).fill('local-rehearsal');
      await page.waitForTimeout(100);
      await page.getByLabel('Assigned entry ID', { exact: true }).fill('local-entry-ready');
      await page.getByRole('button', { name: 'Open scorecard', exact: true }).click();
      const trustScorecard = page.getByRole('checkbox', { name: 'This is my trusted judging device. Save my drafts and commands here until I remove them.' });
      try { await trustScorecard.waitFor({ timeout: 15000 }); }
      catch {
        await page.screenshot({ path: '.workspace/docker-checks/offline-score-recovery-failed.png', fullPage: true });
        throw new Error(`Offline scorecard did not restore its controls: ${(await page.locator('main').innerText()).slice(0, 800)}`);
      }
      await trustScorecard.check();
      await page.getByLabel('Choreography', { exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelector('#numeric-choreography')?.value === '18.25', { timeout: 15000 });
      const recoveredChoreography = await page.getByLabel('Choreography', { exact: true }).inputValue();
      if (recoveredChoreography !== '18.25') {
        const recoveredSnapshot = await savedScoreSnapshot(page, 'local-rehearsal', 'local-entry-ready');
        const currentStatus = await page.locator('.judge-performance .sync-state').innerText();
        throw new Error(`Queued score rehydration lost its saved value (${recoveredChoreography}); state=${currentStatus}; device record=${JSON.stringify(recoveredSnapshot)}`);
      }
      const recoveredState = await page.locator('.judge-performance .sync-state').innerText();
      assert.match(recoveredState, /\bqueued\b/i, `queued score state survives offline shell recovery: ${recoveredState}`);
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

      await page.goto(`${base}/workspaces`);
      await page.getByRole('button', { name: 'Sign out', exact: true }).click();
      await page.getByRole('link', { name: 'Sign in to continue', exact: true }).waitFor();
      await login('marshal');
      await page.goto(`${base}/console/local-rehearsal/check-in`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Dancer check-in', exact: true }).waitFor();
      await page.getByLabel('Entry ID', { exact: true }).fill('local-entry-ready');
      await page.getByLabel('Dancer account ID', { exact: true }).fill('local-ph-manager');
      await page.getByRole('button', { name: 'Record check-in', exact: true }).click();
      await page.getByText('Check-in recorded. Reference:', { exact: false }).waitFor();
      await page.getByRole('heading', { name: 'Event arrivals', exact: true }).waitFor();
      assert.equal(await page.locator('.connected-list').getByText('local-ph-manager', { exact: true }).count(), 1);
      assert.deepEqual(errors, [], 'no browser exceptions across signed event workflows');
      console.log(`PASS ${viewport.width}px: signed marshal check-in and arrival receipt.`);
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
