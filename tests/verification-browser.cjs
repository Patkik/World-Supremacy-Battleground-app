const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const base = `http://localhost:${settings.WSB_WEB_PORT || 3100}`;
const api = `http://localhost:${settings.WSB_API_PORT || 8189}`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  mkdirSync('.workspace/verification-checks', { recursive: true });
  try {
    for (const viewport of [{ width: 1365, height: 960 }, { width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.route('https://**', route => route.abort());
      const page = await context.newPage();
      const errors = [];
      page.setDefaultTimeout(60000);
      page.on('pageerror', error => errors.push(error.message));
      async function login(name) {
        await page.goto(`${base}/sign-in`, { waitUntil: 'networkidle' });
        await page.getByLabel('Email address', { exact: true }).fill(`${name}@ph.wsb.test`);
        await page.getByLabel('Password', { exact: true }).fill(settings.WSB_TEST_PASSWORD);
        await page.getByRole('button', { name: 'Sign in', exact: true }).click();
        await page.waitForURL('**/workspaces');
        await page.getByText('Assigned role:', { exact: false }).waitFor();
      }
      async function logout() {
        await page.goto(`${base}/workspaces`);
        await page.getByRole('button', { name: 'Sign out', exact: true }).click();
        await page.getByRole('link', { name: 'Sign in to continue', exact: true }).waitFor();
      }
      async function revealCase(id) {
        await page.getByRole('button', { name: 'Refresh', exact: true }).waitFor();
        const idle = () => page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Refresh' && !button.disabled));
        await idle();
        for (let i = 0; i < 100 && !(await page.locator('.verification-row').filter({ hasText: id }).count()); i++) {
          const more = page.getByRole('button', { name: 'Load more records', exact: true });
          if (!(await more.count())) break;
          await more.click(); await idle();
        }
      }

      await login('dancer1');
      const unavailable = await page.evaluate(async apiBase => {
        const token = JSON.parse(sessionStorage.getItem('wsb-local-signed-session')).token;
        const endpoints = [
          ['/v1/chapters/ph/crews/example/members/example/consent', 'POST'],
          ['/v1/chapters/ph/events/local-rehearsal/entries/example/audio', 'POST'],
          ['/v1/chapters/ph/events/local-rehearsal/divisions/local-open/dj-export', 'GET'],
        ];
        return Promise.all(endpoints.map(async ([path, method]) => (await fetch(`${apiBase}${path}`, {
          method, headers: { Authorization: `Bearer ${token}`, ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
          ...(method === 'POST' ? { body: '{}' } : {}),
        })).status));
      }, api);
      assert.deepEqual(unavailable, [501, 501, 501]);
      await page.goto(`${base}/app/verification`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Identity evidence', exact: true }).waitFor();
      // A structurally valid PDF: the production parser intentionally rejects
      // the old fixture that contained only a header and an EOF marker.
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >>',
        '<< /Length 0 >>\nstream\n\nendstream',
      ];
      let pdf = '%PDF-1.4\n'; const offsets = [0];
      objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
      const xref = Buffer.byteLength(pdf);
      pdf += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
      const syntheticFile = Buffer.from(pdf);
      await page.getByLabel('Evidence purpose', { exact: true }).selectOption('identity');
      await page.getByLabel('Document', { exact: true }).setInputFiles({ name: 'synthetic-id.pdf', mimeType: 'application/pdf', buffer: syntheticFile });
      const createOperations = [];
      let lostCreate = false;
      let lostSubmit = false;
      let createdId;
      await page.route(`${api}/v1/chapters/ph/verification`, async route => {
        if (route.request().method() !== 'POST') return route.continue();
        createOperations.push(route.request().postDataJSON().operation_id);
        if (!lostCreate) {
          lostCreate = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          createdId = (await response.json()).case_id;
          return route.abort('failed');
        }
        return route.continue();
      });
      await page.route(`${api}/v1/chapters/ph/verification/*/submit`, async route => {
        if (!lostSubmit) {
          lostSubmit = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          return route.abort('failed');
        }
        return route.continue();
      });
      await page.getByRole('button', { name: 'Upload and submit', exact: true }).click();
      await page.locator('.form-error').waitFor();
      await page.getByRole('button', { name: 'Upload and submit', exact: true }).click();
      await page.getByText('The submission could not be confirmed. Check your connection, then retry or refresh your history.', { exact: true }).waitFor();
      assert.equal(createOperations.length, 2);
      assert.equal(createOperations[0], createOperations[1]);
      const interrupted = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Finish an interrupted upload', exact: true }) }).locator('.verification-row').filter({ hasText: createdId });
      await interrupted.getByRole('button', { name: 'Check and submit', exact: true }).click();
      try { await page.getByText(/^Submission received\. Reference /).waitFor(); }
      catch (error) { console.error('Verification submission state:', await page.locator('.form-error').allTextContents(), await page.locator('[role="status"]').allTextContents()); throw error; }
      const confirmation = (await page.getByText(/^Submission received\. Reference /).innerText()).trim();
      const caseId = confirmation.match(/verify-[a-f0-9]+/)?.[0];
      if (!caseId) throw new Error(`Unrecognized submission confirmation: ${confirmation}`);
      assert.match(caseId, /^verify-[a-f0-9]+$/);
      assert.equal(caseId, createdId);
      await revealCase(caseId);
      const submission = page.locator('.verification-row').filter({ hasText: caseId });
      try { await submission.getByText('pending', { exact: true }).waitFor({ timeout: 10000 }); }
      catch (error) { console.error('Submitted row state:', await submission.allTextContents(), 'list:', await page.locator('.verification-list').innerText()); throw error; }

      await logout();
      await login('director');
      await page.goto(`${base}/admin/ph/verification`, { waitUntil: 'networkidle' });
      await revealCase(caseId);
      const record = page.locator('.verification-row').filter({ hasText: caseId });
      await record.getByRole('button', { name: 'Open private document', exact: true }).click();
      await page.locator('iframe[title^="Private evidence"]').waitFor();
      const reviewOperations = [];
      let lostReview = false;
      await page.route(`${api}/v1/chapters/ph/verification/${caseId}/review`, async route => {
        reviewOperations.push(route.request().postDataJSON().operation_id);
        if (!lostReview) {
          lostReview = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          return route.abort('failed');
        }
        return route.continue();
      });
      await record.getByRole('button', { name: 'Approve review', exact: true }).click();
      await page.locator('.form-error').waitFor();
      await record.getByRole('button', { name: 'Approve review', exact: true }).click();
      await page.getByText(`Review saved for ${caseId}.`, { exact: true }).waitFor();
      assert.equal(reviewOperations.length, 2);
      assert.equal(reviewOperations[0], reviewOperations[1]);
      await record.getByText('approved', { exact: true }).waitFor();

      await logout();
      await login('dancer1');
      await page.goto(`${base}/app/verification`, { waitUntil: 'networkidle' });
      await revealCase(caseId);
      const own = page.locator('.verification-row').filter({ hasText: caseId });
      await own.getByText('approved', { exact: true }).waitFor();
      const abandoned = await page.evaluate(async apiBase => {
        const session = JSON.parse(sessionStorage.getItem('wsb-local-signed-session'));
        const response = await fetch(`${apiBase}/v1/chapters/ph/verification`, {
          method: 'POST', headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ purpose: 'residency', operation_id: crypto.randomUUID() }),
        });
        if (!response.ok) throw new Error(`Unable to prepare interrupted case (${response.status})`);
        return response.json();
      }, api);
      await page.reload({ waitUntil: 'networkidle' });
      await revealCase(abandoned.case_id);
      const resume = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Finish an interrupted upload', exact: true }) }).locator('.verification-row').filter({ hasText: abandoned.case_id });
      await resume.getByLabel('Document for this reference', { exact: true }).setInputFiles({ name: 'synthetic-residency.pdf', mimeType: 'application/pdf', buffer: syntheticFile });
      await resume.getByRole('button', { name: 'Resume upload', exact: true }).click();
      await page.getByText(`Submission received. Reference ${abandoned.case_id}.`, { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, [], 'no browser exceptions');
      await page.screenshot({ path: `.workspace/verification-checks/participant-${viewport.width}.png`, fullPage: true });
      console.log(`PASS ${viewport.width}px: lost create and submit responses, interrupted upload resume, private review and reload recovery.`);
      await context.close();
    }
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
