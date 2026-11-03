const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const runner = spawn(process.execPath, [path.join(root, 'tests', 'run-audit-browser.cjs')], {
  cwd: root,
  env: { ...process.env, WSB_RUN_PERFORMANCE: '1' },
  stdio: 'inherit',
});

runner.once('error', error => {
  console.error(error);
  process.exitCode = 1;
});
runner.once('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
