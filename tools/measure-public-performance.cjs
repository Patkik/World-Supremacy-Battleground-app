const { chromium } = require('playwright');

const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3100';

async function capture(page, client, label, clearCache) {
  if (clearCache) await client.send('Network.clearBrowserCache');
  const transfers = new Map();
  client.removeAllListeners('Network.requestWillBeSent');
  client.removeAllListeners('Network.responseReceived');
  client.removeAllListeners('Network.loadingFinished');
  client.on('Network.requestWillBeSent', event => transfers.set(event.requestId, { url: event.request.url, type: 'Other', cached: false, bytes: 0 }));
  client.on('Network.responseReceived', event => {
    const item = transfers.get(event.requestId);
    if (item) { item.type = event.type; item.cached = event.response.fromDiskCache || event.response.fromServiceWorker; }
  });
  client.on('Network.loadingFinished', event => {
    const item = transfers.get(event.requestId);
    if (item) item.bytes = event.encodedDataLength;
  });
  await page.goto(`${base}/`, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(2000);
  const vitals = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const lcp = window.__wsbLcp || null;
    const shifts = window.__wsbShifts || 0;
    return {
      lcpMs: lcp?.startTime ?? null,
      lcpElement: lcp?.element ? {
        tag: lcp.element.tagName,
        className: typeof lcp.element.className === 'string' ? lcp.element.className : '',
        text: (lcp.element.textContent || '').trim().slice(0, 80),
        source: lcp.element.currentSrc || lcp.element.src || undefined,
      } : null,
      cls: shifts,
      loadEventMs: navigation?.loadEventEnd ?? null,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      resourceCount: performance.getEntriesByType('resource').length,
    };
  });
  const values = [...transfers.values()];
  const byType = {};
  for (const value of values) byType[value.type] = (byType[value.type] || 0) + value.bytes;
  const scriptResources = values.filter(value => value.type === 'Script' && value.url.includes('/_next/static/chunks/')).map(({ url, bytes }) => ({ url, bytes }));
  return {
    cache: label,
    ...vitals,
    encodedTransferBytes: values.reduce((sum, value) => sum + value.bytes, 0),
    transferBytesByType: byType,
    scriptResources,
    largestResponses: values.filter(value => value.bytes > 0).sort((a, b) => b.bytes - a.bytes).slice(0, 8).map(({ url, type, bytes, cached }) => ({ url, type, bytes, cached })),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const motionContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
    await motionContext.route('https://www.youtube.com/iframe_api', route => route.abort());
    const motionPage = await motionContext.newPage();
    motionPage.on('pageerror', error => { throw error; });
    await motionPage.addInitScript(() => {
      window.__wsbLcp = null;
      window.__wsbShifts = 0;
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length) window.__wsbLcp = entries[entries.length - 1];
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__wsbShifts += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const motionClient = await motionContext.newCDPSession(motionPage);
    await motionClient.send('Network.enable');
    const motionAllowed = await capture(motionPage, motionClient, 'local-cold-motion-allowed', true);
    await motionContext.close();

    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__wsbLcp = null;
      window.__wsbShifts = 0;
      new PerformanceObserver(list => {
        const entries = list.getEntries();
        if (entries.length) window.__wsbLcp = entries[entries.length - 1];
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__wsbShifts += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    const localCold = await capture(page, client, 'local-cold-cache', true);
    const localWarm = await capture(page, client, 'local-warm-cache', false);
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: 200 * 1024,
      uploadThroughput: 75 * 1024,
      connectionType: 'cellular4g',
    });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const constrainedCold = await capture(page, client, 'simulated-mobile-cold-cache', true);
    const constrainedWarm = await capture(page, client, 'simulated-mobile-warm-cache', false);
    const reducedScripts = new Set(constrainedCold.scriptResources.map(resource => resource.url));
    const motionOnlyScripts = motionAllowed.scriptResources.filter(resource => !reducedScripts.has(resource.url));
    if (motionOnlyScripts.length === 0) throw new Error('Expected at least one motion engine chunk to load only when motion is allowed.');
    console.log(JSON.stringify({
      kind: 'local-lab-measurement',
      site: base,
      browser: await browser.version(),
      viewport: '390x844',
      reducedMotion: true,
      motionAllowedScriptBytes: motionAllowed.transferBytesByType.Script || 0,
      reducedMotionScriptBytes: constrainedCold.transferBytesByType.Script || 0,
      motionOnlyScripts,
      networkProfiles: [
        'Unthrottled loopback server; external poster requested normally.',
        'Synthetic 150 ms latency, 1.6 Mbps down, 0.6 Mbps up and 4x CPU slowdown; not a carrier trace.',
      ],
      results: [motionAllowed, localCold, localWarm, constrainedCold, constrainedWarm].map(result => ({
        cache: result.cache,
        lcpMs: result.lcpMs,
        lcpElement: result.lcpElement,
        cls: result.cls,
        loadEventMs: result.loadEventMs,
        encodedTransferBytes: result.encodedTransferBytes,
        transferBytesByType: result.transferBytesByType,
      })),
      limitations: ['Lab-only result; not field Web Vitals.', 'INP is not estimated without representative interaction.', 'Browser and machine are a developer workstation, not a venue device.'],
    }, null, 2));
    await context.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
