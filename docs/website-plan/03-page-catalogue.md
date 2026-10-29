# Complete page and screen catalogue

116 identified route templates and system screen families. All are planned,
not claims of existing functionality. Shared dialogs, loading states and invitation
variants are specified in the workflow and responsive documents rather than counted
as additional pages. Event IDs in console routes must resolve to one authoritative
chapter; globally unique IDs never remove server-side chapter checks.

Every page must cover loading, empty, ready, action-pending, validation error,
server failure, expired authentication, unauthorized access, stale data and offline
behavior where applicable. Public HTML remains usable before decorative JavaScript.
Forms retain non-sensitive input on recoverable failures. Success requires a server
receipt for authoritative commands. Required fields have labels, help and inline
errors; error summaries link to the relevant field. No page relies on color alone.

For every record, acceptance requires: its stated action works for the listed
roles; its critical case produces the stated safe outcome; unauthorized actors
cannot read or mutate its underlying data; all required content is available in
portrait and landscape; keyboard and screen-reader paths are usable. Group-level
contracts below supply additional data, responsive and verification requirements.

## Index

| ID | Route | Page | Phase |
|---|---|---|---|
| PAGE-001 | `/` | Home | P1 |
| PAGE-002 | `/events` | Event directory | P1 |
| PAGE-003 | `/events/[eventSlug]` | Event overview | P1 |
| PAGE-004 | `/events/[eventSlug]/schedule` | Public schedule | P3 |
| PAGE-005 | `/events/[eventSlug]/rules` | Event rules | P1 |
| PAGE-006 | `/events/[eventSlug]/tickets` | Spectator tickets | P2 |
| PAGE-007 | `/events/[eventSlug]/live` | Spectator live hub | P3 |
| PAGE-008 | `/results` | Results directory | P3 |
| PAGE-009 | `/events/[eventSlug]/results` | Event results | P3 |
| PAGE-010 | `/events/[eventSlug]/results/[entryId]` | Public scorecard | P3 |
| PAGE-011 | `/rankings` | Season rankings | P4 |
| PAGE-012 | `/crews/[crewSlug]` | Public crew profile | P4 |
| PAGE-013 | `/chapters` | Chapter directory | P1 |
| PAGE-014 | `/chapters/[chapterSlug]` | Chapter home | P1 |
| PAGE-015 | `/about` | About WSB | P4 |
| PAGE-016 | `/stories` | Stories and news | P4 |
| PAGE-017 | `/stories/[slug]` | Story detail | P4 |
| PAGE-018 | `/community/studios` | Studios and partners | P4 |
| PAGE-019 | `/community/apply` | Chapter or studio application | P4 |
| PAGE-020 | `/partners` | Sponsors and partnership | P4 |
| PAGE-021 | `/media` | Media hub | P4 |
| PAGE-022 | `/help` | Help center | P1 |
| PAGE-023 | `/help/[slug]` | Help article | P1 |
| PAGE-024 | `/contact` | Contact and support | P1 |
| PAGE-025 | `/policies/[policySlug]` | Policy documents | P1 |
| PAGE-026 | `/sign-in` | Sign in | P1 |
| PAGE-027 | `/sign-up` | Create account | P1 |
| PAGE-028 | `/verify-email` | Email verification | P1 |
| PAGE-029 | `/forgot-password` | Password recovery | P1 |
| PAGE-030 | `/auth/action` | Authentication action | P1 |
| PAGE-031 | `/onboarding` | Profile onboarding | P1 |
| PAGE-032 | `/invite/[token]` | Invitation acceptance | P1 |
| PAGE-033 | `/workspaces` | Workspace chooser | P1 |
| PAGE-034 | `/app` | Personal dashboard | P1 |
| PAGE-035 | `/app/profile` | Profile | P1 |
| PAGE-036 | `/app/security` | Security and sessions | P1 |
| PAGE-037 | `/app/notifications` | Notification center | P2 |
| PAGE-038 | `/app/crews` | My crews | P1 |
| PAGE-039 | `/app/crews/new` | Create crew | P1 |
| PAGE-040 | `/app/crews/[crewId]` | Crew workspace | P1 |
| PAGE-041 | `/app/crews/[crewId]/roster` | Roster and invitations | P1 |
| PAGE-042 | `/app/crews/[crewId]/settings` | Crew settings | P1 |
| PAGE-043 | `/app/register/[eventId]` | Registration: event and division | P1 |
| PAGE-044 | `/app/entries/[entryId]/roster` | Registration: roster | P1 |
| PAGE-045 | `/app/entries/[entryId]/music` | Registration: music | P2 |
| PAGE-046 | `/app/entries/[entryId]/checkout` | Registration: checkout | P2 |
| PAGE-047 | `/app/entries/[entryId]/review` | Registration: review | P1 |
| PAGE-048 | `/app/entries/[entryId]` | Entry status | P1 |
| PAGE-049 | `/app/entries/[entryId]/changes` | Change or withdraw entry | P2 |
| PAGE-050 | `/app/verification` | Dancer verification | P2 |
| PAGE-051 | `/app/consents` | Consent and waivers | P2 |
| PAGE-052 | `/app/dependents` | Guardian dependents | P2 |
| PAGE-053 | `/app/payments` | My payments | P2 |
| PAGE-054 | `/app/payments/[paymentId]` | Payment and receipt | P2 |
| PAGE-055 | `/app/payment-return` | Payment return | P2 |
| PAGE-056 | `/app/passes` | My passes | P3 |
| PAGE-057 | `/app/event-day/[eventId]` | My event day | P3 |
| PAGE-058 | `/app/scorecards` | My scorecards | P3 |
| PAGE-059 | `/app/advancement` | Qualification invitations | P3 |
| PAGE-060 | `/app/tickets` | Purchased tickets | P4 |
| PAGE-061 | `/app/support` | My support requests | P1 |
| PAGE-062 | `/app/privacy` | Privacy and data requests | P4 |
| PAGE-063 | `/admin/[chapterId]` | Chapter dashboard | P1 |
| PAGE-064 | `/admin/[chapterId]/events` | Event management | P1 |
| PAGE-065 | `/admin/[chapterId]/events/new` | Create event | P1 |
| PAGE-066 | `/admin/[chapterId]/events/[eventId]` | Event command center | P1 |
| PAGE-067 | `/admin/[chapterId]/events/[eventId]/settings` | Event configuration | P1 |
| PAGE-068 | `/admin/[chapterId]/events/[eventId]/divisions` | Divisions and rules | P1 |
| PAGE-069 | `/admin/[chapterId]/events/[eventId]/fees` | Fees and add-ons | P2 |
| PAGE-070 | `/admin/[chapterId]/events/[eventId]/registrations` | Registration review queue | P1 |
| PAGE-071 | `/admin/[chapterId]/events/[eventId]/registrations/[entryId]` | Registration review | P1 |
| PAGE-072 | `/admin/[chapterId]/verification` | Identity review queue | P2 |
| PAGE-073 | `/admin/[chapterId]/finance` | Finance overview | P2 |
| PAGE-074 | `/admin/[chapterId]/finance/transactions` | Transactions and reconciliation | P2 |
| PAGE-075 | `/admin/[chapterId]/finance/refunds` | Refunds and disputes | P2 |
| PAGE-076 | `/admin/[chapterId]/staff` | Staff and assignments | P1 |
| PAGE-077 | `/admin/[chapterId]/events/[eventId]/communications` | Event communications | P2 |
| PAGE-078 | `/admin/[chapterId]/events/[eventId]/lineup` | Performance order | P3 |
| PAGE-079 | `/admin/[chapterId]/events/[eventId]/music` | Music readiness | P3 |
| PAGE-080 | `/admin/[chapterId]/events/[eventId]/results` | Result publication | P3 |
| PAGE-081 | `/admin/[chapterId]/events/[eventId]/advancement` | Advancement management | P3 |
| PAGE-082 | `/admin/[chapterId]/events/[eventId]/reports` | Event reports | P3 |
| PAGE-083 | `/admin/[chapterId]/content` | Chapter content | P4 |
| PAGE-084 | `/admin/[chapterId]/support` | Support work queue | P4 |
| PAGE-085 | `/admin/[chapterId]/audit` | Audit explorer | P3 |
| PAGE-086 | `/hq` | Global HQ overview | P4 |
| PAGE-087 | `/hq/chapters` | Chapter administration | P4 |
| PAGE-088 | `/hq/rules` | Global rule library | P4 |
| PAGE-089 | `/hq/access` | Global access governance | P4 |
| PAGE-090 | `/hq/content` | Global publishing | P4 |
| PAGE-091 | `/hq/integrations` | Integrations and configuration | P4 |
| PAGE-092 | `/hq/operations` | Platform operations | P4 |
| PAGE-093 | `/console` | Duty selection | P3 |
| PAGE-094 | `/console/[eventId]/judge` | Judge desk | P3 |
| PAGE-095 | `/console/[eventId]/judge/[entryId]` | Score entry | P3 |
| PAGE-096 | `/console/[eventId]/judge/review` | Judge submission review | P3 |
| PAGE-097 | `/console/[eventId]/head-judge` | Head judge overview | P3 |
| PAGE-098 | `/console/[eventId]/head-judge/[divisionId]` | Division finalization | P3 |
| PAGE-099 | `/console/[eventId]/penalties` | Technical deductions | P3 |
| PAGE-100 | `/console/[eventId]/battles` | Battle control | P3 |
| PAGE-101 | `/console/[eventId]/battles/[matchId]/vote` | Battle voting | P3 |
| PAGE-102 | `/console/[eventId]/check-in` | Check-in scanner | P3 |
| PAGE-103 | `/console/[eventId]/marshal` | Backstage queue | P3 |
| PAGE-104 | `/console/[eventId]/audio` | DJ desk | P3 |
| PAGE-105 | `/console/[eventId]/broadcast` | Broadcast control | P3 |
| PAGE-106 | `/console/[eventId]/sync` | Device and sync center | P3 |
| PAGE-107 | `/console/[eventId]/incidents` | Event incident log | P3 |
| PAGE-108 | `/arena-live/[eventId]` | Arena live display | P3 |
| PAGE-109 | `/arena-live/[eventId]/results` | Arena result reveal | P3 |
| PAGE-110 | `/arena-live/[eventId]/bracket` | Arena bracket | P3 |
| PAGE-111 | `/arena-live/[eventId]/holding` | Arena holding scene | P3 |
| PAGE-112 | `/access-denied` | Access denied | P1 |
| PAGE-113 | `/offline` | Offline and reconnect | P3 |
| PAGE-114 | `/maintenance` | Planned maintenance | P1 |
| PAGE-115 | `/not-found` | Not found template | P1 |
| PAGE-116 | `/error` | Unexpected-error template | P1 |

