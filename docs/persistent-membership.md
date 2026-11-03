# Authoritative chapter membership

Every chapter API session first validates the signed Firebase identity token,
then loads `chapters/{chapter_id}/members/{uid}` from the server repository.
The requested route chapter is not taken from the token. The membership record
must identify the same UID and chapter, be active, not past its optional
`expires_at`, and satisfy `auth_time >= valid_after`. Rust returns the current membership role and
places that role and route chapter into the request context for downstream
handlers. Chapter and role claims are not trusted for authorization.

Durable handlers then re-read membership in their repository transaction and
compare the current role before applying role checks. Event-scoped handlers
also check the event and current assignment. Changing or revoking membership
must advance `valid_after` to the change time, forcing an account to authenticate
again before its new role is used. This allows one Firebase UID to hold
independent memberships in multiple chapters.

## Chapter discovery and workspace context

`GET /v1/account/chapters?limit=30&cursor=...` verifies the signed Firebase
identity without selecting a chapter from token claims. Firestore pages the
server-owned chapter directory, then the API returns only records whose current
membership, expiry and `valid_after` checks pass for the signed UID. Pages are
bounded; a page with no matching membership may still include a continuation
cursor. The workspace selector uses these summaries to choose a chapter and
role-specific home. The selected chapter is a browser context preference only:
each route still calls the chapter session endpoint and each mutation rechecks
current membership and event assignment on the server. Route-bound admin pages
use their URL chapter as context, not as authorization.

Mounted workspaces clear a previously verified session immediately when the
signed-in UID or selected chapter no longer matches it. Same-tab chapter changes
notify mounted hooks directly; other-tab changes are observed through the
browser storage event and trigger a fresh server session check. A stale session
is never used as authorization while the new check is pending.

This avoids treating a stale or single-valued `chapterId` custom claim as the
membership directory and avoids adding a second, denormalized membership index.
The tradeoff is one direct membership read per chapter in each requested page;
clients advance through the opaque chapter-directory cursor when needed.

Firebase Storage applies the same `active`, `valid_after`, and optional
`expires_at` checks for direct private-media reads and uploads; those operations
do not pass through Rust first.

The same membership role, recent-authentication, expiry and active-state checks
are used in the in-memory demo mode and Firestore demo adapter, including event
assignment reads. Local signed-test tokens remain restricted to
`demo-wsb`; the API still rejects unsigned Auth Emulator tokens.

## Firebase account status and revocation

The verifier contains a non-demo Firestore build path that checks the signed
UID against Identity Platform `projects.accounts.lookup` using Google Application
Default Credentials. It requires the `identitytoolkit` OAuth scope and the
`firebaseauth.users.get` IAM permission, then rejects missing, disabled, or
revoked users by comparing the token `auth_time` with `validSince`. Account
lookup errors fail closed as `503`; invalid, disabled, or revoked identities
return `401`. This adds an Auth-backend round trip to each non-demo token check.
See Google's [account lookup reference](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup),
[UserInfo fields](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/UserInfo),
and Firebase's [session revocation guidance](https://firebase.google.com/docs/auth/admin/manage-sessions).

This path can run only after explicit production storage opt-in: the API must
use a non-demo project, `WSB_STORAGE=firestore`,
`WSB_ENABLE_PRODUCTION_STORAGE=true`, ADC and no emulator endpoint. No real
Firebase Auth call has been made. The configured Firebase project must match the
connector's project ID. In a non-demo Firestore build,
chapter-director and HQ membership grants perform a fail-closed Auth
lookup before opening the Firestore mutation transaction; missing or disabled
accounts are rejected, and Auth/IAM/network errors return `503`. The demo grant
flow remains isolated and does not query a production Auth service. Chapter staff
invitations are described below; no account disable-user command is implemented. Production identity remains
gated until runtime configuration, IAM provisioning, account lifecycle tooling,
and signed API rehearsal are complete.

## Local chapter staff management

In the demo Firestore environment, chapter directors can list staff memberships
and grant, change, or revoke supported chapter roles from
`/admin/[chapterId]/staff`. Each write includes a reason, expected revision,
finite expiry for active access, and an operation ID. The API requires the
director's current chapter membership and recent authentication, then commits
the membership update, idempotency receipt, and audit record in one transaction.
Changing access advances `valid_after`; the grantee must sign in again before
using the new membership. Director self-change and granting the director role
through this screen are denied.

The same workspace can load a chapter event by ID and assign or unassign an
active chapter staff member. Event assignment writes use an expected revision,
reason, operation receipt, and audit record in the same transaction. Only a
chapter director can manage the event roster; event assignments do not change
chapter roles, and a role must be active and unexpired before it can be assigned.

This direct-grant workflow is intended for controlled demo and explicitly
configured non-demo Firestore runtimes. The demo adapter does not query Firebase
Auth for the target UID; non-demo builds perform that lookup before granting
access. Production use remains closed pending IAM and signed-workflow rehearsal.

### Chapter staff invitations

Directors can create an invitation for an existing account UID from the staff
workspace. The API checks the target account before creating the invite where
the Identity Platform integration is enabled; non-demo use requires the
explicit production-storage runtime gate above, and the demo uses synthetic
accounts. Each invitation
contains an intended UID, allowed chapter role, director-supplied reason,
accept-by time (seven days), and a separate staff-access expiry.

The browser generates a 256-bit one-time code. The API stores only its SHA-256
digest in the chapter invitation and a server-only root lookup; the code itself
is placed in the URL fragment so it is not sent in the HTTP request or referrer.
The director shares the link directly with the intended person. WSB does not
send an email or create Firebase accounts. The accept endpoint verifies the
signed UID matches the invitation, requires recent authentication, and
transactionally creates the expiring membership, consumes the invitation,
records a replay receipt, and writes an audit event. A director can revoke an
unused invitation with a reason. Exact retries return the prior result only
while the accepted membership remains current. Recipients sign in again after
acceptance because membership changes advance `valid_after`.

Expired, accepted and revoked invitation records currently remain stored. Their
retention and deletion period is unresolved; see [open questions](open-questions.md).

This is a demo-wsb invitation workflow. No account disable command is available.
Approved WSB policy references for waiver wording and guardian verification are
also still pending. These gaps keep `persistent-membership` and release
readiness open. See the [role and permission matrix](website-plan/02-roles-and-navigation.md).
