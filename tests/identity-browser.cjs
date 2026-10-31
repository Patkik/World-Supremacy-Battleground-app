/* Run only with: firebase emulators:exec --project demo-wsb --only auth
   "node tests/identity-browser.cjs" and the development web app on 3108. */
const assert = require('node:assert/strict');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base = process.env.WSB_IDENTITY_URL || 'http://localhost:3108';
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('https://**', route => route.abort());
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const email = `wsb-synthetic-${Date.now()}@example.test`;
    const password = 'Synthetic-Password-1829'; const nextPassword = 'Synthetic-Password-2830';
    async function code(type) {
      for (let attempt = 0; attempt < 20; attempt++) {
        const response = await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-wsb/oobCodes');
        const data = await response.json();
        const value = data.oobCodes?.find(item => item.email === email && item.requestType === type);
        if (value) return value.oobCode;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      throw new Error(`Expected emulator ${type} action`);
    }
    await page.goto(base + '/sign-up', { waitUntil: 'networkidle' });
    await page.getByLabel('Your name', { exact: true }).fill('Synthetic Account');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.waitForURL('**/verify-email');
    const verifyCode = await code('VERIFY_EMAIL');
    await page.goto(`${base}/auth/action?mode=verifyEmail&oobCode=${encodeURIComponent(verifyCode)}`);
    await page.getByText('Email verified. Your chapter membership is checked separately.', { exact: true }).waitFor();
    await page.goto(base + '/workspaces');
    await page.getByText('Your chapter membership is awaiting approval.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.goto(base + '/sign-in');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/workspaces');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.goto(base + '/forgot-password');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Send reset link', exact: true }).click();
    await page.getByText('a reset link has been sent.', { exact: false }).waitFor();
    const resetCode = await code('PASSWORD_RESET');
    await page.goto(`${base}/auth/action?mode=resetPassword&oobCode=${encodeURIComponent(resetCode)}`);
    await page.getByLabel('New password', { exact: true }).fill(nextPassword);
    await page.getByRole('button', { name: 'Save password', exact: true }).click();
    await page.getByText('Password changed. You can now sign in.', { exact: true }).waitFor();
    await page.goto(base + '/sign-in');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(nextPassword);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.waitForURL('**/workspaces');
    await page.goto(`${base}/auth/action?mode=verifyEmail&oobCode=invalid-synthetic-code`);
    await page.locator('.form-error[role=alert]').waitFor();
    assert.ok((await page.locator('.form-error[role=alert]').textContent()).trim().length > 0);
    assert.equal(await page.getByText('Email verified. Your chapter membership is checked separately.', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    console.log('demo-wsb identity workflow passed: signup, verification, membership gate, signout, signin, reset, new-password signin and invalid-link rejection.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
