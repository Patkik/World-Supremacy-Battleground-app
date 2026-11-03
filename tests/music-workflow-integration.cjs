// End-to-end local synthetic music workflow. No real people or audio are used.
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, signInWithEmailAndPassword } = require('firebase/auth');
const { getStorage, connectStorageEmulator, ref, uploadBytesResumable } = require('firebase/storage');
const settings = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)]; }));
const api = `http://127.0.0.1:${settings.WSB_API_PORT||8189}`;
const db = `http://127.0.0.1:${settings.WSB_FIRESTORE_PORT||8188}/v1/projects/demo-wsb/databases/(default)/documents`;
const storageApi = `http://127.0.0.1:${settings.WSB_STORAGE_PORT||9199}/v0/b/demo-wsb.appspot.com/o`;
const admin = {authorization:'Bearer owner','content-type':'application/json'};
const key = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const app = initializeApp({apiKey:'demo-key',projectId:'demo-wsb',storageBucket:'demo-wsb.appspot.com'},`music-flow-${randomUUID()}`);
const auth = getAuth(app); connectAuthEmulator(auth,`http://127.0.0.1:${settings.WSB_AUTH_PORT||9099}`,{disableWarnings:true});
const storage = getStorage(app); connectStorageEmulator(storage,'127.0.0.1',Number(settings.WSB_STORAGE_PORT||9199));
async function login(name,chapter='ph') {const r=await fetch(`${api}/local/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:`${name}@${chapter}.wsb.test`,password:settings.WSB_TEST_PASSWORD,chapter_id:chapter})});assert.equal(r.status,200);return (await r.json()).token;}
async function request(path,token,body,expected=200,extra={}) {const r=await fetch(`${api}${path}`,{method:body===undefined?'GET':'POST',headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(body===undefined?{}:{'content-type':'application/json'}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,expected,`${path}: expected ${expected}, got ${r.status}`);return expected===200?r.json():null;}
function wav(frames){const data=Buffer.alloc(44+4*frames);data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);data.writeUInt32LE(1000,24);data.writeUInt32LE(4000,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);data.write('data',36);data.writeUInt32LE(data.length-44,40);return data;}
function field(v){if(v===null)return {nullValue:null};if(Array.isArray(v))return {arrayValue:{values:v.map(field)}};if(typeof v==='boolean')return {booleanValue:v};if(typeof v==='number')return {integerValue:String(v)};return {stringValue:v};}
async function seedDoc(path,values){const r=await fetch(`${db}/${path}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,field(v)]))})});assert.equal(r.status,200);}
function zipEntries(bytes){const end=bytes.lastIndexOf(Buffer.from('504b0506','hex'));assert.ok(end>=0);let offset=bytes.readUInt32LE(end+16);const result=new Map();for(let i=0;i<bytes.readUInt16LE(end+10);i++){assert.equal(bytes.readUInt32LE(offset),0x02014b50);const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20),n=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32),name=bytes.subarray(offset+46,offset+46+n).toString(),local=bytes.readUInt32LE(offset+42);assert.equal(method,0);const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);result.set(name,bytes.subarray(start,start+size));offset+=46+n+extra+comment;}return result;}
async function main(){
 const [manager,director,registrar,dancer,foreign]=await Promise.all([login('manager'),login('director'),login('registrar'),login('dancer1'),login('manager','hk')]);
 const user=(await signInWithEmailAndPassword(auth,'manager@ph.wsb.test',settings.WSB_TEST_PASSWORD)).user;
 const firebaseToken=await user.getIdToken();
 const event='/v1/chapters/ph/events/local-rehearsal';const division=`music-flow-${randomUUID()}`;
 const divisionPath=`chapters/ph/events/local-rehearsal/divisionState/${division}`;
 const cleanup=[divisionPath,`${divisionPath}/musicPolicies/current`];const objects=[];
 const seed=await fetch(`${db}/chapters/ph/events/local-rehearsal/divisionState/local-open`,{headers:admin});assert.equal(seed.status,200);
 const fields=structuredClone((await seed.json()).fields);fields.policy.mapValue.fields.id.stringValue=division;fields.locked.booleanValue=false;for(const counter of ['generation','approved_entries','completed_scorecards','unready_entries'])fields[counter].integerValue='0';fields.publication_id={nullValue:null};
 try {
  assert.equal((await fetch(`${db}/${divisionPath}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields})})).status,200);
  const entryOp=randomUUID();const crew='local-crew-draft';
  cleanup.push(`chapters/ph/registrationOperations/${key(['local-ph-manager',entryOp])}`,`chapters/ph/audit/${key(['registration','local-ph-manager',entryOp])}`,`chapters/ph/events/local-rehearsal/entryIndex/${key([division,crew])}`);
  const entry=await request(`${event}/entries`,manager,{operation_id:entryOp,crew_id:crew,division_id:division});
  const entryPath=`${event}/entries/${entry.id}`;cleanup.push(`chapters/ph/events/local-rehearsal/entries/${entry.id}`,`chapters/ph/musicSubmissions/${key(['local-rehearsal',entry.id])}`);
  const before=await request(entryPath,manager);assert.equal(before.readiness.music_ready,false);
  const policyOp=randomUUID();cleanup.push(`chapters/ph/musicPolicyOperations/${key(['local-ph-director',policyOp])}`,`chapters/ph/audit/${key(['music-policy','local-ph-director',policyOp])}`);
  const policy=await request(`${event}/divisions/${division}/music-policy`,director,{operation_id:policyOp,expected_revision:0,max_duration_ms:2,grace_ms:0,source:'Synthetic rehearsal only'});assert.equal(policy.status,'draft');
  const advisory=()=>request(`${entryPath}/music-submission/advisory`,manager);
  assert.equal((await advisory()).state,'no_submission');
  const makeSubmission=async(frames,expectedVersion)=>{
    const intentOp=randomUUID(),submitOp=randomUUID();
    const intent=await request(`${entryPath}/music-intents`,manager,{operation_id:intentOp,expected_revision:entry.revision});
    objects.push(intent.storage_path);
    cleanup.push(`chapters/ph/musicIntents/${intent.intent_id}`,`chapters/ph/musicInspections/${intent.intent_id}`,`chapters/ph/audit/${key(['music-intent','local-ph-manager',intentOp])}`,`chapters/ph/audit/${key(['music-inspection',intent.intent_id])}`,`chapters/ph/musicSubmissionOperations/${key(['local-ph-manager',submitOp])}`,`chapters/ph/audit/${key(['music-submission','local-ph-manager',submitOp])}`);
    await uploadBytesResumable(ref(storage,intent.storage_path),wav(frames),{contentType:'audio/wav'});
    const result=await request(`${entryPath}/music-intents/${intent.intent_id}/submit`,manager,{operation_id:submitOp,expected_revision:entry.revision,expected_version:expectedVersion},200,{'x-firebase-id-token':firebaseToken});
    assert.equal(result.status,'pending_review');return {intent,result};
  };
  const first=await makeSubmission(1,0);const firstAdvice=await advisory();assert.equal(firstAdvice.state,'within_draft');assert.equal(firstAdvice.duration_ms,1);
  const audio=await fetch(`${api}${entryPath}/music-submission/audio`,{headers:{authorization:`Bearer ${registrar}`}});assert.equal(audio.status,200);assert.deepEqual(Buffer.from(await audio.arrayBuffer()),wav(1));
  await request(`${entryPath}/music-submission/advisory`,dancer,undefined,403);await request(`${entryPath}/music-submission/advisory`,foreign,undefined,403);
  const reviewOp=randomUUID();cleanup.push(`chapters/ph/musicReviewOperations/${key(['local-ph-registrar',reviewOp])}`,`chapters/ph/audit/${key(['music-review','local-ph-registrar',reviewOp])}`);
  const correction=await request(`${entryPath}/music-submission/review`,registrar,{operation_id:reviewOp,expected_version:first.result.version,decision:'needs_correction',note:'Synthetic replacement requested'});assert.equal(correction.status,'needs_correction');
  const visible=await request(`${entryPath}/music-submission`,manager);assert.equal(visible.review_note,'Synthetic replacement requested');
  const second=await makeSubmission(3,correction.version);assert.notEqual(second.intent.intent_id,first.intent.intent_id);assert.notEqual(second.result.sha256,first.result.sha256);
  const secondAdvice=await advisory();assert.equal(secondAdvice.state,'exceeds_draft');assert.equal(secondAdvice.duration_ms,3);assert.equal(secondAdvice.submission_version,second.result.version);
  const updatedAudio=await fetch(`${api}${entryPath}/music-submission/audio`,{headers:{authorization:`Bearer ${registrar}`}});assert.equal(updatedAudio.status,200);assert.deepEqual(Buffer.from(await updatedAudio.arrayBuffer()),wav(3));
  const after=await request(entryPath,manager);assert.deepEqual(after.readiness,before.readiness);
  const finalReviewOp=randomUUID();cleanup.push(`chapters/ph/musicReviewOperations/${key(['local-ph-registrar',finalReviewOp])}`,`chapters/ph/audit/${key(['music-review','local-ph-registrar',finalReviewOp])}`);
  const reviewed=await request(`${entryPath}/music-submission/review`,registrar,{operation_id:finalReviewOp,expected_version:second.result.version,decision:'reviewed',note:'Synthetic review'});assert.equal(reviewed.status,'reviewed');
  // Isolated test fixture: approval is synthetic and does not establish actual readiness.
  const rawEntry=await fetch(`${db}/chapters/ph/events/local-rehearsal/entries/${entry.id}`,{headers:admin});const entryFields=(await rawEntry.json()).fields;entryFields.entry.mapValue.fields.status={stringValue:'approved'};
  assert.equal((await fetch(`${db}/chapters/ph/events/local-rehearsal/entries/${entry.id}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields:entryFields})})).status,200);
  const stage=`test-${randomUUID()}`,stagePath=`chapters/ph/events/local-rehearsal/stages/${stage}`;cleanup.push(stagePath,`${stagePath}/planning/current`);
  await seedDoc(stagePath,{stage_id:stage,chapter_id:'ph',event_id:'local-rehearsal',active:true,single_performer:true,performing_entry:null});
  await seedDoc(`${stagePath}/planning/current`,{stage_id:stage,chapter_id:'ph',event_id:'local-rehearsal',revision:1,entry_ids:[entry.id],reason:'Synthetic export',updated_by:'local-ph-director',updated_at:Math.floor(Date.now()/1000)});
  const exported=await fetch(`${api}${event}/dj-export`,{headers:{authorization:`Bearer ${director}`}});assert.equal(exported.status,200);
  const files=zipEntries(Buffer.from(await exported.arrayBuffer()));const track=[...files.entries()].find(([name])=>name.startsWith(`${stage}/`)&&name.endsWith('.wav'));assert.ok(track);assert.deepEqual(track[1],wav(3));
  const manifest=files.get('manifest.csv').toString('utf8');assert.ok(manifest.includes(entry.id));assert.ok(manifest.includes(second.result.sha256));
  const inspectionUrl=`${db}/chapters/ph/musicInspections/${second.intent.intent_id}`;
  const inspectionResponse=await fetch(inspectionUrl,{headers:admin});assert.equal(inspectionResponse.status,200);const inspectionFields=(await inspectionResponse.json()).fields;
  try {
    const altered=structuredClone(inspectionFields);altered.sha256.stringValue='0'.repeat(64);
    assert.equal((await fetch(inspectionUrl,{method:'PATCH',headers:admin,body:JSON.stringify({fields:altered})})).status,200);
    const rejected=await fetch(`${api}${event}/dj-export`,{headers:{authorization:`Bearer ${director}`}});assert.equal(rejected.status,409);
  } finally {
    assert.equal((await fetch(inspectionUrl,{method:'PATCH',headers:admin,body:JSON.stringify({fields:inspectionFields})})).status,200);
  }
  // Emulator-only corruption: replace the synthetic object without changing its inspection record.
  assert.ok((await fetch(`${storageApi}/${encodeURIComponent(second.intent.storage_path)}`,{method:'DELETE',headers:{authorization:'Bearer owner'}})).ok);
  const alteredBytes=wav(3);alteredBytes[alteredBytes.length-1]^=1;
  const replacement=await fetch(`${storageApi}?name=${encodeURIComponent(second.intent.storage_path)}`,{method:'POST',headers:{authorization:'Bearer owner','content-type':'audio/wav'},body:alteredBytes});assert.ok(replacement.ok);
  const interrupted=await fetch(`${api}${event}/dj-export`,{headers:{authorization:`Bearer ${director}`}});assert.equal(interrupted.status,200);
  let invalidArchive=false;try {zipEntries(Buffer.from(await interrupted.arrayBuffer()));} catch {invalidArchive=true;}
  assert.equal(invalidArchive,true,'changed bytes must not produce a complete archive');
  console.log('PASS: synthetic music upload, correction, review and DJ archive with verified audio bytes; readiness unchanged before the isolated approval fixture.');
 } finally {
  let cleanupFailed=false;
  for(const path of objects) {const r=await fetch(`${storageApi}/${encodeURIComponent(path)}`,{method:'DELETE',headers:{authorization:'Bearer owner'}});if(!r.ok&&r.status!==404)cleanupFailed=true;}
  for(const path of cleanup.reverse()) {const r=await fetch(`${db}/${path}`,{method:'DELETE',headers:admin});if(!r.ok&&r.status!==404)cleanupFailed=true;}
  if(cleanupFailed)throw new Error('Could not remove all synthetic rehearsal records.');
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;}).finally(()=>deleteApp(app));
