#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const TIERS = [
  {
    tier: 'Tier 1',
    name: 'Feature Coverage (F01 - F40)',
    target: '>=200 tests',
    files: [
      'tests/e2e_tiers/tier1_features/t1_f01_to_f10.test.mjs',
      'tests/e2e_tiers/tier1_features/t1_f11_to_f20.test.mjs',
      'tests/e2e_tiers/tier1_features/t1_f21_to_f30.test.mjs',
      'tests/e2e_tiers/tier1_features/t1_f31_to_f40.test.mjs',
    ],
  },
  {
    tier: 'Tier 2',
    name: 'Boundary & Corner Cases (F01 - F40)',
    target: '>=200 tests',
    files: [
      'tests/e2e_tiers/tier2_boundaries/t2_f01_to_f10.test.mjs',
      'tests/e2e_tiers/tier2_boundaries/t2_f11_to_f20.test.mjs',
      'tests/e2e_tiers/tier2_boundaries/t2_f21_to_f30.test.mjs',
      'tests/e2e_tiers/tier2_boundaries/t2_f31_to_f40.test.mjs',
    ],
  },
  {
    tier: 'Tier 3',
    name: 'Cross-Feature Interactions',
    target: '>=40 tests',
    files: [
      'tests/e2e_tiers/tier3_interactions/t3_registration_finance.test.mjs',
      'tests/e2e_tiers/tier3_interactions/t3_judging_publication.test.mjs',
      'tests/e2e_tiers/tier3_interactions/t3_ops_auth_brand.test.mjs',
    ],
  },
  {
    tier: 'Tier 4',
    name: 'Real-World Scenarios',
    target: '>=20 tests',
    files: [
      'tests/e2e_tiers/tier4_scenarios/t4_competition_lifecycle.test.mjs',
      'tests/e2e_tiers/tier4_scenarios/t4_offline_disruption_recovery.test.mjs',
    ],
  },
  {
    tier: 'Tier 5',
    name: 'Adversarial Coverage Hardening',
    target: '>=150 tests',
    files: [
      'tests/e2e_tiers/tier5_adversarial/t5_backend_hardening.test.mjs',
      'tests/e2e_tiers/tier5_adversarial/t5_ops_client_hardening.test.mjs',
    ],
  },
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
      // Parse node test output for pass/fail counts
      let passCount = 0;
      let failCount = 0;

      const passMatch = stdout.match(/ℹ pass (\d+)/);
      if (passMatch) passCount = parseInt(passMatch[1], 10);

      const failMatch = stdout.match(/ℹ fail (\d+)/);
      if (failMatch) failCount = parseInt(failMatch[1], 10);

      // Fallback counting checkmark icons if summary line missing
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
  console.log('  WORLD SUPREMACY BATTLEGROUNDS (WSB) — 5-TIER E2E TEST RUNNER');
  console.log('='.repeat(78));
  console.log(`Working Directory: ${rootDir}`);
  console.log(`Execution Mode: Native node --test runner`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('-'.repeat(78));

  const tierSummaries = [];
  let totalAllPassed = 0;
  let totalAllFailed = 0;
  let anyFileFailed = false;

  for (const t of TIERS) {
    console.log(`\n▶ Executing ${t.tier}: ${t.name} (Target: ${t.target})`);
    let tierPassed = 0;
    let tierFailed = 0;

    for (const f of t.files) {
      const res = await runTestFile(f);
      tierPassed += res.passed;
      tierFailed += res.failed;

      const statusIcon = res.code === 0 && res.failed === 0 ? '✔' : '✖';
      console.log(`  ${statusIcon} ${path.basename(f)}: ${res.passed} passed, ${res.failed} failed`);

      if (res.code !== 0 || res.failed > 0) {
        anyFileFailed = true;
        console.error(`\n--- FAILURE OUTPUT FOR ${f} ---`);
        console.error(res.stderr || res.stdout);
        console.error('------------------------------------\n');
      }
    }

    tierSummaries.push({
      tier: t.tier,
      name: t.name,
      passed: tierPassed,
      failed: tierFailed,
      total: tierPassed + tierFailed,
    });

    totalAllPassed += tierPassed;
    totalAllFailed += tierFailed;
  }

  console.log('\n' + '='.repeat(78));
  console.log('  SUITE SUMMARY REPORT');
  console.log('='.repeat(78));
  console.log(
    'Tier'.padEnd(10) +
    'Description'.padEnd(40) +
    'Passed'.padEnd(10) +
    'Failed'.padEnd(10) +
    'Status'
  );
  console.log('-'.repeat(78));

  for (const s of tierSummaries) {
    const status = s.failed === 0 ? 'PASS' : 'FAIL';
    console.log(
      s.tier.padEnd(10) +
      s.name.padEnd(40) +
      String(s.passed).padEnd(10) +
      String(s.failed).padEnd(10) +
      status
    );
  }

  console.log('-'.repeat(78));
  const grandTotal = totalAllPassed + totalAllFailed;
  console.log(
    'TOTAL'.padEnd(10) +
    `All 5 Tiers (${TIERS.reduce((acc, t) => acc + t.files.length, 0)} test files)`.padEnd(40) +
    String(totalAllPassed).padEnd(10) +
    String(totalAllFailed).padEnd(10) +
    (anyFileFailed ? 'FAIL' : 'PASS (100%)')
  );
  console.log('='.repeat(78));

  if (anyFileFailed || totalAllPassed < 620) {
    console.error(`\n❌ TEST SUITE FAILED: ${totalAllFailed} failed tests or insufficient total tests (${totalAllPassed}/620 minimum).`);
    process.exit(1);
  } else {
    console.log(`\n🎉 SUCCESS: All ${totalAllPassed} tests across all 5 tiers passed cleanly! Deterministic exit code: 0`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