## Public screens — Spectacle

**Responsive contract:** Single-column mobile; editorial wide-screen composition; compact hero in short landscape; preserve filters and navigation on rotation.

**Data and authority:** Published content and projections only; draft/preview authorization separate.

### PAGE-001 — Home

- **Route / phase:** `/` · P1.
- **Users:** Visitor.
- **Content in reading order:** Hero; featured event; chapter discovery; crew stories; published results; community; FAQ.
- **Primary action and completion:** Find an event or register a crew; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No active events replaces live promotion with a truthful discovery message.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-002 — Event directory

- **Route / phase:** `/events` · P1.
- **Users:** Visitor.
- **Content in reading order:** Country, date, format and status filters; event date, venue, fee summary and registration state.
- **Primary action and completion:** Filter and open event; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No matches preserves filters and offers reset; cancelled events remain clearly labeled.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-003 — Event overview

- **Route / phase:** `/events/[eventSlug]` · P1.
- **Users:** Visitor.
- **Content in reading order:** Event title, chapter, venue, local timezone, divisions, fees, deadline, accessibility, contact and official rule version.
- **Primary action and completion:** Start registration or view published results; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Registration closed offers approved next steps without bypassing deadline.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-004 — Public schedule

- **Route / phase:** `/events/[eventSlug]/schedule` · P3.
- **Users:** Visitor.
- **Content in reading order:** Day/stage/division selector; running order; estimated versus confirmed times; last update.
- **Primary action and completion:** Follow an event segment; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Delayed schedule displays updated time and reason without implying precise ETA.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-005 — Event rules

