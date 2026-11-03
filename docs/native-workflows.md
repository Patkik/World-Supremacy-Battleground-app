# System-owned forms and workflow destinations

User direction, 2026-10-30: build forms suited to this WSB operating system and
keep core workflows here. Do not send users to the older website, Jotform,
Google Forms or another registration service to complete system functions.
Follow-up observation, 2026-10-30: several links inherited from the older site
still send people away. The task therefore includes a full CTA, form-action and
destination audit of the adapted site, not only fixing registration links already
identified below. Replace each workflow destination with a WSB-owned form and
persisted submission; preserve clearly labeled source/reference links.

The existing sites and linked rule documents are reference evidence. A source
link is not a replacement for a working registration, payment, consent, support
or administrative workflow. External payment services may supply payment rails;
the platform must own the entry, invoice, status, receipt and recovery experience.
Any required provider authentication step must be explicit and return to the
correct system record. It must not be presented as a completed internal form.

## Audit and replacement list

| Workflow | Current source / gap | Required system behavior |
| --- | --- | --- |
| Crew registration | `WSB.registration` previously pointed to Jotform from homepage, navigation, help and championship CTAs | Native event selection, crew, performers, readiness, payment, submission and registrar review. CTAs now point to the built-in registration route. An unconfigured event must report unavailable rather than send users elsewhere. |
| Contact and support | Native `/contact`, `/app/support` and chapter support queue now persist conversations, real receipts and authorized replies; `WSB.contact` points here | Desktop/mobile, replay, isolation and full restart checks pass. Email delivery, specialized escalation and live retention/access-key policies remain release work. See `docs/native-inquiries.md`. |
| Chapter, studio and partner proposals | Chapter/country links went to the old site; `/community/apply` and partnership download buttons claimed an unavailable form/file; partner/studio directories showed unverified names and metrics | `/community/apply` now records chapter, studio and brand/event partnership proposals as private durable conversations routed to a selected chapter support queue. Chapter support/directors can reply; applicants can recover the thread after reload. It does not grant affiliation or approve a partner. Directories no longer display unverified listings or stats. A Global HQ queue at `/hq/applications` now supports cross-chapter reading, replies and communication status for indexed proposals. The demo-only historical index migration is available but has not been run. HQ provisioning, review rubric, decision states and retention remain open. See `docs/native-applications.md`. |
| Verification and consent | Native private identity/residency upload and chapter review are connected to Storage rules and Firestore receipts. A local-demo guardian request flow supports create, respond, withdraw and same-tab reload recovery; pending requests remain withdrawable with the unavailable counterpart redacted. Confirmation only enters `awaiting_verification`. | Verified guardian authority, event-scoped waiver signatures and consent readiness remain unimplemented pending source approval. Keep private evidence out of rosters, public projections and development indexes. See `docs/private-verification.md`. |
| Notifications | A chapter-authorized, durable in-app inbox records crew-invitation acceptance, entry and verification review decisions, support updates, judge-panel changes, manual music review outcomes, battle ballot closure for the saved draft creator, payment ledger transitions to the payer and (when distinct) crew manager, event-staff assignment changes, eligible online check-in, revisioned stage-position transitions, stage-hold changes for other assigned marshals, stage-access changes for added/removed marshals, published results, and local PayMongo test-mode settlement/refund events. Approval, stage and result notices queue bounded roster delivery. Each delivery rechecks current active, unexpired recipient membership; roster delivery also rechecks entry membership. Reads are bounded, unread count is transactionally maintained, and read acknowledgements are idempotent. The inbox can acknowledge up to 30 loaded unread notices per action, stopping on a failed or unauthorized response. | Roster and publication delivery recovery and role workflows remain unverified. Followers, result corrections, other business events, delivery preferences and push/email delivery are not connected. The in-app record does not claim that an external notification was sent. |
| Music | Participant WAV/MP3 inspection/submission and a paginated event reviewer queue are connected to Rust and Firestore; the assigned audio operator can download one streamed local-demo ZIP for the entire event, grouped by stage/current order, with division, lineup revisions, hashes and omitted-track states in a CSV manifest | DJ export is demo-wsb/local-testing only; production private-media access/scanning, official allowed-format set, deadline/replacement policy and compliance/readiness rules remain gated. Manual review does not grant compliance or readiness. |
| Payments, refunds and spectator tickets | Manual payment core is connected; provider/ticket/refund screens are incomplete. The public event ticket route no longer invents Manila/Hong Kong event names, ticket tiers or prices and clearly reports that sales are not available. | Native quote, allocation, pending/settled states, verified callbacks, receipt and refund review. Ticket sale requires event-owned pricing, inventory, admission and refund/transfer terms before a ticket can be offered. No false success or raw external payment links in place of the system flow. |
| Event details and rules/help | The Hong Kong 2027 detail page uses sourced event information, the Manila route is explicitly a sample, and unknown event slugs now show no invented dates, venues, divisions, fees or open-registration claims. Official documents remain linked as sources. | Public event information needs organizer publication; versioned in-system event guidance must carry clearly labeled source documents, and a source link must not replace a form's own requirements and validation. |
| Results/advancement | Locked division results now publish through an immutable Firestore projection; the chapter publication desk reads server lock/publication state | Public-only projections and a real publication receipt/digest are connected. Tie policy, corrections/republication, detailed scorecards and advancement still require approved rules and implementation. |
| Chapter and Global HQ publishing | `/admin/[chapter]/content`, `/hq/content` previously showed sample published articles, audience counts, partner claims and browser-only publish/edit actions | Chapter directors can now save private plain-text drafts with immutable revisions and audit history. There is no review, publish action, public projection or notification. Define the complete editor/publisher role boundary, approval authority, content rights, audience, correction/removal and retention policy before public publishing. Global CMS remains unavailable. |

