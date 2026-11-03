const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3100';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const first = await context.newPage();
    await first.goto(`${base}/offline`, { waitUntil: 'domcontentloaded' });
    await first.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/sw.js?build=offline-release-a', { scope: '/', updateViaCache: 'none' });
      await new Promise((resolve, reject) => {
        if (registration.active) return resolve();
        const worker = registration.installing || registration.waiting;
        if (!worker) return reject(new Error('Initial offline worker did not install.'));
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
          if (worker.state === 'redundant') reject(new Error('Initial offline worker became redundant.'));
        });
      });
      const request = indexedDB.open('wsb-judge-outbox-v1', 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('operations')) db.createObjectStore('operations', { keyPath: 'key' }).createIndex('owner', 'owner');
        if (!db.objectStoreNames.contains('cached_lineups')) db.createObjectStore('cached_lineups', { keyPath: 'key' }).createIndex('owner', 'owner');
      };
      const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('operations', 'readwrite');
        tx.objectStore('operations').put({ key: 'pending-operation-1', owner: 'synthetic-judge', state: 'queued', operationId: 'op-synthetic-1' });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
      return (await caches.keys()).filter(name => name.startsWith('wsb-offline-'));
    });
    const firstCaches = await first.evaluate(() => caches.keys());
    assert(firstCaches.includes('wsb-offline-offline-release-a'), 'first build has its own cache');
    await first.close();

    const updating = await context.newPage();
    await updating.goto(`${base}/offline`, { waitUntil: 'domcontentloaded' });
    await updating.evaluate(async () => {
      const registration = await navigator.serviceWorker.register('/sw.js?build=offline-release-b', { scope: '/', updateViaCache: 'none' });
      await new Promise((resolve, reject) => {
        const deadline = Date.now() + 30000;
        const check = () => {
          if (registration.waiting?.state === 'installed') return resolve();
          if (Date.now() > deadline) return reject(new Error('Updated offline worker did not reach the waiting state.'));
          setTimeout(check, 100);
        };
        check();
      });
    });
    await updating.close();

    const recovered = await context.newPage();
    await recovered.goto(`${base}/offline`, { waitUntil: 'domcontentloaded' });
    await recovered.waitForFunction(() => navigator.serviceWorker.getRegistration().then(registration => registration?.active?.scriptURL.includes('build=offline-release-b')));
    const state = await recovered.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const request = indexedDB.open('wsb-judge-outbox-v1', 2);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const operation = await new Promise((resolve, reject) => {
        const request = db.transaction('operations', 'readonly').objectStore('operations').get('pending-operation-1');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return { caches: await caches.keys(), operation };
    });
    assert(state.caches.includes('wsb-offline-offline-release-b'), 'updated build has a new offline shell cache');
    assert(!state.caches.includes('wsb-offline-offline-release-a'), 'activation retires the old static cache');
    assert.equal(state.operation?.state, 'queued', 'queued operation survives the app upgrade');
    assert.equal(state.operation?.operationId, 'op-synthetic-1', 'operation identity survives the app upgrade');
    await context.close();
    console.log('PASS: service worker upgrade replaces versioned shell assets while preserving queued IndexedDB work.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