- **Route / phase:** `/events/[eventSlug]/rules` · P1.
- **Users:** Visitor.
- **Content in reading order:** Version, effective date, division eligibility, music, scoring, appeals and downloadable official source.
- **Primary action and completion:** Read a division policy; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Missing approved rule version prevents claims that eligibility is confirmed.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-006 — Spectator tickets

- **Route / phase:** `/events/[eventSlug]/tickets` · P2.
- **Users:** Visitor.
- **Content in reading order:** Ticket types, inventory, seating/accessibility, total price, refund policy and sales provider.
- **Primary action and completion:** Select ticket and checkout; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Sold-out or cancelled event cannot accept a new purchase.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-007 — Spectator live hub

- **Route / phase:** `/events/[eventSlug]/live` · P3.
- **Users:** Visitor.
- **Content in reading order:** Published now/on-deck; stream link with rights; schedule; results tabs; feed freshness.
- **Primary action and completion:** Follow published competition; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Disconnected feed keeps last known state with timestamp.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-008 — Results directory

- **Route / phase:** `/results` · P3.
- **Users:** Visitor.
- **Content in reading order:** Season, chapter, event and division filters; publication dates.
- **Primary action and completion:** Open event results; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** An unpublished event must not appear through search or direct links.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-009 — Event results

- **Route / phase:** `/events/[eventSlug]/results` · P3.
- **Users:** Visitor.
- **Content in reading order:** Division selector; placement; crew; chapter; official total; tie explanation; revision.
- **Primary action and completion:** Inspect published scorecard; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Corrected results retain a visible revision notice.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-010 — Public scorecard

- **Route / phase:** `/events/[eventSlug]/results/[entryId]` · P3.
- **Users:** Visitor.
- **Content in reading order:** Approved score breakdown; deductions summary; placement; rule version; publication time.
- **Primary action and completion:** Share official result; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Private critique, judge identity or raw detail remains hidden unless publication policy permits.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-011 — Season rankings

- **Route / phase:** `/rankings` · P4.
- **Users:** Visitor.
- **Content in reading order:** Season, division and territory; points; included events; methodology and update date.
- **Primary action and completion:** Inspect ranking history; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No approved ranking formula means this module is unavailable.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-012 — Public crew profile

- **Route / phase:** `/crews/[crewSlug]` · P4.
- **Users:** Visitor.
- **Content in reading order:** Consented crew biography; chapter; media; published event history and awards.
- **Primary action and completion:** View performances and results; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No minors' private identities or unconsented roster biographies appear.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-013 — Chapter directory

- **Route / phase:** `/chapters` · P1.
- **Users:** Visitor.
- **Content in reading order:** Country names, region coverage, local contact and next events.
- **Primary action and completion:** Select chapter; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Unsupported country offers inquiry rather than fabricated local operations.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-014 — Chapter home

- **Route / phase:** `/chapters/[chapterSlug]` · P1.
- **Users:** Visitor.
- **Content in reading order:** Chapter identity; verified local events; contacts; local policy links and news.
- **Primary action and completion:** Find a local event; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Archived chapter is identified and routes users to current contact.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-015 — About WSB

- **Route / phase:** `/about` · P4.
- **Users:** Visitor.
- **Content in reading order:** Verified history, purpose, operating model and leadership-approved statements.
- **Primary action and completion:** Explore events or contact team; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Unverified statistics are omitted.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-016 — Stories and news

- **Route / phase:** `/stories` · P4.
- **Users:** Visitor.
- **Content in reading order:** Editorial feature; category/chapter filters; publication dates and captions.
- **Primary action and completion:** Open story; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Empty category offers other published stories.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-017 — Story detail

- **Route / phase:** `/stories/[slug]` · P4.
- **Users:** Visitor.
- **Content in reading order:** Title, author, date, licensed media, accessible captions, related event and credits.
- **Primary action and completion:** Read related event or story; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Removed media has a meaningful text fallback.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-018 — Studios and partners

- **Route / phase:** `/community/studios` · P4.
- **Users:** Visitor.
- **Content in reading order:** Approved directory with city, discipline, official links and inclusion criteria.
- **Primary action and completion:** Find studio or apply; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired partnership is removed from active listings.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-019 — Chapter or studio application

- **Route / phase:** `/community/apply` · P4.
- **Users:** Applicant.
- **Content in reading order:** Organization, contact, territory, experience, proposed collaboration and consent.
- **Primary action and completion:** Submit inquiry; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Duplicate or interrupted submission returns a trackable receipt.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-020 — Sponsors and partnership

- **Route / phase:** `/partners` · P4.
- **Users:** Visitor.
- **Content in reading order:** Verified partner placements; opportunity categories; inquiry route.
- **Primary action and completion:** Request partnership information; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No fake sponsor logos or unapproved commercial promises.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-021 — Media hub

- **Route / phase:** `/media` · P4.
- **Users:** Visitor.
- **Content in reading order:** Approved press kit, brand-use guide, media contact and downloadable licensed assets.
- **Primary action and completion:** Download permitted assets; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired rights revoke downloads and explain contact path.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-022 — Help center

- **Route / phase:** `/help` · P1.
- **Users:** Visitor.
- **Content in reading order:** Topic search; registration, payment, event-day and account categories.
- **Primary action and completion:** Find answer or contact support; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Search failure retains direct topic navigation.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-023 — Help article

- **Route / phase:** `/help/[slug]` · P1.
- **Users:** Visitor.
- **Content in reading order:** Task steps, screenshots with alt text, related policies, update date.
- **Primary action and completion:** Complete task or request support; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Outdated article is visibly superseded.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-024 — Contact and support

- **Route / phase:** `/contact` · P1.
- **Users:** Visitor.
- **Content in reading order:** Topic, chapter/event, reply email, message, safe attachment guidance and response expectations.
- **Primary action and completion:** Send inquiry; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Failure preserves draft and never falsely confirms receipt.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

### PAGE-025 — Policy documents

- **Route / phase:** `/policies/[policySlug]` · P1.
- **Users:** Visitor.
- **Content in reading order:** Privacy, terms, accessibility, safeguarding, cookies or refund policy; owner; jurisdiction; effective date.
- **Primary action and completion:** Read or manage applicable preferences; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Missing required event policy blocks dependent checkout or consent flow.
- **Layout and authority:** inherits the public contract above and the responsive matrix.

