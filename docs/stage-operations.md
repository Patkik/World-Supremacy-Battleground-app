# Local stage command groundwork

The Rust Firestore repository supports a scoped stage position command for the
local demo. A server-owned `chapters/{chapter}/events/{event}/stages/{stage}`
document must exist and be active. Current chapter membership and event marshal
assignment (or chapter-director authority) are checked on every request,
including receipt replay. The stage configuration chooses whether only one
entry may perform on that stage at a time. Stage configuration and authorization
remain server-owned; a client cannot create or alter a stage through this API.

The command creates an entry in holding at expected revision zero, then accepts
only the normal holding → on deck → performing → completed progression with an
explicit expected revision. The entry must belong to the event; entering holding,
on-deck and performing requires approval and the current configured readiness
check. Completion can release an already performing entry if readiness later
changes; it does not change that entry's eligibility. All roster dancers must have an
event check-in when entering holding and when starting a performance. The
technical bound is 100 roster members. Check-in identifiers do not establish
identity, and the current local readiness fixture does not establish real music,
consent or payment verification.

The transaction reads the shared stage, entry, readiness, check-ins, prior stage
entry and actor/operation receipt before committing the stage state, entry
revision, payload-bound receipt and redacted audit. A single-performer stage
uses the shared stage document as the concurrency barrier. An event-scoped claim
also prevents the same entry performing on two stages at once. An exact retry returns
the saved receipt; a changed request using the same operation ID conflicts.
Firestore transactions may retry after contention and commit their writes
atomically; see [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).

`POST /v1/chapters/{chapter}/events/{event}/stage-commands` accepts
`operation_id`, `stage_id`, `entry_id`, `expected_revision` and `position` under
signed current chapter authority. Authorized GET routes list active stages and
their stage entries in bounded pages. Entry pages scan event records and filter
by stage, so a page can be empty while a continuation remains; their order is not
a performance lineup. Non-durable mode returns 501. The marshal desk reads these
pages and sends revisioned commands, reusing the operation ID if a response is
lost. It reports conflicts and asks the operator to refresh before retrying.
Directors can provision stages through the authenticated native form described
below. Docker creates a synthetic `local-main` stage once for the local rehearsal;
edits and deletions are preserved afterward.

The normal progression is a proposed operational workflow, not an approved
competition rule. Marshal authority requires event and stage assignment; the
director assignment form, stage configuration, ordered lineup drafts and holds
are implemented in later sections. Exceptional-state and roster-change policy,
crew-facing lineup publication, staff calls beyond connected notices, offline
reconciliation and an end-to-end event rehearsal remain unfinished.

The demo-wsb repository scenario covers checked-in roster prerequisites,
chapter/role denial, exact and altered replay, invalid transitions, completion
after readiness changes, concurrent
performer contention, a claim across stages, independent repository recovery and
membership revocation.
The signed local API scenario is `node tests/stage-api.cjs`; it uses only
synthetic fixture accounts and creates a unique synthetic stage. Desktop/mobile
`node tests/stage-browser.cjs` covers a temporary read failure and retry, a
deliberately lost response, a concurrent-change conflict, normal progression and
reload. After a graceful full Docker down/up,
`node tests/stage-browser-recovery.cjs` recovered those stage records.

## In-app stage hold

Configured stages now have a durable hold flag and explicit hold revision.
Authorized event marshals/directors can set or release it through
`POST .../stage-holds`, using a payload-bound operation receipt. The transaction
commits the stage, receipt and audit together. A held stage rejects new
performance starts; completing an existing performance remains available.
Legacy local stage documents default to no hold at revision zero.

The marshal desk reads individual stage status and refreshes it periodically.
Each hold change atomically queues one generic inbox notice for other active,
unexpired marshals assigned to that stage. The initiating operator is excluded;
an exact command retry returns its receipt without another notice. This notice
does not reach audio/lighting staff outside the assigned marshal list or any
external channel. Crew-facing stage communications and production release remain unfinished.

