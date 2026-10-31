const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const config = Object.fromEntries(readFileSync('.env.docker', 'utf8').split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
const api = `http://localhost:${config.WSB_API_PORT || 8189}`;
const firestore = `http://localhost:${config.WSB_FIRESTORE_PORT || 8188}/v1/projects/demo-wsb/databases/(default)/documents`;
async function login(email) {
  const response = await fetch(`${api}/local/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: config.WSB_TEST_PASSWORD, chapter_id: 'ph' }) });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}
async function findPageItem(url, headers, matches) {
  let cursor;
  for (let i=0;i<200;i++) {
    const query=new URLSearchParams({limit:'100',...(cursor?{cursor}:{})});
    const response=await fetch(`${url}?${query}`,{headers});assert.equal(response.status,200);
    const page=await response.json();if(page.items.some(matches))return true;
    if(!page.next_page)return false;cursor=page.next_page;
  }
  throw new Error('Pagination exceeded the test limit.');
}
async function main() {
  const path = `${api}/v1/chapters/ph/events/local-rehearsal/stage-commands`;
  if (process.argv[2] === 'recover') {
    const saved = JSON.parse(readFileSync('.workspace/stage-recovery.json', 'utf8'));
    const token = await login('marshal@ph.wsb.test');
    const response = await fetch(path, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(saved.command) });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), saved.receipt);
    if (saved.holdCommand) {
      const held = await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-holds`, { method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(saved.holdCommand) });
      assert.equal(held.status, 200);assert.deepEqual(await held.json(), saved.holdReceipt);
      const detail=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stages/${saved.holdCommand.stage_id}`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(detail.status,200);assert.equal((await detail.json()).held,true);
    }
    if(saved.lineupCommand){
      const director=await login('director@ph.wsb.test');
      const planned=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-lineup`,{method:'POST',headers:{Authorization:`Bearer ${director}`,'Content-Type':'application/json'},body:JSON.stringify(saved.lineupCommand)});assert.equal(planned.status,200);assert.deepEqual(await planned.json(),saved.lineupReceipt);
      const current=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stages/${saved.lineupCommand.stage_id}/lineup`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(current.status,200);const currentLineup=await current.json();assert.equal(currentLineup.revision,3);assert.deepEqual(currentLineup.entry_ids,saved.lineupReceipt.entry_ids);
      const history=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stages/${saved.lineupCommand.stage_id}/lineup-history`,{headers:{Authorization:`Bearer ${token}`}});assert.equal(history.status,200);assert.deepEqual((await history.json()).items.map(row=>row.revision),[1,2,3]);
    }
    if(saved.configCommand){
      const director=await login('director@ph.wsb.test');
      const configured=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-configure`,{method:'POST',headers:{Authorization:`Bearer ${director}`,'Content-Type':'application/json'},body:JSON.stringify(saved.configCommand)});assert.equal(configured.status,200);assert.deepEqual(await configured.json(),saved.configReceipt);
      const current=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stages/${saved.configCommand.stage_id}`,{headers:{Authorization:`Bearer ${director}`}});assert.equal(current.status,200);const value=await current.json();assert.equal(value.active,false);assert.equal(value.config_revision,3);
    }
    if(saved.createCommand){
      const director=await login('director@ph.wsb.test');
      const created=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-create`,{method:'POST',headers:{Authorization:`Bearer ${director}`,'Content-Type':'application/json'},body:JSON.stringify(saved.createCommand)});
      assert.equal(created.status,200);assert.deepEqual(await created.json(),saved.createReceipt);
    }
    if(saved.accessCommand){
      const director=await login('director@ph.wsb.test');
      const access=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-marshals`,{method:'POST',headers:{Authorization:`Bearer ${director}`,'Content-Type':'application/json'},body:JSON.stringify(saved.accessCommand)});
      assert.equal(access.status,200);assert.deepEqual(await access.json(),saved.accessReceipt);
    }
    console.log('PASS: saved stage, hold and assignment receipts recovered from the running stack.');
    return;
  }
  const stage = `test-${randomUUID()}`;
  const fields = { marshal_uids:{arrayValue:{values:[{stringValue:"local-ph-marshal"}]}}, stage_id: {stringValue:stage}, chapter_id:{stringValue:'ph'}, event_id:{stringValue:'local-rehearsal'}, active:{booleanValue:true}, single_performer:{booleanValue:true}, performing_entry:{nullValue:null} };
  const fixture = await fetch(`${firestore}/chapters/ph/events/local-rehearsal/stages/${stage}`, { method:'PATCH', headers:{Authorization:'Bearer owner','Content-Type':'application/json'}, body:JSON.stringify({fields}) });
  assert.equal(fixture.status, 200);
  const marshal = await login('marshal@ph.wsb.test');
  const manager = await login('manager@ph.wsb.test');
  const headers = token => ({Authorization:`Bearer ${token}`,'Content-Type':'application/json'});
  const checkin = await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/check-in`, { method:'POST', headers:headers(marshal), body:JSON.stringify({entry_id:'local-entry-ready',dancer_uid:'local-ph-manager'}) });
  assert.equal(checkin.status, 200);
  const command = (operation_id, expected_revision, position) => ({ operation_id, stage_id:stage, entry_id:'local-entry-ready', expected_revision, position });
  const send = (token, body) => fetch(path, {method:'POST',headers: token ? headers(token) : {'Content-Type':'application/json'},body:JSON.stringify(body)});
  const first = command(randomUUID(), 0, 'holding');
  assert.equal((await send(null, first)).status, 401);
  assert.equal((await send(manager, first)).status, 403);
  const initial = await send(marshal, first); assert.equal(initial.status, 200); const receipt = await initial.json();
  const stagesPath = `${api}/v1/chapters/ph/events/local-rehearsal/stages`;
  const restricted=`restricted-${randomUUID()}`;
  const restrictedFixture=await fetch(`${firestore}/chapters/ph/events/local-rehearsal/stages/${restricted}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:{...fields,stage_id:{stringValue:restricted},marshal_uids:{arrayValue:{values:[]}}}})});assert.equal(restrictedFixture.status,200);
  assert.equal((await fetch(`${stagesPath}/${restricted}`,{headers:headers(marshal)})).status,403);
  assert.equal((await fetch(`${stagesPath}/${restricted}/history`,{headers:headers(marshal)})).status,403);
  assert.equal((await send(marshal,{...first,operation_id:randomUUID(),stage_id:restricted})).status,403);
  const director=await login('director@ph.wsb.test');assert.equal((await fetch(`${stagesPath}/${restricted}`,{headers:headers(director)})).status,200);
  const createPath=`${api}/v1/chapters/ph/events/local-rehearsal/stage-create`;
  const createCommand={operation_id:randomUUID(),stage_id:`created-${randomUUID()}`,single_performer:true};
  const createSend=(token,body)=>fetch(createPath,{method:'POST',headers:token?headers(token):{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await createSend(null,createCommand)).status,401);assert.equal((await createSend(marshal,createCommand)).status,403);assert.equal((await createSend(manager,createCommand)).status,403);
  const created=await createSend(director,createCommand);assert.equal(created.status,200);const createReceipt=await created.json();assert.equal(createReceipt.held,true);assert.deepEqual(createReceipt.marshal_uids,[]);
  assert.equal((await fetch(`${api}/v1/chapters/hk/events/local-rehearsal/stage-create`,{method:'POST',headers:headers(director),body:JSON.stringify(createCommand)})).status,403);
  assert.equal((await createSend(director,{...createCommand,operation_id:randomUUID(),stage_id:'invalid/path'})).status,400);
  const createReplay=await createSend(director,createCommand);assert.equal(createReplay.status,200);assert.deepEqual(await createReplay.json(),createReceipt);
  assert.equal((await createSend(director,{...createCommand,single_performer:false})).status,409);
  assert.equal((await createSend(director,{...createCommand,operation_id:randomUUID()})).status,409);
  assert.equal((await fetch(`${stagesPath}/${createCommand.stage_id}`,{headers:headers(marshal)})).status,403);
  const configPath=`${api}/v1/chapters/ph/events/local-rehearsal/stage-configure`;
  const configSend=(token,body)=>fetch(configPath,{method:'POST',headers:token?headers(token):{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const configCommand={operation_id:randomUUID(),stage_id:createCommand.stage_id,expected_revision:0,active:false,single_performer:true};
  assert.equal((await configSend(null,configCommand)).status,401);assert.equal((await configSend(marshal,configCommand)).status,403);
  const configured=await configSend(director,configCommand);assert.equal(configured.status,200);const configReceipt=await configured.json();assert.equal(configReceipt.active,false);assert.equal(configReceipt.config_revision,1);
  const configReplay=await configSend(director,configCommand);assert.equal(configReplay.status,200);assert.deepEqual(await configReplay.json(),configReceipt);
  assert.equal((await configSend(director,{...configCommand,active:true})).status,409);
  assert.equal((await fetch(`${stagesPath}/${createCommand.stage_id}`,{headers:headers(director)})).status,200);
  assert.ok(await findPageItem(stagesPath,headers(director),value=>value.stage_id===createCommand.stage_id && !value.active));
  const reactivated=await configSend(director,{...configCommand,operation_id:randomUUID(),expected_revision:1,active:true,single_performer:false});assert.equal(reactivated.status,200);assert.equal((await reactivated.json()).config_revision,2);
  const releaseCreated=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-holds`,{method:'POST',headers:headers(director),body:JSON.stringify({operation_id:randomUUID(),stage_id:createCommand.stage_id,expected_revision:0,held:false})});assert.equal(releaseCreated.status,200);
  assert.equal((await configSend(director,{...configCommand,operation_id:randomUUID(),expected_revision:2,active:false,single_performer:false})).status,409);
  const multiAssignment=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-marshals`,{method:'POST',headers:headers(director),body:JSON.stringify({operation_id:randomUUID(),stage_id:createCommand.stage_id,expected_revision:0,marshal_uids:['local-ph-marshal']})});assert.equal(multiAssignment.status,200);
  for(const [revision,position] of [[0,'holding'],[1,'on_deck'],[2,'performing']]){assert.equal((await send(marshal,{operation_id:randomUUID(),stage_id:createCommand.stage_id,entry_id:'local-entry-ready',expected_revision:revision,position})).status,200);}
  const multiHold=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-holds`,{method:'POST',headers:headers(marshal),body:JSON.stringify({operation_id:randomUUID(),stage_id:createCommand.stage_id,expected_revision:1,held:true})});assert.equal(multiHold.status,200);
  assert.equal((await configSend(director,{...configCommand,operation_id:randomUUID(),expected_revision:2,active:false,single_performer:false})).status,409);
  assert.equal((await send(marshal,{operation_id:randomUUID(),stage_id:createCommand.stage_id,entry_id:'local-entry-ready',expected_revision:3,position:'completed'})).status,200);
  const deactivatedMulti=await configSend(director,{...configCommand,operation_id:randomUUID(),expected_revision:2,active:false,single_performer:false});assert.equal(deactivatedMulti.status,200);
  assert.equal((await fetch(`${stagesPath}/${createCommand.stage_id}`,{headers:headers(marshal)})).status,403);
  const accessPath=`${api}/v1/chapters/ph/events/local-rehearsal/stage-marshals`;
  const accessSend=(token,body)=>fetch(accessPath,{method:'POST',headers:token?headers(token):{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const revoke={operation_id:randomUUID(),stage_id:stage,expected_revision:0,marshal_uids:[]};
  assert.equal((await accessSend(null,revoke)).status,401);
  assert.equal((await accessSend(marshal,revoke)).status,403);
  assert.equal((await accessSend(manager,revoke)).status,403);
  const revoked=await accessSend(director,revoke);assert.equal(revoked.status,200);const revokedReceipt=await revoked.json();assert.equal(revokedReceipt.access_revision,1);
  const accessReplay=await accessSend(director,revoke);assert.equal(accessReplay.status,200);assert.deepEqual(await accessReplay.json(),revokedReceipt);
  assert.equal((await fetch(`${stagesPath}/${stage}`,{headers:headers(marshal)})).status,403);
  assert.equal((await send(marshal,first)).status,403);
  assert.equal((await accessSend(director,{...revoke,marshal_uids:['local-ph-marshal']})).status,409);
  assert.equal((await accessSend(director,{...revoke,operation_id:randomUUID(),marshal_uids:['local-ph-marshal']})).status,409);
  assert.equal((await accessSend(director,{operation_id:randomUUID(),stage_id:stage,expected_revision:1,marshal_uids:['local-ph-manager']})).status,403);
  const accessCommand={operation_id:randomUUID(),stage_id:stage,expected_revision:1,marshal_uids:['local-ph-marshal']};
  const restored=await accessSend(director,accessCommand);assert.equal(restored.status,200);const accessReceipt=await restored.json();assert.equal(accessReceipt.access_revision,2);
  assert.equal((await fetch(stagesPath)).status, 401);
  assert.equal((await fetch(stagesPath, {headers:headers(manager)})).status, 403);
  assert.ok(await findPageItem(stagesPath,headers(marshal),value=>value.stage_id===stage));
  assert.ok(await findPageItem(`${stagesPath}/${stage}/entries`,headers(marshal),value=>value.entry_id==='local-entry-ready' && value.revision===1));
  assert.equal((await fetch(`${api}/v1/chapters/hk/events/local-rehearsal/stages`, {headers:headers(marshal)})).status, 403);
  const replay = await send(marshal, first); assert.equal(replay.status, 200); assert.deepEqual(await replay.json(), receipt);
  assert.equal((await send(marshal, {...first,position:'on_deck'})).status, 409);
  assert.equal((await send(marshal, command(randomUUID(), 1, 'performing'))).status, 409);
  const deck=await send(marshal,command(randomUUID(),1,'on_deck'));assert.equal(deck.status,200);
  const holdPath=`${api}/v1/chapters/ph/events/local-rehearsal/stage-holds`;
  const holdCommand={operation_id:randomUUID(),stage_id:stage,expected_revision:0,held:true};
  const holdSend=(token,body)=>fetch(holdPath,{method:'POST',headers:token?headers(token):{'Content-Type':'application/json'},body:JSON.stringify(body)});
  assert.equal((await holdSend(null,holdCommand)).status,401);assert.equal((await holdSend(manager,holdCommand)).status,403);
  const held=await holdSend(marshal,holdCommand);assert.equal(held.status,200);const heldReceipt=await held.json();assert.equal(heldReceipt.held,true);assert.equal(heldReceipt.hold_revision,1);
  const lineupPath=`${api}/v1/chapters/ph/events/local-rehearsal/stage-lineup`;
  const lineupSend=(token,body)=>fetch(lineupPath,{method:'POST',headers:token?headers(token):{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const lineupCommand={operation_id:randomUUID(),stage_id:stage,expected_revision:0,entry_ids:['local-entry-ready'],reason:'Synthetic draft planning test'};
  assert.equal((await lineupSend(null,lineupCommand)).status,401);assert.equal((await lineupSend(marshal,lineupCommand)).status,403);assert.equal((await lineupSend(manager,lineupCommand)).status,403);
  const lineupResult=await lineupSend(director,lineupCommand);assert.equal(lineupResult.status,200);const lineupReceipt=await lineupResult.json();assert.equal(lineupReceipt.revision,1);
  const lineupReplay=await lineupSend(director,lineupCommand);assert.equal(lineupReplay.status,200);assert.deepEqual(await lineupReplay.json(),lineupReceipt);
  assert.equal((await lineupSend(director,{...lineupCommand,reason:'Changed reason'})).status,409);
  assert.equal((await lineupSend(director,{...lineupCommand,operation_id:randomUUID(),entry_ids:['local-entry-ready','local-entry-ready']})).status,400);
  assert.equal((await lineupSend(director,{...lineupCommand,operation_id:randomUUID(),expected_revision:1,entry_ids:['local-entry-draft']})).status,409);
  const lineupHistoryPath=`${stagesPath}/${stage}/lineup-history`;
  assert.equal((await fetch(lineupHistoryPath)).status,401);
  assert.equal((await fetch(lineupHistoryPath,{headers:headers(manager)})).status,403);
  assert.equal((await fetch(`${stagesPath}/${restricted}/lineup-history`,{headers:headers(marshal)})).status,403);
  const lineupHistory=await fetch(lineupHistoryPath,{headers:headers(marshal)});assert.equal(lineupHistory.status,200);assert.deepEqual((await lineupHistory.json()).items.map(row=>row.revision),[1]);
  const lineupRead=await fetch(`${stagesPath}/${stage}/lineup`,{headers:headers(marshal)});assert.equal(lineupRead.status,200);assert.deepEqual(await lineupRead.json(),lineupReceipt);
  assert.equal((await fetch(`${stagesPath}/${restricted}/lineup`,{headers:headers(marshal)})).status,403);
  const clearDraft=await lineupSend(director,{...lineupCommand,operation_id:randomUUID(),expected_revision:1,entry_ids:[],reason:'Synthetic revision for access check'});assert.equal(clearDraft.status,200);
  const firstLineupPage=await fetch(`${lineupHistoryPath}?limit=1`,{headers:headers(marshal)});assert.equal(firstLineupPage.status,200);const firstLineupHistory=await firstLineupPage.json();assert.ok(firstLineupHistory.next_page);
  const removeAfterPage=await accessSend(director,{operation_id:randomUUID(),stage_id:stage,expected_revision:2,marshal_uids:[]});assert.equal(removeAfterPage.status,200);
  const continuation=new URLSearchParams({limit:'1',cursor:firstLineupHistory.next_page});
  assert.equal((await fetch(`${lineupHistoryPath}?${continuation}`,{headers:headers(marshal)})).status,403);
  assert.equal((await fetch(`${stagesPath}/${stage}/lineup`,{headers:headers(marshal)})).status,403);
  const restoreAfterPage=await accessSend(director,{operation_id:randomUUID(),stage_id:stage,expected_revision:3,marshal_uids:['local-ph-marshal']});assert.equal(restoreAfterPage.status,200);
  const nextLineupPage=await fetch(`${lineupHistoryPath}?${continuation}`,{headers:headers(marshal)});assert.equal(nextLineupPage.status,200);assert.deepEqual((await nextLineupPage.json()).items.map(row=>row.revision),[2]);
  const restoredDraft=await lineupSend(director,{...lineupCommand,operation_id:randomUUID(),expected_revision:2,reason:'Synthetic restoration after access check'});assert.equal(restoredDraft.status,200);
  const heldReplay=await holdSend(marshal,holdCommand);assert.equal(heldReplay.status,200);assert.deepEqual(await heldReplay.json(),heldReceipt);
  assert.equal((await holdSend(marshal,{...holdCommand,held:false})).status,409);
  assert.equal((await send(marshal,command(randomUUID(),2,'performing'))).status,409);
  const release=await holdSend(marshal,{operation_id:randomUUID(),stage_id:stage,expected_revision:1,held:false});assert.equal(release.status,200);assert.equal((await release.json()).hold_revision,2);
  for (const [revision, position] of [[2,'performing'],[3,'completed']]) {
    const response = await send(marshal, command(randomUUID(), revision, position)); assert.equal(response.status, 200); assert.equal((await response.json()).revision, revision + 1);
  }
  const finalHold={operation_id:randomUUID(),stage_id:stage,expected_revision:2,held:true};
  const finalResponse=await holdSend(marshal,finalHold);assert.equal(finalResponse.status,200);const finalReceipt=await finalResponse.json();assert.equal(finalReceipt.hold_revision,3);
  const historyPath=`${stagesPath}/${stage}/history`;
  assert.equal((await fetch(historyPath)).status,401);
  assert.equal((await fetch(historyPath,{headers:headers(manager)})).status,403);
  const historyResponse=await fetch(`${historyPath}?limit=100`,{headers:headers(marshal)});assert.equal(historyResponse.status,200);const history=await historyResponse.json();assert.deepEqual(history.items.map(row=>row.revision),[1,2,3,4,5,6,7]);
  if (process.argv[2] === 'capture') {
    mkdirSync('.workspace', { recursive:true });
    writeFileSync('.workspace/stage-recovery.json', JSON.stringify({command:first, receipt, holdCommand:finalHold, holdReceipt:finalReceipt,accessCommand,accessReceipt,createCommand,createReceipt,configCommand,configReceipt,lineupCommand,lineupReceipt}));
  }
  console.log('PASS: signed stage creation/configuration, occupied multi-performer and unheld change rejection, stage/hold progression and assignment denial/replay/conflict checks.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
