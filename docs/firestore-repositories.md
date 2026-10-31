# Durable competition core — 30 October 2026

## Scope and current migration boundary

`apps/api/src/repository` implements Firestore-backed scoring, manual payments
and core registration commands. `WSB_STORAGE=firestore` selects it with the `firestore`
feature. The initial in-memory backend remains an explicitly synthetic test mode.
Persistent mode never falls back to the in-memory dataset: unported routes return
501. This is an intermediate migration, not completion of registration, the full
Firestore task or the release gate.

Only `demo-wsb` with an explicit `FIRESTORE_EMULATOR_HOST` is currently enabled.
The non-demo project guard and RS256 Firebase ID-token verification stay in place.
Database emulator service credentials do not bypass the browser/API token check.
`/readyz` probes Firestore and reports database connectivity separately, while
remaining 503 with `release_ready=false` until migration and signed identity
integration are complete. No production database, rules or accounts are modified.

## Authority and document layout

All paths are constructed from validated, bounded document identifiers. Unique
indexes and replay keys use SHA-256 of serialized tuples, avoiding ambiguous
concatenation and path traversal. No whole-store/chapter JSON snapshot is used.

| Relative path | Purpose |
| --- | --- |
| `chapters/{chapter}` | Chapter metadata and currency |
| `chapters/{chapter}/members/{uid}` | Active server-owned role and token valid-after |
| `chapters/{chapter}/crews/{crew}` | Private canonical crew/membership data |
| `chapters/{chapter}/events/{event}` | Event chapter and rule version |
| `.../events/{event}/assignments/{uid}` | Current event assignment, including revocation |
| `.../events/{event}/divisionState/{division}` | Configured panel, lock, generation, approved/ready/completed counters |
| `.../divisionState/{division}/deductions/{crewHash}` | Versioned head-judge technical deductions for one approved crew |
| `publicEvents/{event}` | Global event-ID reservation mapping to the owning chapter |
| `.../publicEvents/{event}/divisions/{divisionHash}` | Immutable published-only result snapshot |
| `.../events/{event}/entryIndex/{tupleHash}` | Crew/division to canonical entry ID |
| `.../events/{event}/entries/{entry}` | Entry snapshot, settled amount, reserved pending amount, scorecard count |
| `.../entries/{entry}/scorecards/{judgeHash}` | One latest score and revision per judge |
| `chapters/{chapter}/scoreOperations/{actorOperationHash}` | Exact command and immutable server receipt |
| `chapters/{chapter}/payments/{payment}` | Manual reconciliation ledger record |
| `chapters/{chapter}/paymentLocations/{payment}` | Authoritative event/entry location |
| `chapters/{chapter}/paymentReferences/{referenceHash}` | Unique normalized reference, payer, amount and target |
| `chapters/{chapter}/audit/{record}` | Audit entry committed with its business effect |

Client Firestore rules continue to deny direct access to all business collections.
The repository's general page helper is internal server infrastructure; it is not
an unguarded public list endpoint. Pages are bounded to at most 100 documents and
carry Firestore continuation tokens. Technical deductions persist with the division
and are unavailable after lock. Public reads serve only immutable snapshot documents
under `publicEvents`; private scorecards and unpublished entries are never queried
by public result handlers. The parent public event document reserves the current
API `event_id` globally for one chapter. A collision across chapters fails closed.
Online dancer check-in is also persistent; see [online check-in](online-checkin.md).

## Transaction contract

Authorization reads happen inside the same transaction as mutation. They include
active chapter membership, current role, token auth-time relative to valid-after,
resource chapter/event identity and current event assignment. A stale token alone
does not authorize a write. Crew money requests require current crew ownership or
membership; finance operations require the finance/director role and event scope.
Judge commands require the current configured panel and approved crew entry.

Technical deductions are a separate head-judge command. It rechecks chapter role,
event scope, approved entry and the division lock in the transaction. Each crew's
record has an explicit revision; retries with the same prior revision and payload
return the committed revision, while changed or stale input conflicts. Points are
finite values from 0 to 100; code and reason are required and bounded. Missing and
out-of-scope crew references use the same forbidden response. Each accepted change
and its audit are committed together.

Durable publication starts only from a locked division. It pages approved entries,
reads exactly one current scorecard from every locked panel member, and applies the
stored technical deductions after averaging the panel totals. It verifies the
division generation and lock again in the final transaction, then atomically writes
the public event-ID reservation, immutable snapshot, division publication marker
and audit. The route returns the same saved snapshot on retry, including concurrent
retries. Unresolved ties conflict without writing a public snapshot. Corrections
and republication remain disabled until an approved policy exists. The current API
uses `event_id` as the public event identifier; the reservation prevents a
chapter-scoped event ID collision from resolving to another chapter.

Scoring atomically writes the scorecard, immutable payload-bound receipt, entry
completion count, division completion count/generation and audit. Only the first
scorecard for a judge increments completion. Updating that card replaces its
criteria and revision. Exact replay returns the original receipt, including after
locking; altered payload, wrong scope, revoked membership, stale revision and
unauthorized deductions fail closed. All validation reads precede staged writes.

