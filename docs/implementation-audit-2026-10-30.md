# Full-platform implementation audit — 30 October 2026

## Target and provenance

The user's renewed instruction is to implement the complete paperless WSB
competition system described in `docs/product-brief.txt`, including multi-chapter
registration, payments, judging, event operations, results and advancement.
The route catalogue is a navigation/design inventory, not proof of working features.
The proposal remains a requirements source, not a verified official rulebook.
Existing white-logo and muted, non-interactive hero preferences still apply.

## Correction to previous completion claims

The earlier `memory/status.md` Phase 1–4 completion statements and the all-done
DAG were unsupported by their acceptance criteria. The audit found in-memory
business state, simulated identity actions, hardcoded/demo-token API calls,
fictional public “official” scores, self-settling payment requests, anonymous
battle votes, scores grouped under a constant crew ID, and no durable outbox.
The historical notes are retained and explicitly superseded by this audit.
Tasks requiring provider, storage, rule approval or rehearsal evidence are reopened.

## Implemented in this continuation

- Firebase browser-session sign-in, account creation, email verification, reset,
  sign-out and account action handling replace simulated successes. Server chapter
  session validation gates connected workspaces. No persona grants authorization.
- Chapter membership is rechecked against server-managed active membership, role
  and token valid-after state. Sensitive handlers apply role, event assignment,
  crew ownership and event/entry path checks. Private API responses use no-store;
  PUT preflight is supported. Judges receive a minimal scorecard projection.
- Cryptographically random invitation and record IDs replace second-based IDs.
  Invalid invitation redemption does not consume the token. Retried entry creation
  preserves existing state. Roster selection uses canonical crew members, never
  client-provided consent flags, and duplicate dancers are rejected.
- Connected crew creation, listing, details, roster/invitations, invitation
  acceptance, event draft entry creation/readiness/review, assigned judge lineup,
  manual/split payment references, payment records and finance reconciliation.
  Failed requests in these connected screens stay errors; no synthetic success
  fallback is substituted. Other internal screens are still development previews.
- Version 1 score commands are scoped to event, division, crew and judge.
  Revisions belong to each judge's scorecard. Exact retries return the original
  receipt; changed payloads, missing assignments, revoked membership, invalid
  criteria and locked divisions are rejected. New revisions replace that judge's
  previous score, instead of adding another judge to the average.
- Technical deductions use a separate head-judge command and revision, are
  nonnegative/finite, and are applied once after averaging. Full configured panel
  completion and ready approved entries are required before locking. Equal rounded
  totals share a rank and publication waits for an approved tie policy.
- Separate publication snapshots carry entry/crew identity and a SHA-256 digest.
  Publication requires a lock and retries return the same snapshot. Public and
  arena result routes fetch only these snapshots; fictional “official certified”
  standings and unsupported qualification/trimmed-mean claims were removed.
  Fictional seasonal ranking points were removed until an approved points policy
  and actual published season data exist.
- A payer reference creates a pending reconciliation record, never a settlement.
  Split shares reserve only the available outstanding balance. Only finance or a
  chapter director can reconcile/refund. Replayed approvals/refunds do not double
  credit/debit an entry. No card charge or provider refund is performed.
- Check-in requires an eligible approved entry and is idempotent per event/dancer.
  Battle ballots require a configured 3/5-person panel and event assignment; each
  judge has one immutable vote and voting closes at majority.
- IndexedDB score drafts/outbox support queued, sending, acknowledged, conflict
  and rejected states, immutable operation IDs, backoff and crash recovery. Web
  Locks serialize sends/writes across tabs; account ownership is rechecked before
  token use. The outbox persists no credentials or peer scores. Conflicts stay available
  for review. Only acknowledged copies have a removal action.
- A trusted-device opt-in prepares `/offline` and a service worker. Only the generic
  offline shell, hashed static assets and public branding (including its optimized
  image) are cached. Private pages, Firebase/API traffic and action URLs are not
  cached. The shell can reopen previously saved scorecards after a network outage.

## Verification

- Rust default tests: 16 passing assertions/tests across authorization, tenant and
  object ownership, replay changes, score replacement, complete panels, ties,
  split references/reservations, duplicate refunds/check-ins and unique ballots.
- Rust formatting and Clippy: final run recorded in the current status note.
- Optional Firestore feature: Linux container compilation passed using the pinned
  Rust image. The native Windows attempt failed in the existing aws-lc C toolchain
  (NASM/compiler/archive environment); this is not represented as a Windows pass.
