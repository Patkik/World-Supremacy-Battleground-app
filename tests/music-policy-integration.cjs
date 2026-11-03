// Synthetic local policy only; no real event rules or credentials are printed.
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {randomUUID,createHash}=require('node:crypto');
const settings=Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const api=`http://127.0.0.1:${settings.WSB_API_PORT||8189}`;
const db=`http://127.0.0.1:${settings.WSB_FIRESTORE_PORT||8188}/v1/projects/demo-wsb/databases/(default)/documents`;
const admin={authorization:'Bearer owner','content-type':'application/json'};
const hash=parts=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const fieldsOf=value=>Object.fromEntries(Object.entries(value).map(([key,item])=>[key,item===null?{nullValue:null}:typeof item==='number'?{integerValue:String(item)}:{stringValue:item}]));
async function login(name,chapter='ph'){const r=await fetch(`${api}/local/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:`${name}@${chapter}.wsb.test`,password:settings.WSB_TEST_PASSWORD,chapter_id:chapter})});assert.equal(r.status,200);return (await r.json()).token;}
async function main(){
 const [director,registrar,manager,dancer,foreign]=await Promise.all([login('director'),login('registrar'),login('manager'),login('dancer1'),login('manager','hk')]);
 const division=`music-test-${randomUUID()}`;
 const entry=`music-entry-${randomUUID()}`;
 const root=`chapters/ph/events/local-rehearsal/divisionState/${division}`;
 const entryPath=`chapters/ph/events/local-rehearsal/entries/${entry}`;
 const entryUrl=`${api}/v1/chapters/ph/events/local-rehearsal/entries/${entry}`;
 const base=`${api}/v1/chapters/ph/events/local-rehearsal/divisions/${division}/music-policy`;
 const original=await fetch(`${db}/chapters/ph/events/local-rehearsal/divisionState/local-open`,{headers:admin});assert.equal(original.status,200);
 const fields=structuredClone((await original.json()).fields);fields.policy.mapValue.fields.id.stringValue=division;fields.locked.booleanValue=false;
 assert.equal((await fetch(`${db}/${root}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields})})).status,200);
 const originalEntry=await fetch(`${db}/chapters/ph/events/local-rehearsal/entries/local-entry-draft`,{headers:admin});assert.equal(originalEntry.status,200);
 const entryFields=structuredClone((await originalEntry.json()).fields);entryFields.entry.mapValue.fields.id.stringValue=entry;entryFields.entry.mapValue.fields.division_id.stringValue=division;
 assert.equal((await fetch(`${db}/${entryPath}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields:entryFields})})).status,200);
 const initialEntry=await fetch(entryUrl,{headers:{authorization:`Bearer ${manager}`}});assert.equal(initialEntry.status,200);const initialReadiness=(await initialEntry.json()).readiness;
 const operation=randomUUID();
 const intent=randomUUID();const digest='a'.repeat(64);
 const receiptPath=`chapters/ph/musicInspections/${intent}`;
 const submissionPath=`chapters/ph/musicSubmissions/${hash(['local-rehearsal',entry])}`;
 const receipt={intent_id:intent,chapter_id:'ph',event_id:'local-rehearsal',entry_id:entry,owner_uid:'local-ph-manager',entry_revision:0,sha256:digest,size_bytes:48,duration_ms:127000,sample_rate:1000,channels:2,bits_per_sample:16};
 const submission={...receipt,version:1,status:'pending_review',submitted_at:1};
 const put=async(path,value)=>{const r=await fetch(`${db}/${path}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields:fieldsOf(value)})});assert.equal(r.status,200);};
 const advisory=token=>fetch(`${entryUrl}/music-submission/advisory`,{headers:{...(token?{authorization:`Bearer ${token}`}:{})}});
 const data={operation_id:operation,expected_revision:0,max_duration_ms:123000,grace_ms:4000,source:'Synthetic local test policy; not an official WSB rule.'};
 const get=token=>fetch(base,{headers:{...(token?{authorization:`Bearer ${token}`}:{})}});
 const save=(body=data,token=director)=>fetch(base,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
 try {
  assert.equal((await get(null)).status,401);
  assert.equal((await get(manager)).status,403);assert.equal((await get(foreign)).status,403);
  assert.equal((await get(registrar)).status,200);assert.equal(await (await get(director)).json(),null);
  assert.equal((await advisory(null)).status,401);assert.equal((await advisory(foreign)).status,403);assert.equal((await advisory(dancer)).status,403);
  assert.equal((await (await advisory(manager)).json()).state,'no_submission');
  await put(receiptPath,receipt);await put(submissionPath,submission);
  assert.equal((await (await advisory(manager)).json()).state,'no_draft_policy');
  assert.equal((await save(data,registrar)).status,403);assert.equal((await save(data,foreign)).status,403);
  assert.equal((await save({...data,operation_id:randomUUID(),source:''})).status,400);
  assert.equal((await save({...data,operation_id:randomUUID(),max_duration_ms:0})).status,400);
  const results=await Promise.all([save(),save()]);for(const r of results){assert.equal(r.status,200);const policy=await r.json();assert.equal(policy.status,'draft');assert.equal(policy.revision,1);assert.equal(policy.grace_ms,4000);}
  assert.equal((await save({...data,grace_ms:5000})).status,409);
  assert.equal((await save({...data,operation_id:randomUUID()})).status,409);
  assert.equal((await (await get(registrar)).json()).revision,1);
  const boundary=await (await advisory(registrar)).json();assert.equal(boundary.state,'within_draft');assert.equal(boundary.advisory,true);assert.equal(boundary.duration_ms,127000);
  await put(receiptPath,{...receipt,duration_ms:127001});await put(submissionPath,{...submission,duration_ms:127001});
  assert.equal((await (await advisory(manager)).json()).state,'exceeds_draft');
  await put(receiptPath,receipt);assert.equal((await advisory(manager)).status,409);
  await put(submissionPath,submission);
  const policyUrl=`${db}/${root}/musicPolicies/current`;const policyDoc=await (await fetch(policyUrl,{headers:admin})).json();const stale=structuredClone(policyDoc.fields);stale.rules_version.stringValue='different-version';
  assert.equal((await fetch(policyUrl,{method:'PATCH',headers:admin,body:JSON.stringify({fields:stale})})).status,200);
  assert.equal((await (await advisory(manager)).json()).state,'stale_draft');
  assert.equal((await fetch(policyUrl,{method:'PATCH',headers:admin,body:JSON.stringify({fields:policyDoc.fields})})).status,200);
  const unchanged=await fetch(entryUrl,{headers:{authorization:`Bearer ${manager}`}});assert.deepEqual((await unchanged.json()).readiness,initialReadiness);
  fields.locked.booleanValue=true;assert.equal((await fetch(`${db}/${root}`,{method:'PATCH',headers:admin,body:JSON.stringify({fields})})).status,200);
  assert.equal((await save({...data,operation_id:randomUUID(),expected_revision:1})).status,409);
  console.log('PASS: synthetic draft policy, advisory boundaries, stale guidance, authorization, replay and unchanged readiness.');
 } finally {
  for(const path of [`${root}/musicPolicies/current`,submissionPath,receiptPath,entryPath,root,`chapters/ph/musicPolicyOperations/${hash(['local-ph-director',operation])}`,`chapters/ph/audit/${hash(['music-policy','local-ph-director',operation])}`]) await fetch(`${db}/${path}`,{method:'DELETE',headers:admin});
 }
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
