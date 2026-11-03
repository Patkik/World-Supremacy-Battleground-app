# UI/UX polish plan — 3 November 2026

## Scope and evidence

Planning only; no application changes or new visual/browser verification. Based on the current route inventory, workspace-shell.tsx, portal home, marketing home, registration-flow.tsx, frontend instructions, architecture/development guidance, and recorded status/audit evidence. Recommendations below are proposed improvements, not a claim that every page has a verified defect. Existing local accessibility and role rehearsals are useful baselines, not complete usability certification.

Keep the exact white logo, dark surfaces, volt primary actions, distinctive display typography and quiet functional typography. Marketing can be expressive; private workspaces must be calm and task-focused; public arena screens must be readable at distance. Keep current reduced-motion, data-saving and muted decorative-video behavior. Do not add video controls or move motion preferences out of the footer.

## Highest-value changes supported by source review

1. Workspace navigation currently starts with Support, highlights only exact path matches, and uses static account/chapter wording. Put Overview first, group work by purpose, highlight parent sections on nested routes, and show verified account/chapter context. Preserve an accessible route to support. Never infer permissions from the selected chapter.
2. `/app` renders ConnectedCrews directly. Develop a role-aware overview above or alongside crew management: next required action, active entry, relevant deadline and recent updates. Dancers and guardians need their own requests; crew managers need entry progress. Staff should continue to receive assigned-event links through the existing authorized workspace flow.
3. The landing page places a six-step journey before its featured event and repeats event/workspace calls to action. Move event discovery earlier and shorten the explanatory journey. Preserve the already-clear hero actions and role routing rather than rebuilding them.
4. RegistrationFlow is explicitly a browser-local preview. Do not mistake its stepper for the connected registration journey or update its copy to imply live capabilities. Map connected-entry, connected-roster, checkout and music into a coherent entry workflow independently.
5. Recent status records already report skip-link, error-boundary, motion-loading and narrow-screen fixes. Preserve and rerun those checks instead of listing them as absent features.

## Landing page composition

Recommended order: hero → available event discovery → role paths → compact preparation guide → culture/editorial section → chapter directory → final action → footer.

- Hero: keep “Your crew. Your stage. Your world.”, one dominant Find an event button, and a quieter Open your workspace link. Keep text readable over a stable poster while video loads.
- Event discovery: show verified location/date and explicit registration state. Listing, registration open and entry accepted are separate facts. If no eligible event is available, explain and offer event information/help; never manufacture urgency or counts.
- Role paths: three concise rows for crew managers, dancers/guardians and event staff, plus a published-results route for spectators. Remove decorative numbering from non-sequential choices.
- Preparation guide: three summary stages with links to detailed help; retain full requirements on the relevant event/entry page. Avoid making users read all six current steps before finding events.
- Culture: one strong editorial image/story treatment with approved media and credits. Avoid another repeated card grid. Keep generated decorative artwork distinguishable from actual event evidence.
- Chapter section: preserve the official directory link until verified first-party chapter records can be published. Partnership applications remain native forms.
- Final action: make Find an event visually primary; workspace continuation secondary. Test whether the middle sections already provide sufficient repetition before adding more calls to action.

## Page-family recommendations

