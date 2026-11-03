const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3107';
const script = (file, target) => `(function(exports){${ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText}})(window.${target} = {});`;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://**', route => route.abort());
  fs.mkdirSync('.workspace/screenshots', { recursive: true });
  for (const [width, height] of [[390,844], [844,390], [834,1194], [1194,834], [320,568]]) {
    await page.setViewportSize({ width, height });
    for (const route of ['/sign-in', '/sign-up', '/forgot-password', '/verify-email', '/workspaces', '/app/crews', '/console/synthetic-event/judge/synthetic-entry', '/console/synthetic-event/sync', '/events/synthetic-event/results', '/arena-live/synthetic-event/results', '/offline']) {
      const response = await page.goto(base + route, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200, route);
      assert.equal(await page.locator('h1').count(), 1, route);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${width} ${route} overflow`);
      if (route.includes('synthetic-event/results')) assert.equal(await page.getByText('Official Certified', { exact: false }).count(), 0);
      if (route === '/sign-in') assert.equal(await page.getByText('Development Persona Switch').count(), 0);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + '/offline', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Prepare this trusted device', exact: true }).click();
  await page.getByText('Offline workspace prepared.', { exact: false }).waitFor({ timeout: 30000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.addScriptTag({ content: script('apps/web/src/lib/judging/outbox.ts', 'testOutbox') });
  await page.addScriptTag({ content: script('apps/web/src/lib/judging/indexed-store.ts', 'testStore') });
  await page.evaluate(async () => {
    const store = new window.testStore.IndexedScoreStore();
    const row = window.testOutbox.newOperation('synthetic-judge', 'ph', 'synthetic-event', { schema_version:1, operation_id:'browser-synthetic', division_id:'open', crew_id:'synthetic-crew', expected_revision:0, criteria:{choreography:18,musicality:18,execution:18,stage_presence:18,entertainment:18}, deductions:[] });
    await window.testOutbox.queueOperation(store, row);
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'load' });
  await page.getByRole('heading', { name: 'Offline judging workspace' }).waitFor();
  assert.ok(await page.locator('.brand img').evaluate(img => img.complete && img.naturalWidth > 0), 'Brand image is available offline');
  await page.addScriptTag({ content: script('apps/web/src/lib/judging/outbox.ts', 'testOutbox') });
  await page.addScriptTag({ content: script('apps/web/src/lib/judging/indexed-store.ts', 'testStore') });
  const restored = await page.evaluate(async () => new window.testStore.IndexedScoreStore().list('synthetic-judge'));
  assert.equal(restored.length, 1); assert.equal(restored[0].state, 'queued');
  assert.equal(restored[0].command.operation_id, 'browser-synthetic');
  assert.equal(await page.evaluate(async () => (await new window.testStore.IndexedScoreStore().list('another-judge')).length), 0);
  await page.screenshot({ path: '.workspace/screenshots/connected-offline-390.png', fullPage: true });
  await context.setOffline(false);
  await page.evaluate(async () => {
    const store = new window.testStore.IndexedScoreStore();
    await window.testOutbox.flushOutbox(store, 'synthetic-judge', async row => ({ operation_id: row.command.operation_id, receipt_id:'synthetic-browser-receipt', event_id:row.event, division_id:row.command.division_id, crew_id:row.command.crew_id, judge_uid:row.owner, score_revision:1, net_score:90, recorded_at:1 }));
  });
  const accepted = await page.evaluate(async () => new window.testStore.IndexedScoreStore().list('synthetic-judge'));
  assert.equal(accepted[0].state, 'acknowledged');
  const cachesUsed = await page.evaluate(async () => {
    const name = (await caches.keys()).find(key => key.startsWith('wsb-offline-'));
    if (!name) throw new Error('The current offline shell cache is missing.');
    return (await caches.open(name)).keys().then(requests => requests.map(request => request.url));
  });
  assert.ok(cachesUsed.every(value => { const url = new URL(value); return url.pathname === '/offline' || url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/brand/') || (url.pathname === '/_next/image' && url.searchParams.get('url') === '/brand/wsb-logo.png'); }));
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('55 route/viewport checks; real IndexedDB refresh, offline shell reload, account isolation, reconnect receipt and cache privacy passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
