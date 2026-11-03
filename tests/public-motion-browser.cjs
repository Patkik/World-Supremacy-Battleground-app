/* Deterministic player/lifecycle checks; real playback is checked separately. */
const assert=require('node:assert/strict');
function loadPlaywright(){
 if(process.env.WSB_PLAYWRIGHT_MODULE)return require(process.env.WSB_PLAYWRIGHT_MODULE);
 try{return require('playwright');}
 catch(error){
  if(process.platform==='win32'){
   try{return require('C:/Users/patri/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');}catch{}
  }
  throw error;
 }
}
const {chromium}=loadPlaywright();
const base=process.env.WSB_PREVIEW_URL||'http://localhost:3100';
const fakeAPI=`
window.__videoEvents=[];window.__destroyed=0;
window.YT={Player:class {
 constructor(node,options){this.options=options;this.state=-1;this.frame=document.createElement('iframe');this.frame.title='Test player';node.replaceWith(this.frame);window.__player=this;this.playVideo=undefined;this.pauseVideo=undefined;this.mute=undefined;this.loadVideoById=undefined;
 setTimeout(()=>{document.dispatchEvent(new CustomEvent('wsb:motion-change',{detail:{paused:true}}));Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));document.dispatchEvent(new CustomEvent('wsb:motion-change',{detail:{paused:false}}));},0);
 setTimeout(()=>{for(const name of ['playVideo','pauseVideo','mute','loadVideoById'])delete this[name];window.__readyAt=performance.now();options.events.onReady({target:this});},350);}
 playVideo(){this.state=1;window.__firstPlayAt??=performance.now();window.__videoEvents.push('play');this.options.events.onStateChange({target:this,data:1});}
 pauseVideo(){this.state=2;window.__videoEvents.push('pause');this.options.events.onStateChange({target:this,data:2});}
 mute(){window.__videoEvents.push('mute');}unMute(){window.__videoEvents.push('unmute');}
 destroy(){this.frame.remove();window.__destroyed++;}
 getPlayerState(){return this.state;}
 loadVideoById(options){window.__videoEvents.push(options.videoId);this.playVideo();}
 end(){this.options.events.onStateChange({target:this,data:0});}
}};window.onYouTubeIframeAPIReady();`;
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
 await context.route('https://www.youtube.com/iframe_api',r=>r.fulfill({contentType:'application/javascript',body:fakeAPI}));
 const page=await context.newPage();const errors=[];const mainScripts=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='script'&&r.url().includes('/_next/static/chunks/'))mainScripts.add(r.url());});
 await page.goto(base+'/');
 await page.waitForSelector('.hero-highlights.is-playing');
 assert.ok(await page.evaluate(()=>window.__firstPlayAt-window.__readyAt<100),'playback starts immediately when ready');
 assert.doesNotMatch(await page.locator('body').innerText(),/design preview|sample event|fictional|prototype/i);
 assert.equal(await page.locator('.hero-player iframe').count(),1);
 assert.equal(await page.locator('.hero-highlights button, .hero-highlights a').count(),0);
 assert.equal(await page.locator('.hero-highlights').evaluate(e=>getComputedStyle(e).pointerEvents),'none');
 assert.equal(await page.locator('.hero-player iframe').getAttribute('tabindex'),'-1');
 assert.ok((await page.evaluate(()=>window.__videoEvents)).includes('mute'));
 assert.ok(!(await page.evaluate(()=>window.__videoEvents)).includes('unmute'));
 assert.equal(await page.locator('.site-motion-toggle').count(),0);
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 assert.equal(await page.locator('.brand-mark-white').first().evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)');
 await page.getByRole('button',{name:'Disable page motion',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.marketing-motion').dataset.motion==='paused');
 await page.getByRole('button',{name:'Enable page motion',exact:true}).click();
 await page.locator('.hero-highlights').scrollIntoViewIfNeeded();
 await page.waitForSelector('.hero-highlights.is-playing');
 await page.evaluate(()=>window.__player.end());
 await page.waitForFunction(()=>document.querySelector('.hero-highlights').dataset.activeClip==='JmN8I9OJjYk');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForFunction(()=>document.querySelectorAll('.hero-player iframe').length===0);
 assert.equal(await page.locator('.hero-highlights button').count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.header-cta').click();
 await page.getByRole('heading',{name:'The battlegrounds.'}).waitFor();
 assert.equal(await page.locator('.hero-player iframe').count(),0);
 assert.ok(await page.evaluate(()=>window.__destroyed>0));
 await page.getByRole('link',{name:/WORLD CHAMPIONSHIP/}).click();
 await page.getByRole('heading',{name:/HONG KONG.*WORLD STAGE/}).waitFor();
 assert.equal(await page.locator('a[href*="jotform.com"]').count(),0);
 assert.ok(await page.locator('a[href="/app/register/hk-championship-2027"]').count());

 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});let reducedRequests=0;const reducedScripts=new Set();
 await reduced.route('https://www.youtube.com/iframe_api',r=>{reducedRequests++;return r.fulfill({contentType:'application/javascript',body:fakeAPI});});
 const quiet=await reduced.newPage();quiet.on('request',r=>{if(r.resourceType()==='script'&&r.url().includes('/_next/static/chunks/'))reducedScripts.add(r.url());});await quiet.goto(base+'/');await quiet.waitForTimeout(600);
 assert.equal(reducedRequests,0);assert.equal(await quiet.locator('.hero-player iframe').count(),0);
 assert.equal(await quiet.locator('.motion-tape-track').evaluate(e=>getComputedStyle(e).animationName),'none');
 const motionOnlyChunks=[...mainScripts].filter(url=>!reducedScripts.has(url));assert.ok(motionOnlyChunks.length>0,'motion engine chunks load only when motion is allowed');

 const paused=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});const pausedScripts=new Set();
 await paused.addInitScript(()=>sessionStorage.setItem('wsb-motion-paused','true'));
 await paused.route('https://www.youtube.com/iframe_api',r=>r.abort());
 const pausedPage=await paused.newPage();pausedPage.on('request',r=>{if(r.resourceType()==='script'&&r.url().includes('/_next/static/chunks/'))pausedScripts.add(r.url());});await pausedPage.goto(base+'/');await pausedPage.waitForTimeout(600);
 assert.equal(await pausedPage.locator('.marketing-motion').getAttribute('data-motion'),'paused');
 assert.equal([...pausedScripts].some(url=>motionOnlyChunks.includes(url)),false,'saved motion preference skips motion engine chunks');

 const saver=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});let saverRequests=0;
 await saver.addInitScript(()=>Object.defineProperty(navigator,'connection',{value:{saveData:true,effectiveType:'4g',addEventListener(){},removeEventListener(){}},configurable:true}));
 await saver.route('https://www.youtube.com/iframe_api',r=>{saverRequests++;return r.abort();});
 const saved=await saver.newPage();await saved.goto(base+'/');await saved.waitForTimeout(600);assert.equal(saverRequests,0);

 const blocked=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'});
 await blocked.route('https://www.youtube.com/iframe_api',r=>r.abort());
 const fallback=await blocked.newPage();await fallback.goto(base+'/');
 await fallback.waitForSelector('.hero-highlights[data-playback=unavailable]');
 assert.ok(await fallback.locator('.highlights-poster').isVisible());
 assert.ok(await fallback.getByRole('link',{name:/WSBstreet on YouTube/}).isVisible());
 assert.ok(await fallback.locator('.hero-actions').getByRole('link',{name:'Find an event',exact:true}).isVisible());
 assert.deepEqual(errors,[]);
 console.log('PASS: inert muted autoplay, no video controls, white dark-mode logo, footer motion preference, clip rotation, cleanup, reduced motion, lazy motion bundles, data saving and poster fallback.');
 await paused.close();await reduced.close();await context.close();await browser.close();
})().catch(error=>{console.error(error);process.exit(1)});