## Identity screens — Tactical

**Responsive contract:** Single-column form at all narrow widths; keyboard-aware scrolling; no essential image column; preserve safe redirect and form state.

**Data and authority:** Firebase identity plus Rust authorization; no user-selected privileged roles.

### PAGE-026 — Sign in

- **Route / phase:** `/sign-in` · P1.
- **Users:** Account holder.
- **Content in reading order:** Email/password; approved provider buttons; recovery; invitation context.
- **Primary action and completion:** Authenticate and return to allowed destination; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Generic invalid-login response avoids account enumeration.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-027 — Create account

- **Route / phase:** `/sign-up` · P1.
- **Users:** Applicant.
- **Content in reading order:** Email, password, display name, locale, required terms and age-appropriate routing.
- **Primary action and completion:** Create account and verify email; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Invitation and registration intent survive verification.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-028 — Email verification

- **Route / phase:** `/verify-email` · P1.
- **Users:** Account holder.
- **Content in reading order:** Current verification state; resend cooldown; change-email route.
- **Primary action and completion:** Verify or resend email; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired link offers a new link without losing the account.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-029 — Password recovery

- **Route / phase:** `/forgot-password` · P1.
- **Users:** Account holder.
- **Content in reading order:** Email input; neutral delivery confirmation.
- **Primary action and completion:** Request reset; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Same outward response for known and unknown addresses.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-030 — Authentication action

- **Route / phase:** `/auth/action` · P1.
- **Users:** Account holder.
- **Content in reading order:** Reset-password, verify-email or recover-email action validated by Firebase.
- **Primary action and completion:** Complete authenticated action; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired, used or malformed code gets safe recovery action.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-031 — Profile onboarding

- **Route / phase:** `/onboarding` · P1.
- **Users:** Account holder.
- **Content in reading order:** Preferred name, locale, country, chapter intent and role explanation.
- **Primary action and completion:** Complete profile; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** User cannot self-select privileged staff permissions.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-032 — Invitation acceptance

- **Route / phase:** `/invite/[token]` · P1.
- **Users:** Invited dancer, guardian or staff.
- **Content in reading order:** Inviter, event/crew or assignment scope, expiry and privacy explanation.
- **Primary action and completion:** Accept scoped invitation after identity check; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Revoked, expired, wrong-account and already-used links have separate recovery paths.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

### PAGE-033 — Workspace chooser

- **Route / phase:** `/workspaces` · P1.
- **Users:** Authenticated user.
- **Content in reading order:** Authorized chapters, crews and event assignments; last-used context.
- **Primary action and completion:** Enter permitted workspace; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No assignment shows request-access guidance without exposing other memberships.
- **Layout and authority:** inherits the identity contract above and the responsive matrix.

## Portal screens — Tactical

**Responsive contract:** Phone task flow and compact record lists; tablet optional detail pane; desktop sidebar; sticky actions must clear keyboard and safe area.

**Data and authority:** Own identity, authorized dependent or crew scope; private evidence never enters public projections.

### PAGE-034 — Personal dashboard

- **Route / phase:** `/app` · P1.
- **Users:** Dancer, manager, guardian.
- **Content in reading order:** Upcoming events, required actions, readiness, outstanding balances and notices.
- **Primary action and completion:** Continue highest-priority task; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No crew or event shows role-specific onboarding.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-035 — Profile

- **Route / phase:** `/app/profile` · P1.
- **Users:** Account holder.
- **Content in reading order:** Personal name, preferred name, locale, country representation request and contact preferences.
- **Primary action and completion:** Save own permitted fields; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Eligibility-sensitive edits trigger review rather than silently rewriting registration history.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-036 — Security and sessions

- **Route / phase:** `/app/security` · P1.
- **Users:** Account holder.
- **Content in reading order:** Provider linking, password change, session information and reauthentication.
- **Primary action and completion:** Update security settings or sign out; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Recent-login requirement preserves the intended action.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-037 — Notification center

- **Route / phase:** `/app/notifications` · P2.
- **Users:** Account holder.
- **Content in reading order:** Event-scoped messages, read state, action links and delivery preferences.
- **Primary action and completion:** Open required action; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Withdrawn event notice remains distinguishable from a current instruction.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-038 — My crews

- **Route / phase:** `/app/crews` · P1.
- **Users:** Manager, dancer.
- **Content in reading order:** Crew names, chapter, role, event entries and next required action.
- **Primary action and completion:** Create or open crew; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Membership removal immediately removes private crew access.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-039 — Create crew

- **Route / phase:** `/app/crews/new` · P1.
- **Users:** Manager.
- **Content in reading order:** Crew name, home chapter, public display options and manager confirmation.
- **Primary action and completion:** Create draft crew; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Similar name warning does not invent global name exclusivity.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-040 — Crew workspace

- **Route / phase:** `/app/crews/[crewId]` · P1.
- **Users:** Manager, member.
- **Content in reading order:** Crew summary; readiness; event entries; limited roster and announcements.
- **Primary action and completion:** Manage crew or open entry; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Members see only their permitted fields and tasks.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-041 — Roster and invitations

- **Route / phase:** `/app/crews/[crewId]/roster` · P1.
- **Users:** Manager.
- **Content in reading order:** Names permitted by policy; invite status; eligibility/consent/payment summaries; role labels.
- **Primary action and completion:** Invite, remove or resend invitation; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Roster lock and removal of a paid member route through defined change policy.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-042 — Crew settings

- **Route / phase:** `/app/crews/[crewId]/settings` · P1.
- **Users:** Manager.
- **Content in reading order:** Name, media consent, manager transfer, contact and archive controls.
- **Primary action and completion:** Update crew or transfer ownership; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Last-manager removal and unaccepted ownership transfer cannot orphan a crew.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-043 — Registration: event and division

- **Route / phase:** `/app/register/[eventId]` · P1.
- **Users:** Manager.
- **Content in reading order:** Event context, approved division rules, eligibility inputs, fee preview and deadline.
- **Primary action and completion:** Choose division and start entry; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Unsupported or closed division cannot proceed.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-044 — Registration: roster

