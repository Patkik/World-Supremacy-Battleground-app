# Persistent registration contracts

The Rust Firestore repository now owns crew creation/edits, scoped invitations,
performer selection, entry creation, submission and registrar decisions. This is
part of the full registration workflow; private identity/guardian verification,
media processing and production provisioning remain separate unfinished work.

## Commands, authority and replay

- Registration writes take an `operation_id`. A chapter/actor-scoped receipt binds
  the complete command to its response. Effects, receipt and audit commit in one
  Firestore transaction. Reusing an ID with changed input returns 409.
- Membership, ownership and current event assignment are rechecked before receipt
  replay. Revoked authority cannot retrieve an earlier successful response.
- Crew/entry edits also carry `expected_revision`; stale edits return 409. Payment
  reservation, reconciliation and refund advance the entry revision too.
- Crew creation makes a manager-owned crew with no assumed performers. Entry
  creation also starts with an empty roster. Managers who perform must join and
  be explicitly selected, just like other dancers.
- A hashed event/division/crew index enforces one entry per combination under
  competing requests. Different requests return the existing entry.
- Invitations store a token digest, crew, issuer, issue/expiry times and a bound
  redemption receipt. A transaction can redeem a token only once. The same actor
  and acceptance data recover the accepted effect and current crew; another actor
  or changed data is denied. The saved receipt establishes the acceptance, while
  the response avoids returning an outdated roster snapshot. Expiry, issuer ownership, active membership and revocation apply.

The browser retains only an opaque command fingerprint and operation ID in
session storage for an unresolved request. Retrying identical input after a lost
response or reload uses the same ID. Form payloads are not saved in that retry
record. Successful responses and definitive denials clear the intent.

## Entry lifecycle and locking

New entries derive their chapter/event/crew/division and rule version on the server.
An event can specify `registration_closes_at`; creation, roster edits and
submission recheck it. A changed event rule version requires review. This is a
configurable deadline, not an assumed WSB calendar policy.

Performer selection sends only member IDs. The repository copies canonical crew
records; client identity, minor or consent flags cannot override them. Only the
manager may change an unpaid draft/correction roster. Pending funds, settled
funds, submitted/approved entries and scorecards block direct roster changes.
Money-aware change requests remain a separate workflow to implement.

Submission produces `submitted` when the current requirements are ready, otherwise
`needs_correction`. Registrar/director approval requires a ready submitted entry
and current event access. Direct manager approval is denied. Approval/correction
updates the entry and division approval/readiness ledgers atomically. Scored
entries require a separate correction workflow. Locked divisions reject changes.

The approval transaction writes the same division document as the head judge's
lock transaction. A late approval racing lock cannot succeed alongside a lock
that omitted the new entry's required scores. Roster edits racing payment
reservation similarly conflict on the authoritative entry document.

## Native screens and current limits

Connected screens cover create crew, invitations, registration, explicit performer
selection, readiness, payment references and the registrar list/review. They use
current authenticated scope and preserve an invitation/registration sign-in return
path. Lists are bounded and offer load-more actions. The old roster screen's
sample-token fallback and false save acknowledgement were removed.

Crew profile settings now read through the signed chapter session and save name
and city changes with the server's expected revision and a payload-bound retry
receipt. The manager owner check is enforced by Rust. Load/save errors preserve
the form and never fall back to browser-only success. Crew archival remains
unavailable because no archive command or retention/cancellation contract exists.

Public registration CTAs now use the internal event form. The broader
[native forms requirement](native-workflows.md) still includes contact/support,
chapter/studio applications and the other incomplete system forms. A missing
event configuration must not redirect to an external form or fabricate success.

Emulator evidence is in
`repository::tests::registration::registration_replay_invitation_races_versions_and_approval_lock_barrier`.
It covers competing create/redeem operations, payload-bound replay, canonical
roster, stale/unknown/duplicate selections, deadline/rules changes, payment/roster
races, submission, registrar approval/correction, counters, approval/lock races,
revocation and recovery through another repository instance. The ordinary unit
suite intentionally ignores database cases; run the explicit integration case
against `demo-wsb` or use `npm run test:persistence`.

Browser evidence: `tests/registration-browser.cjs` passed at 1365px and 390px. It
deliberately loses a successful crew-creation response, reloads, retries the same
operation, and proves the same crew ID is recovered. It then follows a dancer's
invitation/sign-in return path, selects canonical performers, submits an incomplete
entry, records and reconciles a manual payment, supplies explicitly synthetic
trusted audio metadata, resubmits and receives registrar approval. No browser
exceptions or horizontal overflow were found. Screenshots were inspected locally.

`tests/native-cta.cjs` passed at both widths: homepage, help and championship
registration links stay in this app and retain the internal sign-in return path.
This proves the registration destinations only; the remaining native form audit
is still active. `tests/registration-recovery.cjs` passed after full container
recreation: both browser-created crews and approved entries, canonical performers,
settled balances and original creation receipts were recovered through fresh API
and emulator processes. The current production web image build also passes.

Synthetic audio metadata in a fixture is not proof of an implemented upload
pipeline. No real identity, consent, payment or score data belongs in development
memory or retrieval. The production gate remains closed.


## Crew invitation QR

After creating a one-use dancer invitation, the manager can show a QR code
rendered locally in the browser for the same invitation link. Anyone who sees
the code can redeem that invitation until it is used or expires. This adds no
external QR service or delivery channel; scan, expiry, replay and account scope
remain part of the deferred role rehearsal.


## Revoke the displayed crew invitation

The crew manager can revoke the currently displayed invitation link/QR. Rust
checks current crew ownership and invitation scope, rejects a previously used
invitation, and commits revocation, the operation receipt and audit together.
Redemption rejects revoked invitations; a concurrent redemption and revocation
contend on the invitation record. An exact revocation retry recovers its receipt.
The manager can also page the crew’s invitation history and revoke unused
invitations after reload. The history query filters by crew and pages by invitation document reference;
it includes legacy records and returns only hashed references, status and dates,
never the bearer link or accepted dancer details. Refresh the list after the
cursor format changes or when new records may have sorted before the cursor. Revocation
races, replay and lost-response recovery remain for the deferred rehearsal.


An uncertain invitation acceptance keeps the submitted name and minor flag fixed
in the mounted form so the dancer can retry the same payload and recover the
existing receipt. Definitive denials provide a request-new-link path. After reload, the dancer can recover an accepted invitation without re-entering
those details. The server checks the accepting account, current chapter and crew
membership and issuer authority, then returns the current crew. Lost-response,
revocation and account-switch scenarios remain for the deferred rehearsal.


New invitation links place their token in a URL fragment. The browser moves it
into tab-scoped session storage and replaces the address with a random local
reference before sign-in; return URLs carry that reference, not the token. A
confirmed acceptance or recovery clears the tab handoff; uncertain outcomes
retain it for reload recovery. The
original link must be reopened when switching browser tabs or devices because
session storage is scoped to the originating tab. Existing token-in-path links
remain supported and are migrated after opening, but their first request may
already appear in server logs. Invitation and identity pages request no-referrer
and private no-store headers. Deployment log redaction, cross-tab verification,
expiry/revocation and runtime header behavior remain release checks.
