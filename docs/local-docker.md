# Local testing with Docker

From the workspace root in PowerShell, with Docker Desktop running:

```powershell
./tools/local.ps1 setup
./tools/local.ps1 status
```

`setup` builds the local images once and starts the stack. The first build
downloads pinned Node, Java, Rust and Firebase tooling; no host Node, Java, Rust,
Firebase login or production credentials are needed. Wait for the API and web
containers to report healthy; the first Rust compile can take several minutes.
To follow startup, run `./tools/local.ps1 logs`.

After setup, `./tools/local.ps1 up` starts existing images without rebuilding.
The web source and API source are mounted from the workspace, so ordinary code
edits do not require image builds. Next.js usually refreshes on its own; if its
file watcher misses an edit, run `./tools/local.ps1 restart-web`. Rust uses the
persistent Cargo target volume for incremental compilation; after Rust edits run
`./tools/local.ps1 restart-api`, which recompiles the mounted workspace source.
The local seed script is also mounted from the workspace; run `up` to apply its
one-time fixture migrations. Use `./tools/local.ps1 build` after changing
Dockerfiles, package manifests/lock files, Rust toolchain configuration or other
emulator image contents, then run `up`. The local settings file is created and
preserved automatically.

| Service | Default address |
| --- | --- |
| Web / sign in | http://localhost:3100/sign-in |
| API liveness | http://localhost:8189/healthz |
| Emulator UI | http://localhost:4408 |
| Auth emulator | http://localhost:9099 |
| Firestore emulator | http://localhost:8188 |
| Storage emulator | http://localhost:9199 |

The emulator inspector also uses localhost ports 4418 (hub), 4518 (logs), and
9288 (Firestore websocket). Internal and browser-facing ports match so the
inspector can reach the correct test services. These ports are configurable too.

Only localhost ports are exposed. All database activity uses `demo-wsb`.
Port settings live in the ignored root `.env.docker`, created automatically from
`.env.docker.example`. The wrapper generates a random test password there on first
use and preserves existing settings. If a port is already occupied, change that
port in `.env.docker` and rerun `up`. Use `localhost` for the web address to match
the API's allowed browser origin.

## Test accounts and connected workflows

All seeded accounts share `WSB_TEST_PASSWORD` from your local `.env.docker`.
These are synthetic local accounts. Account creation is idempotent; running `up`
does not reset existing account passwords, edited fixtures, membership revocations,
scores or payment records. Changing the password setting after seeding does not
change existing test accounts; use the emulator UI if you need to change one.

| Account | Role / workflow |
| --- | --- |
| manager@ph.wsb.test | Crew manager, entry and payment reference |
| judge1@ph.wsb.test | First judge, scorecard and offline queue |
| judge2@ph.wsb.test | Second judge on the test panel |
| head@ph.wsb.test | Head judge |
| finance@ph.wsb.test | Payment reconciliation |
| registrar@ph.wsb.test | Registrar |
| support@ph.wsb.test | Chapter contact and account support queue |
| marshal@ph.wsb.test | Venue marshal |
| director@ph.wsb.test | Chapter director |
| manager@hk.wsb.test | Separate chapter, isolation checks |
| dancer1@ph.wsb.test | Dancer self-onboarding through a crew invitation |
| dancer2@ph.wsb.test | Second dancer for invitation and membership checks |

Sign in, then open the appropriate link:

- Crews: http://localhost:3100/app/crews
- Create crew: http://localhost:3100/app/crews/new
- Register a crew: http://localhost:3100/app/register/local-rehearsal
- Registrar queue: http://localhost:3100/admin/ph/events/local-rehearsal/registrations
- Entry: http://localhost:3100/app/entries/local-entry-ready?event=local-rehearsal
- Payment: http://localhost:3100/app/entries/local-entry-draft/checkout?event=local-rehearsal
- Finance: http://localhost:3100/admin/ph/finance/transactions
- Assigned performances: http://localhost:3100/console/local-rehearsal/judge
- Scorecard: http://localhost:3100/console/local-rehearsal/judge/local-entry-ready
- Saved scores / offline workspace: http://localhost:3100/offline
- Online marshal check-in: http://localhost:3100/console/local-rehearsal/check-in
- Marshal stage desk: http://localhost:3100/console/local-rehearsal/marshal
- Public contact: http://localhost:3100/contact
- Account support: http://localhost:3100/app/support
- Chapter support queue: http://localhost:3100/admin/ph/support

For scoring, confirm a trusted device, save a draft, review and queue it, and wait
for a server receipt. Disconnect the browser to rehearse offline drafts and queued
commands; reconnect to send. A queued command is not an accepted score. The local
API session lasts one hour; sign in again if it expires. Sign out via `/workspaces`
before changing roles. Public projections remain separate from private scores.

