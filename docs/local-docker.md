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
The API also waits for ClamAV. First startup downloads virus signatures, so it
can take longer; ClamAV recommends allocating 4 GiB of RAM to Docker. The scanner
is reachable only over the private API-to-scanner network and has no host port.
See the [official ClamAV Docker guide](https://docs.clamav.net/manual/Installing/Docker.html)
and [INSTREAM protocol](https://docs.clamav.net/manual/Usage/ClamdProtocol.html).

For a repeatable synthetic rehearsal, install Node 24 on the host, leave the
local stack running, and run:

```powershell
./tools/test-rehearsal.ps1
```

For the browser role walkthrough, run `npm run demo:roles`. It writes desktop
and phone screenshots with an interactive index under `.workspace/role-demo/`.
See [executed coverage and limitations](role-demo-2026-11-02.md). This command
requires the Playwright runtime used by the existing browser scenarios.

The command runs the existing role workflow checks, a manager/director/registrar
music upload and correction flow, draft-policy checks, and judging-outbox tests.
It also checks server-rendered participant and public pages for specific removed
sample claims. Those checks do not exercise client-side interaction.
It does not exercise browser interaction, real provider payments, guardian
authority, approved music policy or an entire event across every role.

Participants can enter an event reference under “Your published results,” load
their entries, and request an aggregate row after publication. Rust rechecks the
current chapter and entry ownership or roster membership and reads only the
separate published projection. An unpublished division returns no result even
when scores are locked. Individual judge scores and notes are not included.
The synthetic role test checks the publication boundary, access denial and API
restart recovery; interactive browser verification is still outstanding.

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
| verifier@ph.wsb.test | Private identity/residency review using generated synthetic files only |
| auditor@ph.wsb.test | Read-only chapter audit history |
| support@ph.wsb.test | Chapter contact and account support queue |
| marshal@ph.wsb.test | Venue marshal |
| audio@ph.wsb.test | Assigned event audio operator and local DJ export |
| director@ph.wsb.test | Chapter director |
| hq.admin@wsb.test | Global HQ session (separate global membership; local staff governance and proposal follow-up are connected) |
| manager@hk.wsb.test | Separate chapter, isolation checks |
| multichapter@ph.wsb.test | Same account has independent PH and HK crew-manager memberships; tests chapter selection with a single-chapter Firebase claim |
| dancer1@ph.wsb.test | Dancer self-onboarding through a crew invitation |
| dancer2@ph.wsb.test | Second dancer for invitation and membership checks |
| guardian1@ph.wsb.test | Guardian relationship request workflow; does not establish legal authority or consent |

The planned full role-by-role sequence and its explicit policy/provider gates are
in the [workflow rehearsal runbook](role-workflow-rehearsal.md). The runbook is
preparation only; the current automated runner covers a smaller subset.

Sign in, then open the appropriate link:

- Crews: http://localhost:3100/app/crews
- Create crew: http://localhost:3100/app/crews/new
- Register a crew: http://localhost:3100/app/register/local-rehearsal
- Registrar queue: http://localhost:3100/admin/ph/events/local-rehearsal/registrations
- Entry: http://localhost:3100/app/entries/local-entry-ready?event=local-rehearsal
- Payment: http://localhost:3100/app/entries/local-entry-draft/checkout?event=local-rehearsal
- Finance: http://localhost:3100/admin/ph/finance/transactions
- Global HQ preview: http://localhost:3100/hq (sign in as hq.admin@wsb.test)
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

The real API check also uses an assigned marshal to check in a synthetic roster
member and move an entry through stage positions, then verifies director-only
publication and the public result projection. Check-in and stage commands are
replayed to check their receipts. The seeded audio and consent remain synthetic
fixtures, not proof of a media upload or guardian consent workflow.
Provider-linked refunds are deliberately unavailable through the finance refund
command: it returns a conflict before changing the ledger for a checkout
reservation or a `pay_`/`cs_` reference. Manual-reference refunds remain
available only as a reasoned, idempotent ledger reversal after the external
bank/cash refund is confirmed. The action does not move money. This guard avoids
treating a failed provider request as a completed refund; durable provider
dispatch and reconciliation remain unfinished.
The normal Firestore production build returns 503 for provider refund events
without changing the ledger, so they can be retried after controlled production
reconciliation is enabled. The isolated Compose `local-testing` build instead
models signed synthetic refund events against demo-wsb; this does not call
PayMongo or prove provider compatibility. A signed event whose live/test mode
differs from configuration is rejected.
Checkout-paid events require matching explicit event, session and payment modes,
valid object types, a nonempty session/reference/payment ID, explicit currency,
positive amount and exactly one paid payment. Reservation and ledger checks remain
authoritative. New durable checkout receipts bind a SHA-256 digest of the exact
signed body; exact replay works across webhook aliases, while changed payloads
conflict. Older receipts without a digest fail closed on replay and need review.
This applies to migrated durable checkout settlement; full provider event
coverage and live compatibility remain release work.
The same check creates a crew, redeems a single-use dancer invitation, selects
the performer and exercises registrar review of an incomplete entry. It checks
denials, exact retries and altered requests. It does not claim that the entry
was approved or that the separate media and consent workflows are complete.

The API also offers an interim WAV inspection for an entry manager at
`POST /v1/chapters/{chapter}/events/{event}/entries/{entry}/audio-inspect`.
Send raw WAV bytes with the signed session; the response contains measured
metadata and `saved: false`. It does not store or approve music or change entry
readiness. The 25 MiB bound is technical, not an official competition rule.
The API can create a durable `music-intents` record for an editable entry using
an operation ID and expected entry revision. The server-created path permits a
private, immutable WAV or MP3 upload while the intent is unexpired and the owner has
an active, unexpired manager membership with a token authenticated after
`valid_after`. Reviewer reads use the same current membership checks. Exact intent
retries recheck current membership and ownership. An upload is not a reviewed
submission or readiness decision.
Storage rules check membership and the intent, but do not independently re-read
the entry or crew at upload time; the future submission command must recheck
current ownership, entry state and the actual bytes. The one-hour intent and
25 MiB size limit are technical bounds, not event rules. Older intents without
an expiry cannot upload; create a new intent.
For a saved object, `POST .../music-intents/{intent_id}/inspect` checks the
signed manager session, current entry revision and owner before and after reading
the private object with the caller's Firebase ID token. It inspects the stored
bytes, transactionally records its digest and measured metadata, and reports
`saved: true, approved: false`. Identical retries recover the same inspection
receipt; changed bytes conflict. It creates no approval or readiness decision.
This endpoint currently supports demo-wsb only.
Crew managers can use “Check file” on the entry page for temporary inspection,
or “Save and inspect” for a private upload followed by stored-byte inspection.
If interrupted, reselect the same file in the same tab and retry; the browser
retains the operation reference and file digest, not the file or credentials.
The server's receipt digest must match the selected file before success is shown.
Saving does not submit, approve or change readiness. A separate submit action
re-inspects the stored bytes and records a versioned `pending_review` submission;
it also does not approve or change readiness. The manager or assigned registrar
and chapter director can read the current submission. The entry review screen
can load its WAV or MP3 through the API in the local demo only. The server checks
reviewer membership and event assignment before and after retrieval, compares
the bytes against the saved digest, and returns a no-store response. This local
endpoint uses emulator-only privileged Storage access after authorization; it is
not implemented for production. A reviewer can record “reviewed” or request a
correction with a note; a manager can see the note and resubmit. Review uses an
operation receipt and expected version. These manual outcomes do not establish
event compliance or change readiness. Only PCM/float WAV and MP3 are technically
inspected and scanned by the private ClamAV service before an inspection receipt
is stored; the official allowed-format set, deadline/replacement behavior,
production scanner operations and DJ export remain unapproved or unfinished. Policy enforcement,
production media access and browser interaction still require completion.
For local planning only, a chapter director can save a division's draft maximum
duration and grace with a source; staff can read it from the entry review screen.
The draft is versioned and records the event rules version, but it is not applied
to reviews or readiness. The entry page can request a server-calculated advisory
comparison between the recorded inspection and the draft duration plus grace.
It reports missing submissions, missing guidance and stale rules versions instead
of guessing. The result is not approval, and a refresh is needed after changes.
The one-day total is a technical input bound, not a WSB
rule. `npm run test:music-policy` tests synthetic authorization, replay, locking
and unchanged readiness. Production policy approval and enforcement are separate.
`node tests/music-storage-integration.cjs` verifies synthetic submission and
replay; `node tests/music-storage-integration.cjs --recover` checks the most
recent fixture after an API restart. Full-stack recreation remains unverified.
With the local stack running, `npm run test:music-storage-sdk` checks the actual
Firebase client SDK against a synthetic WAV larger than its small-file threshold,
including missing-object detection, resumable upload, immutable overwrite denial,
inspection replay, and anonymous and unrelated-user access denial. It exercises
SDK and API integration, not the browser interface or interrupted-network recovery.

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
minimal PHP `/v2/checkout_sessions` response, including its hosted `checkout_url`,
and a test-only paid event. A local-only signed
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


## Public testing with Ngrok tunnel

To test the system from real mobile devices, external networks, or webhook callbacks without production deployment, the Docker Compose stack includes an optional
grok service powered by the official
grok/ngrok:latest image.

### Setup and configuration

1. Set your Ngrok authtoken and custom domain in your git-ignored .env.docker:
   `ash
   NGROK_AUTHTOKEN=<your_ngrok_authtoken>
   NGROK_DOMAIN=backless-cuddle-endowment.ngrok-free.dev
   `
   *(Never commit authtokens or domain secrets to repository files or version control).*

2. Start the tunnel:
   `powershell
   ./tools/local.ps1 tunnel
   `
   Or if NGROK_AUTHTOKEN is present in .env.docker, ./tools/local.ps1 up automatically attaches the tunnel profile.

3. Useful commands:
   - ./tools/local.ps1 tunnel — Starts the ngrok container attached to the Docker bridge network.
   - ./tools/local.ps1 tunnel-logs — Follows live ngrok tunnel traffic and connection status.
   - ./tools/local.ps1 tunnel-down — Stops and removes the ngrok container.
   - Web Inspector: Open http://localhost:4040 to inspect HTTP request/response payloads in real-time.

### Single-Domain Reverse Proxy Architecture

The ngrok tunnel connects directly to web:3000 inside Docker. Next.js App Router route handlers at /v1/[...path] and /local/[...path] reverse-proxy backend requests internally to http://api:8088. This allows external and mobile browsers connecting via the public HTTPS domain (e.g. https://backless-cuddle-endowment.ngrok-free.dev) to access both the frontend web app and the authoritative Rust API backend without requiring separate public endpoints or CORS complications.
