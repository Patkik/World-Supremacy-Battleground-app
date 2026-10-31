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
| Chapter, studio and partner proposals | Chapter/country links went to the old site; `/community/apply` and partnership download buttons claimed an unavailable form/file; partner/studio directories showed unverified names and metrics | `/community/apply` now records chapter, studio and brand/event partnership proposals as private durable conversations routed to a selected chapter support queue. Chapter support/directors can reply; applicants can recover the thread after reload. It does not grant affiliation or approve a partner. Directories no longer display unverified listings or stats. The global HQ application queue, membership and decision lifecycle remain unfinished. See `docs/native-applications.md`. |
| Verification and consent | Native private identity/residency upload and chapter review are connected to Storage rules and Firestore receipts for the signed-in subject. Guardian relationships, event waiver versions/signatures and consent readiness are not yet implemented. | Continue with verified guardian authority, event-scoped consent documents and signatures only after policy approval; keep private evidence out of rosters, public projections and development indexes. See `docs/private-verification.md`. |
| Music | Participant upload and staff music-review pages report unavailable instead of displaying fictional tracks or compliance | Native upload/progress, server validation, version and deadline handling, correction and DJ export. |
| Payments, refunds and tickets | Manual core is connected; provider/ticket/refund screens are incomplete | Native quote, allocation, pending/settled states, verified callbacks, receipt and refund review. No false success or raw external payment links in place of the system flow. |
| Rules/help | Official documents remain linked as sources | Versioned in-system event guidance with clearly labeled source documents; a source link must not replace the form's own requirements and validation. |
| Results/advancement | Locked division results now publish through an immutable Firestore projection; the chapter publication desk reads server lock/publication state | Public-only projections and a real publication receipt/digest are connected. Tie policy, corrections/republication, detailed scorecards and advancement still require approved rules and implementation. |

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
