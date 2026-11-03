// Synthetic local accounts and Firebase emulators only; never print tokens or file contents.
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { randomUUID, createHash } = require('node:crypto');
const settings = Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
const api = `http://localhost:${settings.WSB_API_PORT||8189}`;
const auth = `http://localhost:${settings.WSB_AUTH_PORT||9099}`;
const storage = `http://localhost:${settings.WSB_STORAGE_PORT||9199}/v0/b/demo-wsb.appspot.com/o`;
const database = `http://localhost:${settings.WSB_FIRESTORE_PORT||8188}/v1/projects/demo-wsb/databases/(default)/documents`;
async function main() {
  const login = await fetch(`${api}/local/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'manager@ph.wsb.test',password:settings.WSB_TEST_PASSWORD,chapter_id:'ph'})});
  assert.equal(login.status,200); const session=await login.json();
  const firebase = await fetch(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'manager@ph.wsb.test',password:settings.WSB_TEST_PASSWORD,returnSecureToken:true})});
  assert.equal(firebase.status,200); const identity=await firebase.json();
  const base=`${api}/v1/chapters/ph/events/local-rehearsal/entries/local-entry-draft`;
  const headers={authorization:`Bearer ${session.token}`,'content-type':'application/json'};
  if (process.argv.includes('--recover')) {
    const saved=JSON.parse(readFileSync('.workspace/music-storage-recovery.json','utf8'));
    const replay=await fetch(`${base}/music-intents`,{method:'POST',headers,body:JSON.stringify(saved.body)});assert.equal(replay.status,200);assert.deepEqual(await replay.json(),saved.intent);
    const object=`${storage}/${encodeURIComponent(saved.intent.storage_path)}?alt=media`;
    const read=await fetch(object,{headers:{authorization:`Firebase ${identity.idToken}`}});assert.equal(read.status,200);assert.equal((await read.arrayBuffer()).byteLength,48);
    const receiptUrl=`${database}/chapters/ph/musicInspections/${saved.intent.intent_id}`;
    const before=await fetch(receiptUrl,{headers:{authorization:'Bearer owner'}});assert.equal(before.status,200);const receipt=await before.json();
    const inspected=await fetch(`${base}/music-intents/${saved.intent.intent_id}/inspect`,{method:'POST',headers:{authorization:`Bearer ${session.token}`,'x-firebase-id-token':identity.idToken}});
    assert.equal(inspected.status,200);assert.equal((await inspected.json()).duration_ms,1);
    if(saved.submission){
      const recovered=await fetch(`${base}/music-submission`,{headers});assert.equal(recovered.status,200);assert.equal((await recovered.json()).version,saved.submission.expected_version+(saved.review2?4:saved.resubmission?3:saved.review?2:1));
      const retry=await fetch(`${base}/music-intents/${saved.intent.intent_id}/submit`,{method:'POST',headers:{...headers,'x-firebase-id-token':identity.idToken},body:JSON.stringify(saved.submission)});assert.equal(retry.status,200);assert.equal((await retry.json()).version,saved.submission.expected_version+1);
      if(saved.review2){const director=await fetch(`${api}/local/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'director@ph.wsb.test',password:settings.WSB_TEST_PASSWORD,chapter_id:'ph'})});assert.equal(director.status,200);const directorSession=await director.json();const replayReview=await fetch(`${base}/music-submission/review`,{method:'POST',headers:{authorization:`Bearer ${directorSession.token}`,'content-type':'application/json'},body:JSON.stringify(saved.review2)});assert.equal(replayReview.status,200);assert.equal((await replayReview.json()).version,saved.submission.expected_version+4);}
    }
    const after=await fetch(receiptUrl,{headers:{authorization:'Bearer owner'}});assert.deepEqual((await after.json()).fields,receipt.fields);
    console.log('PASS: saved music intent, private object, inspection and submission recovered.');return;
  }
  const detail=await fetch(base,{headers}); assert.equal(detail.status,200); const initial=await detail.json(); const entry=initial.entry;
  const body={operation_id:randomUUID(),expected_revision:entry.revision};
  const created=await fetch(`${base}/music-intents`,{method:'POST',headers,body:JSON.stringify(body)}); assert.equal(created.status,200); const intent=await created.json();
  const inspectPath=`${base}/music-intents/${encodeURIComponent(intent.intent_id)}/inspect`;
  const inspect=(token=session.token,fb=identity.idToken)=>fetch(inspectPath,{method:'POST',headers:{...(token?{authorization:`Bearer ${token}`}:{ }),...(fb?{'x-firebase-id-token':fb}:{})}});
  assert.equal((await inspect(null,identity.idToken)).status,401);
  assert.equal((await inspect(session.token,null)).status,401);
  assert.equal((await inspect()).status,404);
  const wav=Buffer.alloc(48);wav.write('RIFF',0);wav.writeUInt32LE(40,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(1000,24);wav.writeUInt32LE(4000,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(4,40);
  const upload=()=>fetch(`${storage}?uploadType=media&name=${encodeURIComponent(intent.storage_path)}`,{method:'POST',headers:{authorization:`Firebase ${identity.idToken}`,'content-type':'audio/wav'},body:wav});
  assert.equal((await upload()).status,200);
  assert.equal((await upload()).status,403);
  const object=`${storage}/${encodeURIComponent(intent.storage_path)}?alt=media`;
  const read=await fetch(object,{headers:{authorization:`Firebase ${identity.idToken}`}});assert.equal(read.status,200);assert.deepEqual(Buffer.from(await read.arrayBuffer()),wav);
  assert.notEqual((await fetch(object)).status,200);
  const inspected=await Promise.all([inspect(),inspect()]);
  for(const response of inspected){assert.equal(response.status,200);assert.deepEqual(await response.json(),{format:'wav',duration_ms:1,sample_rate:1000,channels:2,bits_per_sample:16,sha256:createHash('sha256').update(wav).digest('hex'),saved:true,approved:false});}
  const receiptResponse=await fetch(`${database}/chapters/ph/musicInspections/${intent.intent_id}`,{headers:{authorization:'Bearer owner'}});assert.equal(receiptResponse.status,200);
  const receipt=await receiptResponse.json();assert.equal(receipt.fields.sha256.stringValue,createHash('sha256').update(wav).digest('hex'));assert.equal(receipt.fields.duration_ms.integerValue,'1');
  const auditId=createHash('sha256').update(JSON.stringify(['music-inspection',intent.intent_id])).digest('hex');
  const auditUrl=`${database}/chapters/ph/audit/${auditId}`;
  const auditBefore=await fetch(auditUrl,{headers:{authorization:'Bearer owner'}});assert.equal(auditBefore.status,200);const audit=await auditBefore.json();
  assert.equal((await inspect()).status,200);
  const auditAfter=await fetch(auditUrl,{headers:{authorization:'Bearer owner'}});assert.deepEqual((await auditAfter.json()).fields,audit.fields);
  const changedReceipt=structuredClone(receipt.fields);changedReceipt.sha256.stringValue='0'.repeat(64);
  const receiptUrl=`${database}/chapters/ph/musicInspections/${intent.intent_id}`;
  assert.equal((await fetch(receiptUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:changedReceipt})})).status,200);
  assert.equal((await inspect()).status,409);
  assert.equal((await fetch(receiptUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:receipt.fields})})).status,200);
  const dancerLogin=await fetch(`${auth}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'dancer1@ph.wsb.test',password:settings.WSB_TEST_PASSWORD,returnSecureToken:true})});assert.equal(dancerLogin.status,200);
  const dancerIdentity=await dancerLogin.json();
  assert.equal((await inspect(session.token,dancerIdentity.idToken)).status,403);
  const previous=await fetch(`${base}/music-submission`,{headers});assert.equal(previous.status,200);
  const version=(await previous.json())?.version ?? 0;
  const submitPath=`${base}/music-intents/${intent.intent_id}/submit`;
  const submission={operation_id:randomUUID(),expected_revision:entry.revision,expected_version:version};
  const submit=(payload=submission,token=session.token,fb=identity.idToken)=>fetch(submitPath,{method:'POST',headers:{...(token?{authorization:`Bearer ${token}`}:{ }),'content-type':'application/json',...(fb?{'x-firebase-id-token':fb}:{})},body:JSON.stringify(payload)});
  assert.equal((await submit(submission,null,identity.idToken)).status,401);
  assert.equal((await submit(submission,session.token,null)).status,401);
  assert.equal((await submit(submission,session.token,dancerIdentity.idToken)).status,403);
  const roleLogin=async (name,chapter='ph')=>{const response=await fetch(`${api}/local/session`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:`${name}@${chapter}.wsb.test`,password:settings.WSB_TEST_PASSWORD,chapter_id:chapter})});assert.equal(response.status,200);return (await response.json()).token;};
  const dancerToken=await roleLogin('dancer1');
  assert.equal((await submit(submission,dancerToken,identity.idToken)).status,403);
  assert.equal((await fetch(`${base}/music-submission`,{headers:{authorization:`Bearer ${dancerToken}`}})).status,403);
  const foreignToken=await roleLogin('manager','hk');
  assert.equal((await fetch(`${base}/music-submission`,{headers:{authorization:`Bearer ${foreignToken}`}})).status,403);
  const submitted=await Promise.all([submit(),submit()]);
  for(const response of submitted){assert.equal(response.status,200);const data=await response.json();assert.equal(data.status,'pending_review');assert.equal(data.version,version+1);assert.equal(data.sha256,createHash('sha256').update(wav).digest('hex'));}
  const current=await fetch(`${base}/music-submission`,{headers});assert.equal((await current.json()).version,version+1);
  assert.equal((await submit({...submission,expected_version:version+1})).status,409);
  assert.equal((await submit({...submission,operation_id:randomUUID()})).status,409);
  const directorToken=await roleLogin('director');
  assert.equal((await fetch(`${base}/music-submission`,{headers:{authorization:`Bearer ${directorToken}`}})).status,200);
  const audioPath=`${base}/music-submission/audio`;
  assert.equal((await fetch(audioPath)).status,401);
  for(const token of [session.token,dancerToken,foreignToken]) assert.equal((await fetch(audioPath,{headers:{authorization:`Bearer ${token}`}})).status,403);
  const audio=await fetch(audioPath,{headers:{authorization:`Bearer ${directorToken}`}});assert.equal(audio.status,200);assert.equal(audio.headers.get('content-type'),'audio/wav');assert.match(audio.headers.get('cache-control'),/no-store/);assert.deepEqual(Buffer.from(await audio.arrayBuffer()),wav);
  const registrarToken=await roleLogin('registrar');
  assert.equal((await fetch(audioPath,{headers:{authorization:`Bearer ${registrarToken}`}})).status,200);
  const assignmentUrl=`${database}/chapters/ph/events/local-rehearsal/assignments/local-ph-registrar`;
  const assignment=await (await fetch(assignmentUrl,{headers:{authorization:'Bearer owner'}})).json();
  const inactive=structuredClone(assignment.fields);inactive.active.booleanValue=false;
  try {
    assert.equal((await fetch(assignmentUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:inactive})})).status,200);
    assert.equal((await fetch(audioPath,{headers:{authorization:`Bearer ${registrarToken}`}})).status,403);
    assert.equal((await fetch(`${base}/music-submission/review`,{method:'POST',headers:{authorization:`Bearer ${registrarToken}`,'content-type':'application/json'},body:JSON.stringify({operation_id:randomUUID(),expected_version:version+1,decision:'reviewed',note:''})})).status,403);
  } finally {
    assert.equal((await fetch(assignmentUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:assignment.fields})})).status,200);
  }
  const submissionId=createHash('sha256').update(JSON.stringify(['local-rehearsal','local-entry-draft'])).digest('hex');
  const submissionUrl=`${database}/chapters/ph/musicSubmissions/${submissionId}`;
  const savedSubmission=await (await fetch(submissionUrl,{headers:{authorization:'Bearer owner'}})).json();
  const altered=structuredClone(savedSubmission.fields);altered.sha256.stringValue='0'.repeat(64);
  try {
    assert.equal((await fetch(submissionUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:altered})})).status,200);
    assert.equal((await fetch(audioPath,{headers:{authorization:`Bearer ${directorToken}`}})).status,409);
  } finally {
    assert.equal((await fetch(submissionUrl,{method:'PATCH',headers:{authorization:'Bearer owner','content-type':'application/json'},body:JSON.stringify({fields:savedSubmission.fields})})).status,200);
  }
  const review={operation_id:randomUUID(),expected_version:version+1,decision:'needs_correction',note:'Synthetic test: replace the file.'};
  const reviewPath=`${base}/music-submission/review`;
  const reviewCall=(body=review,token=directorToken)=>fetch(reviewPath,{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});
  assert.equal((await reviewCall(review,null)).status,401);
  assert.equal((await reviewCall(review,dancerToken)).status,403);
  assert.equal((await reviewCall(review,foreignToken)).status,403);
  assert.equal((await reviewCall({...review,operation_id:randomUUID(),note:''})).status,400);
  const decisions=await Promise.all([reviewCall(),reviewCall()]);
  for(const response of decisions){assert.equal(response.status,200);const value=await response.json();assert.equal(value.status,'needs_correction');assert.equal(value.version,version+2);assert.equal(value.review_note,review.note);}
  const managerView=await (await fetch(`${base}/music-submission`,{headers})).json();assert.equal(managerView.status,'needs_correction');assert.equal(managerView.review_note,review.note);
  assert.equal((await reviewCall({...review,note:'Different'})).status,409);
  assert.equal((await reviewCall({...review,operation_id:randomUUID()})).status,409);
  const resubmission={operation_id:randomUUID(),expected_revision:entry.revision,expected_version:version+2};
  const resubmitted=await submit(resubmission);assert.equal(resubmitted.status,200);const next=await resubmitted.json();assert.equal(next.version,version+3);assert.equal(next.status,'pending_review');assert.equal(next.review_note,null);
  const replayedReview=await reviewCall();assert.equal(replayedReview.status,200);assert.equal((await replayedReview.json()).version,version+2);
  const review2={operation_id:randomUUID(),expected_version:version+3,decision:'reviewed',note:''};
  const completed=await reviewCall(review2);assert.equal(completed.status,200);const reviewed=await completed.json();assert.equal(reviewed.status,'reviewed');assert.equal(reviewed.version,version+4);assert.equal(reviewed.review_note,null);
  const invalidIntentResponse=await fetch(`${base}/music-intents`,{method:'POST',headers,body:JSON.stringify({operation_id:randomUUID(),expected_revision:entry.revision})});assert.equal(invalidIntentResponse.status,200);
  const invalidIntent=await invalidIntentResponse.json();
  assert.equal((await fetch(`${storage}?uploadType=media&name=${encodeURIComponent(invalidIntent.storage_path)}`,{method:'POST',headers:{authorization:`Firebase ${identity.idToken}`,'content-type':'audio/wav'},body:Buffer.from('not wav')})).status,200);
  assert.equal((await fetch(`${base}/music-intents/${invalidIntent.intent_id}/inspect`,{method:'POST',headers:{authorization:`Bearer ${session.token}`,'x-firebase-id-token':identity.idToken}})).status,422);
  assert.equal((await fetch(`${database}/chapters/ph/musicInspections/${invalidIntent.intent_id}`,{headers:{authorization:'Bearer owner'}})).status,404);
  const replay=await fetch(`${base}/music-intents`,{method:'POST',headers,body:JSON.stringify(body)});assert.equal(replay.status,200);assert.deepEqual(await replay.json(),intent);
  const unchanged=await fetch(base,{headers});const state=await unchanged.json();assert.equal(state.entry.revision,entry.revision);assert.deepEqual(state.readiness,initial.readiness);
  mkdirSync('.workspace',{recursive:true});writeFileSync('.workspace/music-storage-recovery.json',JSON.stringify({body,intent,submission,review,resubmission,review2}));
  console.log('PASS: synthetic WAV submission, review, correction, replay and role isolation; readiness unchanged.');
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
