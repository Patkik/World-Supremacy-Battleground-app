const assert = require('node:assert/strict');
const { chromium } = loadPlaywright();
const AxeBuilder = require('@axe-core/playwright').default;
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3100';
const expectedSiteUrl = process.env.WSB_EXPECTED_SITE_URL;

function loadPlaywright() {
  if (process.env.WSB_PLAYWRIGHT_MODULE) return require(process.env.WSB_PLAYWRIGHT_MODULE);
  try { return require('playwright'); }
  catch (error) {
    if (process.platform === 'win32') {
      try { return require('C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'); }
      catch {}
    }
    throw error;
  }
}

async function assertNoSeriousA11y(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const violations = results.violations.filter(item => ['critical', 'serious'].includes(item.impact));
  assert.deepEqual(violations.map(item => ({ id: item.id, impact: item.impact, description: item.description, nodes: item.nodes.map(node => node.target) })), [], `${label} has serious accessibility violations`);
}

async function noOverflow(page, label) {
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    offenders: [...document.querySelectorAll('*')].map(element => {
      const rect = element.getBoundingClientRect();
      return { tag: element.tagName, id: element.id, className: typeof element.className === 'string' ? element.className : '', left: Math.round(rect.left), right: Math.round(rect.right) };
    }).filter(element => element.right > innerWidth + 2 || element.left < -2).slice(0, 8),
  }));
  assert.equal(layout.width <= layout.viewport + 2, true, `${label} has horizontal overflow: ${JSON.stringify(layout)}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('https://**', route => route.abort());
    await context.route('**/v1/events/synthetic-unpublished/live', route => route.fulfill({ json: { published: false } }));
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
    await assertNoSeriousA11y(page, 'homepage');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    if (expectedSiteUrl) {
      const canonicalUrl = new URL(canonical, base);
      const configuredUrl = new URL(expectedSiteUrl);
      assert.equal(canonicalUrl.origin, configuredUrl.origin, 'canonical URL comes from the configured site base');
      assert.equal(canonicalUrl.pathname, '/', 'homepage canonical points to the site root');
      assert.equal(canonicalUrl.search + canonicalUrl.hash, '');
    }
    else assert.equal(canonical, '/', 'an unconfigured local environment does not invent a production domain');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /index, follow/i);
    const manifest = await page.request.get(`${base}/manifest.webmanifest`).then(response => response.json());
    assert.deepEqual(manifest.icons.map(icon => icon.sizes), ['192x192', '512x512', '512x512']);
    for (const icon of manifest.icons) assert.equal((await page.request.get(`${base}${icon.src}`)).ok(), true, `${icon.src} is served`);
    const robots = await page.request.get(`${base}/robots.txt`).then(response => response.text());
    assert.match(robots, /Disallow:\s*\/app/i);
    assert.match(robots, /Disallow:\s*\/console/i);
    const sitemap = await page.request.get(`${base}/sitemap.xml`).then(response => response.text());
    if (expectedSiteUrl) assert.ok(sitemap.includes(new URL('/events', expectedSiteUrl).href), 'sitemap includes public event discovery');
    else {
      assert.match(sitemap, /<urlset\b/, 'sitemap remains a valid empty XML document without a configured domain');
      assert.doesNotMatch(sitemap, /<url>/, 'sitemap does not publish placeholder hostnames');
    }
    assert.doesNotMatch(sitemap, /\/app\/|\/console\/|\/preview/);
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
    await skip.waitFor();
    assert.equal(await skip.evaluate(element => element === document.activeElement), true, 'skip link receives initial keyboard focus');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement === document.getElementById('main-content'));
    assert.equal(await page.locator('#main-content').evaluate(element => element === document.activeElement), true, 'skip link moves focus to main content');
    await noOverflow(page, 'homepage at 390px');
    await page.setViewportSize({ width: 683, height: 512 });
    await noOverflow(page, 'homepage at the 200% zoom-equivalent 683px layout width');

    await page.goto(`${base}/sign-in`, { waitUntil: 'domcontentloaded' });
    await assertNoSeriousA11y(page, 'sign-in');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/i);
    for (const name of ['Email address', 'Password']) assert.equal(await page.getByLabel(name, { exact: true }).count(), 1, `${name} has one associated field`);
    await noOverflow(page, 'sign-in at 390px');
    await page.setViewportSize({ width: 683, height: 512 });
    await noOverflow(page, 'sign-in at the 200% zoom-equivalent 683px layout width');

    await page.goto(`${base}/app/register/demo`, { waitUntil: 'domcontentloaded' });
    await assertNoSeriousA11y(page, 'registration preview');
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/i);
    await noOverflow(page, 'registration preview at 683px');

    await page.goto(`${base}/events/synthetic-unpublished`, { waitUntil: 'domcontentloaded' });
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/i);
    await page.getByRole('heading', { name: 'No event details are available', exact: true }).waitFor();
    assert.equal(await page.getByText('Afterhours Collective', { exact: true }).count(), 0, 'unpublished event details do not use preview fixtures');
    await page.goto(`${base}/events/synthetic-unpublished/results`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'No published results yet', exact: true }).waitFor();
    assert.equal(await page.getByText('Afterhours Collective', { exact: true }).count(), 0, 'empty public results do not use preview fixtures');

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(`${base}/arena-live/synthetic-unpublished`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: 'Event display is not live.', exact: true }).waitFor();
    await assertNoSeriousA11y(page, 'unpublished arena');
    assert.equal(await page.getByText('Afterhours Collective', { exact: true }).count(), 0, 'published arena route never renders preview crew data');
    await noOverflow(page, 'unpublished arena at 320px');
    await page.goto(`${base}/arena-live/demo`, { waitUntil: 'domcontentloaded' });
    await page.getByText('Display preview · fictional data', { exact: true }).waitFor();
    await page.getByRole('heading', { name: /AFTERHOURS COLLECTIVE/ }).waitFor();
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS: keyboard skip navigation, serious WCAG 2.1 A/AA scan, form labels, narrow-screen reflow and published-arena projection boundary passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