## Ordered stage history

Each new stage move and hold change now appends a server-owned history record
under the stage, atomically with the state, receipt and audit. A shared stage
history revision provides a total commit order; padded document IDs preserve
that order when paged. Identical retries return their original receipt without
adding another history record. Existing stages begin history at revision zero;
this does not reconstruct events that occurred before history was implemented.
The history contains actor UID, entry/position where applicable, hold state and
server timestamp. Authorized history API reads and the staff timeline remain
unfinished; no history is published publicly.

Authorized marshals/directors can now page stage history through
`GET .../stages/{stage}/history`. Every page checks current chapter membership,
event assignment and active stage scope. Pages are bounded to 100 rows and
ordered by the padded history document sequence. This endpoint is private and
uses the existing no-store response policy. The staff timeline remains open.

The marshal desk now has a private stage-history timeline with loading, empty,
error, refresh and continuation controls. It shows recorded sequence, actor,
entry/position or hold action and server timestamp. It does not infer older
unrecorded events. The running signed API passed ordered-history and access-denial
checks; desktop/mobile timeline verification is in progress.

Timeline restart evidence: after full graceful Docker container recreation,
`tests/stage-browser-recovery.cjs` passed for both saved stages, asserting seven
ordered timeline rows plus the saved entry and hold state.

History access checks also cover revocation between pages: a saved continuation
is denied after the marshal membership is revoked. Invalid page bounds and
oversized cursor input are rejected in the demo-wsb repository test.

## Explicit stage marshal access

Stage documents now carry `marshal_uids`. An event-assigned marshal must also
be listed on the stage for detail, entries, history, moves and holds; chapter
directors retain oversight. A missing or empty list denies marshals, including
receipt retries. Stage lists filter out unassigned stages. Local setup migrates
only the synthetic `local-main` fixture once; older ad hoc synthetic stages stay
accessible to directors until explicitly assigned. The connected director form manages
these lists; production provisioning remains unfinished.

Stage-list revocation verification removes a marshal while retaining event
membership: reads, history continuation, prior move/hold replay are denied and
the stage is omitted from their list. A fresh repository connection observed the
same denial. This is emulator evidence, not an assignment-management workflow.

## Director assignment command groundwork

The repository now accepts a director-only, revisioned marshal-list command.
It validates proposed UIDs as active chapter marshals with active event
assignments, bounds the list to 100, rejects duplicates and commits the stage,
operation receipt and audit atomically. An empty list revokes marshal access.
A repeated operation returns the original result; changed input conflicts.
The authenticated API route and director form are connected below.

## Connected director assignment workflow — 2026-10-31

POST `/v1/chapters/{chapter}/events/{event}/stage-marshals` accepts the
repository command through authenticated Rust routing. The native marshal desk
shows directors a stage-specific assignment form, saved access revision and UID
list. Drafts do not grant access. Saves re-read current authority after the
receipt, so a historical replay is not displayed as the current state. Empty
lists explicitly remove all marshal access; the server still validates every
nonempty proposed UID against current chapter/event assignments. The form offers a paged list of currently eligible event marshals by account ID,
with manual ID entry available. The list is advisory; the save rechecks current
membership and event assignment. Each saved
change queues one generic inbox notice for each added or removed marshal other than
the acting director. Notices use the access revision for replay deduplication and
recheck current active, unexpired chapter membership. Removed marshals can open
their inbox without retaining stage access.

Signed API checks cover anonymous, manager and marshal denial; director revoke,
restore, invalid target role, stale revisions, exact and changed replay; marshal
reads and accepted move retries fail after revocation. Mobile (390px) and desktop
(1365px) browser checks cover invalid target rejection, revoke/restore, conflicting
edits, refresh recovery, hidden marshal controls and horizontal reflow. TypeScript
and all-feature/all-target Rust Clippy passed. Saved assignment, stage and hold
receipts replayed after an API restart. This adds assignment restart evidence;
it does not claim new full-container-recreation coverage.