- **Route / phase:** `/app/entries/[entryId]/roster` · P1.
- **Users:** Manager.
- **Content in reading order:** Selected dancers, cross-entry conflicts, roster limits, missing requirements and qualifier comparison.
- **Primary action and completion:** Save roster and continue; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Roster requirements explain the exact sourced rule and affected members.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-045 — Registration: music

- **Route / phase:** `/app/entries/[entryId]/music` · P2.
- **Users:** Manager.
- **Content in reading order:** File picker, upload progress, waveform preview, duration, format, deadline and review status.
- **Primary action and completion:** Upload or replace performance track; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Interrupted upload resumes; rejected track gives actionable reason; lock prevents replacement.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-046 — Registration: checkout

- **Route / phase:** `/app/entries/[entryId]/checkout` · P2.
- **Users:** Manager, payer.
- **Content in reading order:** Itemized fees, currency, discounts, sizes/add-ons if enabled, split allocations and policy consent.
- **Primary action and completion:** Pay full balance or assign shares; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired price quote triggers review; return from provider remains pending until verified.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-047 — Registration: review

- **Route / phase:** `/app/entries/[entryId]/review` · P1.
- **Users:** Manager.
- **Content in reading order:** Read-only division, roster, consent, music and payment readiness; terms version.
- **Primary action and completion:** Submit registration for review; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Server revalidates deadline and prerequisites before accepting.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-048 — Entry status

- **Route / phase:** `/app/entries/[entryId]` · P1.
- **Users:** Manager, member.
- **Content in reading order:** Registration receipt, readiness checklist, blockers, timeline and allowed corrections.
- **Primary action and completion:** Resolve blocker or view next event action; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Submitted, approved, rejected, withdrawn and cancelled remain distinct.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-049 — Change or withdraw entry

- **Route / phase:** `/app/entries/[entryId]/changes` · P2.
- **Users:** Manager.
- **Content in reading order:** Change type, affected dancers, refund implications, deadline and reason.
- **Primary action and completion:** Request roster change or withdrawal; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Paid/locked entries require authorized review and retain history.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-050 — Dancer verification

- **Route / phase:** `/app/verification` · P2.
- **Users:** Dancer, guardian.
- **Content in reading order:** Required identity fields, restricted upload, review result, correction and deletion policy.
- **Primary action and completion:** Submit own verification evidence; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** OCR uncertainty triggers human review rather than rejection solely by machine.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-051 — Consent and waivers

- **Route / phase:** `/app/consents` · P2.
- **Users:** Dancer, guardian.
- **Content in reading order:** Applicable event, signer capacity, document version, language and signed receipt.
- **Primary action and completion:** Read and sign applicable document; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Changed waiver requires a new version; manager cannot impersonate guardian.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-052 — Guardian dependents

- **Route / phase:** `/app/dependents` · P2.
- **Users:** Guardian.
- **Content in reading order:** Verified dependent relationships; event readiness; pending consent and payment tasks.
- **Primary action and completion:** Manage authorized dependent task; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Relationship revocation removes access; no access to unrelated minors.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-053 — My payments

- **Route / phase:** `/app/payments` · P2.
- **Users:** Payer, manager.
- **Content in reading order:** Balance by event; allocations; payment/refund status; receipts and due dates.
- **Primary action and completion:** Pay assigned balance or inspect transaction; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Manager cannot expose another payer's private payment details.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-054 — Payment and receipt

- **Route / phase:** `/app/payments/[paymentId]` · P2.
- **Users:** Payer.
- **Content in reading order:** Reference, amount/currency, verified status, allocation, refund history and receipt.
- **Primary action and completion:** Download receipt or request help; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Pending, failed, partial refund and chargeback are explicit states.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-055 — Payment return

- **Route / phase:** `/app/payment-return` · P2.
- **Users:** Payer.
- **Content in reading order:** Provider reference and server verification state.
- **Primary action and completion:** Return to entry after verified outcome; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Repeated return or refresh cannot duplicate a charge or registration.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-056 — My passes

- **Route / phase:** `/app/passes` · P3.
- **Users:** Dancer, attendee.
- **Content in reading order:** Event entitlement, pass validity, access zone, QR and offline status.
- **Primary action and completion:** Present pass; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Revoked, expired and offline-unverifiable passes do not show an unconditional valid badge.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-057 — My event day

- **Route / phase:** `/app/event-day/[eventId]` · P3.
- **Users:** Dancer, manager.
- **Content in reading order:** Check-in, call time, on-deck state, directions, official announcements and freshness.
- **Primary action and completion:** Acknowledge call or open pass; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Stale cached calls clearly show last update.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-058 — My scorecards

- **Route / phase:** `/app/scorecards` · P3.
- **Users:** Manager, dancer.
- **Content in reading order:** Published results, eligible private feedback, certificates and event filters.
- **Primary action and completion:** Review scorecard or download certificate; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Unpublished/retracted results are not available from cached private routes.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-059 — Qualification invitations

- **Route / phase:** `/app/advancement` · P3.
- **Users:** Manager.
- **Content in reading order:** Source event, destination event, qualification basis, validity and roster requirements.
- **Primary action and completion:** Accept invitation and start next entry; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Wildcard and normal qualification have auditable distinct sources.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-060 — Purchased tickets

- **Route / phase:** `/app/tickets` · P4.
- **Users:** Attendee.
- **Content in reading order:** Order, event, seats if used, QR entitlements and transfer/refund rules.
- **Primary action and completion:** View ticket or allowed transfer; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Transfer invalidates previous entitlement according to approved policy.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-061 — My support requests

- **Route / phase:** `/app/support` · P1.
- **Users:** Account holder.
- **Content in reading order:** Ticket topic, status, scoped messages and attachment handling.
- **Primary action and completion:** Create or reply to request; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Sensitive identity documents are redirected to the secure review flow.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

### PAGE-062 — Privacy and data requests

- **Route / phase:** `/app/privacy` · P4.
- **Users:** Account holder.
- **Content in reading order:** Export/deletion options, identity recheck, retention exceptions and request status.
- **Primary action and completion:** Submit tracked data request; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Deletion does not erase required audit/financial history without approved policy.
- **Layout and authority:** inherits the portal contract above and the responsive matrix.

## Admin screens — Tactical

**Responsive contract:** Desktop data workspace; tablet master/detail; phone record list with full detail and actions; controlled table overflow where necessary.

