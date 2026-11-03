// End-to-end API checks against an isolated synthetic chapter in the local stack.
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const project = process.env.GCLOUD_PROJECT;
if (project !== 'demo-wsb' || !/^firebase:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') || !/^firebase:\d+$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) throw new Error('Only the Docker demo-wsb stack is allowed');
const api = 'http://api:8088';
const base = `http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/demo-wsb/databases/(default)/documents`;
const file = '/local-identity/recovery-check.json';
const key = parts => createHash('sha256').update(JSON.stringify(parts)).digest('hex');
function storedZipEntry(bytes, name) {
  const end = bytes.lastIndexOf(Buffer.from('504b0506','hex'));
  assert.ok(end >= 0, 'ZIP end record');
  const count = bytes.readUInt16LE(end+10); let offset = bytes.readUInt32LE(end+16);
  for (let i=0;i<count;i++) {
    assert.equal(bytes.readUInt32LE(offset),0x02014b50);
    const method=bytes.readUInt16LE(offset+10),size=bytes.readUInt32LE(offset+20);
    const n=bytes.readUInt16LE(offset+28),extra=bytes.readUInt16LE(offset+30),comment=bytes.readUInt16LE(offset+32);
    const filename=bytes.subarray(offset+46,offset+46+n).toString();
    if (filename===name) {
      assert.equal(method,0); const local=bytes.readUInt32LE(offset+42);
      assert.equal(bytes.readUInt32LE(local),0x04034b50);
      const start=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
      return bytes.subarray(start,start+size);
    }
    offset+=46+n+extra+comment;
  }
  throw new Error(`ZIP entry not found: ${name}`);
}
function value(item) {
  if (item === null) return { nullValue: null };
  if (typeof item === 'boolean') return { booleanValue: item };
  if (typeof item === 'number') return { integerValue: String(item) };
  if (typeof item === 'string') return { stringValue: item };
  if (Array.isArray(item)) return { arrayValue: { values: item.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(item).map(([k, v]) => [k, value(v)])) } };
}
async function put(path, document) {
  const response = await fetch(`${base}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: value(document).mapValue.fields }) });
  assert.equal(response.status, 200, 'test fixture write');
}
async function request(path, token, body, expected = 200, method) {
  const response = await fetch(`${api}${path}`, { method: method || (body === undefined ? 'GET' : 'POST'), headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) }, body: body === undefined ? undefined : JSON.stringify(body) });
  assert.equal(response.status, expected, `${path} returned ${response.status}; expected ${expected}`);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  return expected === 200 ? response.json() : null;
}
async function login(name, chapter) {
  return request('/local/session', null, { email: `${name}@ph.wsb.test`, password: process.env.WSB_TEST_PASSWORD, chapter_id: chapter });
}
// Chapter access resolves from server-side membership, not the token's chapter
// claim, so a "foreign" actor must be an account with no membership in the
// synthetic chapter at all. The HK accounts are never seeded into it.
async function loginEmail(email, chapter) {
  return request('/local/session', null, { email, password: process.env.WSB_TEST_PASSWORD, chapter_id: chapter });
}
async function main() {
  if (process.argv.includes('--recover')) {
    const saved = JSON.parse(readFileSync(file, 'utf8'));
    const judge = await login('judge1', saved.chapter);
    const ownBallot = await request(`${saved.root}/battles/synthetic-final/my-ballot`, judge.token);
    assert.deepEqual(ownBallot, {event_id:saved.event,match_id:'synthetic-final',judge_uid:'local-ph-judge1',corner:'red'});
    const recoveredBallot = await request(`${saved.root}/battles/synthetic-final/vote`, judge.token, {winner_corner:'red'});
    assert.deepEqual(recoveredBallot, saved.battle_ballot);
    const dancer = await login('dancer1', saved.chapter);
    const guardianPath = `/v1/chapters/${saved.chapter}/guardian-requests/${saved.guardian_request_id}`;
    const guardianRequest = await request(guardianPath, dancer.token);
    assert.equal(guardianRequest.status, 'withdrawn');
    assert.deepEqual(await request(`${guardianPath}/withdraw`, dancer.token, saved.guardian_withdrawal), saved.guardian_withdrawn);
    const guardian = await login('guardian1', saved.chapter);
    assert.equal((await request(guardianPath, guardian.token)).status, 'withdrawn');
    const notices = await request(`/v1/chapters/${saved.chapter}/notifications?limit=100`,guardian.token);
    assert.ok(notices.items.some(item=>item.id===saved.guardian_notice_id && item.read_at!==null));
    const director = await login('director', saved.chapter);
    const draftPath = `/v1/chapters/${saved.chapter}/events/${saved.draft_id}`;
    assert.deepEqual(await request(`${draftPath}/registration-window`,director.token,saved.window_command,200,'PUT'),saved.window_receipt);
    assert.deepEqual(await request(`${draftPath}/division-policy-drafts/open`,director.token,saved.policy_command,200,'PUT'),saved.policy_receipt);
    assert.equal((await request(`${draftPath}/division-policy-drafts/open/versions`,director.token)).items[0].snapshot.status,'draft');
    const staffPath = `/v1/chapters/${saved.chapter}/staff/invitations/${saved.revoked_staff_id}/revoke`;
    assert.deepEqual(await request(staffPath, director.token, saved.staff_revoke_command), saved.staff_revoke_receipt);
    const staff = await request(`/v1/chapters/${saved.chapter}/staff/members?limit=100`, director.token);
    assert.ok(staff.items.some(member=>member.uid==='local-hk-manager' && member.role==='registrar' && !member.active));
    assert.deepEqual(await request(`/v1/chapters/${saved.chapter}/staff/members/local-hk-manager`,director.token,saved.member_revoke_command,200,'PUT'),saved.member_revoke_receipt);
    assert.deepEqual(await request(`${saved.root}/staff/assignments/local-hk-manager`,director.token,saved.assignment_remove_command,200,'PUT'),saved.assignment_remove_receipt);
    const receipt = await request(`${saved.root}/scores`, judge.token, saved.command);
    assert.deepEqual(receipt, saved.receipt, 'receipt survives full stack recreation');
    const state = await request(`${saved.root}/divisions/open/score-state?crew_id=ready`, judge.token);
    assert.equal(state.locked, true);
    const manager = await login('manager', saved.chapter);
    const recoveredArrival = await request(`${saved.root}/check-in/me`, manager.token);
    assert.equal(recoveredArrival.recorded, true);
    const recoveredStage = await request(`${saved.root}/entries/ready/stage-status`, manager.token);
    assert.equal(recoveredStage.items[0].position, 'completed');
    const recoveredResult = await request(`${saved.root}/entries/ready/published-result`, manager.token);
    assert.equal(recoveredResult.publication_id, saved.publication_id);
    const recoveredCrew = await request(`/v1/chapters/${saved.chapter}/crews`, manager.token, saved.crewBody);
    assert.equal(recoveredCrew.id, saved.crew_id);
    const registration = await request(`${saved.root}/entries/${saved.registration_id}`, manager.token);
    assert.equal(registration.entry.status, 'needs_correction');
    assert.equal(registration.entry.revision, saved.registration_revision);
    assert.equal(registration.entry.roster.length, 1);
    const recoveredIntent = await request(`${saved.root}/entries/${saved.registration_id}/music-intents`, manager.token, saved.music_body);
    assert.deepEqual(recoveredIntent, saved.music_intent);
    const quote = await request(`${saved.root}/entries/draft/quote`, manager.token);
    assert.equal(quote.pending_amount_minor, 0);
    assert.equal(quote.paid_amount_minor, 0);
    const projection = await request(`/v1/events/${saved.event}/divisions/open/published`);
    assert.equal(projection.publication_id, saved.publication_id);
    const marshal = await login('marshal', saved.chapter);
    const stage = await request(`${saved.root}/stages/main`, marshal.token);
    assert.equal(stage.stage_id, 'main');
    console.log('PASS: registration, staff invitation state, guardian withdrawal, own check-in, battle ballot, locked score receipt, refunded balance, stage and published projection recovered from the running stack.');
    return;
  }
  await request('/healthz');
  const ready = await fetch(`${api}/readyz`);
  assert.equal(ready.status, 503);
  const readiness = await ready.json();
  assert.equal(readiness.database_reachable, true);
  assert.equal(readiness.release_ready, false);
  await request('/local/session', null, { email: 'judge1@ph.wsb.test', password: 'incorrect-test-password', chapter_id: 'ph' }, 401);
  const raw = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'judge1@ph.wsb.test', password: process.env.WSB_TEST_PASSWORD, returnSecureToken: true }) }).then(r => r.json());
  assert.ok(raw.idToken);
  await request('/v1/chapters/ph/session', raw.idToken, undefined, 401);

  const chapter = `docker-check-${randomUUID()}`;
  const event = `recovery-${randomUUID()}`;
  const root = `/v1/chapters/${chapter}/events/${event}`;
  const parent = `chapters/${chapter}/events/${event}`;
  const now = Math.floor(Date.now() / 1000);
  await put(`chapters/${chapter}`, { id: chapter, name: 'Synthetic Docker checks', currency: 'PHP' });
  await put(parent, { id: event, chapter_id: chapter, name: 'Synthetic recovery test', status: 'active', rules_version: 'test-fixture' });
  await put(`eventDirectory/${event}`, { event_id: event, chapter_id: chapter, created_at: now });
  for (const [name, role] of [['manager', 'crew_manager'], ['dancer1', 'dancer'], ['dancer2', 'dancer'], ['guardian1', 'guardian'], ['registrar', 'registrar'], ['judge1', 'judge'], ['judge2', 'judge'], ['finance', 'finance'], ['head', 'head_judge'], ['marshal', 'marshal'], ['director', 'chapter_director']]) {
    const uid = `local-ph-${name}`;
    await put(`chapters/${chapter}/members/${uid}`, { uid, chapter_id: chapter, role, active: true, valid_after: 0 });
    await put(`${parent}/assignments/${uid}`, { uid, event_id: event, active: true });
  }
  await put(`${parent}/divisionState/open`, { policy: { id: 'open', name: 'Synthetic', min_members: 1, max_members: 4, max_duration_secs: 180, max_age: null, fee_minor: 150000 }, panel: ['local-ph-judge1', 'local-ph-judge2'], locked: false, generation: 0, approved_entries: 1, completed_scorecards: 0, unready_entries: 0, publication_id: null });
  await put(`${parent}/divisionState/registration`, { policy: { id:'registration', name:'Synthetic registration', min_members:1, max_members:4, max_duration_secs:180, max_age:null, fee_minor:150000 }, panel:['local-ph-judge1','local-ph-judge2'], locked:false, generation:0, approved_entries:0, completed_scorecards:0, unready_entries:0, publication_id:null });
  for (const entryId of ['ready', 'draft', 'provider']) {
    const roster = [{ uid: 'local-ph-manager', name: 'Synthetic adult', role: 'Manager', is_minor: false, consent_verified: true }];
    await put(`chapters/${chapter}/crews/${entryId}`, { id: entryId, chapter_id: chapter, name: 'Synthetic crew', city: 'Test', manager_uid: 'local-ph-manager', members: roster, created_at: now });
    await put(`${parent}/entries/${entryId}`, { entry: { id: entryId, chapter_id: chapter, event_id: event, crew_id: entryId, division_id: 'open', roster, track_filename: 'synthetic.mp3', track_duration_secs: 120, paid_minor: entryId === 'ready' ? 150000 : 0, status: entryId === 'ready' ? 'approved' : 'draft', created_at: now, updated_at: now }, pending_minor: 0, completed_scorecards: 0 });
    await put(`${parent}/entryIndex/${key(['open', entryId])}`, { entry_id: entryId, crew_id: entryId, division_id: 'open' });
  }
  const [manager, judge1, judge2, finance, head, marshal, director, dancer, otherDancer, registrar, guardian] = await Promise.all(['manager', 'judge1', 'judge2', 'finance', 'head', 'marshal', 'director', 'dancer1', 'dancer2', 'registrar', 'guardian1'].map(name => login(name, chapter)));
  const globalAdmin = await loginEmail('hq.admin@wsb.test');
  for (const endpoint of ['/v1/hq/chapters?limit=1', '/v1/hq/applications?limit=1']) {
    await request(endpoint, null, undefined, 401);
    await request(endpoint, manager.token, undefined, 403);
    const page = await request(endpoint, globalAdmin.token);
    assert.ok(Array.isArray(page.items));
    assert.ok(page.items.length <= 1);
  }
  const overview = await request('/v1/hq/overview', globalAdmin.token);
  assert.ok(Number.isSafeInteger(overview.chapters.total));
  assert.ok(Number.isSafeInteger(overview.events.total));
  await request('/v1/account/chapters',null,undefined,401);
  let chapterCursor;let discovered=false;
  for(let i=0;i<100;i++){
    const query=new URLSearchParams({limit:'100',...(chapterCursor?{cursor:chapterCursor}:{})});
    const page=await request(`/v1/account/chapters?${query}`,manager.token);
    assert.ok(page.items.every(item=>item.role==='crew_manager'));
    if(page.items.some(item=>item.chapter_id===chapter))discovered=true;
    if(!page.next_page)break;chapterCursor=page.next_page;
  }
  assert.equal(discovered,true);
  const crewBody = { operation_id:randomUUID(), name:'Synthetic rehearsal crew', city:'Test' };
  const waiverPath = `${root}/waiver-draft`;
  assert.equal(await request(waiverPath,director.token),null);
  const waiverBody = {operation_id:randomUUID(),expected_revision:0,title:'Synthetic waiver draft',language:'en-PH',text:'Synthetic demonstration text only; not a legal waiver.',source:'Synthetic local configuration fixture'};
  await request(waiverPath,null,waiverBody,401);
  await request(waiverPath,manager.token,waiverBody,403);
  await request(waiverPath,registrar.token,waiverBody,403);
  await request(waiverPath,guardian.token,undefined,403);
  const [waiver,waiverReplay] = await Promise.all([request(waiverPath,director.token,waiverBody),request(waiverPath,director.token,waiverBody)]);
  assert.deepEqual(waiver,waiverReplay);assert.equal(waiver.status,'draft');assert.equal(waiver.revision,1);
  assert.deepEqual(await request(waiverPath,registrar.token),waiver);
  await request(waiverPath,director.token,{...waiverBody,text:'Changed'},409);
  await request(waiverPath,director.token,{...waiverBody,operation_id:randomUUID()},409);
  const waiver2=await request(waiverPath,director.token,{...waiverBody,operation_id:randomUUID(),expected_revision:1,text:'Second synthetic draft'});
  assert.equal(waiver2.revision,2);assert.equal(waiver2.status,'draft');
  assert.deepEqual(await request(`${waiverPath}/versions/1`,director.token),waiver);
  assert.deepEqual(await request(`${waiverPath}/versions/2`,registrar.token),waiver2);
  await request(`${waiverPath}/versions/1`,guardian.token,undefined,403);
  await request(`${waiverPath}/versions/1`,manager.token,undefined,403);
  await request(`${waiverPath}/versions/0`,director.token,undefined,400);
  await request(`${waiverPath}/versions/999`,director.token,undefined,404);
  assert.deepEqual(await request(waiverPath,director.token,waiverBody),waiver);
  const foreignWaiverDirector=await loginEmail('director@hk.wsb.test','hk');
  const eventDraftPath = `/v1/chapters/${chapter}/events`;
  const draftCommand = {operation_id:randomUUID(),reason:'Synthetic event draft creation',id:`event-${randomUUID().replaceAll('-','')}a`,name:'Synthetic draft event',event_date:'2027-08-15',timezone:'Asia/Manila',venue:'Synthetic venue',rules_version:'synthetic reference'};
  await request(eventDraftPath,manager.token,draftCommand,403);
  await request(eventDraftPath,foreignWaiverDirector.token,draftCommand,403);
  const eventDraft = await request(eventDraftPath,director.token,draftCommand);
  assert.equal(eventDraft.chapter_id,chapter);assert.equal(eventDraft.status,'draft');assert.equal(eventDraft.id,draftCommand.id);
  assert.deepEqual(await request(eventDraftPath,director.token,draftCommand),eventDraft);
  await request(eventDraftPath,director.token,{...draftCommand,name:'Changed draft'},409);
  await request(eventDraftPath,director.token,{...draftCommand,operation_id:randomUUID()},409);
  await request(`/v1/events/${draftCommand.id}/divisions/open/published`,null,undefined,404);
  const eventDetail = `${eventDraftPath}/${draftCommand.id}`;
  const editDraft = {operation_id:randomUUID(),reason:'Synthetic event draft update',expected_revision:eventDraft.revision,name:'Updated synthetic event',event_date:draftCommand.event_date,timezone:draftCommand.timezone,venue:draftCommand.venue,rules_version:draftCommand.rules_version};
  await request(eventDetail,manager.token,editDraft,403,'PUT');
  const edited = await request(eventDetail,director.token,editDraft,200,'PUT');
  assert.equal(edited.name,editDraft.name);assert.equal(edited.revision,eventDraft.revision+1);
  assert.deepEqual(await request(eventDetail,director.token,editDraft,200,'PUT'),edited);
  await request(eventDetail,director.token,{...editDraft,operation_id:randomUUID()},409,'PUT');
  const windowBody = {operation_id:randomUUID(),reason:'Synthetic registration window',expected_revision:edited.revision,opens_at_local:'2027-01-01T09:00',closes_at_local:'2027-02-01T17:00'};
  await request(`${eventDetail}/registration-window`,manager.token,windowBody,403,'PUT');
  const window = await request(`${eventDetail}/registration-window`,director.token,windowBody,200,'PUT');
  assert.equal(window.revision,edited.revision+1);assert.ok(window.registration_closes_at>window.registration_opens_at);
  assert.deepEqual(await request(`${eventDetail}/registration-window`,director.token,windowBody,200,'PUT'),window);
  await request(`${eventDetail}/registration-window`,director.token,{...windowBody,operation_id:randomUUID()},409,'PUT');
  const managed = await request(`/v1/chapters/${chapter}/staff/events?limit=100`,director.token);
  assert.ok(managed.items.some(value=>value.id===draftCommand.id));
  await request(`/v1/chapters/${chapter}/staff/events`,manager.token,undefined,403);
  const auditPath = `/v1/chapters/${chapter}/audit?limit=100`;
  await request(auditPath,manager.token,undefined,403);
  await request(auditPath,foreignWaiverDirector.token,undefined,403);
  const auditPage = await request(auditPath,director.token);
  assert.ok(auditPage.items.some(row=>row.chapter_id===chapter && row.resource_id===draftCommand.id));
  assert.ok(auditPage.items.every(row=>row.chapter_id===chapter));
  await put(`chapters/${chapter}/members/local-ph-auditor`,{uid:'local-ph-auditor',chapter_id:chapter,role:'auditor',active:true,valid_after:0});
  const auditor = await login('auditor',chapter);
  for (const id of ['audit-a','audit-b','audit-c']) await put(`chapters/${chapter}/audit/${id}`,{id,actor_uid:'local-ph-director',chapter_id:chapter,action:'synthetic_test',resource_id:'synthetic',recorded_at:now+1000});
  await request(`/v1/chapters/${chapter}/audit?cursor=invalid`,auditor.token,undefined,400);
  const auditFirst = await request(`/v1/chapters/${chapter}/audit?limit=1`,auditor.token);
  assert.equal(auditFirst.items.length,1);assert.ok(auditFirst.next_page);
  assert.equal(auditFirst.items[0].id,'audit-c');
  await put(`chapters/${chapter}/audit/audit-new`,{id:'audit-new',actor_uid:'local-ph-director',chapter_id:chapter,action:'synthetic_test',resource_id:'synthetic',recorded_at:now+1001});
  const auditSecond = await request(`/v1/chapters/${chapter}/audit?limit=1&cursor=${encodeURIComponent(auditFirst.next_page)}`,auditor.token);
  assert.equal(auditSecond.items.length,1);assert.notEqual(auditFirst.items[0].id,auditSecond.items[0].id);
  assert.equal(auditSecond.items[0].id,'audit-b');
  const auditThird = await request(`/v1/chapters/${chapter}/audit?limit=1&cursor=${encodeURIComponent(auditSecond.next_page)}`,auditor.token);
  assert.equal(auditThird.items[0].id,'audit-a');
  assert.ok(auditFirst.items[0].recorded_at>=auditSecond.items[0].recorded_at);
  try {
    await put(`chapters/${chapter}/members/local-ph-auditor`,{uid:'local-ph-auditor',chapter_id:chapter,role:'auditor',active:false,valid_after:0});
    await request(auditPath,auditor.token,undefined,403);
  } finally {
    await put(`chapters/${chapter}/members/local-ph-auditor`,{uid:'local-ph-auditor',chapter_id:chapter,role:'auditor',active:true,valid_after:0});
  }
  const policyRoot = `${eventDetail}/division-policy-drafts`;
  const policyBody = {operation_id:randomUUID(),reason:'Synthetic policy draft',expected_revision:0,name:'Synthetic division',min_members:1,max_members:5,max_duration_secs:180,max_age:null,fee_minor:10000,rules_source:'synthetic source',rules_version:'draft',effective_date:'2027-08-15'};
  await request(`${policyRoot}/open`,manager.token,policyBody,403,'PUT');
  const policy = await request(`${policyRoot}/open`,director.token,policyBody,200,'PUT');
  assert.equal(policy.status,'draft');assert.equal(policy.revision,1);
  assert.deepEqual(await request(`${policyRoot}/open`,director.token,policyBody,200,'PUT'),policy);
  await request(`${policyRoot}/open`,director.token,{...policyBody,operation_id:randomUUID()},409,'PUT');
  assert.equal((await request(policyRoot,director.token)).items[0].division_id,'open');
  assert.equal((await request(`${policyRoot}/open/versions`,director.token)).items[0].snapshot.revision,1);
  await request(policyRoot,foreignWaiverDirector.token,undefined,403);
  await request(`${policyRoot}/open/versions`,manager.token,undefined,403);
  const staffPath = `/v1/chapters/${chapter}/staff/members`;
  await request(staffPath,null,undefined,401);
  await request(staffPath,manager.token,undefined,403);
  await request(staffPath,foreignWaiverDirector.token,undefined,403);
  const staffPage = await request(`${staffPath}?limit=100`,director.token);
  assert.ok(staffPage.items.some(member=>member.uid==='local-ph-judge1'));
  assert.ok(staffPage.items.every(member=>member.chapter_id===chapter && !['dancer','guardian','crew_manager'].includes(member.role)));
  const invitePath = `/v1/chapters/${chapter}/staff/invitations`;
  const staffInvite = {operation_id:randomUUID(),target_uid:'local-hk-manager',role:'registrar',reason:'Synthetic staff coverage',access_expires_at:now+86400,invite_code:randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','')};
  await request(invitePath,manager.token,staffInvite,403);
  await request(invitePath,foreignWaiverDirector.token,staffInvite,403);
  const issued = await request(invitePath,director.token,staffInvite);
  assert.ok((await request(invitePath,director.token)).items.some(item=>item.id===issued.id));
  await request(invitePath,manager.token,undefined,403);
  assert.deepEqual(await request(invitePath,director.token,staffInvite),issued);
  await request(invitePath,director.token,{...staffInvite,role:'judge'},409);
  const acceptStaff = {operation_id:randomUUID(),invite_code:staffInvite.invite_code};
  await request('/v1/account/staff-invitations/accept',manager.token,acceptStaff,403);
  const targetStaff = await loginEmail('manager@hk.wsb.test','hk');
  const acceptedStaff = await request('/v1/account/staff-invitations/accept',targetStaff.token,acceptStaff);
  assert.equal(acceptedStaff.chapter_id,chapter);assert.equal(acceptedStaff.uid,'local-hk-manager');assert.equal(acceptedStaff.role,'registrar');
  assert.deepEqual(await request('/v1/account/staff-invitations/accept',targetStaff.token,acceptStaff),acceptedStaff);
  await request('/v1/account/staff-invitations/accept',targetStaff.token,{...acceptStaff,operation_id:randomUUID()},409);
  const assignmentPath = `${root}/staff/assignments/local-hk-manager`;
  const assignmentBody = {operation_id:randomUUID(),expected_revision:0,active:true,reason:'Synthetic event assignment'};
  await request(assignmentPath,manager.token,assignmentBody,403,'PUT');
  await request(assignmentPath,foreignWaiverDirector.token,assignmentBody,403,'PUT');
  const assignment = await request(assignmentPath,director.token,assignmentBody,200,'PUT');
  assert.equal(assignment.active,true);assert.equal(assignment.revision,1);
  assert.deepEqual(await request(assignmentPath,director.token,assignmentBody,200,'PUT'),assignment);
  await request(assignmentPath,director.token,{...assignmentBody,active:false},409,'PUT');
  await request(assignmentPath,director.token,{...assignmentBody,operation_id:randomUUID()},409,'PUT');
  const removalCommand = {operation_id:randomUUID(),expected_revision:1,active:false,reason:'Synthetic assignment removal'};
  const removal = await request(assignmentPath,director.token,removalCommand,200,'PUT');
  assert.equal(removal.active,false);assert.equal(removal.revision,2);
  const staffMemberPath = `/v1/chapters/${chapter}/staff/members/local-hk-manager`;
  const revokeMember = {operation_id:randomUUID(),expected_revision:acceptedStaff.revision,role:'registrar',active:false,expires_at:null,reason:'Synthetic access revocation'};
  await request(staffMemberPath,manager.token,revokeMember,403,'PUT');
  const revokedMember = await request(staffMemberPath,director.token,revokeMember,200,'PUT');
  assert.equal(revokedMember.active,false);
  assert.deepEqual(await request(staffMemberPath,director.token,revokeMember,200,'PUT'),revokedMember);
  await request(staffMemberPath,director.token,{...revokeMember,reason:'Different synthetic reason'},409,'PUT');
  await request(`/v1/chapters/${chapter}/session`,targetStaff.token,undefined,403);
  const pendingInvite = {...staffInvite,operation_id:randomUUID(),target_uid:'local-hk-director',invite_code:randomUUID().replaceAll('-','')+randomUUID().replaceAll('-','')};
  const pendingStaff = await request(invitePath,director.token,pendingInvite);
  const revokePath = `${invitePath}/${pendingStaff.id}/revoke`;
  const revokeStaff = {operation_id:randomUUID(),expected_revision:pendingStaff.revision,reason:'Synthetic invitation withdrawn'};
  await request(revokePath,manager.token,revokeStaff,403);
  await request(revokePath,foreignWaiverDirector.token,revokeStaff,403);
  const revokedStaff = await request(revokePath,director.token,revokeStaff);
  assert.equal(revokedStaff.active,false);
  assert.deepEqual(await request(revokePath,director.token,revokeStaff),revokedStaff);
  await request(revokePath,director.token,{...revokeStaff,reason:'Different synthetic reason'},409);
  await request('/v1/account/staff-invitations/accept',foreignWaiverDirector.token,{operation_id:randomUUID(),invite_code:pendingInvite.invite_code},409);
  await request(waiverPath,foreignWaiverDirector.token,undefined,403);
  await request(`${waiverPath}/versions/1`,foreignWaiverDirector.token,undefined,403);
  await request(waiverPath,foreignWaiverDirector.token,waiverBody,403);
  try {
    await put(`${parent}/assignments/local-ph-registrar`,{uid:'local-ph-registrar',event_id:event,active:false});
    await request(waiverPath,registrar.token,undefined,403);
    await request(`${waiverPath}/versions/1`,registrar.token,undefined,403);
  } finally {
    await put(`${parent}/assignments/local-ph-registrar`,{uid:'local-ph-registrar',event_id:event,active:true});
  }
  const crew = await request(`/v1/chapters/${chapter}/crews`, manager.token, crewBody);
  await request(`${root}/dj-export`,null,undefined,401);
  await request(`${root}/dj-export`,manager.token,undefined,403);
  await request(`${root}/dj-export`,foreignWaiverDirector.token,undefined,403);
  await request(`${root}/dj-export`,director.token,undefined,409);
  const battlePath = `${root}/battles/synthetic-final`;
  assert.deepEqual(await request(`${root}/battles`,judge1.token),{items:[],next_page:null});
  await request(`${root}/battles`,manager.token,undefined,403);
  await request(`${root}/battles`,null,undefined,401);
  await request(`${root}/battles`,foreignWaiverDirector.token,undefined,403);
  await put(`${parent}/battles/synthetic-final`, {chapter_id:chapter,panel:['local-ph-judge1','local-ph-judge2','local-ph-head'],record:{match_id:'synthetic-final',event_id:event,category:'Synthetic',round:'Final',red_corner_name:'Synthetic red',blue_corner_name:'Synthetic blue',votes_red:0,votes_blue:0,winner_corner:null,status:'active'}});
  await request(battlePath,null,undefined,401);
  await request(battlePath,manager.token,undefined,403);
  await request(battlePath,foreignWaiverDirector.token,undefined,403);
  await request(`${battlePath}/vote`,foreignWaiverDirector.token,{winner_corner:'red'},403);
  await request(`${battlePath}/vote`,director.token,{winner_corner:'red'},403);
  await request(`${battlePath}/vote`,judge1.token,{winner_corner:'green'},400);
  assert.equal((await request(`${battlePath}/my-ballot`,judge1.token)).corner,null);
  const [ballot,ballotReplay]=await Promise.all([request(`${battlePath}/vote`,judge1.token,{winner_corner:'red'}),request(`${battlePath}/vote`,judge1.token,{winner_corner:'red'})]);
  assert.deepEqual(ballot,ballotReplay);assert.equal(ballot.votes_red,1);
  assert.equal((await request(`${battlePath}/my-ballot`,judge1.token)).corner,'red');
  assert.equal((await request(`${battlePath}/my-ballot`,judge2.token)).corner,null);
  await request(`${battlePath}/my-ballot`,manager.token,undefined,403);
  await request(`${battlePath}/vote`,judge1.token,{winner_corner:'blue'},409);
  const battleClosed=await request(`${battlePath}/vote`,judge2.token,{winner_corner:'red'});
  assert.equal(battleClosed.status,'closed');assert.equal(battleClosed.winner_corner,'red');assert.equal(battleClosed.votes_red,2);
  assert.deepEqual(await request(`${battlePath}/vote`,judge1.token,{winner_corner:'red'}),ballot);
  await request(`${battlePath}/vote`,head.token,{winner_corner:'blue'},409);
  assert.deepEqual(await request(battlePath,director.token),battleClosed);
  const battleList=await request(`${root}/battles`,judge1.token);
  assert.deepEqual(battleList.items,[battleClosed]);assert.equal(battleList.next_page,null);
  try {
    await put(`${parent}/assignments/local-ph-judge1`,{uid:'local-ph-judge1',event_id:event,active:false});
    await request(`${battlePath}/vote`,judge1.token,{winner_corner:'red'},403);
    await request(battlePath,judge1.token,undefined,403);
    await request(`${root}/battles`,judge1.token,undefined,403);
  } finally {
    await put(`${parent}/assignments/local-ph-judge1`,{uid:'local-ph-judge1',event_id:event,active:true});
  }
  try {
    await put(`chapters/${chapter}/members/local-ph-judge1`,{uid:'local-ph-judge1',chapter_id:chapter,role:'judge',active:true,valid_after:0,expires_at:1});
    await request(`${battlePath}/vote`,judge1.token,{winner_corner:'red'},403);
    await request(battlePath,judge1.token,undefined,403);
    await request(`${root}/battles`,judge1.token,undefined,403);
  } finally {
    await put(`chapters/${chapter}/members/local-ph-judge1`,{uid:'local-ph-judge1',chapter_id:chapter,role:'judge',active:true,valid_after:0});
  }
  assert.deepEqual(await request(`/v1/chapters/${chapter}/crews`, manager.token, crewBody), crew);
  await request(`/v1/chapters/${chapter}/crews`, manager.token, { ...crewBody, name:'Changed' }, 409);
  const invitation = await request(`/v1/chapters/${chapter}/crews/${crew.id}/invitations`, manager.token, { operation_id:randomUUID() });
  const join = { token:invitation.token, dancer_name:'Synthetic dancer', is_minor:false };
  const joined = await request(`/v1/chapters/${chapter}/crews/${crew.id}/join`, dancer.token, join);
  assert.deepEqual(await request(`/v1/chapters/${chapter}/crews/${crew.id}/join`, dancer.token, join), joined);
  // A non-member cannot use a redeemed invitation to probe its receipt.
  await request(`/v1/chapters/${chapter}/crews/${crew.id}/join`, otherDancer.token, join, 403);
  const created = await request(`${root}/entries`, manager.token, { operation_id:randomUUID(), crew_id:crew.id, division_id:'registration' });
  const roster = { operation_id:randomUUID(), expected_revision:created.revision, roster:['local-ph-dancer1'] };
  await request(`${root}/entries/${created.id}/roster`, dancer.token, roster, 403, 'PUT');
  const selected = await request(`${root}/entries/${created.id}/roster`, manager.token, roster, 200, 'PUT');
  const readinessBeforeGuardian = (await request(`${root}/entries/${created.id}`, manager.token)).readiness;
  const guardianRoot = `/v1/chapters/${chapter}/guardian-requests`;
  await put(`chapters/${chapter}/members/local-ph-guardian2`, {uid:'local-ph-guardian2',chapter_id:chapter,role:'guardian',active:true,valid_after:0});
  await request(guardianRoot, manager.token, undefined, 403);
  await request(guardianRoot, null, undefined, 401);
  const claimBody = {operation_id:randomUUID(),guardian_uid:'local-ph-guardian1'};
  const [claim,claimReplay] = await Promise.all([request(guardianRoot, dancer.token, claimBody), request(guardianRoot, dancer.token, claimBody)]);
  assert.deepEqual(claim,claimReplay);assert.equal(claim.status,'awaiting_guardian');assert.equal(claim.revision,1);
  const noticePath = `/v1/chapters/${chapter}/notifications`;
  await request(noticePath,null,undefined,401);
  const noticePage = await request(noticePath,guardian.token);
  const notice = noticePage.items.find(item=>item.kind==='guardian_request_created' && item.href.includes(claim.request_id));
  assert.ok(notice);assert.equal(notice.recipient_uid,'local-ph-guardian1');
  await request(`${noticePath}/${notice.id}/read`,dancer.token,undefined,404,'PUT');
  const marked = await request(`${noticePath}/${notice.id}/read`,guardian.token,undefined,200,'PUT');
  assert.ok(marked.notification.read_at);assert.deepEqual(await request(`${noticePath}/${notice.id}/read`,guardian.token,undefined,200,'PUT'),marked);
  await request(guardianRoot, dancer.token, {...claimBody,guardian_uid:'local-ph-guardian2'},409);
  assert.equal((await request(guardianRoot, guardian.token)).items.some(value=>value.request_id===claim.request_id),true);
  assert.equal((await request(guardianRoot, otherDancer.token)).items.length,0);
  const responseBody={operation_id:randomUUID(),expected_revision:1,decision:'confirm'};
  await request(`${guardianRoot}/${claim.request_id}/respond`, dancer.token, responseBody,403);
  const [confirmed,confirmedReplay]=await Promise.all([request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,responseBody),request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,responseBody)]);
  assert.deepEqual(confirmed,confirmedReplay);assert.equal(confirmed.status,'awaiting_verification');assert.equal(confirmed.revision,2);
  await request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,{...responseBody,decision:'decline'},409);
  await request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,{...responseBody,operation_id:randomUUID()},409);
  const foreignGuardian=await loginEmail('guardian@hk.wsb.test','hk');await request(guardianRoot,foreignGuardian.token,undefined,403);
  try {
    await put(`chapters/${chapter}/members/local-ph-dancer1`,{uid:'local-ph-dancer1',chapter_id:chapter,role:'dancer',active:false,valid_after:0});
    const unavailableList=(await request(guardianRoot,guardian.token)).items;
    assert.equal(unavailableList.length,1);
    assert.equal(unavailableList[0].request_id,claim.request_id);
    assert.equal(unavailableList[0].counterpart_available,false);
    assert.equal(unavailableList[0].subject_uid,null);
    // An exact replay still returns its stored receipt; a new command requires an active counterpart.
    assert.deepEqual(await request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,responseBody),confirmed);
    await request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,{...responseBody,operation_id:randomUUID()},403);
  } finally {
    await put(`chapters/${chapter}/members/local-ph-dancer1`,{uid:'local-ph-dancer1',chapter_id:chapter,role:'dancer',active:true,valid_after:0});
  }
  assert.deepEqual((await request(`${root}/entries/${created.id}`, manager.token)).readiness,readinessBeforeGuardian);
  const withdrawal = {operation_id:randomUUID(),expected_revision:2};
  const withdrawalPath = `${guardianRoot}/${claim.request_id}/withdraw`;
  await request(withdrawalPath,null,withdrawal,401);
  await request(withdrawalPath,manager.token,withdrawal,403);
  await request(withdrawalPath,otherDancer.token,withdrawal,403);
  await request(withdrawalPath,foreignGuardian.token,withdrawal,403);
  await request(withdrawalPath,dancer.token,{...withdrawal,expected_revision:1},409);
  const [withdrawn,withdrawnReplay] = await Promise.all([request(withdrawalPath,dancer.token,withdrawal),request(withdrawalPath,dancer.token,withdrawal)]);
  assert.deepEqual(withdrawn,withdrawnReplay);assert.equal(withdrawn.status,'withdrawn');assert.equal(withdrawn.revision,3);
  await request(withdrawalPath,dancer.token,{...withdrawal,expected_revision:3},409);
  await request(`${guardianRoot}/${claim.request_id}/respond`,guardian.token,{...responseBody,operation_id:randomUUID(),expected_revision:3},409);
  await request(withdrawalPath,guardian.token,{operation_id:randomUUID(),expected_revision:3},409);
  assert.deepEqual(await request(`${root}/entries/${created.id}/stage-status`, dancer.token), {items:[]});
  await request(`${root}/entries/${created.id}/stage-status`, otherDancer.token, undefined, 403);
  const secondInvitation = await request(`/v1/chapters/${chapter}/crews/${crew.id}/invitations`, manager.token, {operation_id:randomUUID()});
  await request(`/v1/chapters/${chapter}/crews/${crew.id}/join`, otherDancer.token, {...join,token:secondInvitation.token});
  await request(`${root}/entries/${created.id}/stage-status`, otherDancer.token, undefined, 403);
  await request(`${root}/entries/${created.id}/published-result`, otherDancer.token, undefined, 403);
  await request(`${root}/entries/ready/published-result`, null, undefined, 401);
  assert.equal(await request(`${root}/entries/${created.id}/published-result`, dancer.token), null);
  assert.equal(await request(`${root}/entries/ready/published-result`, manager.token), null);
  await request(`${root}/entries/ready/published-result`, dancer.token, undefined, 403);
  await request(`${root}/entries/ready/published-result`, marshal.token, undefined, 403);
  const musicPath = `${root}/entries/${created.id}/music-intents`;
  const musicBody = {operation_id:randomUUID(), expected_revision:selected.revision};
  await request(musicPath, null, musicBody, 401);
  await request(musicPath, dancer.token, musicBody, 403);
  const [musicIntent, musicReplay] = await Promise.all([request(musicPath, manager.token, musicBody), request(musicPath, manager.token, musicBody)]);
  assert.deepEqual(musicReplay, musicIntent);
  assert.equal(musicIntent.status, 'awaiting_upload');
  assert.equal(musicIntent.entry_revision, selected.revision);
  await request(musicPath, manager.token, {...musicBody, expected_revision:selected.revision+1}, 409);
  await request(`/v1/chapters/hk/events/${event}/entries/${created.id}/music-intents`, manager.token, musicBody, 403);
  // Synthetic PCM WAV only. Inspection neither stores bytes nor grants readiness.
  const wav = Buffer.alloc(48);
  wav.write('RIFF',0); wav.writeUInt32LE(40,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(1000,24); wav.writeUInt32LE(4000,28); wav.writeUInt16LE(4,32);
  wav.writeUInt16LE(16,34); wav.write('data',36); wav.writeUInt32LE(4,40);
  const inspectionPath = `${api}${root}/entries/${created.id}/audio-inspect`;
  const inspect = (token, data) => fetch(inspectionPath, {method:'POST',headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,'content-type':'audio/wav'},body:data});
  assert.equal((await inspect(null, wav)).status,401);
  assert.equal((await inspect(dancer.token, wav)).status,403);
  const crossChapter = await fetch(`${api}/v1/chapters/hk/events/${event}/entries/${created.id}/audio-inspect`, {method:'POST',headers:{Authorization:`Bearer ${manager.token}`},body:wav});
  assert.equal(crossChapter.status,403);
  const inspected = await inspect(manager.token, wav);
  assert.equal(inspected.status,200);
  assert.deepEqual(await inspected.json(),{format:'wav',content_type:'audio/wav',duration_ms:1,sample_rate:1000,channels:2,bits_per_sample:16,saved:false});
  assert.equal((await inspect(manager.token,Buffer.from('not audio'))).status,422);
  assert.equal((await inspect(manager.token,Buffer.alloc(25 * 1024 * 1024 + 1))).status,413);
  const afterInspection = await request(`${root}/entries/${created.id}`,manager.token);
  assert.equal(afterInspection.entry.revision,selected.revision);
  assert.equal(afterInspection.readiness.music_ready,false);
  await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:false,valid_after:0});
  assert.equal((await inspect(manager.token, wav)).status,403);
  await request(musicPath, manager.token, musicBody, 403);
  await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:true,valid_after:0});
  const submission = { operation_id:randomUUID(), expected_revision:selected.revision };
  const incomplete = await request(`${root}/entries/${created.id}/submit`, manager.token, submission);
  assert.equal(incomplete.status, 'needs_correction');
  assert.deepEqual(await request(`${root}/entries/${created.id}/submit`, manager.token, submission), incomplete);
  await request(`${root}/entries/${created.id}/review`, manager.token, { operation_id:randomUUID(), expected_revision:incomplete.revision, status:'approved' }, 403);
  await request(`${root}/entries/${created.id}/review`, registrar.token, { operation_id:randomUUID(), expected_revision:incomplete.revision, status:'approved' }, 409);
  const correction = await request(`${root}/entries/${created.id}/review`, registrar.token, { operation_id:randomUUID(), expected_revision:incomplete.revision, status:'needs_correction' });
  assert.equal(correction.status, 'needs_correction');
  await request(musicPath, manager.token, {operation_id:randomUUID(), expected_revision:selected.revision}, 409);
  assert.deepEqual(await request(musicPath, manager.token, musicBody), musicIntent);
  assert.equal(JSON.parse(Buffer.from(judge1.token.split('.')[0], 'base64url')).alg, 'RS256');
  const forged = judge1.token.split('.');
  forged[1] = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(forged[1], 'base64url')), role: 'chapter_director' })).toString('base64url');
  await request(`/v1/chapters/${chapter}/session`, forged.join('.'), undefined, 401);
  await request('/v1/chapters/hk/session', manager.token, undefined, 403);
  await request(`/v1/chapters/${chapter}/session`, judge1.token);
  const lineup = await request(`${root}/judge-lineup?limit=1`, judge1.token);
  assert.ok(lineup.next_page, 'pagination cursor is available');
  let cursor = lineup.next_page;
  let count = lineup.items.length;
  for (let pages = 0; cursor && pages < 10; pages++) {
    const page = await request(`${root}/judge-lineup?limit=1&cursor=${encodeURIComponent(cursor)}`, judge1.token);
    count += page.items.length;
    cursor = page.next_page;
  }
  assert.equal(cursor, null);
  assert.equal(count, 1);
  assert.deepEqual(Object.keys((await request(`${root}/entries/ready/scorecard`, judge1.token))).sort(), ['crew_id', 'division_id', 'entry_id']);
  await request(`${root}/entries/draft/scorecard`, judge1.token, undefined, 403);
  await request(`${root}/judge-lineup`, manager.token, undefined, 403);
  await request(`/v1/chapters/${chapter}/crews/ready`, judge1.token, undefined, 403);
  const entry = await request(`${root}/entries/ready`, manager.token);
  assert.equal(entry.readiness.is_ready, true);

  for (const prefix of ['pay_', 'cs_']) {
    const providerPayment = await request(`${root}/entries/provider/pay`, manager.token, { provider_reference:`${prefix}${randomUUID()}`, amount_minor:100 });
    await request(`/v1/chapters/${chapter}/finance/payments/${providerPayment.payment_id}/reconcile`, finance.token, { approve:true, operation_id:randomUUID(), reason:'Synthetic reconciliation' });
    await request(`/v1/chapters/${chapter}/finance/payments/${providerPayment.payment_id}/refund`, manager.token, {}, 403);
    await request(`/v1/chapters/${chapter}/finance/payments/${providerPayment.payment_id}/refund`, finance.token, { operation_id:randomUUID(), reason:'Synthetic refund attempt' }, 409);
    await request(`/v1/chapters/${chapter}/finance/payments/${providerPayment.payment_id}/refund`, finance.token, { operation_id:randomUUID(), reason:'Synthetic refund attempt' }, 409);
  }
  const providerQuote = await request(`${root}/entries/provider/quote`, manager.token);
  assert.equal(providerQuote.paid_amount_minor, 200);
  assert.equal(providerQuote.pending_amount_minor, 0);

  // Explicit synthetic media/consent fixture above is not a media or guardian test.
  await put(`${parent}/stages/main`, { stage_id:'main', chapter_id:chapter, event_id:event, active:true, single_performer:true, performing_entry:null, marshal_uids:['local-ph-marshal'] });
  await put(`${parent}/stages/main/planning/current`,{stage_id:'main',chapter_id:chapter,event_id:event,revision:1,entry_ids:['ready'],reason:'Synthetic export lineup',updated_by:'local-ph-director',updated_at:now});
  const exportResponse = await fetch(`${api}${root}/dj-export`,{headers:{Authorization:`Bearer ${director.token}`}});
  assert.equal(exportResponse.status,200);assert.equal(exportResponse.headers.get('x-wsb-export-track-count'),'0');
  assert.match(exportResponse.headers.get('content-type'),/application\/zip/);
  const exportBytes=Buffer.from(await exportResponse.arrayBuffer());assert.equal(exportBytes.subarray(0,4).toString('hex'),'504b0304');
  const manifest=storedZipEntry(exportBytes,'manifest.csv').toString('utf8');
  assert.match(manifest,/stage_id,lineup_revision,order,division_id,entry_id,crew_name,state/);
  assert.match(manifest,/"main",1,1,"open","ready"/);
  assert.match(manifest,/"no_submission"/);
  assert.deepEqual(await request(`${root}/entries/ready/stage-status`, manager.token), {items:[]});
  await request(`${root}/entries/ready/stage-status`, dancer.token, undefined, 403);
  await request(`${root}/entries/ready/stage-status`, marshal.token, undefined, 403);
  assert.deepEqual(await request(`${root}/check-in/me`, manager.token), {recorded:false,checked_in_at:null});
  assert.deepEqual(await request(`${root}/check-in/me`, dancer.token), {recorded:false,checked_in_at:null});
  await request(`${root}/check-in/me`, null, undefined, 401);
  await request(`${root}/check-in/me`, marshal.token, undefined, 403);
  const foreignManager = await loginEmail('manager@hk.wsb.test', 'hk');
  await request(`${root}/check-in/me`, foreignManager.token, undefined, 403);
  await request(`${root}/entries/ready/stage-status`, foreignManager.token, undefined, 403);
  await request(`${root}/entries/ready/published-result`, foreignManager.token, undefined, 403);
  await request(`${root}/check-in`, manager.token, { dancer_uid:'local-ph-manager', entry_id:'ready' }, 403);
  await request(`${root}/check-in/candidates`, null, undefined, 401);
  await request(`${root}/check-in/candidates`, manager.token, undefined, 403);
  await request(`${root}/check-in/candidates`, foreignManager.token, undefined, 403);
  const candidates = await request(`${root}/check-in/candidates`, marshal.token);
  assert.ok(Array.isArray(candidates.items));
  assert.ok(candidates.items.some(item => item.entry_id === 'ready'));
  const arrival = await request(`${root}/check-in`, marshal.token, { dancer_uid:'local-ph-manager', entry_id:'ready' });
  assert.deepEqual(await request(`${root}/check-in`, marshal.token, { dancer_uid:'local-ph-manager', entry_id:'ready' }), arrival);
  assert.deepEqual(await request(`${root}/check-in/me`, manager.token), {recorded:true,checked_in_at:arrival.checked_in_at});
  assert.deepEqual(await request(`${root}/check-in/me?uid=local-ph-manager`, dancer.token), {recorded:false,checked_in_at:null});
  try {
    await put(`${parent}/checkIns/${key(['local-ph-manager'])}`, {...arrival,dancer_uid:'local-ph-dancer1'});
    await request(`${root}/check-in/me`, manager.token, undefined, 409);
  } finally {
    await put(`${parent}/checkIns/${key(['local-ph-manager'])}`, arrival);
  }
  try {
    await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:false,valid_after:0});
    await request(`${root}/check-in/me`, manager.token, undefined, 403);
  } finally {
    await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:true,valid_after:0});
  }
  for (const [revision, position] of ['holding', 'on_deck', 'performing', 'completed'].entries()) {
    const move = { operation_id:randomUUID(), stage_id:'main', entry_id:'ready', expected_revision:revision, position };
    const accepted = await request(`${root}/stage-commands`, marshal.token, move);
    assert.deepEqual(await request(`${root}/stage-commands`, marshal.token, move), accepted);
    assert.deepEqual(await request(`${root}/entries/ready/stage-status`, manager.token), {items:[{stage_id:'main',position,revision:revision+1,updated_at:accepted.updated_at,stage_active:true,stage_held:false}]});
  }
  await request(`${root}/stage-holds`, marshal.token, {operation_id:randomUUID(),stage_id:'main',expected_revision:0,held:true});
  assert.equal((await request(`${root}/entries/ready/stage-status`, manager.token)).items[0].stage_held,true);
  await request(`${root}/stage-configure`, director.token, {operation_id:randomUUID(),stage_id:'main',expected_revision:0,active:false,single_performer:true,reason:'Synthetic stage deactivation'});
  assert.equal((await request(`${root}/entries/ready/stage-status`, manager.token)).items[0].stage_active,false);
  await request(`${root}/stage-configure`, director.token, {operation_id:randomUUID(),stage_id:'main',expected_revision:1,active:true,single_performer:true,reason:'Synthetic stage reactivation'});
  await request(`${root}/stage-holds`, marshal.token, {operation_id:randomUUID(),stage_id:'main',expected_revision:1,held:false});

  const reference = `docker-ref-${randomUUID()}`;
  const payment = await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: reference, amount_minor: 100000 });
  assert.equal(payment.status, 'pending');
  assert.deepEqual(await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: reference, amount_minor: 100000 }), payment);
  await request(`${root}/entries/draft/pay`, manager.token, { provider_reference: `${reference}-overflow`, amount_minor: 60000 }, 409);
  await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/reconcile`, manager.token, { approve: true }, 403);
  const paid = await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/reconcile`, finance.token, { approve: true, operation_id: randomUUID(), reason: 'Synthetic reconciliation' });
  assert.equal(paid.status, 'settled');
  const refundOperation = randomUUID();
  const refunded = await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/refund`, finance.token, { operation_id: refundOperation, reason: 'Synthetic external reversal confirmed' });
  assert.equal(refunded.status, 'refunded');
  assert.deepEqual(await request(`/v1/chapters/${chapter}/finance/payments/${payment.payment_id}/refund`, finance.token, { operation_id: refundOperation, reason: 'Synthetic external reversal confirmed' }), refunded);

  const command = { schema_version: 1, operation_id: randomUUID(), division_id: 'open', crew_id: 'ready', expected_revision: 0, criteria: { choreography: 18, musicality: 18, execution: 18, stage_presence: 18, entertainment: 18 }, deductions: [] };
  const receipt = await request(`${root}/scores`, judge1.token, command);
  assert.deepEqual(await request(`${root}/scores`, judge1.token, command), receipt);
  await request(`${root}/scores`, judge1.token, { ...command, operation_id: randomUUID() }, 409);
  await request(`${root}/divisions/open/lock`, head.token, {}, 409);
  await request(`${root}/scores`, judge2.token, { ...command, operation_id: randomUUID() });
  await request(`${root}/divisions/open/lock`, head.token, {});
  await request(`${root}/scores`, judge1.token, { ...command, operation_id: randomUUID(), expected_revision: 1 }, 409);
  assert.equal(await request(`${root}/entries/ready/published-result`, manager.token), null);
  await request(`/v1/events/${event}/divisions/open/published`,null,undefined,404);
  assert.deepEqual(await request(`/v1/events/${event}/published`),[]);
  await request(`${root}/divisions/open/publish`, manager.token, {}, 403);
  const published = await request(`${root}/divisions/open/publish`, director.token, {});
  const publicSnapshot = await request(`/v1/events/${event}/divisions/open/published`);
  assert.equal(publicSnapshot.publication_id, published.publication_id);
  assert.deepEqual(await request(`/v1/events/${event}/published`),[publicSnapshot]);
  for (const result of publicSnapshot.results) {
    assert.deepEqual(Object.keys(result).sort(), ['crew_id','entry_id','final_score','rank','raw_average','total_deductions'].sort());
  }
  const personalResult = await request(`${root}/entries/ready/published-result`, manager.token);
  assert.equal(personalResult.publication_id, published.publication_id);
  assert.deepEqual(personalResult.result, published.results.find(value => value.entry_id === 'ready'));
  const snapshotPath = `publicEvents/${event}/divisions/${key(['open'])}`;
  const snapshotResponse = await fetch(`${base}/${snapshotPath}`, {headers:{Authorization:'Bearer owner'}});
  assert.equal(snapshotResponse.status,200); const savedSnapshot = (await snapshotResponse.json()).fields;
  try {
    const wrongChapter = structuredClone(savedSnapshot);wrongChapter.chapter_id.stringValue='foreign-synthetic-chapter';
    assert.equal((await fetch(`${base}/${snapshotPath}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:wrongChapter})})).status,200);
    await request(`/v1/events/${event}/published`,null,undefined,403);
    await request(`/v1/events/${event}/divisions/open/published`,null,undefined,403);
  } finally {
    assert.equal((await fetch(`${base}/${snapshotPath}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:savedSnapshot})})).status,200);
  }
  try {
    const corrupt = structuredClone(savedSnapshot);corrupt.results.arrayValue.values.push(structuredClone(corrupt.results.arrayValue.values[0]));
    assert.equal((await fetch(`${base}/${snapshotPath}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:corrupt})})).status,200);
    await request(`${root}/entries/ready/published-result`, manager.token, undefined, 409);
  } finally {
    assert.equal((await fetch(`${base}/${snapshotPath}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields:savedSnapshot})})).status,200);
  }
  assert.equal(await request(`${root}/entries/${created.id}/published-result`, dancer.token), null);
  const foreignResultManager = await loginEmail('manager@hk.wsb.test', 'hk');
  await request(`${root}/entries/ready/published-result`, foreignResultManager.token, undefined, 403);
  try {
    await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:false,valid_after:0});
    await request(`${root}/entries/ready/published-result`, manager.token, undefined, 403);
  } finally {
    await put(`chapters/${chapter}/members/local-ph-manager`, {uid:'local-ph-manager',chapter_id:chapter,role:'crew_manager',active:true,valid_after:0});
  }
  const memberPath = `chapters/${chapter}/members/local-ph-judge1`;
  await put(memberPath, { uid: 'local-ph-judge1', chapter_id: chapter, role: 'judge', active: false, valid_after: 0 });
  await request(`/v1/chapters/${chapter}/session`, judge1.token, undefined, 403);
  await put(memberPath, { uid: 'local-ph-judge1', chapter_id: chapter, role: 'judge', active: true, valid_after: 0 });
  writeFileSync(file, JSON.stringify({ chapter, event, root, command, receipt, draft_id:draftCommand.id, window_command:windowBody, window_receipt:window, policy_command:policyBody, policy_receipt:policy, battle_ballot:ballot, guardian_notice_id:notice.id, guardian_request_id:claim.request_id, guardian_withdrawal:withdrawal, guardian_withdrawn:withdrawn, revoked_staff_id:pendingStaff.id, staff_revoke_command:revokeStaff, staff_revoke_receipt:revokedStaff, member_revoke_command:revokeMember, member_revoke_receipt:revokedMember, assignment_remove_command:removalCommand, assignment_remove_receipt:removal, publication_id: published.publication_id, crewBody, crew_id:crew.id, registration_id:created.id, registration_revision:correction.revision, music_body:musicBody, music_intent:musicIntent }));
  console.log('PASS: manager/dancer/registrar incomplete-entry handoff, signed role isolation, payment replay/refund, stage progression, judge locking and publication. Synthetic audio/consent fixture; actual readiness and other roles remain outside this test.');
}
main().catch(error => { console.error(error.stack); process.exitCode = 1; });
