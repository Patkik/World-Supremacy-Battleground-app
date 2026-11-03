// Real browser rehearsal against the isolated running demo-wsb stack.
const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const base = `http://localhost:${settings.WSB_WEB_PORT || 3100}`;
const api = `http://localhost:${settings.WSB_API_PORT || 8189}`;
const output = '.workspace/role-demo';
const event = 'local-rehearsal';
const roles = [
  ['visitor', 'visitor', ['/', '/chapters', '/results', '/events/synthetic-unlisted', '/app/tickets', '/app/privacy']],
  ['manager', 'crew_manager', ['/app/crews', `/app/register/${event}`, '/app/notifications', '/app/profile', '/app/security']],
  ['dancer1', 'dancer', ['/app/crews', '/app/dependents', '/app/verification']],
  ['guardian1', 'guardian', ['/app/dependents', '/app/notifications']],
  ['registrar', 'registrar', [`/admin/ph/events/${event}/registrations`, '/console']],
  ['verifier', 'verifier', ['/admin/ph/verification']],
  ['finance', 'finance', ['/admin/ph/finance/transactions', '/admin/ph/finance/refunds']],
  ['judge1', 'judge', [`/console/${event}/judge`, `/console/${event}/battles`, '/offline']],
  ['judge2', 'judge', [`/console/${event}/judge`]],
  ['head', 'head_judge', [`/console/${event}/head-judge`, `/admin/ph/events/${event}/results`]],
  ['marshal', 'marshal', [`/console/${event}/check-in`, `/console/${event}/marshal`]],
  ['audio', 'audio_operator', [`/console/${event}/audio`]],
  ['support', 'support', ['/admin/ph/support']],
  ['auditor', 'auditor', ['/admin/ph/audit']],
  ['director', 'chapter_director', ['/admin/ph', '/admin/ph/events', '/admin/ph/staff', `/admin/ph/events/${event}`, `/admin/ph/events/${event}/battles`, '/admin/ph/content']],
  ['multichapter', 'crew_manager', ['/workspaces']],
  ['hq.admin@wsb.test', 'hq_admin', ['/workspaces', '/hq', '/hq/chapters', '/hq/access', '/hq/applications', '/hq/integrations', '/hq/operations']],
  ['manager@hk.wsb.test', 'crew_manager', ['/app/crews']],
];
function saveReport(report) {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const keyFor = row => row.account.replace('@ph.wsb.test', '').replace(/[^a-z0-9]/gi, '-');
  const rows = report.roles.map(row => `<section id="${escape(keyFor(row))}"><h2>${escape(row.role.replaceAll('_', ' '))} · ${escape(row.status || 'running')}</h2><p>${escape(row.account)}</p>${row.action ? `<p>${escape(row.action)}</p>` : ''}${row.boundaries ? `<p>Permission checks: ${escape(Object.entries(row.boundaries).map(([name, status]) => `${name}: HTTP ${status}`).join(' · '))}</p>` : ''}${row.error ? `<pre>${escape(row.error)}</pre>` : ''}${row.pages.map((page, i) => {
    const file = `${keyFor(row)}-${i + 1}`;
    return `<article><h3><a href="${base}${escape(page.path)}">${escape(page.path)}</a> · ${escape(page.status)}</h3><p>${escape((page.headings || []).join(' / '))}</p>${page.error ? `<pre>${escape(page.error)}</pre>` : ''}<details><summary>View desktop and phone screenshots</summary><div class="screens"><a href="${escape(file)}.png"><img loading="lazy" src="${escape(file)}.png" alt="${escape(row.role)} desktop workspace"></a><a href="${escape(file)}-mobile.png"><img loading="lazy" src="${escape(file)}-mobile.png" alt="${escape(row.role)} phone workspace"></a></div></details></article>`;
  }).join('')}</section>`).join('');
  const passed = report.roles.filter(row => row.status === 'passed').length;
  writeFileSync(`${output}/index.html`, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WSB role demonstration</title><style>body{margin:0 auto;padding:32px;max-width:1100px;background:#070709;color:#f4f5f8;font:16px/1.6 system-ui}a{color:#d4ff00}h1,h2{text-transform:uppercase}section{border-top:1px solid #444;padding:24px 0}article{margin:24px 0}img{width:100%;height:420px;object-fit:contain;object-position:top;border:1px solid #444}pre{white-space:pre-wrap;color:#ffb800}nav{display:flex;gap:16px;flex-wrap:wrap}.screens{display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-top:16px}summary{cursor:pointer;padding:12px 0}@media(max-width:600px){body{padding:20px}.screens{grid-template-columns:1fr}}</style><h1>WSB role demonstration</h1><p>${passed}/${report.roles.length} visitor and account cases passed · desktop 1365px · phone 390px.</p><p>${escape(report.scope)}</p><p>Started ${escape(report.started_at)}. <a href="${base}/sign-in">Open the running app</a>. Use the local password from the ignored .env.docker settings; credentials are excluded from this report.</p><p>Tickets, signed venue passes, actual waiver signing, approved event policies, full battle brackets, privacy export/deletion, separate publishing/governance roles and production providers remain unfinished. Their unavailable screens are demonstrations of the current boundary.</p><nav>${report.roles.map(row => `<a href="#${escape(keyFor(row))}">${escape(row.role.replaceAll('_', ' '))}</a>`).join('')}</nav>${rows}</html>`);
}
async function main() {
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: process.env.WSB_DEMO_HEADED !== 'true' });
  const report = { started_at: new Date().toISOString(), scope: 'Synthetic browser role demonstration; page checks do not establish complete business workflows or production readiness.', roles: [] };
  let relationshipId;
  try {
    for (const [name, role, paths] of roles.filter(([name]) => !process.env.WSB_DEMO_ACCOUNT || name === process.env.WSB_DEMO_ACCOUNT)) {
      const key = name.replace(/[^a-z0-9]/gi, '-');
      const row = { account: role === 'visitor' ? 'visitor' : name.includes('@') ? name : `${name}@ph.wsb.test`, role, pages: [], errors: [] };
      report.roles.push(row);
      const context = await browser.newContext({ viewport: { width: 1365, height: 960 }, reducedMotion: 'reduce' });
      await context.route('https://**', route => route.abort());
      const page = await context.newPage();
      page.setDefaultTimeout(25000); page.setDefaultNavigationTimeout(90000);
      page.on('pageerror', error => row.errors.push(error.message));
      try {
        console.log(`DEMO ${role}: ${name}`);
        if (role !== 'visitor') {
        await page.goto(`${base}/sign-in${role === 'hq_admin' ? '?next=%2Fhq' : ''}`, { waitUntil: 'networkidle' });
        await page.getByLabel('Email address', { exact: true }).fill(row.account);
        await page.getByLabel('Password', { exact: true }).fill(settings.WSB_TEST_PASSWORD);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForURL(role === 'hq_admin' ? /\/hq(\?|$)/ : /\/workspaces(\?|$)/);
        if (role !== 'hq_admin') await page.getByText('Assigned role:', { exact: false }).waitFor();
        const signed = await page.evaluate(() => { const s = JSON.parse(sessionStorage.getItem('wsb-local-signed-session') || 'null'); return !!s?.token; });
        assert.ok(signed, 'signed local session established');
        }
        for (const path of paths) {
          const item = { path, status: 'pending', api: [] }; row.pages.push(item);
          const listener = response => { if (response.url().startsWith(`${api}/v1/`)) item.api.push({ path: new URL(response.url()).pathname, status: response.status() }); };
          page.on('response', listener);
          try {
            const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
            assert.equal(response.status(), 200, 'page serves successfully');
            await page.waitForFunction(() => !Array.from(document.querySelectorAll('main [role="status"]')).some(e => /^(Checking|Loading|Verifying)\b/.test(e.textContent.trim())), { timeout: 25000 });
            item.headings = await page.locator('main h1, main h2').allTextContents();
            item.alerts = await page.locator('main [role="alert"], main .form-error').allTextContents();
            item.overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            assert.ok(item.headings.length, 'workspace has a heading');
            assert.ok(!item.overflow, 'desktop has no horizontal overflow');
            assert.ok(!item.api.some(r => r.status >= 500), 'no server failures');
            assert.deepEqual(item.alerts, [], 'authorized workspace has no errors');
            if (role === 'hq_admin' && path === '/workspaces') await page.getByRole('link', { name: 'Open Global HQ', exact: true }).waitFor();
            item.status = 'passed';
          } catch (error) { item.status = 'failed'; item.error = error.message.split('\n').slice(0, 5).join('\n'); }
          finally {
            page.off('response', listener);
            await page.screenshot({ path: `${output}/${key}-${row.pages.length}.png`, fullPage: true });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.screenshot({ path: `${output}/${key}-${row.pages.length}-mobile.png`, fullPage: true });
            item.mobile_overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
            if (item.mobile_overflow) { item.status = 'failed'; item.error = `${item.error || ''} Horizontal overflow at 390px.`; }
            await page.setViewportSize({ width: 1365, height: 960 });
            console.log(`  ${item.status}: ${path}${item.error ? ` — ${item.error}` : ''}`);
          }
        }
        if (name === 'dancer1') {
          await page.goto(`${base}/app/dependents`, { waitUntil: 'networkidle' });
          await page.getByLabel('Guardian account reference', { exact: true }).fill('local-ph-guardian1');
          const response = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/v1/chapters/ph/guardian-requests');
          await page.getByRole('button', { name: 'Request relationship', exact: true }).click();
          const receipt = await response;
          assert.equal(receipt.status(), 200, 'relationship request saved');
          relationshipId = (await receipt.json()).request_id;
          assert.match(relationshipId, /^[a-f0-9]{64}$/);
          await page.reload({ waitUntil: 'networkidle' });
          await page.locator('article').filter({ hasText: relationshipId }).getByText('Awaiting guardian response', { exact: true }).waitFor();
          row.action = 'Created guardian request through the form and recovered it after reload.';
        }
        if (name === 'guardian1' && relationshipId) {
          await page.goto(`${base}/app/dependents?chapter=ph&request=${relationshipId}`, { waitUntil: 'networkidle' });
          const request = page.locator('article').filter({ hasText: relationshipId });
          await request.getByRole('button', { name: 'Confirm relationship request', exact: true }).click();
          await request.getByText('Awaiting relationship verification', { exact: true }).waitFor();
          await page.reload({ waitUntil: 'networkidle' });
          await request.getByText('Awaiting relationship verification', { exact: true }).waitFor();
          await request.getByRole('button', { name: 'Withdraw relationship request', exact: true }).click();
          await request.getByText('Withdrawn', { exact: true }).waitFor();
          row.action = 'Confirmed the linked request, recovered after reload, then withdrew it. Confirmation grants no guardian authority.';
        }
        if (name === 'multichapter') {
          const selectedKey = 'wsb:active-chapter:local-ph-multichapter';
          await page.evaluate(key => localStorage.setItem(key, 'ph'), selectedKey);
          const verified = page.waitForResponse(response => response.url().includes('/v1/chapters/hk/session') && response.status() === 200);
          await page.goto(`${base}/admin/hk`, { waitUntil: 'networkidle' });
          await verified;
          assert.equal(await page.evaluate(key => localStorage.getItem(key), selectedKey), 'ph', 'visiting another chapter must not change the selected chapter');
          await page.goto(`${base}/workspaces`, { waitUntil: 'networkidle' });
          await page.getByText('Current chapter:', { exact: false }).filter({ hasText: 'PH' }).waitFor();
          row.action = 'Verified another chapter without changing the selected workspace chapter.';
        }
        if (['chapter_director', 'registrar', 'head_judge', 'judge', 'marshal', 'audio_operator'].includes(role)) {
          await page.goto(`${base}/workspaces`, { waitUntil: 'networkidle' });
          const assigned = page.locator('[aria-labelledby="assigned-event-workspace-heading"]');
          await assigned.getByRole('heading', { name: 'Assigned event workspaces', exact: true }).waitFor();
          await assigned.getByText(event, { exact: false }).waitFor();
          const nextAction = {
            chapter_director: 'Open event operations',
            registrar: 'Review registrations',
            head_judge: 'Review judging status',
            judge: 'Open assigned scorecards',
            marshal: 'Open check-in desk',
            audio_operator: 'Open audio desk',
          }[role];
          const action = assigned.getByRole('link', { name: nextAction, exact: true });
          await action.waitFor();
          const pathname = new URL(await action.getAttribute('href'), base).pathname;
          assert.ok(pathname.includes(encodeURIComponent(event)), `${role} next action carries the verified event reference`);
          if (role === 'marshal') await assigned.getByRole('link', { name: 'Open stage queue', exact: true }).waitFor();
          await page.setViewportSize({ width: 390, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${role} assigned event workspace fits phone width`);
          await page.setViewportSize({ width: 1365, height: 960 });
          if (role === 'marshal') {
            await page.route(`${api}/v1/chapters/ph/staff/duty-events`, route => route.fulfill({ status: 403, headers: { 'access-control-allow-origin': base }, contentType: 'application/json', body: '{}' }));
            await assigned.getByRole('button', { name: 'Refresh events', exact: true }).click();
            await assigned.getByRole('alert').waitFor();
            assert.equal(await assigned.getByRole('link', { name: 'Open check-in desk', exact: true }).count(), 0, 'revoked assignment links are removed after a denied refresh');
            await page.unroute(`${api}/v1/chapters/ph/staff/duty-events`);
            await page.goto(`${base}/console`, { waitUntil: 'networkidle' });
            let releaseAccess;
            const accessHeld = new Promise(resolve => { releaseAccess = resolve; });
            let accessStarted;
            const started = new Promise(resolve => { accessStarted = resolve; });
            await page.route(`${api}/v1/chapters/ph/events/${event}/duty-access`, async route => {
              const response = await route.fetch();
              accessStarted();
              await accessHeld;
              await route.fulfill({ response });
            });
            await page.getByRole('textbox', { name: 'Event reference', exact: true }).fill(event);
            await page.getByRole('button', { name: 'Check event access', exact: true }).click();
            await started;
            await page.route(`${api}/v1/chapters/ph/staff/duty-events`, route => route.fulfill({ status: 403, headers: { 'access-control-allow-origin': base }, contentType: 'application/json', body: '{}' }));
            await page.getByRole('button', { name: 'Refresh events', exact: true }).click();
            await page.getByRole('alert').waitFor();
            releaseAccess();
            await page.unroute(`${api}/v1/chapters/ph/events/${event}/duty-access`, undefined, { behavior: 'wait' });
            assert.equal(await page.getByRole('textbox', { name: 'Event reference', exact: true }).inputValue(), '', 'denial clears the selected event');
            assert.equal(await page.getByRole('link', { name: /Stage marshal/ }).count(), 0, 'late access response cannot restore a denied duty link');
            await page.unroute(`${api}/v1/chapters/ph/staff/duty-events`);
          }
          row.action = `Loaded the server-verified ${event} assignment and opened the role-specific next action.`;
        }
        // API denial is tested with the actual browser's signed account.
        if (role !== 'visitor') row.boundaries = await page.evaluate(async ({ api, role }) => {
          const token = JSON.parse(sessionStorage.getItem('wsb-local-signed-session')).token;
          const headers = { Authorization: `Bearer ${token}` };
          const result = {};
          if (role !== 'hq_admin') result.hq = (await fetch(`${api}/v1/hq/overview`, { headers })).status;
          if (!['chapter_director', 'auditor', 'hq_admin'].includes(role)) result.audit = (await fetch(`${api}/v1/chapters/ph/audit`, { headers })).status;
          if (!['chapter_director', 'hq_admin'].includes(role)) result.staff = (await fetch(`${api}/v1/chapters/ph/staff/members`, { headers })).status;
          return result;
        }, { api, role });
        for (const [boundary, status] of Object.entries(row.boundaries || {})) assert.ok([401, 403].includes(status), `${boundary} denied: ${status}`);
        assert.deepEqual(row.errors, [], 'no browser exceptions');
        row.status = row.pages.every(p => p.status === 'passed') ? 'passed' : 'failed';
      } catch (error) { row.status = 'failed'; row.error = error.message.split('\n').slice(0, 5).join('\n'); console.log(`  FAILED: ${row.error}`); }
      finally { await context.close(); saveReport(report); }
    }
  } finally { await browser.close(); }
  report.completed_at = new Date().toISOString();
  saveReport(report);
  const failed = report.roles.filter(r => r.status !== 'passed');
  console.log(`${report.roles.length - failed.length}/${report.roles.length} role demonstrations passed. Evidence: ${output}/report.json`);
  if (failed.length) process.exitCode = 1;
}
module.exports = { saveReport };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