- Browser: 55 route/viewport checks at phone portrait, short landscape, tablet
  portrait/landscape and 320px; real IndexedDB refresh, cold offline shell reload,
  public logo availability, account isolation, reconnect receipt and cache privacy.
- Queue engine: six tests for explicit queuing, lost acknowledgements, immutable
  payloads, status classification, bounded retry, crashed sends and wrong receipts.
- Firebase Firestore rules: two passing tests, only against `demo-wsb`.
- Identity: the actual demo-wsb Auth emulator browser workflow passed signup,
  verification, membership-pending denial, signout/signin, reset, new-password
  signin and invalid-link rejection. A single-use verification effect replay bug
  found by this test was repaired. No real email was sent.
- Production web build: passed, including TypeScript and the final public-ranking
  honesty cleanup. The default Rust tests and Clippy passed on Windows. The optional
  Firestore feature compiled in the pinned Linux container.
- Existing visual-prototype regression: 54 responsive cases and registration,
  rotation/local draft persistence, judge review, mobile keyboard recovery, arena
  switching and no-JavaScript navigation passed without page errors.
- Workspace: three Python tests, DAG/check and Rust formatting passed.

Browser queue receipt transport is a synthetic fixture; it is not evidence of a
signed-Firebase-token, durable-API event rehearsal. The Rust API continues to
reject unsigned emulator tokens. No production auth bypass was added.

## Remaining implementation and release gates

| Capability | Remaining work |
| --- | --- |
| Durable business storage | Firestore repositories, transactionally atomic score/receipt/audit and payment writes, indexes, migrations, restart and multi-instance tests |
| Server identity | Authoritative persistent membership/assignment provisioning, claim issuance and disabled-user/revocation integration; signed-token API rehearsal |
| Verified registration | Identity vault, upload scanning/OCR, age/residency policy, guardian/waiver signatures, retention and privacy lifecycle |
| Music | Actual upload/processing, trusted duration/format inspection, rule-versioned grace/lock policy, late handling and DJ export |
| Payments | Provider adapters, secure checkout, verified webhook signatures, event replay protection, allocations/refunds/receipts and provider failure recovery |
| Judging | Durable atomic lock races, panel administration, approved rubric/rounding/tie policy, technical-review UI and full authenticated outage rehearsal |
| Venue | Signed QR passes and revocation, real scanner, offline eligibility/reconciliation, stage state and idempotent FCM notifications |
| Battles | Bracket seeding/progression, configured formats and tiebreak workflow; the ballot model alone is not a tournament engine |
| Results | Controlled corrections/republication, detailed authorized scorecards/critique/certificates and approved advancement policies |
| Expansion | Actual HQ governance, seasonal points, studios/editorial publishing, spectator ticketing, support and privacy workflows |
| Release | Performance/load measurements, accessible authenticated workflows, backup/restore, operator rehearsal, deployment/rollback and monitoring |

The API currently uses volatile synthetic data. Startup refuses any Firebase
project other than `demo-wsb`, and `/readyz` returns 503 with durable_storage=false.
The unsigned emulator-token limitation means successful business API requests
are currently verified through isolated fixtures, not the browser Auth emulator.
Do not deploy this build for real registration, payments or judging. Implement
Firestore persistence and signed identity integration next; credentials alone
will not complete those missing code paths. No production data or deployed
Firebase rules were changed in this continuation.


## Persistence follow-up — 30 October 2026

The [durable core implementation](firestore-repositories.md) supersedes the
absence-of-repositories observation for scoring, locking and manual payments.
Their effects, receipts and audits now use Firestore transactions and recover in
independent processes. The remainder of the migration is still outstanding, so
the overall release/Firestore/registration milestones remain unfinished. Durable
mode explicitly rejects unmigrated routes rather than falling back to samples.

## Docker local runtime follow-up — 2026-10-30

The user's Docker-first local test request is implemented. See
[local setup](local-docker.md) and [verified coverage](docker-validation-2026-10-30.md).
The web, Rust API and demo-wsb Auth/Firestore/Storage/UI run in Compose. Positive
signed local browser/API commands, offline queue/reconnect, scope failures and
full container recreation recovery pass. Production/local signing separation is
tested; the production API image excludes the local identity feature. This
supersedes the local integration blocker only. Registration/configuration,
production provisioning, private media/consent, providers and complete event
operations still require implementation and rehearsal before real-project use.

## Native registration and user-owned forms follow-up — 2026-10-30

