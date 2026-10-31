const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {chromium} = require(process.env.WSB_PLAYWRIGHT_MODULE || 'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings=Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}));
const base=`http://localhost:${settings.WSB_WEB_PORT||3100}`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 try { for(const width of [390,1365]) {
  const context=await browser.newContext({viewport:{width,height:950},reducedMotion:'reduce'});await context.route('https://**',r=>r.abort());
  const page=await context.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/sign-in`,{waitUntil:'networkidle'});await page.getByLabel('Email address',{exact:true}).fill('marshal@ph.wsb.test');await page.getByLabel('Password',{exact:true}).fill(settings.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/workspaces');await page.getByText('Assigned role:',{exact:false}).waitFor();
  await page.goto(`${base}/console/local-rehearsal/check-in`,{waitUntil:'networkidle'});await page.getByLabel('Entry ID',{exact:true}).fill('local-entry-ready');await page.getByLabel('Dancer account ID',{exact:true}).fill('unknown-synthetic');await page.getByRole('button',{name:'Record check-in'}).click();await page.getByRole('alert').getByText('Check the entry and dancer IDs.',{exact:false}).waitFor();
  await page.getByLabel('Dancer account ID',{exact:true}).fill('local-ph-manager');await page.getByRole('button',{name:'Record check-in'}).click();await page.getByText('Check-in recorded.',{exact:false}).waitFor();const reference=await page.locator('p[role=status]').filter({hasText:'Check-in recorded.'}).locator('.mono').innerText();await page.locator('.connected-list').getByText('local-ph-manager').waitFor();
  await page.reload({waitUntil:'networkidle'});await page.locator('.connected-list').getByText('local-ph-manager').waitFor();await page.getByLabel('Entry ID',{exact:true}).fill('local-entry-ready');await page.getByLabel('Dancer account ID',{exact:true}).fill('local-ph-manager');await page.getByRole('button',{name:'Record check-in'}).click();await page.getByText('Check-in recorded.',{exact:false}).waitFor();assert.equal(await page.locator('p[role=status]').filter({hasText:'Check-in recorded.'}).locator('.mono').innerText(),reference);
  const overflow=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth,elements:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,className:typeof el.className==='string'?el.className:'',text:el.innerText?.slice(0,80),right:Math.round(el.getBoundingClientRect().right)})).slice(0,8)}));assert.equal(overflow.width<=overflow.viewport,true,JSON.stringify(overflow));assert.deepEqual(errors,[]);await context.close();
 } console.log('PASS: online check-in rejected an unknown dancer, showed the durable arrival list after save and reload, and returned the same receipt on desktop and mobile.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
