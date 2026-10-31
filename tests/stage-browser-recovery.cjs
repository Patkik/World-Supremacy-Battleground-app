const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {chromium} = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config=Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
const stages=JSON.parse(readFileSync('.workspace/stage-browser-recovery.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:950}});page.setDefaultTimeout(60000);await page.route('https://**',route=>route.abort());
 await page.goto(`http://localhost:${config.WSB_WEB_PORT||3100}/sign-in`,{waitUntil:'networkidle'});await page.getByLabel('Email address',{exact:true}).fill('marshal@ph.wsb.test');await page.getByLabel('Password',{exact:true}).fill(config.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/workspaces');
 await page.goto(`http://localhost:${config.WSB_WEB_PORT||3100}/console/local-rehearsal/marshal`,{waitUntil:'networkidle'});const select=page.getByLabel('Select stage');await select.waitFor();
 for(const stage of stages){
  for(let i=0;i<200 && !(await select.locator('option').filter({hasText:stage}).count());i++){const more=page.getByRole('button',{name:'Load more stages'});if(!(await more.count()))throw new Error('Stage not found');const next=page.waitForResponse(result=>result.request().method()==='GET' && /\/stages\?/.test(result.url()));await more.click();assert.equal((await next).status(),200);await select.waitFor();}
  const response=page.waitForResponse(result=>result.request().method()==='GET' && result.url().includes(`/stages/${stage}/entries`));
  const status=page.waitForResponse(result=>result.request().method()==='GET' && result.url().endsWith(`/stages/${stage}`));
  if(await select.inputValue()===stage) await page.getByRole('button',{name:'Refresh',exact:true}).click(); else await select.selectOption(stage);
  assert.equal((await response).status(),200);const statusResponse=await status;assert.equal(statusResponse.status(),200);const savedStatus=await statusResponse.json();assert.equal(savedStatus.held,true);assert.equal(savedStatus.hold_revision,3);
  const completed=page.getByText('Completed · revision 4',{exact:true});
  for(let i=0;i<200;i++){await page.getByText('Loading entries…',{exact:true}).waitFor({state:'hidden'});if(await completed.count())break;const more=page.getByRole('button',{name:'Load more entries'});if(!(await more.count()))throw new Error('Recovered stage entry not found');const next=page.waitForResponse(result=>result.request().method()==='GET' && result.url().includes(`/stages/${stage}/entries`));await more.click();assert.equal((await next).status(),200);}
  await completed.waitFor();
  await page.getByText('Hold active',{exact:true}).waitFor();
  await page.locator('.stage-history').getByText('Change 7',{exact:true}).waitFor();
  assert.equal(await page.locator('.stage-history li').count(),7);
  const changes=await page.locator('.stage-history li strong').allTextContents();assert.deepEqual(changes,Array.from({length:7},(_,i)=>`Change ${i+1}`));
 }
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('PASS: marshal stage records and seven ordered timeline rows recovered after container recreation.');
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