| Page family / route scope | Recommended polish | Completion evidence |
| --- | --- | --- |
| Identity: sign-in, sign-up, recovery, change-email, verify-email, auth/action | Preserve recent branded layout; prioritize the form on phones; explain pending verification, expired links and recovery without losing return destinations | Keyboard completion, invalid/expired states, password visibility and correct return route |
| Onboarding, workspaces, crew/staff invitations | Show account → chapter access → assigned workspace as distinct steps; explain pending approval and wrong-account invitations; retain verified selected chapter | Multi-role, multi-chapter and revoked-access journeys |
| `/app`, notifications | Next required action first; then current entry and recent actionable updates; read/unread and empty states; link notifications to permitted records | Users identify their next task without opening multiple sections |
| Crews: list, new, detail, roster, settings | Searchable roster rows; distinguish invited, accepted and review status; put dangerous actions away from routine edits; preserve context returning from a dancer | Long names, duplicate invitations, pending requests and narrow layouts |
| Register and entry detail/roster/review/changes | Persistent event/crew summary, step completion with reasons, one primary action per step; editable review summary; explain why submission is blocked | Resume/reload, validation errors, server rejection and saved-versus-submitted states |
| Verification, dependents, consents | Plain-language evidence checklist; who must act; upload progress; readable consent version; private data hidden from shared summaries | Guardian/dancer boundaries and recoverable upload/review failures |
| Music | Distinguish file selected, uploading, inspecting, accepted and correction needed; show event requirements and replacement consequences | Interrupted upload, rejected file, pending inspection and authorized replacement |
| Checkout, payment-return, payment list/detail | Clear amount/currency breakdown, payer obligation and receipt status; pending confirmation after return; explicit synthetic-provider labels | Duplicate return, delayed confirmation and failed/cancelled flow without false paid status |
| Passes, tickets, event-day | Event context, readable pass when issued, check-in state and last update; manual fallback where supported; unavailable services explain the next step | Small phone, stale state, denied access and issued/unavailable pass |
| Scorecards, advancement | Published results only; readable breakdowns and publication timestamps; explain missing results; advancement appears only when authorized | Unpublished/withdrawn/empty projections and long names |
| Profile, security, privacy, support | Group personal settings by purpose; explain save success and reauthentication; support conversation has clear status and next reply action | Failed saves, session expiry, permission boundaries and message recovery |
| Public events and event detail/rules/schedule/tickets/live/results | Shared event masthead and local navigation; dates with timezone; registration status near primary action; sourced rules and meaningful empty states | All event subpages preserve context and avoid unsupported purchase/registration claims |
| Public results, rankings, crew profiles | Search/filter only where supported; show season/event context; accessible tables and publication state; no fictional rankings as live data | Public projection and empty-result checks |
| About, chapters, chapter detail, partners, studios, applications | Editorial layouts with concise purpose and relevant action; provenance for affiliations; native application progress/receipt | No unsupported affiliation, external form substitution or ambiguous application success |
| Stories/detail, media | Image-led hierarchy, readable text width, captions/credits, stable media dimensions and accessible alternatives | Missing asset, long title and slow connection |
| Help/detail, contact, policies | Task-oriented help, related links, clear contact receipt, readable policies with version/status; show approved content only | Search/navigation usefulness and successful recovery from contact errors |
| Console entry, judge queue/scorecard/review, sync | Assigned work first; visible crew/event/division; large controls; persistent draft/queued/sending/acknowledged/conflict distinction | Tablet portrait/landscape, keyboard, offline reload, reconnect and server receipt |
| Head judge/division, penalties, battles/voting | Review queue with provenance and revision/lock state; clear confirmation for consequential changes; no unsupported adjudication rules | Denial, stale revision, duplicate operation and conflict recovery |
| Marshal/check-in, audio, incidents, broadcast | Immediate next crew/task, large operational action, explicit receipt; retain useful last-confirmed state with stale label | Poor connection, repeat action, denied assignment and long lineup |
| Chapter admin overview, events/new/detail/settings | Event context persists across pages; readiness exceptions before metrics; drafts visibly distinct from published configuration | Role isolation and draft/published distinction |
| Registrations/detail, verification, music, support | Filterable review queue, clear ownership and outstanding reason; evidence beside decision; preserve filter on return | Large queue, pagination, denied case and correction loop |
| Divisions/policies, fees, waivers, lineup, battles, advancement | Separate configuration from approval/publication; version labels and impact review; disabled actions explain prerequisites | Policy remains unconfirmed until sourced and authorized |
| Finance/transactions/refunds, results, communications, reports | Dense but readable tables; filters and totals with scope; clear publication/refund confirmation; honest delivery/export availability | Amount accuracy, authorization, duplicate action and unpublished results |
| Chapter staff, audit, content | Access scope before edits, readable change history and content preview; no hidden chapter switching | Revocation, audit pagination and draft publishing boundaries |
| HQ overview, chapters, applications, access, operations, rules, content, integrations | Cross-chapter scope explicit; exceptions first; sample counts labelled; configuration, monitoring and governance separated | Global/chapter permission checks and unavailable integration states |
| Arena live, results, bracket, holding | Large tabular numbers, long-name strategy, holding and stale-connection states; published data only | Actual display resolution, viewing distance and publication withdrawal |
| Offline, denied, not-found, error, maintenance | Explain what happened, what remains saved and one useful recovery route; preserve drafts across retry | Offline reload, expired session, render failure and safe retry |
| Preview/demo routes | Persistent preview identification and return to real information; isolate synthetic content from public/authorized data | No simulated success presented as real registration/payment/results |

