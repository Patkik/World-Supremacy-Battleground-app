const { spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const config = JSON.parse(readFileSync('/workspace/firebase.local.json', 'utf8'));
const used = new Set();
for (const [service, setting, fallback] of [['auth','WSB_AUTH_PORT',9099],['firestore','WSB_FIRESTORE_PORT',8188],['storage','WSB_STORAGE_PORT',9199],['ui','WSB_EMULATOR_UI_PORT',4408],['hub','WSB_EMULATOR_HUB_PORT',4418],['logging','WSB_EMULATOR_LOG_PORT',4518],['websocket','WSB_FIRESTORE_WS_PORT',9288]]) {
  const port = Number(process.env[setting] || fallback);
  if (!Number.isInteger(port) || port < 1024 || port > 65535 || used.has(port)) throw new Error('Emulator ports must be distinct integers between 1024 and 65535');
  used.add(port);
  if (service === 'websocket') config.emulators.firestore.websocketPort = port;
  else config.emulators[service].port = port;
}
writeFileSync('/workspace/firebase.runtime.json', JSON.stringify(config));
const args = ['emulators:start', '--project', 'demo-wsb', '--config', 'firebase.runtime.json', '--only', 'auth,firestore,storage', '--export-on-exit', '/data/export'];
if (existsSync('/data/export/firebase-export-metadata.json')) args.push('--import', '/data/export');
const child = spawn('/workspace/node_modules/.bin/firebase', args, { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill('SIGINT'));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
