import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({projectId:'demo-wsb', firestore:{rules:await readFile('infra/firebase/firestore.rules','utf8')}});
  await env.withSecurityRulesDisabled(async context => {
    const db=context.firestore();
    await setDoc(doc(db,'chapters/ph/members/judge'),{role:'judge'});
    await setDoc(doc(db,'chapters/au/members/judge'),{role:'judge'});
    await setDoc(doc(db,'publicEvents/live'),{published:true});
    await setDoc(doc(db,'publicEvents/draft'),{published:false});
  });
});
after(async()=>{await env?.cleanup();});
test('public reads only published projections',async()=>{
  const db=env.unauthenticatedContext().firestore();
  await assertSucceeds(getDoc(doc(db,'publicEvents/live')));
  await assertFails(getDoc(doc(db,'publicEvents/draft')));
  await assertFails(getDoc(doc(db,'chapters/ph/members/judge')));
});
test('chapter membership cannot cross tenant or be self-promoted',async()=>{
  const db=env.authenticatedContext('judge',{chapterId:'ph',role:'judge'}).firestore();
  await assertSucceeds(getDoc(doc(db,'chapters/ph/members/judge')));
  await assertFails(getDoc(doc(db,'chapters/au/members/judge')));
  await assertFails(setDoc(doc(db,'chapters/ph/members/judge'),{role:'super_admin'}));
  await assertFails(setDoc(doc(db,'chapters/ph/events/event/scores/score'),{score:100}));
});
