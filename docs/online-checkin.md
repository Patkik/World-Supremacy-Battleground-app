# Persistent online check-in — local implementation

A marshal assigned to the event or its chapter director can record the arrival of
one dancer against an explicit entry. Rust rechecks current chapter membership,
event assignment, event/entry scope, approved status, dancer roster membership and
configured readiness in the same Firestore transaction. The event/dancer key gives
one check-in across entries; simultaneous duplicates return the same record. A
single redacted audit is committed with the first check-in. Each retry rechecks
staff authority and eligibility. The server returns errors instead of simulated
success; the desk keeps input after a failure. This remains an online action.

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
