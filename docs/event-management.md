# Chapter event drafts

Chapter directors can create a private draft at
`POST /v1/chapters/{chapter}/events` and review saved drafts at
`GET /v1/chapters/{chapter}/staff/events`. The API checks current chapter
membership, director role and recent authentication. Creation stores an
idempotency receipt, event record, globally reserved event identifier and audit
record in one Firestore transaction. Replaying the same operation returns the
original event; reusing its operation ID with changed fields conflicts. The
director must supply an 8–1000 character reason; it is saved in the same
transaction as the audit record and stable correlation ID.

The event identifier is a lowercase URL slug reserved across newly created
events and published event projections. The event starts in `draft` status and
records the date, validated IANA timezone, venue and rule source/version reference
provided by the director. The system does not verify the rule reference as an
official source or activate registration from this information.

Directors can configure or clear a registration window at
`PUT /v1/chapters/{chapter}/events/{event}/registration-window`. The local date
and time values are interpreted using the event's IANA timezone. Both endpoints
must be set together; the close must follow the open. Ambiguous or nonexistent
local times during daylight-saving transitions are rejected. The command checks
current director membership, recent authentication, draft status and the
expected event revision. Its operation receipt, updated event and audit are
written transactionally. Saving dates does not change the draft status or open
registration. A human reason is required and recorded in the audit entry.

The director can edit the draft's name, date, timezone, venue and supplied rule
source/version reference with `PUT /v1/chapters/{chapter}/events/{event}`. The
same recent-authentication, current-membership, revision, replay-receipt and
transactional-audit checks apply. Timezone cannot change while a registration
window exists, because stored window timestamps are absolute instants. The
server does not treat the supplied source reference as rule approval. A human
reason is required and recorded in the audit entry.

Chapter directors can prepare versioned division policy drafts through
`GET /v1/chapters/{chapter}/events/{event}/division-policy-drafts` and
`PUT /v1/chapters/{chapter}/events/{event}/division-policy-drafts/{division}`.
A draft stores the supplied name, roster bounds, duration, optional age limit,
integer minor-unit fee, effective date and rule source/version reference. Every
save creates an immutable snapshot with a version number, revision, operation
receipt and audit record. These records are kept outside live `divisionState`;
they do not affect participant registration, payment quotes, judging or
readiness. No publish or approval action is available. Official rule and fee
approval, scoring criteria, and attaching an approved version remain unfinished.
The version list is available at the draft's `/versions` endpoint. Each save
requires a human reason stored alongside the audit event.

This slice replaces the sample-only create/list pages with saved records and
supports revisioned registration date configuration, core detail edits and
separate versioned division policy drafts. Live division policies/fees, stage
structure, staff assignment, activation, publication and cancellation remain
separate work; a draft is not available for participant registration.

The Firestore repository currently connects only to `demo-wsb` with an explicit
emulator. No production event provisioning or migration is enabled.

## Registration cutoff display

The event command center formats the saved registration close instant in the
configured event IANA timezone, independent of the viewing device timezone. A
missing or invalid timezone is displayed as a configuration issue; the browser
timezone is never substituted silently.
