# Roles, permissions and navigation

## Authorization model

One person may hold several assignments. An assignment is a role plus chapter,
event, stage/division where relevant, validity period and granting authority.
Switching a UI role changes context, not permissions. Rust checks current
membership for every sensitive action; token claims alone are insufficient for
revocation, event assignment or ownership checks. Deny access unless explicitly
granted. Private URLs are not authorization mechanisms.

## Role catalogue

| Role | Scope / default home | Can do | Must not do by default |
|---|---|---|---|
| Visitor / spectator | Published global content / home | Discover events, read rules and published results | Read private roster, scores or identity evidence |
| Attendee / ticket buyer | Own orders / tickets | Buy and present authorized spectator entitlement | Access dancer backstage zones through spectator ticket |
| Dancer | Self and joined entries / personal dashboard | Complete own profile, verification, consent and assigned payment; see released feedback | Edit another dancer's identity or another judge's score |
| Crew manager | Owned/managed crews / crew workspace | Create entries, invite roster, upload music, pay/allocate balances, request changes | Sign as a guardian or approve own eligibility evidence |
| Guardian | Verified dependent relationship / dependents | Review dependent event terms, consent and permitted payment tasks | Access unrelated minors or automatically become crew manager |
| Studio coordinator | Explicitly delegated crews / crew list | Coordinate several crews and monitor summarized readiness | Inherit full personal evidence access across a studio |
| Registrar / registration reviewer | Assigned chapter/events / review queue | Review entry completeness and approved eligibility decisions; request corrections | Alter payment ledger or private scores |
| Identity / consent reviewer | Assigned cases / verification queue | Inspect necessary evidence and approve/reject with reason | Export unrestricted identity archive or publish identity data |
| Finance administrator | Chapter ledger / finance | Reconcile payments, allocate confirmed funds, initiate refunds | Change competition scores or store payment secrets in chapter records |
| Refund approver | Delegated chapter authority / refund queue | Approve allowed refund requests | Bypass provider settlement or exceed original refundable balance |
| Chapter director | Chapter / chapter dashboard | Manage events, staff and local approved configuration | Change another chapter or silently rewrite used rules |
| Event manager | Explicit events / event command center | Coordinate readiness, schedule, communication and incidents | Overrule judging authority simply because event manager |
| Judge | Assigned divisions/entries / judge desk | Edit own permitted drafts and submit scores | See peers' unfinalized scores or publish outcomes |
| Head judge | Assigned divisions / head judge desk | Review completeness/discrepancies; authorize score correction; lock division | Silently change a judge score or manage refunds |
| Technical judge / marshal | Assigned competition scope / penalties | Record sourced violations and deductions | Edit criterion scores without a separate authorized role |
| Battle judge | Assigned match/round / voting screen | Cast permitted vote during open voting window | Vote repeatedly or advance bracket manually |
| Battle operator | Assigned event / battle control | Open rounds, manage progression under approved rules | Cast judges' votes or invent tie policy |
| Check-in operator | Event/zone / scanner | Validate entitlement and record entrance state | Access complete identity files or finance histories |
| Backstage marshal | Event/stage / queue | Move authorized crews through holding/on-deck/on-stage states | Mark unpaid/unverified dancers eligible through stage control |
| DJ / audio operator | Event/stage / audio desk | Download accepted tracks and verify cue readiness | Edit registration or accepted track ownership |
| Broadcast operator | Event/display / broadcast controller | Preview and take published scenes live | Publish raw/unapproved scores or personal details |
| Content editor | Chapter/global editorial scope / content | Draft copy, upload approved media, preview revisions | Publish without a publishing grant |
| Content / result publisher | Explicit publication scope / review queue | Release approved editorial content or locked results as assigned | Treat editorial permission as score-lock authority |
| Support agent | Assigned tickets / support queue | Resolve account/navigation issues and escalate | Impersonate users, access identity documents or change scores by default |
| Auditor | Authorized read scope / audit | Inspect redacted histories and export approved audit reports | Modify original records |
| Global rules administrator | Global template scope / rule library | Maintain approved rules and applicability/version metadata | Apply unapproved changes retroactively |
| Global administrator | Global governance / HQ | Appoint directors, govern chapters, approve exceptional access | Exercise invisible unrestricted access without audit |
| Platform operator | Technical environment / operations | Monitor services, jobs and integrations | Gain business access merely from technical operations role |

