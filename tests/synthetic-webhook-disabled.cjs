const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const body=JSON.stringify({payment_id:'synthetic-unknown',status:'settled'});
const sig=crypto.createHmac('sha256','demo-secret').update(body).digest('hex');
(async()=>{for(const path of ['/v1/webhooks/payments','/v1/chapters/ph/finance/webhook']){const r=await fetch(`http://localhost:8189${path}`,{method:'POST',headers:{'content-type':'application/json','x-signature':sig},body});assert.equal(r.status,503);}console.log('PASS: synthetic settlement fails closed when no explicit secret is configured.');})().catch(e=>{console.error(e);process.exitCode=1;});
