const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const webBuild = path.join(root, 'apps', 'web', '.next');
const serverCandidates = [
  path.join(webBuild, 'standalone', 'apps', 'web'),
  path.join(webBuild, 'standalone'),
];
const serverRoot = serverCandidates.find(candidate => fs.existsSync(path.join(candidate, 'server.js')));

assert(serverRoot, 'Build the web app before running the production browser audit.');
fs.cpSync(path.join(root, 'apps', 'web', 'public'), path.join(serverRoot, 'public'), { recursive: true });
fs.cpSync(path.join(webBuild, 'static'), path.join(serverRoot, '.next', 'static'), { recursive: true });

async function unusedPort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

async function main() {
  const port = await unusedPort();
  const api = http.createServer((request, response) => {
    if (request.url === '/v1/events/synthetic-unpublished/published') {
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end('[]');
      return;
    }
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end('{"error":"not_found"}');
  });
  await new Promise((resolve, reject) => api.once('error', reject).listen(0, '127.0.0.1', resolve));
  const apiPort = api.address().port;
  const server = spawn(process.execPath, ['server.js'], {
    cwd: serverRoot,
    env: { ...process.env, API_URL: `http://127.0.0.1:${apiPort}`, HOSTNAME: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let serverLog = '';
  server.stdout.on('data', chunk => { serverLog += chunk; });
  server.stderr.on('data', chunk => { serverLog += chunk; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30000;

  try {
    let ready = false;
    while (Date.now() < deadline) {
      if (server.exitCode !== null) throw new Error(`Standalone server exited early.\n${serverLog}`);
      try {
        const response = await fetch(base, { signal: AbortSignal.timeout(1500) });
        ready = response.ok;
        if (ready) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    assert(ready, `Standalone server did not start.\n${serverLog}`);
    const scripts = ['audit-browser.cjs', 'public-stage-browser.cjs', 'public-motion-browser.cjs', 'service-worker-upgrade-browser.cjs'];
    if (process.env.WSB_RUN_PERFORMANCE === '1') scripts.push('../tools/measure-public-performance.cjs');
    for (const script of scripts) {
      const audit = spawn(process.execPath, [path.join(__dirname, script)], {
        cwd: root,
        env: { ...process.env, WSB_PREVIEW_URL: base, WSB_EXPECTED_SITE_URL: process.env.WSB_EXPECTED_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wsb.invalid' },
        stdio: 'inherit',
      });
      const code = await new Promise((resolve, reject) => {
        audit.once('error', reject);
        audit.once('exit', (exitCode, signal) => resolve(exitCode ?? (signal ? 1 : 0)));
      });
      if (code !== 0) throw new Error(`${script} failed with exit code ${code}.\n${serverLog}`);
    }
  } finally {
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill('SIGTERM');
      await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 5000))]);
      if (server.exitCode === null) server.kill('SIGKILL');
    }
    await new Promise(resolve => api.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
