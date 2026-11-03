# Global HQ session boundary

`GET /v1/hq/session` verifies a signed Firebase ID token and then loads
`globalMembers/{uid}` from Firestore. The record must contain the same `uid`,
`role: "hq_admin"`, `active: true`, and `valid_after` in Unix seconds. The
token's `auth_time` must be at least `valid_after`. The response contains only
the authenticated UID and global role and uses `Cache-Control: no-store`.

This collection is a platform-level authorization boundary. A chapter member,
chapter director, or client-supplied role does not create global authority.
Records must be provisioned through a trusted server-side administrative path;
no browser or self-service mutation is provided. The local Docker seed creates
one synthetic `hq.admin@wsb.test` identity and a matching global member record;
the local signed-session endpoint still checks Firestore before issuing its
token.

The `/hq/access` workspace now lets an authenticated `hq_admin` list and manage
chapter staff memberships across chapters. Grant/change/revoke commands are
transactional, revisioned, idempotent, reasoned and audited; they require a
five-minute recent sign-in and finite expiry for active access. HQ may grant a
chapter director role, while chapter directors cannot grant that role through
the chapter workspace. The target UID must still be supplied from an existing
account process. A non-demo Firestore build preflights Firebase Auth and rejects
missing or disabled accounts before the grant transaction; the current demo-only
runtime skips that production lookup. This command does not send invitations,
create/revoke Global HQ membership, or check production token revocation. The
management API is limited to the demo Firestore environment.

The `/hq/applications` queue lists indexed chapter, studio and partner proposals
and supports cross-chapter replies/status changes through the existing inquiry
transaction, receipt and audit path. It uses communication statuses only and
does not represent affiliation approval, refusal or licensing. Proposals received
before indexes were introduced can be indexed with the demo-only migration in
`docs/native-applications.md`; that command is available but has not been run.
The formal review rubric, decision states, retention lifecycle, HQ account provisioning and
approval/break-glass lifecycle remain unfinished. Other `/hq` screens outside
chapter staff access, application follow-up, integration status, read-only
operations and the read-only chapter directory remain previews.

`/hq/integrations` now reads `GET /v1/hq/integrations`, which independently
verifies the signed identity against the current `hq_admin` membership before
returning any status. It probes Firestore reachability and reports only whether
PayMongo checkout/webhook configuration and private-media environment values
are present. It never returns credential values and does not ping PayMongo,
Firebase Storage or ClamAV. A configured value is not proof of valid credentials,
successful delivery, malware-scanner health or release readiness. The page keeps
the release gate closed and explicitly labels external connectivity as unchecked.

`/hq/operations` reuses the same authorized status response to show the API
request outcome, Firestore reachability and release gate. It is read only; the
former browser-only maintenance toggle, fabricated performance metrics and
cryptographic-ledger success message were removed. Maintenance routing, ledger
verification, alert delivery and deployment controls remain unimplemented.

`GET /v1/hq/notification-queue` independently verifies current HQ membership
and returns a no-store sample of pending local notification jobs and recorded
failures. The sample reads only failure counts and exposes no recipient data.
It is not complete failure history or evidence of external notification delivery.

`GET /v1/hq/chapters` returns bounded, newest database-page chapter documents
after rechecking the current HQ membership. `/hq/chapters` displays only saved
chapter ID, name and currency. License status, expiry, seed quotas, director
contacts and affiliation decisions have no authoritative records and are not
shown or editable in this view.

`/hq/rules` is a policy-gate board, not a rule catalog. It lists open decisions,
labels the external WSB rules link as reference only, and has no publish action.
`/hq/content` has no CMS, release records or publication action; fabricated
campaigns, partner claims and operational metrics were removed. The shared HQ
banner now states that the API verifies current membership and directs users to
each workspace's capability status instead of labeling all HQ pages disconnected.

Production identity revocation and global access-review procedures are not
complete. This API is not release-ready; `/readyz` continues to report 503.

## Global HQ overview

`/hq` now shows the same signed live API/database/release signals and bounded
notification exception sample as the read-only operations workspaces. It
validates response shapes and clears results when the account changes. Queue
counts remain labeled as samples; missing failure records and completed jobs
cannot be inferred. `GET /v1/hq/overview` separately aggregates exact chapter
document totals and nested event document totals after rechecking current global
membership. These independent count queries do not form a consistent snapshot;
they do not establish chapter health, event readiness, affiliation status or
approved global publication state. The directory still contains only saved
chapter names/currencies, and the global CMS has no publication feed.
