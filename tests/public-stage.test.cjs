const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const ts = require('typescript');
const file = require('node:path').resolve('apps/web/src/lib/public-stage.ts');
const mod = new Module(file, module);
mod._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { parseStageProjection, pollStage } = mod.exports;
const valid = { published: true, event: 'Synthetic event', chapter: 'Synthetic chapter', held: false, performers: [{ crew: 'Synthetic crew', division: 'Open' }], updated_at: 1 };
const tick = () => new Promise(resolve => setImmediate(resolve));
test('stage payload rejects malformed network data and projects only public fields', () => {
  for (const value of [null, [], {}, { ...valid, performers: {} }, { ...valid, performers: [null] }, { ...valid, updated_at: -1 }, { ...valid, held: 'false' }]) assert.throws(() => parseStageProjection(value));
  assert.deepEqual(parseStageProjection({ ...valid, private: 'discard' }), valid);
  assert.deepEqual(parseStageProjection({ published: false, event: 'discard' }), { published: false });
});
test('polling waits for completion, backs off on invalid data and preserves valid state', async () => {
  let resolve; let calls = 0; let accepted; let failed = 0; const scheduled = [];
  const stop = pollStage({ load: () => { calls++; return new Promise(r => resolve = r); }, accept: v => accepted = v, fail: () => failed++, visible: () => true, schedule: (fn, delay) => { scheduled.push({ fn, delay }); return scheduled.length; }, cancel: () => {} });
  assert.equal(calls, 1); assert.equal(scheduled.length, 0);
  resolve(valid); await tick(); assert.deepEqual(accepted, valid); assert.equal(scheduled[0].delay, 5000);
  scheduled.shift().fn(); resolve({ ...valid, performers: null }); await tick();
  assert.equal(failed, 1); assert.deepEqual(accepted, valid); assert.equal(scheduled[0].delay, 10000);
  stop();
});
test('cleanup aborts requests and ignores a response after leaving the event', async () => {
  let resolve; let signal; let writes = 0;
  const stop = pollStage({ load: s => { signal = s; return new Promise(r => resolve = r); }, accept: () => writes++, fail: () => writes++, visible: () => true });
  stop(); assert.equal(signal.aborted, true); resolve(valid); await tick(); assert.equal(writes, 0);
});
test('hidden displays do not fetch and resume on the next scheduled check', async () => {
  let visible = false; let calls = 0; const scheduled = [];
  const stop = pollStage({ load: async () => { calls++; return valid; }, accept: () => {}, fail: () => {}, visible: () => visible, schedule: fn => { scheduled.push(fn); return scheduled.length; }, cancel: () => {} });
  assert.equal(calls, 0); visible = true; scheduled.shift()(); await tick(); assert.equal(calls, 1); stop();
});