**Data and authority:** Server checks chapter, event, action and current assignment; mutation audit and optimistic concurrency.

### PAGE-063 — Chapter dashboard

- **Route / phase:** `/admin/[chapterId]` · P1.
- **Users:** Director, delegated staff.
- **Content in reading order:** Upcoming events, registration blockers, finance summaries by permission and operational alerts.
- **Primary action and completion:** Open actionable work queue; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Counts and links must use the same chapter-scoped query rules.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-064 — Event management

- **Route / phase:** `/admin/[chapterId]/events` · P1.
- **Users:** Director, event manager.
- **Content in reading order:** Draft, open, running, completed and cancelled events.
- **Primary action and completion:** Create or edit authorized event; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Archived event history remains read-only.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-065 — Create event

- **Route / phase:** `/admin/[chapterId]/events/new` · P1.
- **Users:** Director.
- **Content in reading order:** Name, timezone, venue, dates, stage structure, registration window and owner.
- **Primary action and completion:** Save draft event; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Invalid windows and missing timezone prevent publication.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-066 — Event command center

- **Route / phase:** `/admin/[chapterId]/events/[eventId]` · P1.
- **Users:** Event manager.
- **Content in reading order:** Readiness summary, staff, entries, division state, schedule and go-live checklist.
- **Primary action and completion:** Move to event task; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Event cancellation requires impact preview and communication workflow.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-067 — Event configuration

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/settings` · P1.
- **Users:** Director, event manager.
- **Content in reading order:** Dates, venue, contacts, timezone, publication state, capacity and policies.
- **Primary action and completion:** Publish event or amend settings; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Material changes after registration opens require revision and attendee notice.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-068 — Divisions and rules

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/divisions` · P1.
- **Users:** Director, rules administrator.
- **Content in reading order:** Division templates, sourced eligibility, roster limits, scoring config, version and effective date.
- **Primary action and completion:** Attach approved rules to event; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Editing a used template creates a new version instead of changing history.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-069 — Fees and add-ons

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/fees` · P2.
- **Users:** Finance admin, director.
- **Content in reading order:** Currency, fee lines, discounts, cross-entry policy, merch sizes and refund rules.
- **Primary action and completion:** Publish fee version; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Already-paid registrations retain their original price basis.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-070 — Registration review queue

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/registrations` · P1.
- **Users:** Registrar.
- **Content in reading order:** Entries, readiness filters, submission dates and ownership.
- **Primary action and completion:** Assign or open review; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Concurrent reviewers see assignment and version conflicts.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-071 — Registration review

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/registrations/[entryId]` · P1.
- **Users:** Registrar.
- **Content in reading order:** Roster summary, evidence states, sourced rule checks, change history and reasons.
- **Primary action and completion:** Approve or request correction; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Manual override requires explicit permission, reason and audit record.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-072 — Identity review queue

- **Route / phase:** `/admin/[chapterId]/verification` · P2.
- **Users:** Identity reviewer.
- **Content in reading order:** Assigned cases, minimal identity evidence, OCR comparison and retention date.
- **Primary action and completion:** Approve, reject or request replacement; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Private evidence access is logged and excluded from normal exports.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-073 — Finance overview

- **Route / phase:** `/admin/[chapterId]/finance` · P2.
- **Users:** Finance admin.
- **Content in reading order:** Receivables, verified collections, reconciliation issues and refunds per currency.
- **Primary action and completion:** Open exception queue; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Do not sum currencies without a disclosed conversion method.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-074 — Transactions and reconciliation

- **Route / phase:** `/admin/[chapterId]/finance/transactions` · P2.
- **Users:** Finance admin.
- **Content in reading order:** Provider events, ledger entries, allocations, manual receipts and mismatches.
- **Primary action and completion:** Reconcile or approve supported deposit; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Receipt image alone never confirms funds received.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-075 — Refunds and disputes

- **Route / phase:** `/admin/[chapterId]/finance/refunds` · P2.
- **Users:** Finance admin, approver.
- **Content in reading order:** Original payment, eligible amount, policy, reason, approval and provider outcome.
- **Primary action and completion:** Approve or execute permitted refund; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Repeat submission cannot over-refund; request and settlement are distinct.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-076 — Staff and assignments

- **Route / phase:** `/admin/[chapterId]/staff` · P1.
- **Users:** Director.
- **Content in reading order:** Staff invitations, chapter/event roles, validity periods and revocation.
- **Primary action and completion:** Assign least-privilege access; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** User cannot grant permissions above own authority.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-077 — Event communications

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/communications` · P2.
- **Users:** Event manager.
- **Content in reading order:** Audience criteria, message preview, channels, schedule and delivery state.
- **Primary action and completion:** Send approved announcement; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Preview audience count and exclude unrelated chapters; duplicate sends are prevented.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-078 — Performance order

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/lineup` · P3.
- **Users:** Event manager, marshal.
- **Content in reading order:** Eligible entries, rule-based seeds, randomized remainder, stage slots and version.
- **Primary action and completion:** Generate, review and publish order; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Manual reorder explains reason and notifies affected crews after publication.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-079 — Music readiness

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/music` · P3.
- **Users:** Audio operator.
- **Content in reading order:** Accepted tracks, division duration, latest version, order, missing files and export manifest.
- **Primary action and completion:** Prepare downloadable playlist; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Do not rename WAV bytes to MP3; preserve format or explicitly transcode.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-080 — Result publication

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/results` · P3.
- **Users:** Head judge, publisher.
- **Content in reading order:** Completion checks, penalties, ties, lock receipt, preview and audit.
- **Primary action and completion:** Authorize finalization then publish; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Head judge lock and public publication are separate permissions and events.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-081 — Advancement management

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/advancement` · P3.
- **Users:** Director, registrar.
- **Content in reading order:** Source placements, qualification slots, wildcard reasons and invitations.
- **Primary action and completion:** Issue qualification invitation; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No silent qualification when source results are retracted.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-082 — Event reports

- **Route / phase:** `/admin/[chapterId]/events/[eventId]/reports` · P3.
- **Users:** Director, delegated staff.
- **Content in reading order:** Registration, check-in, judging completion and finance reports by access.
- **Primary action and completion:** Export scoped report; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Export strips private fields and logs recipient/scope.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-083 — Chapter content