The chapter admin navigation now opens the event-duty console selector rather
than the fictional demo scorecard. The selector requires an event reference;
each destination still checks current server authority.

## Account onboarding

`/onboarding` now saves the signed-in account display name through Firebase
instead of claiming a browser-only dancer profile was created. Email verification
and chapter membership remain separate. Locale, country representation, dance
alias, birth date and eligibility-sensitive profile workflows are not connected;
the onboarding screen does not present these as saved or verified.

## Remaining unavailable participant routes

These routes intentionally do not claim to accept or complete a request. Keep
their unavailable states until the listed authority and implementation are
ready:

| Route | Current state | Required before activation |
| --- | --- | --- |
| `/app/consents` | No waiver signature is recorded. | The user will provide approved waiver and guardian-verification source references; then implement versioned, event-scoped signatures and verified signer authority. Retention and readiness rules also remain open in `docs/open-questions.md`. |
| `/app/advancement` | No invitation, qualification or acceptance is recorded. | Approved eligibility, tie, correction and advancement rules with an identified authority. The product brief's roster-retention and seeding proposals are not sufficient evidence. |
| `/app/tickets` | No attendee ticket purchase or ticket record is shown. | Confirm whether native attendee ticketing is in pilot scope, then define inventory, payment, refund, transfer and receipt behavior. The delivery plan currently permits external ticket providers for the pilot until those policies are defined. |
| `/app/passes` | No signed venue credential is issued. | Signed online/offline pass issuance, expiry, revocation and reconciliation. The online check-in primitive does not establish a dancer's identity or constitute a personal pass. |
| `/app/privacy` | No privacy request or preference change is submitted. | Define the account-wide request owner, identity recheck, request status and exceptions for retained audit/financial records before adding export or deletion actions. |
| `/app/entries/[entryId]/changes` | No division change, substitution or withdrawal request is recorded; the page points to the entry workspace and account support. | Authorized review workflow for division changes, substitutions and withdrawals, including fee/readiness effects. |
| `/admin/[chapter]/events/[event]/advancement` | No seed, quota, invitation or acceptance record exists. | Approved advancement policy and an identified issuing authority. |
| `/admin/[chapter]/events/[event]/reports` | No scrutineer, attendance or financial report is generated or exported. | Report definitions, export and retention policy; authoritative reads already exist in the audit feed and finance ledger. |
| `/admin/[chapter]/events/[event]/communications` | No director-composed broadcast is delivered; no SMS/email channel is configured. | A durable, authorized announcement workflow with audience and delivery rules. |
| `/admin/[chapter]/events/[event]/settings` | Event draft fields and the registration window are edited on the events list; music cutoff, per-event currency and automatic locking are not configurable. | Approved music deadline policy; any future currency or locking setting needs an authorized command. |
| `/console/[event]/incidents` | No incident record is created or stored. | Durable incident workflow with retention and access rules. |
| `/console/[event]/penalties` | No separate penalty desk exists; technical deductions live in the head-judge division review and accept values as entered. | Approved deduction catalog and violation penalties. |

