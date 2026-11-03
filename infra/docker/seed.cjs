// Synthetic local fixtures only. Missing records are created; existing edits survive.
const { generateKeyPairSync, createHash } = require('node:crypto');
const { mkdirSync, existsSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
async function main() {
const project = process.env.GCLOUD_PROJECT;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const dbHost = process.env.FIRESTORE_EMULATOR_HOST;
if (project !== 'demo-wsb' || !/^firebase:\d+$/.test(authHost || '') || !/^firebase:\d+$/.test(dbHost || '')) throw new Error('Seed requires the isolated Docker demo-wsb emulators');
const password = process.env.WSB_TEST_PASSWORD;
if (!password || password.length < 16) throw new Error('Create a local password with tools/local.ps1 up');
const directory = process.env.WSB_LOCAL_KEY_DIR;
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (!existsSync(join(directory, 'signing-key.der')) && !existsSync(join(directory, 'jwks.json'))) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(join(directory, 'signing-key.der'), privateKey.export({ type: 'pkcs1', format: 'der' }), { mode: 0o600 });
  writeFileSync(join(directory, 'jwks.json'), JSON.stringify({ keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'wsb-local-1', alg: 'RS256', use: 'sig' }] }), { mode: 0o644 });
} else if (!existsSync(join(directory, 'signing-key.der')) || !existsSync(join(directory, 'jwks.json'))) throw new Error('Local signing key pair is incomplete');

async function auth(method, body) {
  const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/projects/${project}/accounts${method}`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Test account setup failed (${response.status})`);
  return response.json();
}
const accounts = [
  ['manager', 'crew_manager'], ['judge1', 'judge'], ['judge2', 'judge'], ['head', 'head_judge'],
  ['finance', 'finance'], ['registrar', 'registrar'], ['marshal', 'marshal'], ['audio', 'audio_operator'], ['director', 'chapter_director'],
  ['verifier', 'verifier'], ['auditor', 'auditor'],
  ['multichapter', 'crew_manager'],
  ['dancer1', 'dancer'], ['dancer2', 'dancer'],
  ['guardian1', 'guardian'],
  ['support', 'support'],
].map(([name, role]) => ({ uid: `local-ph-${name}`, email: `${name}@ph.wsb.test`, role, chapter: 'ph', name }))
  .concat([
    { uid: 'local-hk-manager', email: 'manager@hk.wsb.test', role: 'crew_manager', chapter: 'hk', name: 'manager' },
    { uid: 'local-hk-director', email: 'director@hk.wsb.test', role: 'chapter_director', chapter: 'hk', name: 'hk-director' },
    { uid: 'local-hk-guardian', email: 'guardian@hk.wsb.test', role: 'guardian', chapter: 'hk', name: 'hk-guardian' },
    { uid: 'local-hq-admin', email: 'hq.admin@wsb.test', role: 'hq_admin', name: 'HQ administrator' },
  ]);