The division document is a transactional barrier. A lock checks a nonempty unique
panel, active panel memberships/assignments, at least one approved entry, zero
unready approved entries and exactly the required number of scorecards. It then
writes the lock and audit atomically. It does not aggregate an unbounded division
inside that transaction. Future entry approval/readiness mutations must update
these counters in the same transaction; they remain gated until migrated.

A payment reference atomically reserves its requested share, creates a pending
ledger row, creates the unique reference/location records and records its audit.
No payer request sets money as settled. Reconciliation atomically releases the
reservation and credits an approved amount once. Refund recording debits once.
When an approved entry's readiness changes, its division's unready count changes
in that same transaction. This is manual ledger reconciliation, not a provider
charge, webhook or transfer.

Firestore ABORTED retries re-read all authority and state through the SDK's
transaction-scoped client. No external network effect occurs inside the callback.
Domain denials are permanent failures and roll back staged writes. A commit with
an unknown outcome is not blindly replayed by the SDK; callers retry the original
score operation or payment reference, which resolves through the durable receipt
or ledger state. Receipt/audit IDs generated inside an aborted attempt do not
become visible until an attempt commits.

## Running the isolated checks

The separate emulator configuration uses localhost 8188 and websocket 9288 to
avoid another project's normal emulator port. Tests refuse any real project.

On Linux, with Rust/Node/Java installed:

```text
npm run test:persistence
```

On this Windows workspace, the optional SDK's native C/NASM environment is not
complete, so use the pinned Linux builder and persistent compiler caches:

```powershell
$env:WSB_PERSISTENCE_RUNNER = 'docker'
npm run test:persistence
```

The npm launcher owns its emulator process. On Windows it cleans up only Java
children of that exact CLI process matching the demo-wsb test port and workspace
rules file. A pre-existing listener is never stopped. The runner invokes the
explicitly ignored Rust repository integration test, with
`WSB_RUN_PERSISTENCE_TESTS=demo-wsb`, and only against the emulator. The feature's
normal unit tests do not connect to a database. Existing source checks remain:
`cargo test --locked --workspace`, `cargo test --locked --workspace --all-features`,
`cargo fmt --all --check` and all-features/all-targets Clippy.

The repository test creates a new synthetic chapter/event on each run. It covers
independent clients and two fresh operating-system processes, concurrent reservations,
duplicate references, approval/refund replays, unknown-outcome-style score replay,
changed payload, score corrections without extra completion counts, lock races, post-lock denial, cross-tenant denial, audit cardinality,
explicit rollback, membership revocation and durable-mode routing/readiness.
CI definitions are added; a local pass is not evidence of a remote CI run.

## Remaining migration work

- Crew creation/edits, invitation redemption, entry/roster submission and registrar
  review now persist with replay/version checks and atomic counters. See
  [registration contracts](persistent-registration.md). Verification,
  event/panel configuration, private media and their readiness changes remain.
- Expand bounded authorized list coverage beyond crews, payments and assigned
  performances, which now have paginated persistent reads and browser controls.
- Add approved correction/republication workflows, battle progression and stage
  state. Immutable locked result snapshots and public-only reads now persist; ties
  remain blocked pending an official policy.
- Build production membership/assignment provisioning and Firebase identity
  lifecycle checks. The separately compiled signed local-test flow now exercises
  positive API commands without accepting unsigned emulator tokens.
- Verify provider callbacks, uploads/consent/media processing, multi-instance load,
  backup/restore and the complete event rehearsal before opening a live-data gate.

## Vendor evidence

The implementation was checked against the locally installed, lockfile-resolved
`firestore` 0.58.0 transaction, consistency-selector, fluent get/list and error APIs.
It follows Firebase's [transaction contract](https://firebase.google.com/docs/firestore/manage-data/transactions)
and [serializable isolation explanation](https://firebase.google.com/docs/firestore/transaction-data-contention):
retryable transactions re-read state, validation reads precede writes, and a
committed transaction makes its combined changes visible together. The SDK's
transaction-scoped client is required; a normal client inside the callback would
not establish the same read set.


## Local verification evidence

The emulator workflow passed with two independent repository instances and fresh
process checks at both pending-reservation and locked-score checkpoints. It also
verified revocation before receipt replay, API migration-gate denial, actual
readiness RPC connectivity and a deliberately rolled-back staged write. The
feature-enabled ordinary suite passed 17 tests; the explicit parent workflow
invokes the two otherwise ignored emulator/helper tests. Default Windows tests
passed 16/16. All-features/all-targets Clippy is checked in the pinned Linux image.
No assertion here claims a real Firebase-issued signed identity or a full event
browser rehearsal; those remain the next integration gate.

## Docker local integration

[Docker setup](local-docker.md) supplies an isolated full runtime without production
credentials. The `local-testing` Cargo feature is excluded from the production
API Dockerfile. It checks the password with the Auth emulator and mints an RS256
session with membership-derived scope. The regular verifier keeps its Firebase
issuer; no unsigned-token exchange or acceptance was introduced.

Persistent crew/entry detail reads and bounded crew/payment/assigned-performance
pages recheck membership and object/event/panel access. ListDocuments uses the
transaction client's consistency selector. Pages inspect at most 100 documents;
filtered pages can be empty and still have a next cursor. Browser lists offer
explicit load-more controls. Scorecard reads return identifiers only.
