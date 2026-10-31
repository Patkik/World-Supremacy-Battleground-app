#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const TIER5_FILES = [
  'tests/e2e_tiers/tier5_adversarial/t5_backend_hardening.test.mjs',
  'tests/e2e_tiers/tier5_adversarial/t5_ops_client_hardening.test.mjs',
];

async function runTestFile(relPath) {
  return new Promise((resolve) => {
    const fullPath = path.resolve(rootDir, relPath);
    const child = spawn(process.execPath, ['--test', fullPath], {
      cwd: rootDir,
      env: { ...process.env, NODE_ENV: 'test' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      let passCount = 0;
      let failCount = 0;

      const passMatch = stdout.match(/ℹ pass (\d+)/);
      if (passMatch) passCount = parseInt(passMatch[1], 10);

      const failMatch = stdout.match(/ℹ fail (\d+)/);
      if (failMatch) failCount = parseInt(failMatch[1], 10);

      if (passCount === 0 && failCount === 0) {
        passCount = (stdout.match(/✔/g) || []).length;
        failCount = (stdout.match(/✖/g) || []).length;
      }

      resolve({
        file: relPath,
        code,
        passed: passCount,
        failed: failCount,
        stdout,
        stderr,
      });
    });
  });
}

async function main() {
  console.log('='.repeat(78));
  console.log('  WORLD SUPREMACY BATTLEGROUNDS (WSB) — TIER 5 ADVERSARIAL RUNNER');
  console.log('='.repeat(78));
  console.log(`Working Directory: ${rootDir}`);
  console.log(`Execution Mode: Native node --test runner`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(78));

  let totalPassed = 0;
  let totalFailed = 0;
  let anyFailed = false;

  for (const f of TIER5_FILES) {
    const res = await runTestFile(f);
    totalPassed += res.passed;
    totalFailed += res.failed;

    const statusIcon = res.code === 0 && res.failed === 0 ? '✔' : '✖';
    console.log(`  ${statusIcon} ${path.basename(f)}: ${res.passed} passed, ${res.failed} failed`);

    if (res.code !== 0 || res.failed > 0) {
      anyFailed = true;
      console.error(`\n--- FAILURE OUTPUT FOR ${f} ---`);
      console.error(res.stderr || res.stdout);
      console.error('------------------------------------\n');
    }
  }

  console.log('\n' + '='.repeat(78));
  console.log('  TIER 5 SUMMARY REPORT');
  console.log('='.repeat(78));
  console.log(
    'Tier'.padEnd(10) +
    'Description'.padEnd(40) +
    'Passed'.padEnd(10) +
    'Failed'.padEnd(10) +
    'Status'
  );
  console.log('-'.repeat(78));
  console.log(
    'Tier 5'.padEnd(10) +
    'Adversarial Coverage Hardening'.padEnd(40) +
    String(totalPassed).padEnd(10) +
    String(totalFailed).padEnd(10) +
    (anyFailed ? 'FAIL' : 'PASS (100%)')
  );
  console.log('='.repeat(78));

  if (anyFailed || totalPassed === 0) {
    console.error(`\n❌ TIER 5 SUITE FAILED: ${totalFailed} failed tests.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCESS: All ${totalPassed} Tier 5 adversarial tests passed cleanly! Exit code: 0`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
