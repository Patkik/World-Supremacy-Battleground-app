const http = require('node:http');
const { randomUUID, createHash, createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
if (process.env.WSB_PAYMONGO_EMULATOR !== 'true') throw new Error('PayMongo emulator must be explicitly enabled');
const stateFile = process.env.WSB_PAYMONGO_STATE_FILE;
if (!stateFile) throw new Error('Synthetic emulator state file is required');
let state = { sessions: {}, operations: {} };
try { state = JSON.parse(fs.readFileSync(stateFile, 'utf8')); if (!state.sessions || !state.operations) throw new Error('invalid emulator state'); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
const persist = () => { fs.mkdirSync(path.dirname(stateFile), {recursive:true}); const temporary = `${stateFile}.tmp`; fs.writeFileSync(temporary,JSON.stringify(state)); fs.renameSync(temporary,stateFile); };
const json = (response, status, value) => { response.writeHead(status, {'content-type':'application/json','cache-control':'no-store'}); response.end(JSON.stringify(value)); };
const id = prefix => `${prefix}_${randomUUID().replaceAll('-','')}`;
const server=http.createServer(async (request,response)=>{
  const url=new URL(request.url,'http://localhost');
  if(request.method==='GET' && url.pathname==='/healthz') return json(response,200,{status:'synthetic'});
  let body='';
  try { for await (const chunk of request) {body+=chunk; if(Buffer.byteLength(body)>65536) return json(response,413,{error:'body too large'});} } catch { return json(response,400,{error:'invalid request'}); }
  let input={};if(body){try{input=JSON.parse(body);}catch{return json(response,400,{error:'invalid JSON'});}}
  if(request.method==='POST' && url.pathname==='/v2/checkout_sessions') {
    const attributes=input?.data?.attributes;const items=attributes?.line_items;
    const operation=request.headers['idempotency-key'];if(typeof operation!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(operation))return json(response,400,{error:'synthetic idempotency key required'});
    const hash=createHash('sha256').update(body).digest('hex');const previous=state.operations[operation];if(previous){if(previous.hash!==hash)return json(response,409,{error:'synthetic operation conflict'});return json(response,200,{data:previous.response});}
    if(!Array.isArray(items)||items.length!==1||!Number.isSafeInteger(items[0]?.amount)||items[0].amount<=0||items[0].currency!=='PHP'||items[0].quantity!==1||typeof attributes.reference_number!=='string'||!attributes.reference_number.trim()||attributes.reference_number.length>200) return json(response,400,{error:'invalid synthetic checkout'});
    const session={id:id('cs'),type:'checkout_session',attributes:{reference_number:attributes.reference_number,livemode:false,status:'active',amount:items[0].amount,currency:'PHP',payments:[]}};
    state.sessions[session.id]=session;state.operations[operation]={hash,session_id:session.id,response:JSON.parse(JSON.stringify(session))};persist();return json(response,200,{data:session});
  }
  const expire=url.pathname.match(/^\/v2\/checkout_sessions\/(cs_[a-f0-9]+)\/expire$/);
  if(request.method==='POST' && expire){
    const session=state.sessions[expire[1]];if(!session)return json(response,404,{error:'session not found'});
    if(session.attributes.status==='paid')return json(response,409,{error:'paid session cannot expire'});
    if(session.attributes.status!=='expired'){session.attributes.status='expired';persist();}
    return json(response,200,{data:session});
  }
  const delivery=url.pathname.match(/^\/test\/checkout_sessions\/(cs_[a-f0-9]+)\/deliver$/);
  if(request.method==='POST' && delivery){
    const session=state.sessions[delivery[1]];if(!session?.event)return json(response,404,{error:'paid event not found'});
    const secret=process.env.WSB_PAYMONGO_LOCAL_SECRET;if(!secret||secret.length<32)return json(response,503,{error:'synthetic signing unavailable'});
    const raw=JSON.stringify(session.event);const timestamp=String(Math.floor(Date.now()/1000));const signature=createHmac('sha256',secret).update(`${timestamp}.${raw}`).digest('hex');
    try {const result=await fetch('http://api:8088/v1/local/paymongo/webhook',{method:'POST',headers:{'content-type':'application/json','paymongo-signature':`t=${timestamp},te=${signature},li=`},body:raw,signal:AbortSignal.timeout(5000)});return json(response,result.status,{delivered:result.ok});} catch {return json(response,503,{error:'synthetic callback unavailable'});}
  }
  const match=url.pathname.match(/^\/test\/checkout_sessions\/(cs_[a-f0-9]+)\/pay$/);
  if(request.method==='POST' && match){
    const session=state.sessions[match[1]];if(!session)return json(response,404,{error:'session not found'});
    if(session.attributes.status==='expired')return json(response,409,{error:'expired session cannot be paid'});
    if(!session.event){session.attributes.status='paid';session.attributes.payments=[{id:id('pay'),type:'payment',attributes:{amount:session.attributes.amount,currency:'PHP',status:'paid',livemode:false}}];session.event={data:{id:id('evt'),type:'event',attributes:{type:'checkout_session.payment.paid',livemode:false,created_at:Math.floor(Date.now()/1000),data:{id:session.id,type:session.type,attributes:{...session.attributes}}}}};}
    persist();return json(response,200,session.event);
  }
  return json(response,404,{error:'not found'});
});
server.listen(Number(process.env.PORT||8191),process.env.HOST||'127.0.0.1',()=>console.log('PayMongo emulator: synthetic, in-memory sessions only'));