## Shared polish system

Use existing semantic tokens and fonts. Define consistent page title, description, context, primary action and status placement. Use spacing in a small repeatable scale (4/8/12/16/24/32/48px); keep form content comfortably narrow and operational tables wider. Use tabular numerals for money, scores and times. Reserve volt for the main action and meaningful active state; pair status colors with words/icons.

Desktop: contextual sidebar and restrained page header. Phone: compact context header and a small set of role-relevant navigation destinations, with the remainder in an accessible menu. Do not expose every route as a top-level destination. Keep sticky actions clear of the keyboard, safe areas and focused fields.

For all data-dependent pages specify loading, empty, partial, error, denied, stale/offline and success states. Disable repeat submissions while pending, retain input on recoverable failures and show receipts only after authoritative acknowledgement. Use field-level errors plus a linked error summary; this follows [W3C form notification guidance](https://www.w3.org/WAI/tutorials/forms/notifications/).

Private pages use minimal interaction feedback, not marketing animation. Judge primary controls target 56px and auxiliary controls at least 48px. Allow reflow/scroll when zoom or portrait orientation requires it; never clip controls to satisfy a viewport-lock recipe.

## Delivery order and acceptance gates

| Phase | Work | Gate before proceeding |
| --- | --- | --- |
| 1: Baseline and shared shell | Capture representative screens; map routes to families; correct context/navigation; agree reusable page/form/status patterns | Desktop/phone navigation, nested active state, visible focus and authorized context |
| 2: User journey | Overview → crew → entry → roster/evidence/music → checkout → review; dancer/guardian invitations | Complete synthetic journeys including return/resume and failure states |
| 3: Public conversion | Landing hierarchy, event detail, public results and help | Find-event and workspace tasks succeed; existing media/performance checks do not regress |
| 4: Event operations | Judge, sync, marshal, head judge, audio and public display | Signed demo-wsb offline/conflict/reconnect checks and venue-device review |
| 5: Administration and long tail | Chapter admin/HQ, editorial, settings and all utility routes | Every route family has reviewed normal and non-happy-path states |
| 6: Final verification | Cross-surface consistency, accessibility and performance | Recorded evidence and explicit unresolved issues; no automatic production-readiness claim |

For each phase check 320/390px phones, tablet portrait/landscape and desktop; real browser zoom and keyboard; reduced motion and data saving; long names and translated-label expansion. Check text contrast, screen-reader labels and status announcements. Reuse existing role, public accessibility, stage and outbox tests; add only behavior-focused regressions for changed flows. Existing local lab performance numbers are baselines, not real-user guarantees.

Track user-task success and time to find the next action using synthetic rehearsals before/after. Record actual results rather than promising arbitrary percentage gains. Every route should eventually map to a screenshot, state checklist and journey result; a route inventory alone is not verification.

## Boundaries and next action

Design can clarify blocked capabilities but cannot make unsourced eligibility, payment settlement, published results or advancement rules available. Keep authority in Rust and public results in published projections. Work only with synthetic records in demo-wsb.

Start implementation with workspace-shell navigation/context and a role-aware `/app` overview, then one complete manager registration journey. This delivers a reusable pattern before spreading visual edits across the entire route inventory. Planning is complete; implementation and rendered-page review remain pending.