for (const account of accounts) {
  const found = await auth(':lookup', { localId: [account.uid] });
  if (found.users?.length) {
    if (found.users[0].email !== account.email) throw new Error('Existing test account identity mismatch');
    continue;
  }
  await auth('', { localId: account.uid, email: account.email, password, displayName: `Local ${account.name}`, emailVerified: true });
  await auth(':update', { localId: account.uid, customAttributes: JSON.stringify({ ...(account.chapter ? { chapterId: account.chapter } : {}), role: account.role }) });
}
const base = `http://${dbHost}/v1/projects/${project}/databases/(default)/documents`;
const initialized = await fetch(`${base}/localSetup/fixture-v1`, { headers: { Authorization: 'Bearer owner' } });
function value(item) {
  if (item === null) return { nullValue: null };
  if (typeof item === 'boolean') return { booleanValue: item };
  if (typeof item === 'number') return Number.isInteger(item) ? { integerValue: String(item) } : { doubleValue: item };
  if (typeof item === 'string') return { stringValue: item };
  if (Array.isArray(item)) return { arrayValue: { values: item.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([key, item]) => [key, value(item)])) } };
}
// A one-time schema migration provisions only the new synthetic dancer accounts.
// The marker prevents a future seed run from undoing edits or deletions.
const migrated = await fetch(`${base}/localSetup/dancer-fixtures-v2`, { headers: { Authorization: 'Bearer owner' } });
if (migrated.status === 404) {
  const writes=[];
  for (const account of accounts.filter(a=>a.role==='dancer')) {
    const path=`chapters/${account.chapter}/members/${account.uid}`;
    const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});
    if(existing.ok)continue;
    if(existing.status!==404)throw new Error('Cannot inspect local dancer membership');
    writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:account.chapter,role:account.role,active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
  }
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/dancer-fixtures-v2`,fields:value({version:2,synthetic:true}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});
  if(!response.ok)throw new Error('Local dancer fixture migration failed');
}else if(!migrated.ok)throw new Error('Cannot inspect local fixture migration');
const supportMigration=await fetch(`${base}/localSetup/support-fixtures-v3`,{headers:{Authorization:'Bearer owner'}});
if(supportMigration.status===404){
  const account=accounts.find(value=>value.role==='support');const path=`chapters/ph/members/${account.uid}`;
  const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});const writes=[];
  if(existing.status===404)writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:'ph',role:'support',active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
  else if(!existing.ok)throw new Error('Cannot inspect support fixture');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/support-fixtures-v3`,fields:value({version:3,synthetic:true}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local support fixture migration failed');
}else if(!supportMigration.ok)throw new Error('Cannot inspect support fixture migration');
const hqMigration=await fetch(`${base}/localSetup/hq-membership-v1`,{headers:{Authorization:'Bearer owner'}});
if(hqMigration.status===404){
  const path='globalMembers/local-hq-admin';const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});const writes=[];
  if(existing.status===404)writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:'local-hq-admin',role:'hq_admin',active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
  else if(!existing.ok)throw new Error('Cannot inspect local HQ membership');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/hq-membership-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local HQ membership fixture migration failed');
}else if(!hqMigration.ok)throw new Error('Cannot inspect local HQ membership marker');
const guardianMigration=await fetch(`${base}/localSetup/guardian-fixture-v6`,{headers:{Authorization:'Bearer owner'}});
if(guardianMigration.status===404){
  const account=accounts.find(value=>value.role==='guardian');const path=`chapters/ph/members/${account.uid}`;
  const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});const writes=[];
  if(existing.status===404)writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:account.chapter,role:account.role,active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
  else if(!existing.ok)throw new Error('Cannot inspect guardian fixture');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/guardian-fixture-v6`,fields:value({version:6,synthetic:true}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local guardian fixture migration failed');
}else if(!guardianMigration.ok)throw new Error('Cannot inspect guardian fixture migration');
// Provision the local stage once, without restoring later edits or deletions.
const stageMigration=await fetch(`${base}/localSetup/stage-fixture-v4`,{headers:{Authorization:'Bearer owner'}});
if(stageMigration.status===404){
  const path='chapters/ph/events/local-rehearsal/stages/local-main';
  const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});const writes=[];
  if(existing.status===404)writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({stage_id:'local-main',chapter_id:'ph',event_id:'local-rehearsal',active:true,single_performer:true,performing_entry:null}).mapValue.fields},currentDocument:{exists:false}});
  else if(!existing.ok)throw new Error('Cannot inspect local stage fixture');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/stage-fixture-v4`,fields:value({version:4,synthetic:true}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local stage fixture migration failed');
}else if(!stageMigration.ok)throw new Error('Cannot inspect local stage fixture migration');
const stageAccessMarker=await fetch(`${base}/localSetup/stage-access-v5`,{headers:{Authorization:'Bearer owner'}});
if(stageAccessMarker.status===404){
  const path='chapters/ph/events/local-rehearsal/stages/local-main';const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});const writes=[];
  if(existing.ok){const document=await existing.json();if(!document.fields.marshal_uids)writes.push({update:{name:document.name,fields:value({marshal_uids:['local-ph-marshal']}).mapValue.fields},updateMask:{fieldPaths:['marshal_uids']},currentDocument:{updateTime:document.updateTime}});}
  else if(existing.status!==404)throw new Error('Cannot inspect local stage access');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/stage-access-v5`,fields:value({synthetic:true,version:5}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local stage access migration failed');
}else if(!stageAccessMarker.ok)throw new Error('Cannot inspect local stage access marker');
const audioOperatorMarker=await fetch(`${base}/localSetup/audio-operator-fixture-v1`,{headers:{Authorization:'Bearer owner'}});
if(audioOperatorMarker.status===404){
  const account=accounts.find(value=>value.role==='audio_operator');const writes=[];
  for(const path of [`chapters/ph/members/${account.uid}`,`chapters/ph/events/local-rehearsal/assignments/${account.uid}`]){
    const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});
    if(existing.status===404){
      const document=path.includes('/members/')?{uid:account.uid,chapter_id:'ph',role:'audio_operator',active:true,valid_after:0}:{uid:account.uid,event_id:'local-rehearsal',active:true};
      writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value(document).mapValue.fields},currentDocument:{exists:false}});
    }else if(!existing.ok)throw new Error('Cannot inspect audio operator fixture');
  }
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/audio-operator-fixture-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});if(!response.ok)throw new Error('Local audio operator fixture migration failed');
}else if(!audioOperatorMarker.ok)throw new Error('Cannot inspect audio operator fixture marker');
const reviewRoleMarker=await fetch(`${base}/localSetup/review-role-fixtures-v1`,{headers:{Authorization:'Bearer owner'}});
if(reviewRoleMarker.status===404){
  const writes=[];
  for(const account of accounts.filter(value=>['verifier','auditor'].includes(value.role))){
    const path=`chapters/${account.chapter}/members/${account.uid}`;
    const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});
    if(existing.status===404){
      writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:account.chapter,role:account.role,active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
    }else if(!existing.ok)throw new Error(`Cannot inspect ${account.role} fixture`);
  }
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/review-role-fixtures-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});
  if(!response.ok)throw new Error('Local reviewer and auditor fixture migration failed');
}else if(!reviewRoleMarker.ok)throw new Error('Cannot inspect reviewer role fixture marker');
const multiChapterMarker=await fetch(`${base}/localSetup/multi-chapter-fixture-v1`,{headers:{Authorization:'Bearer owner'}});
if(multiChapterMarker.status===404){
  const account=accounts.find(value=>value.name==='multichapter');
  const path=`chapters/hk/members/${account.uid}`;
  const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});
  const writes=[];
  if(existing.status===404){
    writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:'hk',role:'crew_manager',active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
  }else if(!existing.ok)throw new Error('Cannot inspect multi-chapter fixture');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/multi-chapter-fixture-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});
  if(!response.ok)throw new Error('Local multi-chapter fixture migration failed');
}else if(!multiChapterMarker.ok)throw new Error('Cannot inspect multi-chapter fixture marker');
// Add the foreign-chapter accounts used by cross-chapter denial checks.
// Older initialized stacks predate this account and skipped its primary PH
// membership while provisioning only HK. Create it once; preserve later edits.
const multiPrimaryMarker = await fetch(`${base}/localSetup/multi-chapter-primary-v2`, { headers: { Authorization: 'Bearer owner' } });
if (multiPrimaryMarker.status === 404) {
  const account = accounts.find(value => value.name === 'multichapter');
  const path = `chapters/ph/members/${account.uid}`;
  const existing = await fetch(`${base}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  const writes = [];
  if (existing.status === 404) writes.push({ update: { name: `projects/${project}/databases/(default)/documents/${path}`, fields: value({ uid: account.uid, chapter_id: 'ph', role: 'crew_manager', active: true, valid_after: 0 }).mapValue.fields }, currentDocument: { exists: false } });
  else if (!existing.ok) throw new Error('Cannot inspect primary multi-chapter fixture');
  writes.push({ update: { name: `projects/${project}/databases/(default)/documents/localSetup/multi-chapter-primary-v2`, fields: value({ synthetic: true, version: 2 }).mapValue.fields }, currentDocument: { exists: false } });
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  if (!response.ok) throw new Error('Primary multi-chapter fixture migration failed');
} else if (!multiPrimaryMarker.ok) throw new Error('Cannot inspect primary multi-chapter fixture marker');
const hkForeignMarker=await fetch(`${base}/localSetup/hk-foreign-roles-fixture-v1`,{headers:{Authorization:'Bearer owner'}});
if(hkForeignMarker.status===404){
  const writes=[];
  for(const account of accounts.filter(value=>['local-hk-director','local-hk-guardian'].includes(value.uid))){
    const path=`chapters/hk/members/${account.uid}`;
    const existing=await fetch(`${base}/${path}`,{headers:{Authorization:'Bearer owner'}});
    if(existing.status===404){
      writes.push({update:{name:`projects/${project}/databases/(default)/documents/${path}`,fields:value({uid:account.uid,chapter_id:'hk',role:account.role,active:true,valid_after:0}).mapValue.fields},currentDocument:{exists:false}});
    }else if(!existing.ok)throw new Error('Cannot inspect HK foreign-role fixture');
  }
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/hk-foreign-roles-fixture-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});
  if(!response.ok)throw new Error('Local HK foreign-role fixture migration failed');
}else if(!hkForeignMarker.ok)throw new Error('Cannot inspect HK foreign-role fixture marker');
// Add the global event-to-chapter reservation required by the public stage feed.
// This migration only fills a missing mapping for the known synthetic event.
const eventDirectoryMarker=await fetch(`${base}/localSetup/event-directory-fixture-v1`,{headers:{Authorization:'Bearer owner'}});
if(initialized.ok&&eventDirectoryMarker.status===404){
  const eventPath='chapters/ph/events/local-rehearsal';
  const eventResponse=await fetch(`${base}/${eventPath}`,{headers:{Authorization:'Bearer owner'}});
  if(!eventResponse.ok)throw new Error('Cannot verify the synthetic event before adding its directory entry');
  const eventDocument=await eventResponse.json();
  if(eventDocument.fields?.id?.stringValue!=='local-rehearsal'||eventDocument.fields?.chapter_id?.stringValue!=='ph')throw new Error('Synthetic event scope does not match the expected chapter');
  const directoryPath='eventDirectory/local-rehearsal';
  const existingDirectory=await fetch(`${base}/${directoryPath}`,{headers:{Authorization:'Bearer owner'}});
  const writes=[];
  if(existingDirectory.status===404){
    writes.push({update:{name:`projects/${project}/databases/(default)/documents/${directoryPath}`,fields:value({event_id:'local-rehearsal',chapter_id:'ph',created_at:0}).mapValue.fields},currentDocument:{exists:false}});
  }else if(existingDirectory.ok){
    const document=await existingDirectory.json();
    if(document.fields?.event_id?.stringValue!=='local-rehearsal'||document.fields?.chapter_id?.stringValue!=='ph')throw new Error('Existing event directory entry has a different owner');
  }else throw new Error('Cannot inspect the synthetic event directory entry');
  writes.push({update:{name:`projects/${project}/databases/(default)/documents/localSetup/event-directory-fixture-v1`,fields:value({synthetic:true,version:1}).mapValue.fields},currentDocument:{exists:false}});
  const response=await fetch(`${base}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes})});
  if(!response.ok)throw new Error('Local event directory fixture migration failed');
}else if(eventDirectoryMarker.status!==404&&!eventDirectoryMarker.ok)throw new Error('Cannot inspect the synthetic event directory marker');
if (initialized.ok) { console.log('Local test accounts ready; existing fixture edits and deletions preserved.'); return; }
if (initialized.status !== 404) throw new Error(`Cannot inspect local setup marker (${initialized.status})`);
const documents = new Map();
function add(path, document) { documents.set(path, document); }
const now = Math.floor(Date.now() / 1000);
add('chapters/ph', { id: 'ph', name: 'Philippines · Local test', currency: 'PHP' });
add('chapters/hk', { id: 'hk', name: 'Hong Kong · Local test', currency: 'HKD' });
for (const account of accounts.filter(account => account.chapter)) add(`chapters/${account.chapter}/members/${account.uid}`, { uid: account.uid, chapter_id: account.chapter, role: account.role, active: true, valid_after: 0 });
add('globalMembers/local-hq-admin', { uid: 'local-hq-admin', role: 'hq_admin', active: true, valid_after: 0 });
const event = 'local-rehearsal';
const division = 'local-open';
const eventPath = `chapters/ph/events/${event}`;
add(eventPath, { id: event, chapter_id: 'ph', name: 'Local rehearsal · Synthetic fixtures', status: 'registration_open', rules_version: 'local-fixture-v1' });
add(`eventDirectory/${event}`, { event_id: event, chapter_id: 'ph', created_at: now });
for (const account of accounts.filter(a => a.chapter === 'ph')) add(`${eventPath}/assignments/${account.uid}`, { uid: account.uid, event_id: event, active: true });
add(`${eventPath}/divisionState/${division}`, {
  policy: { id: division, name: 'Local open · Test policy', min_members: 1, max_members: 4, max_duration_secs: 180, max_age: null, fee_minor: 150000 },
  panel: ['local-ph-judge1', 'local-ph-judge2'], locked: false, generation: 1,
  approved_entries: 1, completed_scorecards: 0, unready_entries: 0, publication_id: null,
});
const key = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
for (const [crewId, entryId, approved] of [['local-crew-ready', 'local-entry-ready', true], ['local-crew-draft', 'local-entry-draft', false]]) {
  const members = [{ uid: 'local-ph-manager', name: 'Synthetic adult manager', role: 'Manager', is_minor: false, consent_verified: true }];
  add(`chapters/ph/crews/${crewId}`, { id: crewId, chapter_id: 'ph', name: approved ? 'Local ready crew' : 'Local payment crew', city: 'Test city', manager_uid: 'local-ph-manager', members, created_at: now });
  add(`${eventPath}/entries/${entryId}`, { entry: { id: entryId, chapter_id: 'ph', event_id: event, crew_id: crewId, division_id: division, roster: members, track_filename: approved ? 'synthetic-compliance-fixture.mp3' : null, track_duration_secs: approved ? 120 : null, paid_minor: approved ? 150000 : 0, status: approved ? 'approved' : 'draft', created_at: now, updated_at: now }, pending_minor: 0, completed_scorecards: 0 });
  add(`${eventPath}/entryIndex/${key([division, crewId])}`, { entry_id: entryId, crew_id: crewId, division_id: division });
}
const fixturePayment = 'local-fixture-settled';
add(`chapters/ph/payments/${fixturePayment}`, { payment_id: fixturePayment, chapter_id: 'ph', entry_id: 'local-entry-ready', payer_uid: 'local-ph-manager', amount_minor: 150000, currency: 'PHP', status: 'settled', provider_reference: 'synthetic-fixture', created_at: now, settled_at: now });
add(`chapters/ph/paymentLocations/${fixturePayment}`, { event_id: event, entry_id: 'local-entry-ready' });
add('localSetup/fixture-v1', { synthetic: true, version: 1, event_id: event, created_at: now });

// One atomic initial commit prevents half-seeded counters and fixtures.
const writes = [];
for (const [path, document] of documents) {
  const existing = await fetch(`${base}/${path}`, { headers: { Authorization: 'Bearer owner' } });
  if (existing.ok) continue;
  if (existing.status !== 404) throw new Error(`Cannot inspect test fixture (${existing.status})`);
  writes.push({ update: { name: `projects/${project}/databases/(default)/documents/${path}`, fields: value(document).mapValue.fields }, currentDocument: { exists: false } });
}
if (writes.length) {
  const response = await fetch(`${base}:commit`, { method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
  if (!response.ok) throw new Error(`Local fixture commit failed (${response.status})`);
}
console.log(`Local test accounts ready; created ${writes.length} missing documents. Existing data preserved.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
