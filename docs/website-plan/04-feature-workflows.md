# Feature workflows, validation and recovery

The route catalogue gives screens; these contracts define the behavior that
connects them. All writes that affect eligibility, money, scores, access or
publication run through Rust and produce an auditable outcome.

## 1. Discovery to registration
Visitor filters chapter/events -> reads event details and versioned rules ->
starts registration -> signs in or creates account -> returns to same event ->
creates/selects crew -> chooses division -> prepares roster -> music -> checkout
-> review -> submission receipt. Permit save-and-resume between steps. Readiness
is a computed set of individual prerequisites, not a single client-controlled
boolean. Distinguish draft, submitted, under review, needs correction, approved,
withdrawn and cancelled. Stage access may require approval plus paid status and
other conditions; submitting the form alone does not grant a pass.

Acceptance: reloading or signing in midway resumes the correct entry; expired
event/deadline is revalidated; unauthorized crew cannot be substituted in a URL;
duplicate submit returns the original receipt. Field-level errors preserve input.

## 2. Crew membership and roster
Manager creates crew -> issues scoped, expiring invitation -> dancer authenticates
-> checks inviter/crew/event -> accepts -> supplies own details -> manager sees
readiness summary. Prevent duplicate membership while allowing legitimate
multiple crews/entries under approved policy. Roster entry and persistent crew
membership are separate records: changing a crew does not rewrite historical
event entries. Manager transfer requires recipient acceptance and cannot orphan
the crew. Removing a dancer from a paid/locked entry uses a change request.

Roster validation includes event rule version, age cutoff, size, cross-entry,
representation and advancement retention once those rules are verified. Report
each failure with the relevant requirement. Do not infer citizenship from a
name, appearance or uploaded document without approved review policy.

## 3. Minors, identity and consent
Collect the minimum required identity information in a secure private flow.
Document upload -> malware/type/size validation -> OCR assistance if enabled ->
human review when ambiguous -> approved, rejected or replacement requested.
OCR is advisory. Required guardian relationship is verified separately from
crew manager status. Signer sees the exact event and document version, language,
capacity and consent scope. Keep participation waiver, media consent and optional
marketing permission separate. Policy changes create new consent versions.

Acceptance: unrelated guardian cannot view a dependent; staff views are audited;
private document URLs expire; no ID thumbnails in ordinary roster lists,
notifications, analytics or exported public results. Retention and deletion
periods are jurisdiction-dependent decisions, not hard-coded assumptions.

## 4. Payments, allocation and refunds
Server calculates quote in integer minor units with currency and expiry -> payer
chooses supported method -> provider creates payment intent -> browser returns
to pending screen -> signed webhook/verified provider lookup updates ledger ->
allocations update entry balance. Payment statuses include created, pending,
succeeded, failed, expired, partially refunded, refunded and disputed. Registration
status is independent. Multiple concurrent payers cannot over-allocate an invoice.

Bulk and split flows use one authoritative invoice with individual allocations.
A late successful payment after invoice cancellation enters reconciliation.
Repeated provider event IDs are idempotent; events arriving out of order cannot
regress a settled state. A manual receipt enters review; actual bank evidence
confirms funds. Refund request -> policy check -> approval -> provider execution
-> settlement -> revised balance and receipt. Never infer success from a redirect.
Merch/add-on stock and sizes require explicit inventory/cancellation rules if used.

Acceptance: duplicate webhook produces one ledger effect; wrong currency or amount
quarantines the event; simultaneous share payments reconcile correctly; refund
retries do not over-refund. Test provider failure and delayed settlement with fixtures.

## 5. Music and media
Manager selects approved format -> upload progress with cancellation/resume ->
client preview -> server verifies actual container/content and duration -> accepted
or correction needed. Server records hash, original name, stored version, duration,
format and associated entry. Deadline lock uses event timezone converted to server
time; display exact cutoff with timezone. Replacing a file invalidates previous
readiness until verification completes. Late submission is a distinct state with
approved policy treatment, not an invented automatic deduction.

DJ export snapshots accepted track versions and running-order revision. Export
manifest contains order, division, crew, actual extension, hash and playback
readiness. Never change a WAV file's extension to MP3 without transcoding. Validate
an export after lineup changes, and show whether the DJ's downloaded pack is stale.

## 6. Check-in and passes
Eligible entry -> issue scoped entitlement -> dancer presents QR -> operator checks
event, zone, expiry and revocation -> scan records outcome. QR should contain an
opaque identifier or signed bounded entitlement, not raw personal information.
Distinguish valid, already checked in, wrong zone, expired, revoked and cannot
verify offline. Provide camera permission recovery and authorized manual lookup.
Offline mode may check a bounded signed cache, but cannot guarantee prevention of
replay between disconnected scanners; reconciliation and manual escalation must
be explicit. Never advertise offline QR as unconditionally fraud-proof.

