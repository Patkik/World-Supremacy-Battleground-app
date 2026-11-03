# Run the foundation

The preferred local environment is now [Docker Compose](local-docker.md): run
`./tools/local.ps1 setup` the first time, then use `up` for fast no-build starts.
It includes signed local-test API sessions and persistent
demo-wsb emulators. The host-tool instructions below remain available; their
historical unsigned-emulator limitation is superseded only by the separately
compiled Docker local identity flow. Production credentials are not needed.

Native registration and contact/account support are connected on this stack.
Use [registration contracts](persistent-registration.md) and
[native inquiry contracts](native-inquiries.md) for their browser, authorization,
replay and full-container-recreation checks. Other workflow migrations and
production identity/provider/policy gates remain unfinished.

Use Node 24 and npm. Install with `npm ci` after the lockfile exists.
The initial setup creates ignored `.env.development.local` for demo emulators
and `.env.production.local` with the user's supplied public Firebase web config.
For a new checkout, copy `apps/web/.env.example` to
`apps/web/.env.development.local`. Production configuration must be supplied by
the deployment environment. Firebase web configuration identifies the app; it
does not grant server-side administrative access.

```powershell
npm run emulators
# In a separate terminal:
npm run dev
```

Web: http://localhost:3000. Emulator UI: http://localhost:4000.
Checks: `npm run typecheck`, `npm run build`, `npm run test:rules`.

Rust needs a stable toolchain and the host linker/build tools. From repository root:

```powershell
$env:FIREBASE_PROJECT_ID = 'demo-wsb'
$env:WEB_ORIGIN = 'http://localhost:3000'
cargo run -p wsb-api
cargo test --locked --workspace
cargo check --locked --workspace --all-features
```

API: http://localhost:8088/healthz. Set PORT for another port. Production Firebase
ID tokens are required for the session endpoint; unsigned emulator tokens are
intentionally rejected. No development authentication bypass exists.

To initialize the optional Firestore client, configure Application Default
Credentials or workload identity and run `cargo run -p wsb-api --features firestore`.
Never put service-account credentials in browser variables or repository files.
The provided web config cannot authenticate this server adapter.

Container build, once Docker is running:
`docker build -f apps/api/Dockerfile -t wsb-api .`

The container is a foundation target with Cargo.lock and a pinned builder image.
Before release, add readiness, request timeout,
rate limiting and bounded shutdown; validate all auth failure paths and
revocation policy. CI currently tests default Rust and optional adapter builds.

No Firebase configuration, database rules, containers or web app have been
deployed to the real project. Business features are tracked separately in the DAG.

Windows toolchain: Rust 1.99.1, Cargo, rustfmt and Clippy are installed under
`C:\Users\patri\.cargo\bin`. Reopen your terminal to pick up the PATH change.
The Microsoft C++ build tools and Windows SDK provide the native linker.


## Connected workflow checks — 2026-10-30

The default business API mode is synthetic and volatile, and `/readyz` reports
503. For isolated persistence, use `demo-wsb` with an explicit emulator. An
intentional non-demo runtime requires the `firestore` build,
`WSB_STORAGE=firestore`, `WSB_ENABLE_PRODUCTION_STORAGE=true`, a matching
configured Firebase project ID, ADC and no emulator endpoint; release readiness
remains 503 until migration and release verification are complete. The Firebase Auth emulator can exercise real browser account
actions, but its unsigned tokens are intentionally rejected by the Rust API. Do
not use fake persona/demo-token credentials to bypass this boundary. See the
implementation audit for remaining migration and signed-token rehearsal needs.

- `npm run test:outbox`: isolated synthetic queue state/recovery tests.
- `npm run test:rules`: Firestore authorization tests, only demo-wsb.
- Run `npm run dev --workspace @wsb/web -- --port 3108`, then
  `npm run test:identity`: actual Firebase Auth emulator account workflow.
- Run the production web app on port 3107, then `npm run test:browser-connected`:
  responsive anonymous states and real browser IndexedDB/offline-shell recovery.
  Set `WSB_PREVIEW_URL` or `WSB_PLAYWRIGHT_MODULE` if necessary.
- `cargo test --locked --workspace`, `cargo clippy --locked --workspace -- -D warnings`,
  `cargo fmt --all --check`, `npm run typecheck`, `npm run build`.

Prepare `/offline` online on a trusted device, then save each assigned scorecard
before losing the connection. Reopening the generic offline workspace restores
saved drafts/commands. Queued state is not submission. Conflicts and rejected
commands remain on device for review; accepted copies can be explicitly removed.
Changing accounts never sends another judge's saved commands.


## Persistent core mode — 2026-10-30

See `docs/firestore-repositories.md` for schema, migration gates and checks.
`npm run test:persistence` starts the separate demo-wsb emulator on port 8188 and
runs the explicit repository integration scenario. On this Windows machine set
`WSB_PERSISTENCE_RUNNER=docker` to use the pinned Linux toolchain. The test runner
uses fresh processes as well as independent clients; no real Firebase data is used.

To run a feature-enabled API against an already running isolated emulator, set
`FIREBASE_PROJECT_ID=demo-wsb`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8188` and
`WSB_STORAGE=firestore`, then `cargo run -p wsb-api --features firestore`.
The Windows optional SDK native C/NASM limitation still applies; use the Linux
builder where needed. This mode currently supports session validation and the
migrated scoring/payment core. Other workflow routes return 501. Readiness stays
503 until the migration and signed identity flow are complete.