Stage assignment changes now notify the changed marshals through the durable
inbox; stage provisioning, lineup ordering, broader venue recovery and production
identity remain unfinished. Assignment changes use the private audit;
they are not appended to the operator stage-position/hold timeline.

## Director-published public stage projection

The director can publish one active stage to an event's public display from the
stage configuration form. Publishing and unpublishing require the existing
8–1000 character reason, expected configuration revision, held stage and no
active performance; the stage change, event selector, replay receipt and audit
commit in one Firestore transaction. The event ID must resolve to its globally
reserved chapter directory entry. At most one stage can be selected per event.
The local seed includes that mapping for new fixtures; an additive migration
adds it to the existing synthetic rehearsal event only after verifying that the
event still belongs to `ph`, and it refuses to overwrite a different owner.

`GET /v1/events/{event}/live` is an unauthenticated, no-store endpoint. It
returns only event and chapter names, held state, current crew/division labels,
and the latest stage-position time. It excludes entry and dancer IDs, rosters,
scores, payment fields and lineup order. The arena display polls this endpoint
and retains its last confirmed factual state during a connection failure. The
bracket view remains empty until seeding/advancement policy and an authorized
published bracket exist. Sponsor tickers, scene switching and physical LED/stream
delivery remain unconnected; a browser preview does not claim those actions ran.
The public event schedule and livestream routes show that no timetable or video
feed is connected; private lineup drafts are not presented as a public schedule.

The director's display workflow is not yet rehearsed. Later role verification
must confirm publish/unpublish, concurrent stage-selection conflict, rejection
of inactive/performing stages, public field allowlisting, chapter scoping,
receipt replay, and connection-loss freshness. It must also confirm that
unpublished results and draft lineup do not appear in the public response.

## Reasoned director stage configuration — 2026-11-01

Stage creation, configuration changes and marshal-access changes require a
director-entered reason of 8–1000 characters. Rust stores it with the stage
change, replay receipt and audit correlation ID in one transaction. Proposed
marshal UIDs must be active, unexpired chapter marshals with active event
assignments. Routine stage position and hold commands remain reasonless for
venue speed; their actor, action, resource and correlation ID are still audited.
This is an initial PAGE-085 reason policy, not full reason coverage.

## Native stage provisioning — 2026-10-31

Directors can now create event stages using the native marshal desk and Rust
POST `/v1/chapters/{chapter}/events/{event}/stage-create`. The command accepts
an operation ID, unique stage ID and single-performer setting. Current chapter
director membership and an existing matching event are checked in the transaction,
including on receipt replay. Stage creation, receipt and private audit commit
atomically. Existing IDs cannot be overwritten. Exact retries return the original
result; changed payloads or a new operation for the same stage ID conflict.

New stages are active, held, without assigned marshals or a performing entry;
all revisions begin at zero. This is an explicit initial state, not a fabricated
hold-history event. Directors assign marshals separately and deliberately release
the hold before performances. Renaming, deactivation and changing performer
capacity on an existing stage are not implemented. Creation does not establish
an ordered lineup or notify staff.

The demo-wsb repository test passed concurrent identical creation, role denial,
duplicate/changed requests, safe initial state and independent-connection reads.
Signed API checks passed anonymous/wrong-role/chapter denial, invalid path IDs,
creation, replay, changed payload and duplicate ID rejection. Browser checks at
390px and 1365px passed native creation, deliberately lost successful response
and same-operation retry, duplicate ID feedback, existing assignment workflows,
marshal controls hidden and horizontal reflow. TypeScript and strict all-feature,
all-target Rust Clippy passed. Restart receipt evidence is tracked in status.

## Director stage lifecycle — 2026-10-31