The seeded division is an explicitly synthetic policy and approved readiness
fixture. It is not an official rulebook, real uploaded music, verified identity,
gateway payment or guardian consent record. The durable core supports scoring,
locking, manual payment references/reconciliation/refunds, scoped crew/entry reads,
crew/invitation/entry submission and registrar review, and bounded
crew/payment/assigned-performance/registration lists. Native public/account
inquiries, scoped conversations and the chapter support queue are also durable.
Other workflow migrations
remain in progress and return 501. See [the implementation audit](implementation-audit-2026-10-30.md).

## Checks and restart recovery

```powershell
./tools/local.ps1 test
# Preserve data, remove and recreate the containers:
./tools/local.ps1 down
./tools/local.ps1 up
docker compose --env-file .env.docker run --rm --no-deps seed node infra/docker/test-local.cjs --recover
```

The check creates an isolated synthetic chapter. It exercises signed login,
unsigned/forged token denial, chapter/role/assignment boundaries, paginated reads,
duplicate and split payment requests, settlement/refund, score replay/revision
conflicts, full-panel locking and membership revocation. Recovery replays the same
accepted command after container recreation and checks the original receipt,
lock and balance. This is local integration evidence, not release certification.

`down` preserves named volumes. Firebase exports Auth, Firestore and Storage on
graceful shutdown and imports them on startup. Allow shutdown to finish. This
emulator export is for development recovery; it is not a production backup or a
guarantee against a forced host shutdown. Routine source changes use the mounted
workspace and persistent dependency/build volumes; they do not rebuild images.

Native registration checks on a running stack:
`node tests/registration-browser.cjs` exercises desktop/mobile forms (requires
Playwright), and `node tests/registration-recovery.cjs` verifies those exact
records after a graceful `down` / `up`. The browser test includes a labeled
synthetic server audio fixture; it is not an upload-processing test.

Native contact/support checks: `node tests/support-browser.cjs` verifies the forms
at desktop/mobile sizes; after graceful container recreation,
`node tests/support-recovery.cjs` checks those same conversations. These require
Playwright and use the ignored local password and recovery handles without
printing them. Public requests use a private per-request access key; save it to
reopen the conversation after closing the browser session. Email delivery is not
connected. See [native inquiries](native-inquiries.md) for coverage and live gates.

## Production configuration later

Keep `.env.docker` for local testing. Fill a separate production configuration
from `.env.production.example` when the release gates are met. No existing
`apps/web/.env.production.local` is copied into Docker images or overwritten.
The public Firebase web settings identify the app; server access needs workload
identity / Application Default Credentials. Never put administrative credentials,
payment secrets or signing keys in `NEXT_PUBLIC_*` variables.

The local API is separately compiled with `local-testing`. It verifies the test
password against the Auth emulator, checks persistent membership and issues an
RS256 session using keys generated in a private named volume. Unsigned emulator
tokens are rejected. The production API Dockerfile compiles only `firestore`;
the local login implementation is absent from that build.

Replacing an environment file alone is not a production release: rebuild the web
image when public settings change, supply real server identity, finish the durable
workflow migration, configure providers and verify the full release rehearsal.
Real-project startup remains deliberately gated; `/readyz` reports database
reachability separately and stays 503 with `release_ready=false`.

The production web image target is `web-production` in `infra/docker/Dockerfile`.
It accepts the public settings above as Docker build arguments. Its build and
non-root runtime were checked with synthetic configuration; no real credentials
or deployment were used. `apps/api/Dockerfile` is the separate API image target.

If a new source file is not detected by the Windows bind-mount development
watcher, run `./tools/local.ps1 restart-web`. It reloads workspace sources without
building an image. This was required for the director stage assignment form.

## Local PayMongo-shaped emulator

The no-build local stack includes a synthetic in-memory service on
`127.0.0.1:8191` (override with `WSB_PAYMONGO_EMULATOR_PORT`). It simulates a
minimal PHP checkout session and a test-only paid event. A local-only signed
callback can update the synthetic WSB ledger; it does not call PayMongo or move
real money.
Its synthetic sessions and operation receipts are stored in a local Docker volume
and survive an emulator container restart. Run
`node tests/paymongo-emulator.cjs` while the stack is up. This is groundwork;
The local-only checkout panel can start, cancel and simulate settlement. A signed
API and mobile browser recovery check (`node tests/local-paymongo-recovery.cjs`)
confirms that after full Docker container recreation (`down` followed by `up`),
the synthetic settled payment, duplicate signed delivery idempotency, balance
quotes and mobile UI state recover without double-crediting. Live provider
credentials, production checkout, real PayMongo webhook handling and operational
refunds remain unverified. Never point production payment code at this service.
