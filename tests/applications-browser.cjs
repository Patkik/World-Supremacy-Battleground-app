const assert = require('node:assert/strict');
const { readFileSync, mkdirSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const base = `http://localhost:${settings.WSB_WEB_PORT || 3100}`;
const api = `http://localhost:${settings.WSB_API_PORT || 8189}`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  mkdirSync('.workspace/application-checks', { recursive: true });
  try {
    for (const [width, kind] of [[1365, 'chapter'], [390, 'studio'], [1365, 'partner']]) {
      const visitorContext = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      const reviewerContext = await browser.newContext({ viewport: { width, height: 960 }, reducedMotion: 'reduce' });
      for (const context of [visitorContext, reviewerContext]) await context.route('https://**', route => route.abort());
      const page = await visitorContext.newPage();
      const reviewer = await reviewerContext.newPage();
      const errors = [];
      for (const tab of [page, reviewer]) { tab.setDefaultTimeout(60000); tab.on('pageerror', error => errors.push(error.message)); }
      await page.goto(`${base}/partners`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Verified listings will appear here', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Send a partnership proposal', exact: true }).getAttribute('href'), '/community/apply?type=partner');
      assert.equal(await page.getByText('Monster Energy', { exact: true }).count(), 0);
      await page.goto(`${base}/community/studios`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'No verified studio listings are available here yet', exact: true }).waitFor();
      assert.equal(await page.getByRole('link', { name: 'Propose a studio hub', exact: true }).getAttribute('href'), '/community/apply?type=studio');
      await page.goto(`${base}/community/apply?type=${kind}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Bring your community into the movement', exact: true }).waitFor();
      const form = page.locator('.application-form');
      await form.getByLabel('Proposal type', { exact: true }).selectOption(`${kind}_application`);
      for (let attempt = 0; attempt < 100 && !(await page.locator('#application-chapter option[value="ph"]').count()); attempt++) await page.waitForTimeout(100);
      await form.getByLabel('Regional chapter team', { exact: true }).selectOption('ph');
      const organization = `Synthetic ${kind} ${randomUUID()}`;
      const label = kind === 'chapter' ? 'Chapter partnership proposal' : kind === 'studio' ? 'Studio hub proposal' : 'Partner collaboration proposal';
      const subject = `${label}: ${organization}`;
      const organizationField = kind === 'chapter' ? 'Proposed chapter name' : kind === 'studio' ? 'Studio name' : 'Organization name';
      await form.getByLabel(organizationField, { exact: true }).fill(organization);
      await form.getByLabel('City and country or territory', { exact: true }).fill('Synthetic test region');
      await form.getByLabel('Your role in the organization', { exact: true }).fill('Synthetic coordinator');
      await form.getByLabel('Your name', { exact: true }).fill('Synthetic applicant');
      await form.getByLabel('Contact email', { exact: true }).fill(`application-${randomUUID()}@example.test`);
      await form.getByLabel('Website or public profile (optional)', { exact: true }).fill('https://example.test/community');
      await form.getByLabel('Tell the team about your proposal', { exact: true }).fill('Synthetic proposal details for local workflow verification.');
      await form.getByRole('button', { name: 'Send proposal for review', exact: true }).click();
      await page.getByRole('heading', { name: 'Your proposal is with the selected chapter team', exact: true }).waitFor();
      const reference = (await page.locator('.application-receipt .mono').innerText()).trim();
      assert.match(reference, /^inquiry-[a-f0-9]+$/);
      const key = await page.getByLabel('Private access key', { exact: true }).inputValue();
      assert.match(key, /^[a-f0-9]{64}$/);
      await page.screenshot({ path: `.workspace/application-checks/applicant-${kind}-${width}.png`, fullPage: true });

      await reviewer.goto(`${base}/sign-in`, { waitUntil: 'networkidle' });
      await reviewer.getByLabel('Email address', { exact: true }).fill('support@ph.wsb.test');
      await reviewer.getByLabel('Password', { exact: true }).fill(settings.WSB_TEST_PASSWORD);
      await reviewer.getByRole('button', { name: 'Sign in', exact: true }).click();
      await reviewer.waitForURL('**/workspaces');
      await reviewer.goto(`${base}/admin/ph/support`);
      await reviewer.getByRole('heading', { name: 'Chapter support', exact: true }).waitFor();
      await reviewer.waitForFunction(() => document.querySelector('.inquiry-list article') || document.querySelector('.support-workspace')?.innerText.includes('No requests found'));
      const applicationHeading = reviewer.getByRole('heading', { name: subject, exact: true });
      for (let pageNumber = 0; pageNumber < 30 && !(await applicationHeading.count()); pageNumber++) {
        const more = reviewer.getByRole('button', { name: 'Load more requests', exact: true });
        if (!(await more.count())) break;
        await more.click();
        await reviewer.waitForTimeout(100);
      }
      if (!(await applicationHeading.count())) throw new Error(`Application not found in support queue pages: ${await reviewer.locator('.inquiry-list').innerText()}`);
      const application = reviewer.locator('article').filter({ hasText: subject });
      assert.match(await application.innerText(), new RegExp(`${kind}_application`));
      await application.getByRole('button', { name: 'Open conversation', exact: true }).click();
      await reviewer.locator('.inquiry-messages').getByText(/Synthetic proposal details for local workflow verification/).waitFor();
      await reviewer.getByLabel('Reply visible to requester', { exact: true }).fill('Synthetic review response: request received for follow-up.');
      await reviewer.getByLabel('Request status', { exact: true }).selectOption('waiting_on_requester');
      await reviewer.getByRole('button', { name: 'Save response', exact: true }).click();
      await reviewer.getByText('Synthetic review response: request received for follow-up.', { exact: true }).waitFor();

      const denied = await fetch(`${api}/v1/chapters/ph/contact/${reference}`, { headers: { Authorization: `Contact ${'0'.repeat(64)}` } });
      assert.equal(denied.status, 404);
      await page.reload({ waitUntil: 'networkidle' });
      await page.getByRole('button', { name: new RegExp(`PH · ${reference}`) }).click();
      await page.getByText('Synthetic review response: request received for follow-up.', { exact: true }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.equal(await reviewer.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `.workspace/application-checks/thread-${kind}-${width}.png`, fullPage: true });
      console.log(`PASS ${width}px ${kind}: native proposal form, durable reference, private request key, authorized chapter review, reload recovery and reply visibility.`);
      await visitorContext.close();
      await reviewerContext.close();
    }
  } finally { await browser.close(); }
}

main().catch(error => { console.error(error.stack); process.exitCode = 1; });