Roles may be combined for a small event, but the UI must display the active duty
and permission boundaries. Approvals remain distinct actions even if policy
allows the same person to perform both. Financial and result-related separation
of duties should be configurable and approved by the organization.

## High-risk permission matrix

| Action | Actor allowed | Additional condition | Evidence |
|---|---|---|---|
| Grant chapter role | Director or global admin within authority | Cannot grant above own authority; reauthentication | Grantor, grantee, scope, period and reason |
| Invite crew member | Manager of crew | Event/crew invitation scope and expiry | Invitation and acceptance identity |
| Review ID | Assigned reviewer | Minimum necessary fields; case assignment | View and decision audit |
| Submit score | Assigned judge | Current assignment; unlocked entry; expected revision | Operation ID, score revision and receipt |
| Correct accepted score | Original judge after authorized reopen | Reason, head judge authorization and new revision | Original preserved, correction chain |
| Apply deduction | Technical judge | Valid sourced rule and target entry | Rule version, points, reason and review |
| Lock division | Assigned head judge | Completeness and no unresolved conflict | Snapshot/version and lock receipt |
| Publish result | Assigned result publisher | Locked approved projection | Publication revision and timestamp |
| Retract result | Authorized publisher/head judge workflow | Explicit reason and affected downstream state | Retraction, notifications and replacement link |
| Confirm deposit | Finance admin | Bank/settlement evidence, not image alone | Ledger reconciliation reference |
| Refund | Finance actor plus approval if policy requires | Valid amount, provider idempotency and current status | Request, approval, execution and settlement |
| View QR check-in | Check-in operator | Event/zone assignment | Scan outcome with minimal participant data |
| Override eligibility | Explicit override authority | Reason and policy allowance | Source rule, original decision and override |
| Access another chapter | Explicit cross-chapter grant | Auditable purpose and scope | Access event; no blanket implicit staff access |

## Navigation by context

Public top level: Events, Chapters, Results, Stories, About. Utilities: Help,
Sign in and Register crew. Footer: policies, accessibility, safeguarding,
contact, approved social accounts, partners and media.

Portal: Home, Crews, Entries, Payments, Passes, Inbox. On phones use at most five
primary items: Home, Crews, Events, Inbox, More. Payments, passes, profile,
dependents, support and privacy remain reachable through contextual actions and
More. Do not hide outstanding payment tasks inside navigation alone.

Administration: chapter selector, event context, Dashboard, Events,
Registrations, Finance, Staff, Content, Support and Audit. Render only authorized
destinations; headings and empty states must not disclose forbidden counts.
At narrow widths the sidebar becomes an accessible drawer. Preserve current
event and route when changing viewport, and confirm before changing chapter
with unsaved work.

Console: duty selector, event/stage identity, persistent sync status, current
task, incident/help action and explicit exit. Judge navigation remains focused on
assigned work. The console must not inherit public marketing navigation or
competing registration CTAs.

HQ: Chapters, Rules, Access, Content, Integrations, Operations and Audit links
according to role. Global and chapter contexts have persistent visible labels.
Broadcast displays expose presentation only; controls live in the separate
authenticated console.

## Access lifecycle

Invite -> identity verification -> accepted assignment -> active -> expired or
revoked. Revocation closes protected listeners, invalidates local private views
and blocks mutations on the server. Unsent work is preserved safely for support
review rather than automatically submitted under a different account. Account
switching clears prior user's sensitive local context. Auth return paths are
restricted to allowed internal URLs; invite tokens do not expose full records
before authentication.
