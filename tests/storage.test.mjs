import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const env = await initializeTestEnvironment({
  projectId: 'demo-wsb',
  firestore: {
    rules: await readFile('infra/firebase/firestore.rules', 'utf8'),
    host: (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')[0],
    port: Number((process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':').at(-1)),
  },
  storage: {
    rules: await readFile('infra/firebase/storage.rules', 'utf8'),
    host: (process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':')[0],
    port: Number((process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199').split(':').at(-1)),
  },
});
const marker = randomUUID().replaceAll('-', '');
const recordPath = (chapter, caseId) => `chapters/${chapter}/verificationCases/${caseId}`;
const objectPath = (chapter, uid, caseId) => `chapters/${chapter}/verification/${uid}/${caseId}/document`;
const testDocs = new Set();
const testObjects = new Set();

after(async () => {
  await env.withSecurityRulesDisabled(async context => {
    for (const path of testObjects) {
      try { await deleteObject(ref(context.storage(), path)); } catch { /* Failed uploads leave no object. */ }
    }
    for (const path of testDocs) await context.firestore().doc(path).delete();
  });
  await env.cleanup();
});

async function seed(chapter, uid, role, caseId) {
  testDocs.add(`chapters/${chapter}/members/${uid}`);
  testDocs.add(recordPath(chapter, caseId));
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc(`chapters/${chapter}/members/${uid}`).set({
      uid, chapter_id: chapter, role, active: true, valid_after: 0,
    });
    await context.firestore().doc(recordPath(chapter, caseId)).set({
      case_id: caseId, chapter_id: chapter, dancer_uid: uid,
      purpose: 'identity', status: 'uploading',
      storage_path: objectPath(chapter, uid, caseId),
    });
  });
}

test('owner uploads and reads private evidence; unrelated uid and chapter cannot read it', async () => {
  const chapter = `ph-${marker}`;
  const uid = `dancer-${marker}`;
  const caseId = `case-${marker}`;
  await seed(chapter, uid, 'dancer', caseId);
  const owner = env.authenticatedContext(uid, { chapterId: chapter, role: 'dancer' }).storage();
  const storedObject = objectPath(chapter, uid, caseId);
  testObjects.add(storedObject);
  const object = ref(owner, storedObject);
  await assertSucceeds(uploadBytes(object, new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' }));
  assert.equal((await assertSucceeds(getBytes(object))).byteLength, 4);

  const other = env.authenticatedContext(`other-${marker}`, { chapterId: chapter, role: 'dancer' }).storage();
  await assertFails(getBytes(ref(other, objectPath(chapter, uid, caseId))));
  const wrongChapter = env.authenticatedContext(uid, { chapterId: 'hk', role: 'dancer' }).storage();
  await assertFails(getBytes(ref(wrongChapter, objectPath(chapter, uid, caseId))));
});

test('only active authorized chapter reviewers can read a submitted chapter file', async () => {
  const chapter = `ph-review-${marker}`;
  const uid = `owner-${marker}`;
  const caseId = `review-${marker}`;
  const object = objectPath(chapter, uid, caseId);
  await seed(chapter, uid, 'dancer', caseId);
  await seed(chapter, `reviewer-${marker}`, 'verifier', `reviewer-case-${marker}`);
  const otherChapter = `hk-review-${marker}`;
  await seed(otherChapter, `reviewer-hk-${marker}`, 'verifier', `hk-case-${marker}`);
  await seed(chapter, `inactive-${marker}`, 'verifier', `inactive-case-${marker}`);
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc(`chapters/${chapter}/members/reviewer-${marker}`).set({
      uid: `reviewer-${marker}`, chapter_id: chapter, role: 'verifier', active: true, valid_after: 0,
    });
    await context.firestore().doc(`chapters/${otherChapter}/members/reviewer-hk-${marker}`).set({
      uid: `reviewer-hk-${marker}`, chapter_id: otherChapter, role: 'verifier', active: true, valid_after: 0,
    });
    await context.firestore().doc(`chapters/${chapter}/members/inactive-${marker}`).set({
      uid: `inactive-${marker}`, chapter_id: chapter, role: 'verifier', active: false, valid_after: 0,
    });
  });
  const owner = env.authenticatedContext(uid, { chapterId: chapter, role: 'dancer' }).storage();
  testObjects.add(object);
  await assertSucceeds(uploadBytes(ref(owner, object), new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  const reviewer = env.authenticatedContext(`reviewer-${marker}`, { chapterId: chapter, role: 'verifier' }).storage();
  // Reviewer reads are gated on a pending case with a clean malware-scan receipt.
  await assertFails(getBytes(ref(reviewer, object)));
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc(recordPath(chapter, caseId)).update({ status: 'pending', malware_scan_status: 'clean' });
  });
  assert.equal((await assertSucceeds(getBytes(ref(reviewer, object)))).byteLength, 3);
  const outsider = env.authenticatedContext(`reviewer-hk-${marker}`, { chapterId: otherChapter, role: 'verifier' }).storage();
  await assertFails(getBytes(ref(outsider, object)));
  const inactive = env.authenticatedContext(`inactive-${marker}`, { chapterId: chapter, role: 'verifier' }).storage();
  await assertFails(getBytes(ref(inactive, object)));
});

test('upload policy denies missing chapter membership, unsupported MIME and oversized files', async () => {
  const chapter = `ph-limits-${marker}`;
  const uid = `limits-${marker}`;
  const badMimeCase = `bad-mime-${marker}`;
  const largeCase = `large-${marker}`;
  await seed(chapter, uid, 'dancer', badMimeCase);
  await seed(chapter, uid, 'dancer', largeCase);
  const owner = env.authenticatedContext(uid, { chapterId: chapter, role: 'dancer' }).storage();
  const badMimeObject = objectPath(chapter, uid, badMimeCase);
  const oversizedObject = objectPath(chapter, uid, largeCase);
  testObjects.add(badMimeObject);
  testObjects.add(oversizedObject);
  await assertFails(uploadBytes(ref(owner, badMimeObject), new Uint8Array([1]), { contentType: 'text/plain' }));
  await assertFails(uploadBytes(ref(owner, oversizedObject), new Uint8Array(10 * 1024 * 1024 + 1), { contentType: 'application/pdf' }));
  const unprovisioned = env.authenticatedContext(`missing-${marker}`, { chapterId: chapter, role: 'dancer' }).storage();
  await assertFails(uploadBytes(ref(unprovisioned, objectPath(chapter, uid, badMimeCase)), new Uint8Array([1]), { contentType: 'application/pdf' }));
});

test('music objects require an active manager and matching unexpired intent, and are immutable', async () => {
  const chapter = `music-${marker}`;
  const uid = `manager-${marker}`;
  const intentId = `intent-${marker}`;
  const memberPath = `chapters/${chapter}/members/${uid}`;
  const intentPath = `chapters/${chapter}/musicIntents/${intentId}`;
  const objectPath = `chapters/${chapter}/music/${uid}/${intentId}/track`;
  testDocs.add(memberPath); testDocs.add(intentPath); testObjects.add(objectPath);
  const member = { uid, chapter_id:chapter, role:'crew_manager', active:true, valid_after:0 };
  const intent = { intent_id:intentId, chapter_id:chapter, owner_uid:uid, storage_path:objectPath, status:'awaiting_upload', expires_at:Math.floor(Date.now()/1000)+3600 };
  await env.withSecurityRulesDisabled(async context => {
    await context.firestore().doc(memberPath).set(member);
    await context.firestore().doc(intentPath).set(intent);
  });
  const owner = env.authenticatedContext(uid,{chapterId:chapter,role:'crew_manager',auth_time:Math.floor(Date.now()/1000)}).storage();
  const wrongChapter = env.authenticatedContext(uid,{chapterId:'hk',role:'crew_manager',auth_time:Math.floor(Date.now()/1000)}).storage();
  const outsider = env.authenticatedContext(`other-${marker}`,{chapterId:chapter,role:'crew_manager',auth_time:Math.floor(Date.now()/1000)}).storage();
  const object = ref(owner,objectPath);
  await assertFails(uploadBytes(ref(wrongChapter,objectPath),new Uint8Array([1]),{contentType:'audio/wav'}));
  await assertFails(uploadBytes(ref(outsider,objectPath),new Uint8Array([1]),{contentType:'audio/wav'}));
  await assertFails(uploadBytes(object,new Uint8Array([1]),{contentType:'audio/ogg'}));
  await assertFails(uploadBytes(object,new Uint8Array(25*1024*1024+1),{contentType:'audio/wav'}));
  await assertFails(uploadBytes(ref(owner,objectPath.replace('/track','/other')),new Uint8Array([1]),{contentType:'audio/wav'}));
  await assertFails(uploadBytes(ref(owner,objectPath.replace(intentId,'missing-intent')),new Uint8Array([1]),{contentType:'audio/wav'}));
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(memberPath).update({valid_after:Math.floor(Date.now()/1000)+300}); });
  await assertFails(uploadBytes(object,new Uint8Array([1]),{contentType:'audio/wav'}));
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(memberPath).update({valid_after:0}); });
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(intentPath).update({status:'submitted'}); });
  await assertFails(uploadBytes(object,new Uint8Array([1]),{contentType:'audio/wav'}));
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(intentPath).update({status:'awaiting_upload'}); });
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(intentPath).update({expires_at:1}); });
  await assertFails(uploadBytes(object,new Uint8Array([1]),{contentType:'audio/wav'}));
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(intentPath).update({expires_at:intent.expires_at}); });
  await assertSucceeds(uploadBytes(object,new Uint8Array([1,2,3]),{contentType:'audio/wav'}));
  assert.equal((await assertSucceeds(getBytes(object))).byteLength,3);
  // MP3 uploads are accepted alongside WAV; both stay immutable once written.
  const mpegIntentId = `intent-mpeg-${marker}`;
  const mpegIntentPath = `chapters/${chapter}/musicIntents/${mpegIntentId}`;
  const mpegObjectPath = `chapters/${chapter}/music/${uid}/${mpegIntentId}/track`;
  testDocs.add(mpegIntentPath); testObjects.add(mpegObjectPath);
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(mpegIntentPath).set({ ...intent, intent_id: mpegIntentId, storage_path: mpegObjectPath }); });
  await assertSucceeds(uploadBytes(ref(owner, mpegObjectPath), new Uint8Array([1, 2, 3]), { contentType: 'audio/mpeg' }));
  await assertFails(uploadBytes(ref(owner, mpegObjectPath), new Uint8Array([4]), { contentType: 'audio/mpeg' }));
  await assertFails(uploadBytes(object,new Uint8Array([4]),{contentType:'audio/wav'}));
  await assertFails(deleteObject(object));
  await assertFails(getBytes(ref(outsider,objectPath)));
  await env.withSecurityRulesDisabled(async context => { await context.firestore().doc(memberPath).update({active:false}); });
  await assertFails(getBytes(object));
});
