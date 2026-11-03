# Persistent online check-in — local implementation

A marshal assigned to the event or its chapter director can record the arrival of
one dancer against an explicit entry. Rust rechecks current chapter membership,
event assignment, event/entry scope, approved status, dancer roster membership and
configured readiness in the same Firestore transaction. The event/dancer key gives
one check-in across entries; simultaneous duplicates return the same record. A
single redacted audit is committed with the first check-in. Each retry rechecks
staff authority and eligibility. The server returns errors instead of simulated
success; the desk keeps input after a failure. This remains an online action.

Assigned marshals and chapter directors can use
`GET /v1/chapters/{chapter}/events/{event}/check-in/candidates?limit=30&cursor=...`
for a bounded manual lookup. The endpoint returns only approved entries that
currently satisfy configured readiness, with entry/crew/division references and
the roster member names and account IDs needed to select a dancer. It does not
return contact, payment, evidence or consent records. Candidate data may become
stale after it is loaded; the check-in transaction remains authoritative and
rechecks assignment, roster membership, approval and readiness. Operators must
still confirm the person's identity separately. Manual ID entry remains
available when a candidate page cannot be loaded.

The input identifiers are not proof of identity. Staff must confirm identity
separately; signed QR passes, revocation reconciliation and offline check-in are
not implemented. Current readiness uses the existing synthetic
configured-policy core, including synthetic audio/consent metadata; actual private
verification, consent, music processing and real policies remain release gates.
The local environment is demo-wsb only, and the production readiness gate is closed.

The event check-in list now reads the durable `checkIns` collection in Firestore
and returns a bounded cursor page. Rust verifies current event assignment or
chapter-director authority and checks every returned record against the chapter
and event path. The marshal desk displays the first page, supports loading more,
and reloads the saved list after a successful check-in. The list is operational;
it does not authenticate a dancer or establish a signed/revocable pass.

The event-day page also reads the signed-in dancer or crew manager's own
check-in using `GET /v1/chapters/{chapter}/events/{event}/check-in/me`. The Rust
API derives the subject from the signed session, checks current membership and
event scope, and returns only whether an arrival is recorded and its timestamp.
A missing record is not an eligibility decision, and a recorded arrival is not
a pass. The response is not cached. Local tests cover another account's lookup,
chapter and role denial, revocation, scope corruption and API restart recovery;
the participant screen has not been interactively browser-tested.

Participants can request their own entry's stage positions from
`GET /v1/chapters/{chapter}/events/{event}/entries/{entry}/stage-status`.
The server checks current chapter membership and either manager ownership or
dancer roster membership, then returns only positions associated with that
entry, including whether each stage is held or inactive. The event-day page now
refreshes the loaded entries in groups of four when opened, approximately every
30 seconds while visible and online, and on returning to the page or reconnecting.
It prevents overlapping checks, reports partial failures, and labels the last
complete check and browser-reported offline state. Each group uses the read-only
`POST /v1/chapters/{chapter}/events/{event}/stage-calls` endpoint. It accepts
one to four distinct entry references and independently rechecks participant
scope for each; unavailable entries have no stage data in the response. This
reduces HTTP and authentication overhead, but each entry still uses its own
repository reads. Event-day load and reconnection behavior have not been
measured. It is a foreground status view, not a push notification,
automatic call or venue pass.
Synthetic tests exercise stage progression, held/inactive states, role and
chapter denial, and API-restart recovery. Browser interaction remains
unverified.

`repository::tests::venue::online_checkin_is_scoped_idempotent_and_recovers`
uses the Firestore emulator to check unready and non-roster denial, wrong chapter
and role denial, concurrent identical requests, one audit, fresh repository reads
and revocation on retry. It is included in the explicit persistence runner.
`tests/venue-browser.cjs` passed on desktop and mobile: rejected a non-roster
dancer, recorded a server receipt, displayed the durable arrival list, and returned
the same receipt after browser reload. A full
graceful Docker down/up followed by `tests/venue-recovery.cjs` recovered the exact
same synthetic check-in. The initial browser attempt occurred during the API
rebuild and timed out; it passed after the API became healthy.