## 7. Stage and marshal operations
Published lineup -> check-in -> holding -> on deck -> performing -> completed.
Allow policy-driven skipped, delayed and withdrawn states. Each command carries
expected stage revision; only one current performance per stage where the format
requires it. Stage operator changes trigger authoritative in-app notices; push is
best-effort and never the sole source of the call. Show crew call history and
estimated times as estimates. Offline changes to globally shared stage state
remain tentative until acknowledged.

## 8. Judging and score lifecycle
Judge selects assigned entry -> loads rule snapshot -> changes criteria locally
-> draft autosave -> review -> submit command -> queued/sending -> acknowledged
or conflict/rejected. Criteria, precision and maximum values come from the
approved rule version. No fixed five-by-twenty rule is asserted here. Provide
numeric input and step buttons alongside sliders. Notes can be text or optional
voice transcription, with recording permission, retention and explicit review.
Private commentary has a separate release policy from public score breakdowns.

Outbox record: operationId, authenticated actor binding, chapter/event/entry,
expectedRevision, ruleVersion, payload, payload hash, creation time, attempts and
server receipt. Retry preserves operationId. Changed payload with same key is
rejected. Server transaction checks current assignment, lock state, rule version
and expected revision before committing score, idempotency record and audit.
The server timestamp, not device time, establishes accepted order.

Rotation, reload and tab backgrounding must not lose drafts. Device handoff and
second-tab conflicts must be visible. Offline lease expiration is a policy
decision; reconnect after revocation or lock must reject the operation and
preserve a recoverable local copy. Sign-out warns about pending operations.

## 9. Discrepancies, deductions, locking and publication
Head judge sees completion matrix and advisory anomalies -> asks for review ->
original judge makes authorized revision -> technical deductions are confirmed ->
tie resolution is recorded -> lock snapshot -> tabulation job -> validation ->
publication preview -> publisher releases public projection. Do not implement
trimmed means, standard deviation thresholds, tie breakers or penalties from
unverified proposal text. Preserve score precision internally and apply approved
rounding only at defined stages.

Large divisions use a versioned finalization snapshot and bounded jobs, rather
than one unbounded transaction. Finalization proves all included revisions and
deductions belong to the same snapshot. Public display consumes only released
projection versions. Retraction marks the old version withdrawn, invalidates
related certificates/advancement where policy requires, and issues a correction
notice. Exports include publication version and date.

## 10. Battles
Seed entrants under approved format -> validate bracket -> assign judges -> open
round -> accept one vote per authorized judge/round -> close vote -> compute
outcome -> resolve ties under approved rule -> confirm advancement. A bye is not
a fabricated win against an opponent. Withdrawals and disqualifications have
distinct records. Battle operator cannot impersonate voters. Late, replayed and
offline votes are accepted only under an explicit bounded policy; no client-side
winner calculation is authoritative.

## 11. Advancement and seasonal rankings
Published result -> evaluate verified qualification rule -> invitation -> manager
acceptance -> new event entry referencing original roster snapshot -> retention
validation -> ordinary registration readiness. Wildcard invitations carry grantor,
reason and separate qualification basis. Invitations expire or are superseded
explicitly. Seasonal rankings require their own approved point schedule, season
boundaries, event eligibility, tie policy and correction propagation. A placement
and a season rank must never share an unlabeled number.

## 12. Content, support and operations
Content draft -> owner review -> accessibility/media-rights check -> scheduled or
immediate publish -> revision/retire. Preview links are scoped and private. Staff
announcements require event audience preview and idempotent send intent. Support
cases can escalate to finance, registration or judging authority; support does not
gain those permissions automatically. Incident records track impact, owner and
resolution. Audit entries are append-only, scoped and redacted.

## Shared state language

| State | User copy | Allowed action |
|---|---|---|
| Local draft | Saved on this device | Continue editing |
| Queued offline | Saved on this device. Waiting to send. | Keep working; inspect queue |
| Sending | Sending your submission… | Avoid duplicate action; allow navigation only with safe state |
| Accepted | Submission received | View receipt |
| Conflict | A newer version exists. Review before resubmitting. | Compare and resolve |
| Locked | This division is locked. Your draft was kept. | Request authorized review |
| Permission revoked | Your assignment has changed | Return to authorized workspace |
| Payment pending | We are confirming your payment | Check status; no second charge prompt |
| Upload rejected | This file needs a change: [specific reason] | Replace file |
| Feed stale | Last updated [time] | Retry; use approved offline procedure |

## Cross-workflow failure rehearsal

Rehearse payment confirmation while roster changes; two judges editing the same
account's draft on different devices; lock while an offline score is queued;
lineup changes after DJ export; revoked pass on disconnected scanners; withdrawn
crew with a paid invoice; guardian revocation; corrected result after qualification;
expired staff assignment during event; device storage exhaustion; and browser
relaunch during upload. Each incident must have an owner and visible recovery path.
