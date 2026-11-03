const assert=require('node:assert/strict');
const {readFileSync,writeFileSync,mkdirSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
const {chromium}=require(process.env.WSB_PLAYWRIGHT_MODULE||'C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const settings=Object.fromEntries(readFileSync('.env.docker','utf8').split(/\r?\n/).filter(line=>line&&!line.startsWith('#')).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
const base=`http://localhost:${settings.WSB_WEB_PORT||3100}`;
const api=`http://localhost:${settings.WSB_API_PORT||8189}`;
const database=`http://localhost:${settings.WSB_FIRESTORE_PORT||8188}/v1/projects/demo-wsb/databases/(default)/documents`;
async function syntheticAudioFixture(entryId){
  assert.match(entryId,/^entry-[a-f0-9]+$/);
  const path=`${database}/chapters/ph/events/local-rehearsal/entries/${entryId}`;
  const response=await fetch(path,{headers:{Authorization:'Bearer owner'}});assert.equal(response.status,200);
  const record=await response.json();const entry=record.fields.entry.mapValue.fields;
  assert.equal(entry.status.stringValue,'needs_correction');
  // Trusted server metadata fixture only, until the private media pipeline is implemented.
  entry.track_filename={stringValue:'synthetic-browser-compliance.mp3'};entry.track_duration_secs={integerValue:'120'};
  entry.revision={integerValue:String(Number(entry.revision.integerValue)+1)};
  const update=await fetch(`${database}:commit`,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify({writes:[{update:{name:record.name,fields:record.fields},currentDocument:{updateTime:record.updateTime}}]})});
  if(!update.ok)console.log('Synthetic metadata fixture rejected:',await update.text());
  assert.equal(update.status,200);
}
async function main(){
  const browser=await chromium.launch({headless:true});mkdirSync('.workspace/registration-checks',{recursive:true});const saved=[];
  try{
    for(const viewport of [{width:1365,height:960},{width:390,height:844}]){
      const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.route('https://**',route=>route.abort());
      const page=await context.newPage();page.setDefaultTimeout(60000);page.setDefaultNavigationTimeout(120000);console.log(`Checking native registration at ${viewport.width}px…`);const errors=[];page.on('pageerror',error=>errors.push(error.message));
      async function login(name){await page.goto(`${base}/sign-in`,{waitUntil:'networkidle',timeout:120000});await page.getByLabel('Email address',{exact:true}).fill(`${name}@ph.wsb.test`);await page.getByLabel('Password',{exact:true}).fill(settings.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/workspaces');await page.getByText('Assigned role:',{exact:false}).waitFor();}
      async function logout(){await page.goto(`${base}/workspaces`);await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.getByRole('link',{name:'Sign in to continue',exact:true}).waitFor();}
      await login('manager');await page.goto(`${base}/app/crews/new`);
      const name=`Synthetic browser crew ${randomUUID()}`;
      await page.getByLabel('Crew name',{exact:true}).fill(name);await page.getByLabel('Home city',{exact:true}).fill('Synthetic test city');
      let lost=false,accepted=null;const operations=[];
      await page.route(`${api}/v1/chapters/ph/crews`,async route=>{
        if(route.request().method()!=='POST')return route.continue();
        operations.push(route.request().postDataJSON().operation_id);
        if(!lost){lost=true;const response=await route.fetch();assert.equal(response.status(),200);accepted=await response.json();return route.abort('failed');}
        return route.continue();
      });
      await page.getByRole('button',{name:'Create crew',exact:true}).click();await page.locator('.form-error').waitFor();
      await page.reload({waitUntil:'networkidle'});await page.getByLabel('Crew name',{exact:true}).fill(name);await page.getByLabel('Home city',{exact:true}).fill('Synthetic test city');
      await page.getByRole('button',{name:'Create crew',exact:true}).click();await page.waitForURL('**/app/crews/crew-*');
      assert.equal(operations.length,2);assert.equal(operations[0],operations[1]);assert.ok(page.url().endsWith(accepted.id));assert.deepEqual(accepted.members,[]);
      await page.getByRole('button',{name:'Create dancer invitation',exact:true}).click();
      const invite=page.getByLabel('One-use invitation link');await invite.waitFor();const invitation=await invite.inputValue();
      await logout();await page.goto(invitation);await page.getByRole('link',{name:'Sign in',exact:true}).click();
      await page.getByLabel('Email address',{exact:true}).fill('dancer1@ph.wsb.test');await page.getByLabel('Password',{exact:true}).fill(settings.WSB_TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL('**/invite/**');
      await page.getByLabel('Your name',{exact:true}).fill('Synthetic browser performer');await page.getByRole('button',{name:'Accept invitation',exact:true}).click();await page.getByRole('heading',{name:'Crew joined',exact:true}).waitFor();
      await logout();await login('manager');await page.goto(`${base}/app/register/local-rehearsal`);
      try {await page.getByLabel('Your crew',{exact:true}).selectOption(accepted.id);await page.getByLabel('Event division',{exact:true}).selectOption('local-open');}
      catch(error){console.log('Registration state:',(await page.locator('main').innerText()).slice(0,1500));console.log('Browser exceptions:',errors);throw error;}
      await page.getByRole('button',{name:'Create draft entry',exact:true}).click();await page.waitForURL('**/app/entries/entry-*?event=local-rehearsal');
      const entryId=new URL(page.url()).pathname.split('/').at(-1);saved.push({crewId:accepted.id,entryId,operationId:operations[0],name});
      await page.getByRole('link',{name:'Select performers',exact:true}).click();await page.getByLabel('Synthetic browser performer',{exact:true}).check();await page.getByRole('button',{name:'Save performers',exact:true}).click();await page.getByText('Performer roster saved by the event service.',{exact:true}).waitFor();
      await page.getByRole('link',{name:'Back to readiness',exact:true}).click();await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByText('Server updated entry status to needs correction.',{exact:true}).waitFor();
      await page.getByRole('link',{name:'Payment reference',exact:true}).click();const reference=`synthetic-bank-${randomUUID()}`;await page.getByLabel('Bank or cash receipt reference',{exact:true}).fill(reference);await page.getByRole('button',{name:'Send for finance review',exact:true}).click();await page.getByRole('heading',{name:'Awaiting finance review',exact:true}).waitFor();
      await page.goto(`${base}/app/entries/${entryId}/roster?event=local-rehearsal`);await page.getByText('Settled or pending payments and approved entries require review before the roster can change.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Save performers',exact:true}).isDisabled(),true);
      await logout();await login('finance');await page.goto(`${base}/admin/ph/finance/transactions`);
      await page.getByRole('button',{name:'Refresh payment status',exact:true}).waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Refresh payment status'&&!button.disabled));
      const payment=page.locator('article').filter({has:page.getByRole('heading',{name:reference,exact:true})});
      for(let i=0;i<100&&!(await payment.count());i++){const more=page.getByRole('button',{name:'Load more payment records',exact:true});if(!(await more.count()))break;const response=page.waitForResponse(value=>value.request().method()==='GET'&&new URL(value.url()).pathname==='/v1/chapters/ph/finance/payments');await more.click();assert.equal((await response).status(),200);await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Refresh payment status'&&!button.disabled));}
      await payment.getByRole('button',{name:'Review reference',exact:true}).click();await payment.getByLabel('Reason for this reconciliation decision',{exact:true}).fill('Synthetic reconciliation approval');await payment.getByRole('button',{name:'Confirm verified payment',exact:true}).click();await payment.getByText('settled',{exact:true}).waitFor();
      await syntheticAudioFixture(entryId);
      await logout();await login('manager');await page.goto(`${base}/app/entries/${entryId}?event=local-rehearsal`);await page.getByRole('button',{name:'Submit for review',exact:true}).click();await page.getByText('Server updated entry status to submitted.',{exact:true}).waitFor();
      await logout();await login('registrar');await page.goto(`${base}/admin/ph/events/local-rehearsal/registrations`);
      await page.getByRole('button',{name:'Refresh registrations',exact:true}).waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Refresh registrations'&&!button.disabled));
      for(let i=0;i<100&&!(await page.getByRole('heading',{name:accepted.id,exact:true}).count());i++){const more=page.getByRole('button',{name:'Load more registrations',exact:true});if(!(await more.count()))break;const response=page.waitForResponse(value=>value.request().method()==='GET'&&new URL(value.url()).pathname==='/v1/chapters/ph/events/local-rehearsal/entries');await more.click();assert.equal((await response).status(),200);await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(button=>button.textContent.trim()==='Refresh registrations'&&!button.disabled));}
      const entry=page.locator('article').filter({has:page.getByRole('heading',{name:accepted.id,exact:true})});await entry.getByRole('link',{name:'Review entry',exact:true}).click();await page.getByRole('button',{name:'Approve ready entry',exact:true}).click();await page.getByText('Server updated entry status to approved.',{exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.screenshot({path:`.workspace/registration-checks/approved-${viewport.width}.png`,fullPage:true});assert.deepEqual(errors,[]);
      await logout();await context.close();console.log(`PASS ${viewport.width}px: lost crew response + reload/retry, dancer invitation/sign-in return, canonical roster, payment reservation/reconciliation, submission and registrar approval.`);
    }
    writeFileSync('.workspace/registration-checks/recovery.json',JSON.stringify(saved));
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error.stack);process.exitCode=1;});
