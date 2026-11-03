// The same Firebase client SDK operations used by the entry screen, against demo-wsb only.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut } = require('firebase/auth');
const { getStorage, connectStorageEmulator, ref, getMetadata, uploadBytesResumable } = require('firebase/storage');

const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
const api = `http://127.0.0.1:${settings.WSB_API_PORT || 8189}`;
const app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-wsb', storageBucket: 'demo-wsb.appspot.com' }, `music-sdk-${randomUUID()}`);
const auth = getAuth(app);
connectAuthEmulator(auth, `http://127.0.0.1:${settings.WSB_AUTH_PORT || 9099}`, { disableWarnings: true });
const storage = getStorage(app);
connectStorageEmulator(storage, '127.0.0.1', Number(settings.WSB_STORAGE_PORT || 9199));

async function main() {
  const email = 'manager@ph.wsb.test';
  const login = await fetch(`${api}/local/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password: settings.WSB_TEST_PASSWORD, chapter_id: 'ph' }) });
  assert.equal(login.status, 200);
  const { token } = await login.json();
  const credential = await signInWithEmailAndPassword(auth, email, settings.WSB_TEST_PASSWORD);
  const base = `${api}/v1/chapters/ph/events/local-rehearsal/entries/local-entry-draft`;
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const detail = await fetch(base, { headers }); assert.equal(detail.status, 200);
  const { entry } = await detail.json();
  const command = { operation_id: randomUUID(), expected_revision: entry.revision };
  const create = () => fetch(`${base}/music-intents`, { method: 'POST', headers, body: JSON.stringify(command) });
  const created = await create(); assert.equal(created.status, 200); const intent = await created.json();
  const object = ref(storage, intent.storage_path);
  await assert.rejects(getMetadata(object), error => error.code === 'storage/object-not-found');
  // Exceed the SDK's small-file threshold to exercise resumable upload, not just multipart.
  const wav = Buffer.alloc(44 + 300 * 1024); wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(44100, 24); wav.writeUInt32LE(176400, 28); wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
  await uploadBytesResumable(object, wav, { contentType: 'audio/wav' });
  assert.equal((await getMetadata(object)).size, wav.length);
  const replay = await create(); assert.equal(replay.status, 200); assert.deepEqual(await replay.json(), intent);
  await assert.rejects(uploadBytesResumable(object, wav, { contentType: 'audio/wav' }), error => error.code === 'storage/unauthorized');
  const idToken = await credential.user.getIdToken();
  const inspect = () => fetch(`${base}/music-intents/${intent.intent_id}/inspect`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'x-firebase-id-token': idToken } });
  const first = await inspect(); assert.equal(first.status, 200); const receipt = await first.json();
  assert.equal(receipt.sha256, createHash('sha256').update(wav).digest('hex'));
  assert.equal(receipt.saved, true); assert.equal(receipt.approved, false);
  const retry = await inspect(); assert.equal(retry.status, 200); assert.deepEqual(await retry.json(), receipt);
  await signOut(auth);
  await assert.rejects(getMetadata(object), error => error.code === 'storage/unauthorized');
  await signInWithEmailAndPassword(auth, 'dancer1@ph.wsb.test', settings.WSB_TEST_PASSWORD);
  await assert.rejects(getMetadata(object), error => error.code === 'storage/unauthorized');
  console.log('PASS: Firebase SDK absent-object detection, private immutable upload and inspection recovery.');
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(() => deleteApp(app));
