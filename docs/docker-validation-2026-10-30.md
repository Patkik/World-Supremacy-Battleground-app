# Docker local verification — 2026-10-30

Scope: synthetic `demo-wsb` only, Docker Desktop Linux engine, pinned Node 24,
Java 21 and Rust builder images. No production configuration was read into the
images or deployed. See [local setup](local-docker.md).

Verified locally:

- `tools/local.ps1 up` builds and starts the Firebase, seed, API and web services.
  Firebase/API/web are healthy and the seed exits successfully. The wrapper uses
  generated ignored local settings; no host language toolchains are required.
- `infra/docker/test-local.cjs` passes positive RS256 login, incorrect-password
  denial, unsigned Auth-emulator token rejection, forged-role-token rejection,
  chapter/role/panel boundaries, bounded list pagination, private scorecard
  projection, payment reservations/replays/reconciliation/refunds, score replay
  and revision conflict, incomplete-panel lock denial, completed-panel lock and
  immediate membership revocation.
- Full `down` and `up` recreates the containers. Firebase exports/imports Auth,
  Firestore and Storage; the `--recover` check proves the original locked score
  receipt and refunded balance survive. Seed detects initialization and preserves
  edits/deletions. Test accounts and the signing-key volume survive.
- `tests/docker-browser.cjs` passes at 1365px and 390px: signed manager and judge
  login, crew/entry/payment-quote reads, explicit session cleanup on signout,
  trusted-device draft, queue while disconnected, reconnection and a matching
  persistent server receipt. No browser exceptions or horizontal overflow.
  Screenshots are disposable local artifacts in `.workspace/docker-checks`.
- The production-verifier separation test explicitly passes with generated local
  keys: regular Firebase issuer validation rejects a locally issued token even
  when supplied the same key; local issuer validation rejects Firebase issuer,
  expired/future-issued/wrong-audience tokens and a non-demo project.
- Linux all-features Rust suite: 17 ordinary tests pass. Three cases are
  deliberately ignored normally; the local-key test and repository orchestrator
  are explicitly invoked. The latter also invokes its helper in two fresh OS
  processes, verifying persistence, competing writers, rollback and lock races.
- All-features/all-targets Clippy passes with warnings denied. TypeScript,
  six offline queue tests and three workspace tests pass.
- The emulator inspector advertises the matching browser ports, including hub,
  logs and Firestore websocket; an actual browser loads its synthetic chapters
  collection. Web images contain no `.env` files.
- The `web-production` Docker target builds successfully with synthetic public
  configuration. Its non-root runtime serves sign-in HTML, compiled scripts and
  branding with the expected headers. The API compiles with `firestore` alone,
  excluding `local-testing`. These are packaging checks, not a production release.

The browser checks also exposed an early sign-in click before hydration, now
prevented by disabled loading controls. Visual inspection prompted wider decimal
score inputs and an accepted status that replaces the queued message.

CI includes a Compose startup, API check and recreate/recovery job. It has not
been run remotely. This evidence covers the migrated core; it does not prove
complete registration, private media/consent processing, provider payments,
published results, venue operations or a full event rehearsal. `/readyz` keeps
`release_ready=false`; the complete platform goal remains active.
