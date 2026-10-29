/* Integration and responsive checks against the running local preview.
   Set WSB_PLAYWRIGHT_MODULE to an installed Playwright module if not on NODE_PATH. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.WSB_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.WSB_PREVIEW_URL || 'http://localhost:3000';
const routes = ['/', '/events/world-championship-2027', '/app/register/demo', '/app', '/console/demo/judge', '/arena-live/demo'];
const viewports = [[1440,1000],[390,844],[844,390],[834,1194],[1194,834],[320,568],[2560,1080],[1920,1080],[1080,1920]];

(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({reducedMotion:'reduce'});
 const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync('.workspace/screenshots',{recursive:true});
 for(const [width,height] of viewports){
  await page.setViewportSize({width,height});
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'networkidle'});
   assert.equal(response.status(),200,route);
   await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('h1').count(),1,`One primary heading: ${route}`);
   const dimensions=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(dimensions.scroll<=dimensions.width+2,`Horizontal overflow at ${width}×${height} ${route}: ${JSON.stringify(dimensions)}`);
   assert.equal(await page.locator('main#main-content').count(),1);
   if(width===1440 || width===390){
    const name=route==='/'?'home':route.split('/').filter(Boolean).join('-');
    await page.screenshot({path:`.workspace/screenshots/${name}-${width}.png`,fullPage:true});
   }
  }
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+'/',{waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Open navigation'}).click();
 await page.locator('#mobile-navigation').getByRole('link',{name:'Events',exact:true}).focus();
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('#mobile-navigation').count(),0);
 assert.equal(await page.getByRole('button',{name:'Open navigation'}).evaluate(e=>e===document.activeElement),true);

 await page.goto(base+'/app/register/demo');
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.getByRole('alert').filter({hasText:'Add your crew name'}).waitFor();
 await page.getByLabel('Crew name').fill('Prototype Test Crew');
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.getByLabel('Sample dancer name').fill('Sample Dancer One');
 await page.getByRole('button',{name:'Add dancer'}).click();
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.setViewportSize({width:844,height:390});
 await page.getByRole('button',{name:'Continue',exact:false}).click();
 await page.getByRole('button',{name:'Save preview entry'}).click();
 await page.getByRole('heading',{name:'Your crew’s next move.'}).waitFor();
 await page.getByRole('link',{name:'Open crew workspace'}).click();
 await page.getByRole('heading',{name:'Prototype Test Crew',exact:true}).waitFor();
 await page.reload();
 await page.getByRole('heading',{name:'Prototype Test Crew',exact:true}).waitFor();

 await page.goto(base+'/console/demo/judge');
 await page.getByRole('spinbutton',{name:'Choreography numeric score'}).fill('17.25');
 await page.getByRole('button',{name:'Review draft'}).click();
 await page.getByRole('dialog').waitFor();
 await page.getByRole('button',{name:'Save draft on this device'}).click();
 await page.getByText('Draft saved on this device',{exact:true}).waitFor();
 await page.reload();
 await page.getByText('Draft restored from this device',{exact:true}).waitFor();
 assert.equal(await page.getByRole('spinbutton',{name:'Choreography numeric score'}).inputValue(),'17.25');

 await page.goto(base+'/arena-live/demo');
 await page.getByLabel('Scene',{exact:true}).selectOption('holding');
 await page.getByRole('heading',{name:'ONE FLOOR. EVERY POSSIBILITY.'}).waitFor();

 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
 const plain=await noJs.newPage();await plain.goto(base+'/');
 assert.ok(await plain.getByRole('heading',{level:1}).isVisible());
 assert.ok(await plain.getByRole('link',{name:'Find your battleground'}).isVisible());
 await plain.getByRole('link',{name:'Find your battleground'}).click();
 await plain.getByRole('heading',{name:'The battlegrounds.'}).waitFor();
 await noJs.close();
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({responsiveCases:routes.length*viewports.length,checks:['registration validation','rotation preserves draft','sample entry persistence','judge review and persistence','mobile menu keyboard recovery','arena scene switching','no-JavaScript public navigation'],pageErrors:errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
