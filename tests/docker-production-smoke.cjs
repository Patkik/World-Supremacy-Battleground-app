// Run inside the built web-production image, with this file mounted read-only.
const assert = require('node:assert/strict');
const { readdirSync } = require('node:fs');
assert.notEqual(process.getuid(), 0, 'runtime runs without root privileges');
assert.deepEqual(readdirSync('/workspace/apps/web').filter(name => name.startsWith('.env')), []);
require('/workspace/apps/web/server.js');
async function main() {
  let response;
  for (let attempt = 0; attempt < 40; attempt++) {
    try { response = await fetch('http://127.0.0.1:3000/sign-in'); if (response.ok) break; } catch { /* Wait for server startup. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.equal(response?.status, 200);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const html = await response.text();
  assert.ok(html.includes('Sign in'));
  const script = html.match(/src="(\/_next\/static\/[^"?]+\.js)/)?.[1];
  assert.ok(script, 'HTML references compiled scripts');
  assert.equal((await fetch(`http://127.0.0.1:3000${script}`)).status, 200);
  assert.equal((await fetch('http://127.0.0.1:3000/brand/wsb-logo.png')).status, 200);
  console.log('PASS: production web image starts as non-root, serves HTML, bundled scripts and branding, and contains no environment files.');
}
main().then(() => process.exit(0)).catch(error => { console.error(error.message); process.exit(1); });