- **Route / phase:** `/admin/[chapterId]/content` · P4.
- **Users:** Editor, publisher.
- **Content in reading order:** Event copy, chapter pages, stories, sponsor placements and revisions.
- **Primary action and completion:** Draft, preview, submit or publish; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Editor cannot publish unless separately granted publishing permission.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-084 — Support work queue

- **Route / phase:** `/admin/[chapterId]/support` · P4.
- **Users:** Support agent.
- **Content in reading order:** Tickets, priority, assigned staff, event context and safe reply history.
- **Primary action and completion:** Resolve or escalate request; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Support cannot edit scores or inspect identity evidence by default.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-085 — Audit explorer

- **Route / phase:** `/admin/[chapterId]/audit` · P3.
- **Users:** Auditor, director.
- **Content in reading order:** Actor, action, entity, timestamp, reason and correlation ID.
- **Primary action and completion:** Filter authorized audit records; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Logs redact secrets and prevent staff alteration.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-086 — Global HQ overview

- **Route / phase:** `/hq` · P4.
- **Users:** Global administrator.
- **Content in reading order:** Chapter health, event counts, approved global publications and operational exceptions.
- **Primary action and completion:** Enter authorized chapter oversight; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Global totals respect currency and publication boundaries.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-087 — Chapter administration

- **Route / phase:** `/hq/chapters` · P4.
- **Users:** Global administrator.
- **Content in reading order:** Country coverage, directors, localized settings, status and history.
- **Primary action and completion:** Create, suspend or transfer chapter administration; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Suspension preserves financial and competition evidence.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-088 — Global rule library

- **Route / phase:** `/hq/rules` · P4.
- **Users:** Rules administrator.
- **Content in reading order:** Source documents, version history, applicability and chapter overrides.
- **Primary action and completion:** Publish approved rule template; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Conflicting overrides require resolution before event activation.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-089 — Global access governance

- **Route / phase:** `/hq/access` · P4.
- **Users:** Global administrator.
- **Content in reading order:** Privileged roles, approvals, access reviews and break-glass history.
- **Primary action and completion:** Grant or revoke scoped privilege; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Elevated access requires reauthentication and logged reason.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-090 — Global publishing

- **Route / phase:** `/hq/content` · P4.
- **Users:** Global editor, publisher.
- **Content in reading order:** Home features, global pages, localization, legal content and media rights.
- **Primary action and completion:** Preview and publish approved content; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Future content does not leak through public previews.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-091 — Integrations and configuration

- **Route / phase:** `/hq/integrations` · P4.
- **Users:** Platform operator.
- **Content in reading order:** Provider connection health, webhook status, environment and secret references.
- **Primary action and completion:** Inspect health or rotate approved configuration; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Never display secret values in chapter documents or client bundles.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

### PAGE-092 — Platform operations

- **Route / phase:** `/hq/operations` · P4.
- **Users:** Platform operator.
- **Content in reading order:** Service health, job backlog, notification failures and event incident links.
- **Primary action and completion:** Acknowledge and investigate incident; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Technical access does not automatically grant score or identity access.
- **Layout and authority:** inherits the admin contract above and the responsive matrix.

## Console screens — Tactical

**Responsive contract:** Landscape tablet is optimized; portrait and short screens reflow to scrolling sections; minimum primary control 56px; draft survives rotation.

**Data and authority:** Assigned event/stage/entry only; explicit revisions, operation IDs and acknowledgements for commands.

### PAGE-093 — Duty selection

- **Route / phase:** `/console` · P3.
- **Users:** Assigned event staff.
- **Content in reading order:** Chapter, event, stage, role, device and connectivity status.
- **Primary action and completion:** Enter assigned workstation; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Expired or revoked assignment cannot be selected.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-094 — Judge desk

- **Route / phase:** `/console/[eventId]/judge` · P3.
- **Users:** Judge.
- **Content in reading order:** Assigned division, current/next crew, criteria version, completion and outbox state.
- **Primary action and completion:** Open assigned scorecard; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Judge cannot see peers' unfinalized scores.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-095 — Score entry

- **Route / phase:** `/console/[eventId]/judge/[entryId]` · P3.
- **Users:** Assigned judge.
- **Content in reading order:** Crew context, criteria labels/maxima, numeric controls, notes, revision and saved/queued/acknowledged state.
- **Primary action and completion:** Save draft and submit score; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Duplicate retry is idempotent; locked/revised entry produces a recoverable conflict.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-096 — Judge submission review

- **Route / phase:** `/console/[eventId]/judge/review` · P3.
- **Users:** Judge.
- **Content in reading order:** Own submissions, receipts, revision history and unresolved drafts.
- **Primary action and completion:** Inspect own receipt or request authorized correction; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No overwrite of a locked accepted score.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-097 — Head judge overview

- **Route / phase:** `/console/[eventId]/head-judge` · P3.
- **Users:** Head judge.
- **Content in reading order:** Judge completion matrix, missing scores, anomaly flags and technical deductions.
- **Primary action and completion:** Inspect discrepancy and prepare lock; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Outlier flag is advisory and never silently modifies a judge's score.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-098 — Division finalization

- **Route / phase:** `/console/[eventId]/head-judge/[divisionId]` · P3.
- **Users:** Head judge.
- **Content in reading order:** Completeness, conflict review, penalties, tie policy, final preview and rule version.
- **Primary action and completion:** Lock division with explicit review; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Missing acknowledgements prevent accidental finalization.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-099 — Technical deductions

- **Route / phase:** `/console/[eventId]/penalties` · P3.
- **Users:** Technical judge.
- **Content in reading order:** Entry, sourced violation codes, points, evidence, reviewer and history.
- **Primary action and completion:** Submit or reverse authorized deduction; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Reversal creates audit entry rather than deleting original evidence.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-100 — Battle control

- **Route / phase:** `/console/[eventId]/battles` · P3.
- **Users:** Head judge, battle operator.
- **Content in reading order:** Bracket, round format, assignment, voting window, tiebreak and match state.
- **Primary action and completion:** Start round and advance confirmed winner; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Byes, withdrawals and ties use approved event rules.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-101 — Battle voting

