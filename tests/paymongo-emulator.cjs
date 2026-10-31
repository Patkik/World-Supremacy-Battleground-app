const assert=require('node:assert/strict');
const endpoint='http://127.0.0.1:8191';const fs=require('node:fs');
if(process.argv[2]==='recover'){(async()=>{const saved=JSON.parse(fs.readFileSync('.workspace/paymongo-emulator.json','utf8'));const send=(path,body)=>fetch(endpoint+path,{method:'POST',headers:{'content-type':'application/json','idempotency-key':saved.operation},body:JSON.stringify(body)});const create=await send('/v2/checkout_sessions',{data:{attributes:saved.attrs}});assert.equal(create.status,200);assert.deepEqual(await create.json(),saved.original);const paid=await send(`/test/checkout_sessions/${saved.original.data.id}/pay`,{});assert.equal(paid.status,200);assert.deepEqual(await paid.json(),saved.event);console.log('PASS: synthetic checkout and paid event recovered after emulator restart.');})().catch(e=>{console.error(e);process.exitCode=1;});return;}
(async()=>{
 const operation=require('node:crypto').randomUUID();const send=(path,body)=>fetch(endpoint+path,{method:'POST',headers:{'content-type':'application/json','idempotency-key':operation},body:JSON.stringify(body)});
 const attrs={line_items:[{name:'Synthetic entry',amount:12500,currency:'PHP',quantity:1}],reference_number:'synthetic-order'};
 assert.equal((await send('/v2/checkout_sessions',{data:{attributes:{...attrs,line_items:[{...attrs.line_items[0],currency:'USD'}]}}})).status,400);
 const created=await send('/v2/checkout_sessions',{data:{attributes:attrs}});assert.equal(created.status,200);const original=await created.json();const session=original.data;assert.equal(session.attributes.livemode,false);
 const repeat=await send('/v2/checkout_sessions',{data:{attributes:attrs}});assert.equal((await repeat.json()).data.id,session.id);
 const changed=await send('/v2/checkout_sessions',{data:{attributes:{line_items:[{amount:12501,currency:'PHP',quantity:1}],reference_number:'synthetic-order'}}});assert.equal(changed.status,409);
 const paid=await send(`/test/checkout_sessions/${session.id}/pay`,{});assert.equal(paid.status,200);const event=await paid.json();assert.equal(event.data.attributes.type,'checkout_session.payment.paid');assert.equal(event.data.attributes.data.id,session.id);assert.equal(event.data.attributes.data.attributes.payments[0].attributes.amount,12500);
 const cannotExpirePaid=await send(`/v2/checkout_sessions/${session.id}/expire`,{});assert.equal(cannotExpirePaid.status,409);
 const retry=await send(`/test/checkout_sessions/${session.id}/pay`,{});assert.deepEqual(await retry.json(),event);
 assert.equal((await send('/test/checkout_sessions/cs_deadbeef/pay',{})).status,404);
 const expiringOperation=require('node:crypto').randomUUID();const post=(path,body)=>fetch(endpoint+path,{method:'POST',headers:{'content-type':'application/json','idempotency-key':expiringOperation},body:JSON.stringify(body)});
 const createExpiring=await post('/v2/checkout_sessions',{data:{attributes:attrs}});const expiring=(await createExpiring.json()).data;
 const expired=await post(`/v2/checkout_sessions/${expiring.id}/expire`,{});assert.equal(expired.status,200);assert.equal((await expired.json()).data.attributes.status,'expired');
 assert.equal((await post(`/v2/checkout_sessions/${expiring.id}/expire`,{})).status,200);assert.equal((await post(`/test/checkout_sessions/${expiring.id}/pay`,{})).status,409);

 fs.mkdirSync('.workspace',{recursive:true});fs.writeFileSync('.workspace/paymongo-emulator.json',JSON.stringify({operation,attrs,original,event}));
 console.log('PASS: synthetic checkout validation, paid event and repeated completion.');
})().catch(e=>{console.error(e);process.exitCode=1;});
