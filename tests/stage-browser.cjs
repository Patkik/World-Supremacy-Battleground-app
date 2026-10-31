const assert = require('node:assert/strict');
const { readFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { chromium } = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config = Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('='); return [x.slice(0,i),x.slice(i+1)];}));
const api = `http://localhost:${config.WSB_API_PORT||8189}`;
const web = `http://localhost:${config.WSB_WEB_PORT||3100}`;
const firestore = `http://localhost:${config.WSB_FIRESTORE_PORT||8188}/v1/projects/demo-wsb/databases/(default)/documents`;
async function setup(stage) {
 const fields={marshal_uids:{arrayValue:{values:[{stringValue:"local-ph-marshal"}]}},stage_id:{stringValue:stage},chapter_id:{stringValue:'ph'},event_id:{stringValue:'local-rehearsal'},active:{booleanValue:true},single_performer:{booleanValue:true},performing_entry:{nullValue:null}};
 const r=await fetch(`${firestore}/chapters/ph/events/local-rehearsal/stages/${stage}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({fields})}); assert.equal(r.status,200);
 const login=await fetch(`${api}/local/session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'marshal@ph.wsb.test',password:config.WSB_TEST_PASSWORD,chapter_id:'ph'})}); assert.equal(login.status,200); const {token}=await login.json();
 const check=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/check-in`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({entry_id:'local-entry-ready',dancer_uid:'local-ph-manager'})}); assert.equal(check.status,200); return token;
}
async function revealEntry(page, target) {
 for(let i=0;i<200;i++){
  await page.getByText('Loading entries…',{exact:true}).waitFor({state:'hidden'});
  if(await target.count())return;
  const more=page.getByRole('button',{name:'Load more entries'});
  if(!(await more.count()))throw new Error('Stage entry was not found in the paginated list.');
  const response=page.waitForResponse(result=>result.request().method()==='GET' && /\/stages\/[^/]+\/entries\?/.test(result.url()));
  await more.click();assert.equal((await response).status(),200);
 }
 throw new Error('Stage entry pagination exceeded the test limit.');
}
async function chooseStage(page, select, stage) {
 const response=page.waitForResponse(result=>result.request().method()==='GET' && result.url().includes(`/stages/${stage}/entries`));
 if(await select.inputValue()===stage) await page.getByRole('button',{name:'Refresh',exact:true}).click(); else await select.selectOption(stage);
 assert.equal((await response).status(),200);
}
async function revealStage(page, select, stage) {
 for(let i=0;i<200 && !(await select.locator('option').filter({hasText:stage}).count());i++){
  const more=page.getByRole('button',{name:'Load more stages'});if(!(await more.count()))throw new Error('Stage was not found in the paginated list.');
  const response=page.waitForResponse(result=>result.request().method()==='GET' && /\/stages\?/.test(result.url()));
  await more.click();assert.equal((await response).status(),200);await select.waitFor();
 }
}
(async()=>{const browser=await chromium.launch({headless:true});const stages=[];try{for(const width of [390,1365]){
 const stage=`browser-${randomUUID()}`; const token=await setup(stage);
 stages.push(stage);
 const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'}); await context.route('https://**',route=>route.abort());
 const page=await context.newPage();page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`${web}/sign-in`,{waitUntil:'networkidle'});await page.getByLabel('Email address',{exact:true}).fill('marshal@ph.wsb.test');await page.getByLabel('Password',{exact:true}).fill(config.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/workspaces');
 let failStageLoad=true;await page.route(/\/stages(?:\?.*)?$/,async route=>{if(failStageLoad)await route.fulfill({status:503,body:'unavailable'});else await route.continue();});
 await page.goto(`${web}/console/local-rehearsal/marshal`,{waitUntil:'networkidle'});await page.getByText('Stage list is unavailable.',{exact:true}).waitFor();failStageLoad=false;await page.getByRole('button',{name:'Retry loading stages'}).click();const select=page.getByLabel('Select stage'); await select.waitFor();
 await revealStage(page,select,stage);
 await chooseStage(page,select,stage);await page.getByLabel('Entry ID',{exact:true}).fill('local-entry-ready');
 const operations=[];let drop=true;await page.route('**/stage-commands',async route=>{const body=route.request().postDataJSON();operations.push(body.operation_id);if(drop){drop=false;await route.fetch();await route.abort();}else await route.continue();});
 await page.getByRole('button',{name:'Add to holding'}).click();await page.getByRole('alert').waitFor();await page.getByRole('button',{name:'Add to holding'}).click();await page.getByText('Saved local-entry-ready: Holding',{exact:false}).waitFor();assert.equal(operations[0],operations[1]);
 const other=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-commands`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({operation_id:randomUUID(),stage_id:stage,entry_id:'local-entry-ready',expected_revision:1,position:'on_deck'})});assert.equal(other.status,200);
 const deck=page.getByRole('button',{name:'Move to On deck'});await revealEntry(page,deck);await deck.click();await page.getByRole('alert').getByText('The stage or entry changed',{exact:false}).waitFor();const refresh=page.waitForResponse(result=>result.request().method()==='GET' && result.url().includes(`/stages/${stage}/entries`));await page.getByRole('button',{name:'Refresh',exact:true}).click();assert.equal((await refresh).status(),200);await revealEntry(page,page.getByText('On deck · revision 2',{exact:true}));
 const observerContext=await browser.newContext({viewport:{width,height:950}});await observerContext.route('https://**',route=>route.abort());const observer=await observerContext.newPage();observer.setDefaultTimeout(60000);observer.on('pageerror',error=>errors.push(error.message));
 await observer.goto(`${web}/sign-in`,{waitUntil:'networkidle'});await observer.getByLabel('Email address',{exact:true}).fill('marshal@ph.wsb.test');await observer.getByLabel('Password',{exact:true}).fill(config.WSB_TEST_PASSWORD);await observer.getByRole('button',{name:'Sign in',exact:true}).click();await observer.waitForURL('**/workspaces');
 await observer.goto(`${web}/console/local-rehearsal/marshal`,{waitUntil:'networkidle'});const observerSelect=observer.getByLabel('Select stage');await observerSelect.waitFor();await revealStage(observer,observerSelect,stage);await chooseStage(observer,observerSelect,stage);
 await page.getByRole('button',{name:'Put stage on hold'}).click();await page.getByText('Hold active',{exact:true}).waitFor();await observer.getByText('Hold active',{exact:true}).waitFor({timeout:20000});
 const performing=page.getByRole('button',{name:'Move to Performing'});await revealEntry(page,performing);assert.equal(await performing.isDisabled(),true);
 const blocked=await fetch(`${api}/v1/chapters/ph/events/local-rehearsal/stage-commands`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({operation_id:randomUUID(),stage_id:stage,entry_id:'local-entry-ready',expected_revision:2,position:'performing'})});assert.equal(blocked.status,409);
 await page.getByRole('button',{name:'Release stage hold'}).click();await page.getByText('No hold active',{exact:true}).waitFor();await observer.getByText('No hold active',{exact:true}).waitFor({timeout:20000});await observer.close();
 for(const label of ['Performing','Completed']){const button=page.getByRole('button',{name:`Move to ${label}`});await revealEntry(page,button);await button.click();await page.getByText(`Saved local-entry-ready: ${label}`,{exact:false}).waitFor();}
 await page.getByRole('button',{name:'Put stage on hold'}).click();await page.getByText('Hold active',{exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});await select.waitFor();await revealStage(page,select,stage);await chooseStage(page,select,stage);await revealEntry(page,page.getByText('Completed · revision 4',{exact:true}));
 await page.getByText('Hold active',{exact:true}).waitFor();
 await page.locator('.stage-history').getByText('Change 7',{exact:true}).waitFor();assert.equal(await page.locator('.stage-history li').count(),7);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await context.close();
 }mkdirSync('.workspace',{recursive:true});writeFileSync('.workspace/stage-browser-recovery.json',JSON.stringify(stages));console.log('PASS: marshal stage workflow, hold synchronization, denial, loading recovery, lost-response retry, conflict refresh and reload on desktop and mobile.');}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