[Persistent registration](persistent-registration.md) now covers crew/invitation,
entry/performer selection, submit/review and atomic approval counters. Desktop
and mobile positive browser flows, denial/race/replay tests and full Docker
recreation recovery pass. Synthetic trusted audio metadata is used to exercise
review; private media/identity/consent processing is still incomplete.

The user explicitly requires system-owned forms instead of external workflow
redirects. [The redirect and form audit](native-workflows.md) is now an active
task. Public registration buttons enter the native route.
[Native contact/account support](native-inquiries.md) now persists real requests,
receipts, private conversations and chapter support replies. Desktop/mobile,
denial/replay/race/quota checks and full Docker recreation recovery pass. Email
delivery and live privacy/access-key policies remain gates. Chapter/studio
applications and other incomplete forms still need authoritative submissions and
receipts. These gaps remain release requirements.

## Durable results publication follow-up — 2026-10-30

Locked divisions now produce immutable Firestore result snapshots from the
approved entries, complete judge panel and saved technical deductions. The final
transaction rechecks the lock generation and commits the public projection,
publication marker and audit together. A global event-ID reservation prevents
cross-chapter public lookup collisions. Public API routes read only the
`publicEvents` projection. The chapter publication desk reads durable lock state
and calls the real publish command; the previous fabricated podium and rollback
controls are removed.

Demo-wsb checks cover adjustment arithmetic, concurrent publish replay, fresh
repository reads, ID collision denial and tied-result rejection without a public
write. Signed desktop/mobile browser checks load the connected publication desk.
This is a verified local slice, not a complete results or release rehearsal. Tie
policy, correction/republication, a human-readable event slug, detailed scorecards,
advancement and season rankings remain unfinished.

## Private identity/residency evidence continuation — 2026-10-30

Implemented a native participant upload and chapter review path in
`docs/private-verification.md`. Firestore stores the subject-owned case and
metadata; Firebase Storage stores the private immutable object. Server commands
check current chapter membership, subject ownership and reviewer role, and the
API verifies Storage object metadata with a Firebase ID token before accepting a
submission or review. Storage rules deny unrelated UIDs, non-members, invalid
paths and unsupported declared types. Review does not update roster consent or
entry readiness.

Verified locally against demo-wsb: storage rules (3/3), persistent repository
scenarios (including tenancy, role denial, submission idempotency and review
replay), web typecheck, and signed browser upload/open/review/reload at 1365px and
390px. Browser uses generated synthetic PDF bytes only. A stale list-response
race was fixed; case history now follows all result pages and preserves a new
local submission through refresh.

This slice does not establish image/PDF byte validity, malware safety, age or
residency policy, guardian relationship or signer authority, event waiver
consent, reviewer escalation, retention/deletion, readiness transitions or
production membership/storage. `verification-media` remains in progress until
those policies and the related music workflow are implemented and verified.

## Native chapter/studio/partner proposal intake — 2026-10-31

Replaced the unavailable `/community/apply` state with an in-system form for
chapter, studio hub and brand/event partnership proposals. The public form routes to a chosen
regional chapter, records the request through the Rust/Firestore inquiry service,
and returns a private reference and capability key. The current chapter support
or director role can review the conversation and reply; the applicant can reopen
it after reload. The chapter directory's primary calls now point to this native
form, while the external country directory is labeled as a reference. The
partner page's fabricated sponsor list, audience metrics and kit-download alert,
and the studio directory's unverified names and counts, were removed in favor of
an honest empty state and the matching native proposal form.

Verified with synthetic demo-wsb browser flows at 1365px and 390px: chapter,
studio and partner submissions, persisted reference, support-role reply, incorrect-key
denial, and requester recovery after reload. This is proposal intake, not HQ
affiliation approval. The global HQ queue, HQ membership provisioning, formal
decision rubric/states and application-data retention policy remain unfinished;
`native-system-forms` stays in progress.

## Review of pasted milestone summary — 2026-10-31

The reported `tests/e2e_tiers` suite uses its own JavaScript `SystemHarness`
with in-memory maps and independently implemented behavior. Its test counts do
not establish coverage of the running Rust API, Firebase, browser, offline queue,
or recovery. The claimed guardian/audio milestone is also not established: the
temporary in-memory consent handler accepted a supplied name without establishing
guardian authority, while the audio handler trusted supplied metadata and used a
fixed five-second grace. These endpoints and the synthetic DJ export endpoint now
return 501 until their authorized, durable workflows are implemented. The
readiness calculation uses the configured maximum without an invented grace.
No official consent, file inspection or audio-grace policy is inferred. The
existing isolated store tests are not evidence of real consent or file inspection.