## Event staff assignment handoff — 2026-11-02

An active event assignment notice links to the scoped event-duty selector with
chapter and event references. `/console` verifies current assignment before
enabling event desks, and the chapter chooser preserves this same-origin return
destination when the user's selected chapter differs. Assignment removal notices
return to workspace selection. The notice is a navigation aid only; every
destination remains responsible for current role and assignment authorization.
Browser delivery, cross-chapter selection recovery and assignment revocation
remain for role rehearsal.

## External destination review — 2026-11-01

Static review of `apps/web/src` found no external form action or external
registration, support, payment, consent or administration workflow destination.
The remaining external links are labeled source or media links: the official WSB
event calendar and public pages, official rule/guide documents, WSBstreet video,
and icon attribution/license pages. Embedded YouTube playback is public media,
not a workflow destination. The native homepage/help/championship registration
destinations remain internal and retain their sign-in return path; prior desktop
and phone CTA checks are recorded below. Account creation, unverified sign-in and
email action links now preserve only same-origin invitation, registration and
entry destinations through the verification step. This continuity is
implemented but still needs the deferred authenticated browser rehearsal. Repeat
the external-link inventory when new public content or CTAs are added.

Relevant source files: `apps/web/src/lib/public-content.ts`,
`components/public-nav.tsx`, `public-help.tsx`, `chapter-directory.tsx`,
`app/(marketing)/events/world-championship-2027/page.tsx`,
`app/(marketing)/contact/page.tsx`, `app/(marketing)/community/apply/page.tsx`,
and the reopened implementation audit.

## Acceptance

- Inventory every CTA, form action and workflow link inherited from the older
  site; classify it as a WSB workflow or a reference/attribution link. Replace
  each workflow redirect with a WSB-owned form, submission state and receipt.
- Walk every primary CTA and form on desktop and mobile; core steps stay in this
  app, preserve sign-in return paths and chapter/event/entry scope.
- Every claimed submission has a server receipt and survives reload/restart.
  Browser-only sample actions cannot claim a record was received or approved.
- Failed, unauthorized, unconfigured and offline states preserve input and explain
  the next available action without redirecting to the old service.
- Audit external links and form actions. Keep legitimate media, attribution and
  rule-source links clearly labeled; no mandatory core workflow depends on them.
- Connect each remaining form to authoritative Rust/Firebase behavior and prove
  authorization, replay and recovery; replacing a URL alone is not completion.

Verified registration destination check: `tests/native-cta.cjs` passed at 1365px
and 390px for homepage, help and championship links, including the internal
sign-in return path. Native registration itself is covered by
`docs/persistent-registration.md`. Native contact/account support also passes
desktop/mobile and full restart recovery; see `docs/native-inquiries.md`.
The overall replacement task remains in progress for the unfinished rows above.
The four remaining interim unavailable pages are checked on phone and desktop by
`tests/unavailable-workflows.cjs`; this check is not evidence that the missing
submission or review workflows are implemented.
`tests/applications-browser.cjs` verifies the chapter/studio/partner proposal intake,
authorized chapter support reply, wrong-key denial and requester recovery at
1365px and 390px. This closes the prior unavailable intake state, not the
remaining global HQ application review requirement.


## Homepage entry sequence - 2026-11-02

The homepage and shared public navigation now start with event selection rather
than a hardcoded event registration shortcut. Returning users open /workspaces;
the homepage explains six steps and separate manager, participant and staff
entry paths. Event-specific registration links remain native and preserve their
sign-in return destination. The earlier homepage fixed-registration-link check
is superseded by the revised tests/native-cta.cjs expectations.
