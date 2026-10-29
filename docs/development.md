# Run the foundation

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
$env:FIREBASE_PROJECT_ID = 'model-palace-346207'
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