- **Route / phase:** `/console/[eventId]/battles/[matchId]/vote` · P3.
- **Users:** Assigned battle judge.
- **Content in reading order:** Competitor names, corner labels, round, vote state and receipt.
- **Primary action and completion:** Cast authorized vote; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Window closed or duplicate vote cannot silently change outcome.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-102 — Check-in scanner

- **Route / phase:** `/console/[eventId]/check-in` · P3.
- **Users:** Check-in operator.
- **Content in reading order:** Scanner, manual search, entitlement, identity confirmation and freshness.
- **Primary action and completion:** Validate pass and record check-in; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Replay, revoked pass, camera denial and offline uncertainty have distinct outcomes.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-103 — Backstage queue

- **Route / phase:** `/console/[eventId]/marshal` · P3.
- **Users:** Marshal.
- **Content in reading order:** Holding, on-deck, performing and complete lanes; stage and call history.
- **Primary action and completion:** Move crew through allowed stage states; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Concurrent stage transition conflicts are resolved with latest server version.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-104 — DJ desk

- **Route / phase:** `/console/[eventId]/audio` · P3.
- **Users:** Audio operator.
- **Content in reading order:** Performance order, accepted track version, cue, local availability and checksum.
- **Primary action and completion:** Download approved pack or mark cue ready; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Missing/corrupt local track is flagged before stage transition.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-105 — Broadcast control

- **Route / phase:** `/console/[eventId]/broadcast` · P3.
- **Users:** Broadcast operator.
- **Content in reading order:** Preview, scene preset, published data, sponsor schedule and display health.
- **Primary action and completion:** Take authorized scene live; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Preview data and internal scores never reach public display.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-106 — Device and sync center

- **Route / phase:** `/console/[eventId]/sync` · P3.
- **Users:** Assigned staff.
- **Content in reading order:** Queued operations, receipt state, last sync, local storage and device identity.
- **Primary action and completion:** Retry or escalate conflict; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Sign-out or storage clearing warns about unsent work and provides recovery.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

### PAGE-107 — Event incident log

- **Route / phase:** `/console/[eventId]/incidents` · P3.
- **Users:** Event manager, assigned staff.
- **Content in reading order:** Incident time, stage, severity, owner, mitigation and resolution.
- **Primary action and completion:** Record and escalate incident; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Operational note cannot directly mutate results.
- **Layout and authority:** inherits the console contract above and the responsive matrix.

## Broadcast screens — Broadcast

**Responsive contract:** 16:9, 16:10, 21:9 and 9:16 scene presets; safe margins; no browser scrollbars; calibrated readable text and match-focused views.

**Data and authority:** Published projection only; separate authenticated controller; no private participant data.

### PAGE-108 — Arena live display

- **Route / phase:** `/arena-live/[eventId]` · P3.
- **Users:** Public display.
- **Content in reading order:** Now performing, chapter, division, approved sponsor and scene state.
- **Primary action and completion:** Render operator-published scene; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Connection loss freezes factual state with discreet freshness indicator.
- **Layout and authority:** inherits the broadcast contract above and the responsive matrix.

### PAGE-109 — Arena result reveal

- **Route / phase:** `/arena-live/[eventId]/results` · P3.
- **Users:** Public display.
- **Content in reading order:** Published placement, crew, official total and reveal ordering.
- **Primary action and completion:** Show approved results sequence; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Publication rollback stops reveal and shows holding scene.
- **Layout and authority:** inherits the broadcast contract above and the responsive matrix.

### PAGE-110 — Arena bracket

- **Route / phase:** `/arena-live/[eventId]/bracket` · P3.
- **Users:** Public display.
- **Content in reading order:** Current match, prior winners, round and next pairing.
- **Primary action and completion:** Display current competition bracket; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Large brackets focus current round instead of shrinking all names.
- **Layout and authority:** inherits the broadcast contract above and the responsive matrix.

### PAGE-111 — Arena holding scene

- **Route / phase:** `/arena-live/[eventId]/holding` · P3.
- **Users:** Public display.
- **Content in reading order:** Event identity, approved schedule message, sponsor loop and support contact if appropriate.
- **Primary action and completion:** Wait for authorized live scene; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No fabricated countdown when resume time is unknown.
- **Layout and authority:** inherits the broadcast contract above and the responsive matrix.

## System screens — Shared

**Responsive contract:** Readable single-column layout in every orientation; actions remain reachable at 400% zoom.

**Data and authority:** No sensitive diagnostic output; private route existence protected.

### PAGE-112 — Access denied

- **Route / phase:** `/access-denied` · P1.
- **Users:** Any user.
- **Content in reading order:** Current account, unavailable scope and safe help path.
- **Primary action and completion:** Switch authorized context or request help; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Do not reveal whether a protected resource exists.
- **Layout and authority:** inherits the system contract above and the responsive matrix.

### PAGE-113 — Offline and reconnect

- **Route / phase:** `/offline` · P3.
- **Users:** Any user.
- **Content in reading order:** Available cached functions, pending operations, last sync and retry action.
- **Primary action and completion:** Resume supported local work; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Payments, publishing and identity approval remain unavailable offline.
- **Layout and authority:** inherits the system contract above and the responsive matrix.

### PAGE-114 — Planned maintenance

- **Route / phase:** `/maintenance` · P1.
- **Users:** Any user.
- **Content in reading order:** Service status, impact, verified next update and support.
- **Primary action and completion:** Check service status or return later; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Avoid unsourced recovery-time promises.
- **Layout and authority:** inherits the system contract above and the responsive matrix.

### PAGE-115 — Not found template

- **Route / phase:** `/not-found` · P1.
- **Users:** Any user.
- **Content in reading order:** Clear explanation, event search and home/help links.
- **Primary action and completion:** Recover navigation; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** Missing private resource uses non-disclosing response; this also represents framework 404 boundaries.
- **Layout and authority:** inherits the system contract above and the responsive matrix.

### PAGE-116 — Unexpected-error template

- **Route / phase:** `/error` · P1.
- **Users:** Any user.
- **Content in reading order:** Safe error description, retry, preserved input and support reference.
- **Primary action and completion:** Retry or report issue; show the resulting destination or a traceable receipt.
- **Critical exception / acceptance case:** No tokens, personal details or stack traces in user-visible errors.
- **Layout and authority:** inherits the system contract above and the responsive matrix.