POST `/v1/chapters/{chapter}/events/{event}/stage-configure` accepts an operation
ID, stage ID, expected config revision, active flag and single-performer flag.
Rust rechecks current director membership and event scope before receipt replay.
New effects require the stage held, at least one changed setting, matching revision
and no performing entry. A transaction queries event stageEntries for this stage
and performing position (one result is enough to deny), as well as checking the
single-performer pointer. This covers multiple-performer stages and legacy stage
documents. The same stage document serializes starts, holds and configuration.
State, receipt and private audit commit together; exact replays return the original
result and changed operation payloads conflict.

Deactivation preserves assignments, entry/history records and the hold. Marshals
cannot read or mutate inactive stages, including move/hold receipts; director
lists/details/entry/history reads include inactive stages for oversight and
reactivation. Reactivation stays held, so starts need a separate hold release.
Assignment edits and hold changes still require an active stage. Configuration
changes use the private audit, not the position/hold timeline. IDs cannot be renamed.

The native director form shows current config revision, active state and capacity,
reloads current authority after an accepted command and handles conflicts/errors.
The page updates the selected stage without resetting paginated selection.
Demo-wsb repository checks passed deactivate/reactivate, historical replay,
changed requests, wrong-role denial, independent reads and an occupied multiple-
performer stage. Signed API checks passed these commands and actual multiple-
performer progression: changes rejected while unheld or occupied, completion then
deactivation succeeded, and marshal detail access was denied. TypeScript and
strict all-feature/all-target Clippy passed. Browser/restart evidence is recorded
in memory/status.md; broader event readiness is still incomplete.

## Versioned internal lineup draft — 2026-10-31

GET `/v1/chapters/{chapter}/events/{event}/stages/{stage}/lineup` returns the
current internal draft or null, under current stage authority. POST
`/v1/chapters/{chapter}/events/{event}/stage-lineup` requires current director
membership, an active matching stage, operation ID, expected revision, ordered
entry IDs and an edit reason. Technical bounds are 200 distinct entries and a
nonempty reason up to 500 UTF-8 bytes. These are implementation bounds, not WSB
competition rules. Every proposed entry must exist in the same chapter/event and
be approved. Planning does not grant readiness or bypass checks when moving entries.

New edits require a held stage with no active performances; queries include
multiple-performer entries. Writing the stage document serializes drafts with
starts, holds and lifecycle changes. Current draft, immutable revision snapshot,
receipt and private audit commit atomically. Exact retries return the original
result; changed retries, stale revisions and unchanged order conflict. Empty
lists explicitly clear a draft. Drafts never change entry position or judging
lineups, publish to crews, enforce start order or deliver notifications.

The native marshal desk displays the saved draft order to authorized staff and
provides directors an ordered-ID/reason form, refresh and conflict recovery.
Current state is re-read after an accepted receipt. Future publication must use
a distinct authorized projection/version, approved seeding/randomization policy
and traceable notifications; this internal draft does not satisfy those gates.
Historical draft snapshots are stored under stage lineupRevisions and shown in
the private staff history viewer described below.

Demo-wsb repository checks passed concurrent identical draft commands, exact and
changed replay, duplicate rejection, stale edits, clear/reorder with two entries,
independent reads and occupied-stage denial. Signed API checks passed private
read/save, role denials, replay, invalid duplicates, unapproved-entry denial and
unassigned-stage read denial. Browser and restart evidence is tracked in status.

## Lineup draft history viewer — 2026-10-31

Authorized staff can page through stored lineup revisions with order, edit reason,
actor and timestamp in the stage desk. GET `stages/{stage}/lineup-history`
rechecks stage access for each bounded page and rejects snapshots whose chapter,
event or stage fields do not match the requested scope. Demo-wsb repository pagination and
denial, signed API access denials, and mobile/desktop browser revision/reason
checks passed. This remains private draft history, not publication or notification.

Lineup history access and recovery: signed tests verified a previously issued
continuation is denied after stage-assignment removal, then works after restoration.
After full local Docker down/up, signed API receipt/current/history and the
marshal browser view recovered the saved draft and three ordered revisions.
