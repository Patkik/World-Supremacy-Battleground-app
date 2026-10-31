// Firebase emulators:exec supplies the local endpoint. No production project,
// credential file, shell interpolation or real dancer data is accepted here.
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const host = process.env.FIRESTORE_EMULATOR_HOST;
if (!host || !/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Start the local demo-wsb Firestore emulator first.');
if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== 'demo-wsb') throw new Error('Repository tests are limited to demo-wsb.');
const cases = [
  'repository::tests::firestore_restart_competing_writers_rollback_and_lock_races',
  'repository::tests::publication::unresolved_tie_is_never_written_to_public_projection',
  'repository::tests::venue::online_checkin_is_scoped_idempotent_and_recovers',
  'repository::tests::stage::stage_commands_are_authorized_replay_safe_and_serialize_performers',
  'repository::tests::deductions::technical_deductions_are_versioned_scoped_and_persistent',
  'repository::tests::support::inquiry_capabilities_account_scope_replay_staff_races_quota_and_recovery',
  'repository::tests::verification::verification_uploads_are_private_scoped_versioned_and_reviewed',
  'repository::tests::registration::registration_replay_invitation_races_versions_and_approval_lock_barrier',
];
for (const test of cases) {
  const cargo = ['test', '--locked', '--workspace', '--features', 'firestore', test, '--', '--exact', '--ignored', '--test-threads=1'];
  let command = 'cargo'; let args = cargo;
  if (process.env.WSB_PERSISTENCE_RUNNER === 'docker') {
    command = 'docker';
    args = ['run', '--rm', '--mount', `type=bind,source=${path.resolve(__dirname, '..')},target=/source,readonly`, '--mount', 'type=volume,source=wsb-rustup,target=/usr/local/rustup', '--mount', 'type=volume,source=wsb-cargo-registry,target=/usr/local/cargo/registry', '--mount', 'type=volume,source=wsb-cargo-target,target=/build', '-e', 'CARGO_TARGET_DIR=/build', '-e', `FIRESTORE_EMULATOR_HOST=host.docker.internal:${host.split(':').at(-1)}`, '-e', 'WSB_RUN_PERSISTENCE_TESTS=demo-wsb', '-w', '/source', 'rust:1-bookworm@sha256:9181b56c2a21ab1d5e73cffe04fc762426d30aa7fac3c91141dd033f49a7fc8b', 'cargo', ...cargo];
  }
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, WSB_RUN_PERSISTENCE_TESTS: 'demo-wsb' } });
  if (result.error) throw result.error;
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}
