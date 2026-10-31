// Own the emulator CLI process so Windows cleanup can target only Java children
// launched by this test. Never stop a pre-existing service on the selected ports.
const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const cli = spawn(process.execPath, [require.resolve('firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--project', 'demo-wsb', '--config', 'infra/firebase/persistence-emulators.json', '--only', 'firestore', 'node tests/run-firestore-repository.cjs'], { cwd: root, stdio: 'inherit', windowsHide: true });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => cli.kill(signal));
const psLiteral = value => `'${value.replaceAll("'", "''")}'`;
function cleanupOwnedEmulator() {
  if (process.platform !== 'win32' || !Number.isInteger(cli.pid)) return;
  const rules = path.join(root, 'infra', 'firebase', 'firestore.rules');
  const query = `Get-CimInstance Win32_Process -Filter "Name='java.exe'" | Where-Object { $_.ParentProcessId -eq ${cli.pid} -and $_.CommandLine.Contains('--port 8188') -and $_.CommandLine.Contains('--project_id demo-wsb') -and $_.CommandLine.Contains(${psLiteral(rules)}) } | Select-Object -ExpandProperty ProcessId`;
  const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', query], { encoding: 'utf8', windowsHide: true });
  for (const value of output.split(/\s+/).filter(Boolean)) {
    const pid = Number(value);
    if (!Number.isInteger(pid) || pid <= 0) throw new Error('Unexpected emulator process identifier.');
    try { process.kill(pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
}
cli.once('error', error => { console.error(error.message); process.exitCode = 1; });
cli.once('exit', code => {
  try { cleanupOwnedEmulator(); process.exitCode = code ?? 1; }
  catch (error) { console.error(`Test emulator cleanup failed: ${error.message}`); process.exitCode = 1; }
});
