const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {chromium}=require(process.env.WSB_PLAYWRIGHT_MODULE||'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const config=Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(x=>x&&!x.startsWith('#')).map(x=>{const i=x.indexOf('=');return[x.slice(0,i),x.slice(i+1)];}));
const saved=JSON.parse(readFileSync('.workspace/stage-recovery.json','utf8'));
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:950}});page.setDefaultTimeout(60000);await page.route('https://**',r=>r.abort());
 const web=`http://localhost:${config.WSB_WEB_PORT||3100}`;await page.goto(`${web}/sign-in`,{waitUntil:'networkidle'});await page.getByLabel('Email address',{exact:true}).fill('marshal@ph.wsb.test');await page.getByLabel('Password',{exact:true}).fill(config.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/workspaces');
 await page.goto(`${web}/console/local-rehearsal/marshal`,{waitUntil:'networkidle'});const select=page.getByLabel('Select stage');await select.waitFor();const stage=saved.lineupCommand.stage_id;
 for(let i=0;i<200 && !(await select.locator('option').filter({hasText:stage}).count());i++){const next=page.waitForResponse(r=>r.request().method()==='GET'&&/\/stages\?/.test(r.url()));await page.getByRole('button',{name:'Load more stages'}).click();assert.equal((await next).status(),200);await select.waitFor();}
 await select.selectOption(stage);const history=page.locator('.lineup-history');await history.getByText('Revision 3',{exact:true}).waitFor();assert.deepEqual(await history.locator('li strong').allTextContents(),['Revision 1','Revision 2','Revision 3']);await history.getByText('Reason: Synthetic restoration after access check',{exact:true}).waitFor();
 const draft=page.locator('.stage-lineup');await draft.getByText('Draft revision 3',{exact:true}).waitFor();await draft.getByText('1. local-entry-ready',{exact:true}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);console.log('PASS: authorized marshal recovered the saved lineup draft and three history revisions after container recreation.');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
