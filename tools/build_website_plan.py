"""Build the reviewable page catalogue from the planning records below."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/website-plan'
# surface | phase | route | title | roles | content | action | critical case
DATA = '''
public|P1|/|Home|Visitor|Hero; featured event; chapter discovery; crew stories; published results; community; FAQ|Find an event or register a crew|No active events replaces live promotion with a truthful discovery message
public|P1|/events|Event directory|Visitor|Country, date, format and status filters; event date, venue, fee summary and registration state|Filter and open event|No matches preserves filters and offers reset; cancelled events remain clearly labeled
public|P1|/events/[eventSlug]|Event overview|Visitor|Event title, chapter, venue, local timezone, divisions, fees, deadline, accessibility, contact and official rule version|Start registration or view published results|Registration closed offers approved next steps without bypassing deadline
public|P3|/events/[eventSlug]/schedule|Public schedule|Visitor|Day/stage/division selector; running order; estimated versus confirmed times; last update|Follow an event segment|Delayed schedule displays updated time and reason without implying precise ETA
public|P1|/events/[eventSlug]/rules|Event rules|Visitor|Version, effective date, division eligibility, music, scoring, appeals and downloadable official source|Read a division policy|Missing approved rule version prevents claims that eligibility is confirmed
public|P2|/events/[eventSlug]/tickets|Spectator tickets|Visitor|Ticket types, inventory, seating/accessibility, total price, refund policy and sales provider|Select ticket and checkout|Sold-out or cancelled event cannot accept a new purchase
public|P3|/events/[eventSlug]/live|Spectator live hub|Visitor|Published now/on-deck; stream link with rights; schedule; results tabs; feed freshness|Follow published competition|Disconnected feed keeps last known state with timestamp
public|P3|/results|Results directory|Visitor|Season, chapter, event and division filters; publication dates|Open event results|An unpublished event must not appear through search or direct links
public|P3|/events/[eventSlug]/results|Event results|Visitor|Division selector; placement; crew; chapter; official total; tie explanation; revision|Inspect published scorecard|Corrected results retain a visible revision notice
public|P3|/events/[eventSlug]/results/[entryId]|Public scorecard|Visitor|Approved score breakdown; deductions summary; placement; rule version; publication time|Share official result|Private critique, judge identity or raw detail remains hidden unless publication policy permits
public|P4|/rankings|Season rankings|Visitor|Season, division and territory; points; included events; methodology and update date|Inspect ranking history|No approved ranking formula means this module is unavailable
public|P4|/crews/[crewSlug]|Public crew profile|Visitor|Consented crew biography; chapter; media; published event history and awards|View performances and results|No minors' private identities or unconsented roster biographies appear
public|P1|/chapters|Chapter directory|Visitor|Country names, region coverage, local contact and next events|Select chapter|Unsupported country offers inquiry rather than fabricated local operations
public|P1|/chapters/[chapterSlug]|Chapter home|Visitor|Chapter identity; verified local events; contacts; local policy links and news|Find a local event|Archived chapter is identified and routes users to current contact
public|P4|/about|About WSB|Visitor|Verified history, purpose, operating model and leadership-approved statements|Explore events or contact team|Unverified statistics are omitted
public|P4|/stories|Stories and news|Visitor|Editorial feature; category/chapter filters; publication dates and captions|Open story|Empty category offers other published stories
public|P4|/stories/[slug]|Story detail|Visitor|Title, author, date, licensed media, accessible captions, related event and credits|Read related event or story|Removed media has a meaningful text fallback
public|P4|/community/studios|Studios and partners|Visitor|Approved directory with city, discipline, official links and inclusion criteria|Find studio or apply|Expired partnership is removed from active listings
public|P4|/community/apply|Chapter or studio application|Applicant|Organization, contact, territory, experience, proposed collaboration and consent|Submit inquiry|Duplicate or interrupted submission returns a trackable receipt
public|P4|/partners|Sponsors and partnership|Visitor|Verified partner placements; opportunity categories; inquiry route|Request partnership information|No fake sponsor logos or unapproved commercial promises
public|P4|/media|Media hub|Visitor|Approved press kit, brand-use guide, media contact and downloadable licensed assets|Download permitted assets|Expired rights revoke downloads and explain contact path
public|P1|/help|Help center|Visitor|Topic search; registration, payment, event-day and account categories|Find answer or contact support|Search failure retains direct topic navigation
public|P1|/help/[slug]|Help article|Visitor|Task steps, screenshots with alt text, related policies, update date|Complete task or request support|Outdated article is visibly superseded
public|P1|/contact|Contact and support|Visitor|Topic, chapter/event, reply email, message, safe attachment guidance and response expectations|Send inquiry|Failure preserves draft and never falsely confirms receipt
public|P1|/policies/[policySlug]|Policy documents|Visitor|Privacy, terms, accessibility, safeguarding, cookies or refund policy; owner; jurisdiction; effective date|Read or manage applicable preferences|Missing required event policy blocks dependent checkout or consent flow
identity|P1|/sign-in|Sign in|Account holder|Email/password; approved provider buttons; recovery; invitation context|Authenticate and return to allowed destination|Generic invalid-login response avoids account enumeration
identity|P1|/sign-up|Create account|Applicant|Email, password, display name, locale, required terms and age-appropriate routing|Create account and verify email|Invitation and registration intent survive verification
identity|P1|/verify-email|Email verification|Account holder|Current verification state; resend cooldown; change-email route|Verify or resend email|Expired link offers a new link without losing the account
identity|P1|/forgot-password|Password recovery|Account holder|Email input; neutral delivery confirmation|Request reset|Same outward response for known and unknown addresses
identity|P1|/auth/action|Authentication action|Account holder|Reset-password, verify-email or recover-email action validated by Firebase|Complete authenticated action|Expired, used or malformed code gets safe recovery action
identity|P1|/onboarding|Profile onboarding|Account holder|Preferred name, locale, country, chapter intent and role explanation|Complete profile|User cannot self-select privileged staff permissions
identity|P1|/invite/[token]|Invitation acceptance|Invited dancer, guardian or staff|Inviter, event/crew or assignment scope, expiry and privacy explanation|Accept scoped invitation after identity check|Revoked, expired, wrong-account and already-used links have separate recovery paths
identity|P1|/workspaces|Workspace chooser|Authenticated user|Authorized chapters, crews and event assignments; last-used context|Enter permitted workspace|No assignment shows request-access guidance without exposing other memberships
portal|P1|/app|Personal dashboard|Dancer, manager, guardian|Upcoming events, required actions, readiness, outstanding balances and notices|Continue highest-priority task|No crew or event shows role-specific onboarding
portal|P1|/app/profile|Profile|Account holder|Personal name, preferred name, locale, country representation request and contact preferences|Save own permitted fields|Eligibility-sensitive edits trigger review rather than silently rewriting registration history
portal|P1|/app/security|Security and sessions|Account holder|Provider linking, password change, session information and reauthentication|Update security settings or sign out|Recent-login requirement preserves the intended action
portal|P2|/app/notifications|Notification center|Account holder|Event-scoped messages, read state, action links and delivery preferences|Open required action|Withdrawn event notice remains distinguishable from a current instruction
portal|P1|/app/crews|My crews|Manager, dancer|Crew names, chapter, role, event entries and next required action|Create or open crew|Membership removal immediately removes private crew access
portal|P1|/app/crews/new|Create crew|Manager|Crew name, home chapter, public display options and manager confirmation|Create draft crew|Similar name warning does not invent global name exclusivity
portal|P1|/app/crews/[crewId]|Crew workspace|Manager, member|Crew summary; readiness; event entries; limited roster and announcements|Manage crew or open entry|Members see only their permitted fields and tasks
portal|P1|/app/crews/[crewId]/roster|Roster and invitations|Manager|Names permitted by policy; invite status; eligibility/consent/payment summaries; role labels|Invite, remove or resend invitation|Roster lock and removal of a paid member route through defined change policy
portal|P1|/app/crews/[crewId]/settings|Crew settings|Manager|Name, media consent, manager transfer, contact and archive controls|Update crew or transfer ownership|Last-manager removal and unaccepted ownership transfer cannot orphan a crew
portal|P1|/app/register/[eventId]|Registration: event and division|Manager|Event context, approved division rules, eligibility inputs, fee preview and deadline|Choose division and start entry|Unsupported or closed division cannot proceed
portal|P1|/app/entries/[entryId]/roster|Registration: roster|Manager|Selected dancers, cross-entry conflicts, roster limits, missing requirements and qualifier comparison|Save roster and continue|Roster requirements explain the exact sourced rule and affected members
portal|P2|/app/entries/[entryId]/music|Registration: music|Manager|File picker, upload progress, waveform preview, duration, format, deadline and review status|Upload or replace performance track|Interrupted upload resumes; rejected track gives actionable reason; lock prevents replacement
portal|P2|/app/entries/[entryId]/checkout|Registration: checkout|Manager, payer|Itemized fees, currency, discounts, sizes/add-ons if enabled, split allocations and policy consent|Pay full balance or assign shares|Expired price quote triggers review; return from provider remains pending until verified
portal|P1|/app/entries/[entryId]/review|Registration: review|Manager|Read-only division, roster, consent, music and payment readiness; terms version|Submit registration for review|Server revalidates deadline and prerequisites before accepting
portal|P1|/app/entries/[entryId]|Entry status|Manager, member|Registration receipt, readiness checklist, blockers, timeline and allowed corrections|Resolve blocker or view next event action|Submitted, approved, rejected, withdrawn and cancelled remain distinct
portal|P2|/app/entries/[entryId]/changes|Change or withdraw entry|Manager|Change type, affected dancers, refund implications, deadline and reason|Request roster change or withdrawal|Paid/locked entries require authorized review and retain history
portal|P2|/app/verification|Dancer verification|Dancer, guardian|Required identity fields, restricted upload, review result, correction and deletion policy|Submit own verification evidence|OCR uncertainty triggers human review rather than rejection solely by machine
portal|P2|/app/consents|Consent and waivers|Dancer, guardian|Applicable event, signer capacity, document version, language and signed receipt|Read and sign applicable document|Changed waiver requires a new version; manager cannot impersonate guardian
portal|P2|/app/dependents|Guardian dependents|Guardian|Verified dependent relationships; event readiness; pending consent and payment tasks|Manage authorized dependent task|Relationship revocation removes access; no access to unrelated minors
portal|P2|/app/payments|My payments|Payer, manager|Balance by event; allocations; payment/refund status; receipts and due dates|Pay assigned balance or inspect transaction|Manager cannot expose another payer's private payment details
portal|P2|/app/payments/[paymentId]|Payment and receipt|Payer|Reference, amount/currency, verified status, allocation, refund history and receipt|Download receipt or request help|Pending, failed, partial refund and chargeback are explicit states
portal|P2|/app/payment-return|Payment return|Payer|Provider reference and server verification state|Return to entry after verified outcome|Repeated return or refresh cannot duplicate a charge or registration
portal|P3|/app/passes|My passes|Dancer, attendee|Event entitlement, pass validity, access zone, QR and offline status|Present pass|Revoked, expired and offline-unverifiable passes do not show an unconditional valid badge
portal|P3|/app/event-day/[eventId]|My event day|Dancer, manager|Check-in, call time, on-deck state, directions, official announcements and freshness|Acknowledge call or open pass|Stale cached calls clearly show last update
portal|P3|/app/scorecards|My scorecards|Manager, dancer|Published results, eligible private feedback, certificates and event filters|Review scorecard or download certificate|Unpublished/retracted results are not available from cached private routes
portal|P3|/app/advancement|Qualification invitations|Manager|Source event, destination event, qualification basis, validity and roster requirements|Accept invitation and start next entry|Wildcard and normal qualification have auditable distinct sources
portal|P4|/app/tickets|Purchased tickets|Attendee|Order, event, seats if used, QR entitlements and transfer/refund rules|View ticket or allowed transfer|Transfer invalidates previous entitlement according to approved policy
portal|P1|/app/support|My support requests|Account holder|Ticket topic, status, scoped messages and attachment handling|Create or reply to request|Sensitive identity documents are redirected to the secure review flow
portal|P4|/app/privacy|Privacy and data requests|Account holder|Export/deletion options, identity recheck, retention exceptions and request status|Submit tracked data request|Deletion does not erase required audit/financial history without approved policy
admin|P1|/admin/[chapterId]|Chapter dashboard|Director, delegated staff|Upcoming events, registration blockers, finance summaries by permission and operational alerts|Open actionable work queue|Counts and links must use the same chapter-scoped query rules
admin|P1|/admin/[chapterId]/events|Event management|Director, event manager|Draft, open, running, completed and cancelled events|Create or edit authorized event|Archived event history remains read-only
admin|P1|/admin/[chapterId]/events/new|Create event|Director|Name, timezone, venue, dates, stage structure, registration window and owner|Save draft event|Invalid windows and missing timezone prevent publication
admin|P1|/admin/[chapterId]/events/[eventId]|Event command center|Event manager|Readiness summary, staff, entries, division state, schedule and go-live checklist|Move to event task|Event cancellation requires impact preview and communication workflow
admin|P1|/admin/[chapterId]/events/[eventId]/settings|Event configuration|Director, event manager|Dates, venue, contacts, timezone, publication state, capacity and policies|Publish event or amend settings|Material changes after registration opens require revision and attendee notice
admin|P1|/admin/[chapterId]/events/[eventId]/divisions|Divisions and rules|Director, rules administrator|Division templates, sourced eligibility, roster limits, scoring config, version and effective date|Attach approved rules to event|Editing a used template creates a new version instead of changing history
admin|P2|/admin/[chapterId]/events/[eventId]/fees|Fees and add-ons|Finance admin, director|Currency, fee lines, discounts, cross-entry policy, merch sizes and refund rules|Publish fee version|Already-paid registrations retain their original price basis
admin|P1|/admin/[chapterId]/events/[eventId]/registrations|Registration review queue|Registrar|Entries, readiness filters, submission dates and ownership|Assign or open review|Concurrent reviewers see assignment and version conflicts
admin|P1|/admin/[chapterId]/events/[eventId]/registrations/[entryId]|Registration review|Registrar|Roster summary, evidence states, sourced rule checks, change history and reasons|Approve or request correction|Manual override requires explicit permission, reason and audit record
admin|P2|/admin/[chapterId]/verification|Identity review queue|Identity reviewer|Assigned cases, minimal identity evidence, OCR comparison and retention date|Approve, reject or request replacement|Private evidence access is logged and excluded from normal exports
admin|P2|/admin/[chapterId]/finance|Finance overview|Finance admin|Receivables, verified collections, reconciliation issues and refunds per currency|Open exception queue|Do not sum currencies without a disclosed conversion method
admin|P2|/admin/[chapterId]/finance/transactions|Transactions and reconciliation|Finance admin|Provider events, ledger entries, allocations, manual receipts and mismatches|Reconcile or approve supported deposit|Receipt image alone never confirms funds received
admin|P2|/admin/[chapterId]/finance/refunds|Refunds and disputes|Finance admin, approver|Original payment, eligible amount, policy, reason, approval and provider outcome|Approve or execute permitted refund|Repeat submission cannot over-refund; request and settlement are distinct
admin|P1|/admin/[chapterId]/staff|Staff and assignments|Director|Staff invitations, chapter/event roles, validity periods and revocation|Assign least-privilege access|User cannot grant permissions above own authority
admin|P2|/admin/[chapterId]/events/[eventId]/communications|Event communications|Event manager|Audience criteria, message preview, channels, schedule and delivery state|Send approved announcement|Preview audience count and exclude unrelated chapters; duplicate sends are prevented
admin|P3|/admin/[chapterId]/events/[eventId]/lineup|Performance order|Event manager, marshal|Eligible entries, rule-based seeds, randomized remainder, stage slots and version|Generate, review and publish order|Manual reorder explains reason and notifies affected crews after publication
admin|P3|/admin/[chapterId]/events/[eventId]/music|Music readiness|Audio operator|Accepted tracks, division duration, latest version, order, missing files and export manifest|Prepare downloadable playlist|Do not rename WAV bytes to MP3; preserve format or explicitly transcode
admin|P3|/admin/[chapterId]/events/[eventId]/results|Result publication|Head judge, publisher|Completion checks, penalties, ties, lock receipt, preview and audit|Authorize finalization then publish|Head judge lock and public publication are separate permissions and events
admin|P3|/admin/[chapterId]/events/[eventId]/advancement|Advancement management|Director, registrar|Source placements, qualification slots, wildcard reasons and invitations|Issue qualification invitation|No silent qualification when source results are retracted
admin|P3|/admin/[chapterId]/events/[eventId]/reports|Event reports|Director, delegated staff|Registration, check-in, judging completion and finance reports by access|Export scoped report|Export strips private fields and logs recipient/scope
admin|P4|/admin/[chapterId]/content|Chapter content|Editor, publisher|Event copy, chapter pages, stories, sponsor placements and revisions|Draft, preview, submit or publish|Editor cannot publish unless separately granted publishing permission
admin|P4|/admin/[chapterId]/support|Support work queue|Support agent|Tickets, priority, assigned staff, event context and safe reply history|Resolve or escalate request|Support cannot edit scores or inspect identity evidence by default
admin|P3|/admin/[chapterId]/audit|Audit explorer|Auditor, director|Actor, action, entity, timestamp, reason and correlation ID|Filter authorized audit records|Logs redact secrets and prevent staff alteration
admin|P4|/hq|Global HQ overview|Global administrator|Chapter health, event counts, approved global publications and operational exceptions|Enter authorized chapter oversight|Global totals respect currency and publication boundaries
admin|P4|/hq/chapters|Chapter administration|Global administrator|Country coverage, directors, localized settings, status and history|Create, suspend or transfer chapter administration|Suspension preserves financial and competition evidence
admin|P4|/hq/rules|Global rule library|Rules administrator|Source documents, version history, applicability and chapter overrides|Publish approved rule template|Conflicting overrides require resolution before event activation
admin|P4|/hq/access|Global access governance|Global administrator|Privileged roles, approvals, access reviews and break-glass history|Grant or revoke scoped privilege|Elevated access requires reauthentication and logged reason
admin|P4|/hq/content|Global publishing|Global editor, publisher|Home features, global pages, localization, legal content and media rights|Preview and publish approved content|Future content does not leak through public previews
admin|P4|/hq/integrations|Integrations and configuration|Platform operator|Provider connection health, webhook status, environment and secret references|Inspect health or rotate approved configuration|Never display secret values in chapter documents or client bundles
admin|P4|/hq/operations|Platform operations|Platform operator|Service health, job backlog, notification failures and event incident links|Acknowledge and investigate incident|Technical access does not automatically grant score or identity access
console|P3|/console|Duty selection|Assigned event staff|Chapter, event, stage, role, device and connectivity status|Enter assigned workstation|Expired or revoked assignment cannot be selected
console|P3|/console/[eventId]/judge|Judge desk|Judge|Assigned division, current/next crew, criteria version, completion and outbox state|Open assigned scorecard|Judge cannot see peers' unfinalized scores
console|P3|/console/[eventId]/judge/[entryId]|Score entry|Assigned judge|Crew context, criteria labels/maxima, numeric controls, notes, revision and saved/queued/acknowledged state|Save draft and submit score|Duplicate retry is idempotent; locked/revised entry produces a recoverable conflict
console|P3|/console/[eventId]/judge/review|Judge submission review|Judge|Own submissions, receipts, revision history and unresolved drafts|Inspect own receipt or request authorized correction|No overwrite of a locked accepted score
console|P3|/console/[eventId]/head-judge|Head judge overview|Head judge|Judge completion matrix, missing scores, anomaly flags and technical deductions|Inspect discrepancy and prepare lock|Outlier flag is advisory and never silently modifies a judge's score
console|P3|/console/[eventId]/head-judge/[divisionId]|Division finalization|Head judge|Completeness, conflict review, penalties, tie policy, final preview and rule version|Lock division with explicit review|Missing acknowledgements prevent accidental finalization
console|P3|/console/[eventId]/penalties|Technical deductions|Technical judge|Entry, sourced violation codes, points, evidence, reviewer and history|Submit or reverse authorized deduction|Reversal creates audit entry rather than deleting original evidence
console|P3|/console/[eventId]/battles|Battle control|Head judge, battle operator|Bracket, round format, assignment, voting window, tiebreak and match state|Start round and advance confirmed winner|Byes, withdrawals and ties use approved event rules
console|P3|/console/[eventId]/battles/[matchId]/vote|Battle voting|Assigned battle judge|Competitor names, corner labels, round, vote state and receipt|Cast authorized vote|Window closed or duplicate vote cannot silently change outcome
console|P3|/console/[eventId]/check-in|Check-in scanner|Check-in operator|Scanner, manual search, entitlement, identity confirmation and freshness|Validate pass and record check-in|Replay, revoked pass, camera denial and offline uncertainty have distinct outcomes
console|P3|/console/[eventId]/marshal|Backstage queue|Marshal|Holding, on-deck, performing and complete lanes; stage and call history|Move crew through allowed stage states|Concurrent stage transition conflicts are resolved with latest server version
console|P3|/console/[eventId]/audio|DJ desk|Audio operator|Performance order, accepted track version, cue, local availability and checksum|Download approved pack or mark cue ready|Missing/corrupt local track is flagged before stage transition
console|P3|/console/[eventId]/broadcast|Broadcast control|Broadcast operator|Preview, scene preset, published data, sponsor schedule and display health|Take authorized scene live|Preview data and internal scores never reach public display
console|P3|/console/[eventId]/sync|Device and sync center|Assigned staff|Queued operations, receipt state, last sync, local storage and device identity|Retry or escalate conflict|Sign-out or storage clearing warns about unsent work and provides recovery
console|P3|/console/[eventId]/incidents|Event incident log|Event manager, assigned staff|Incident time, stage, severity, owner, mitigation and resolution|Record and escalate incident|Operational note cannot directly mutate results
broadcast|P3|/arena-live/[eventId]|Arena live display|Public display|Now performing, chapter, division, approved sponsor and scene state|Render operator-published scene|Connection loss freezes factual state with discreet freshness indicator
broadcast|P3|/arena-live/[eventId]/results|Arena result reveal|Public display|Published placement, crew, official total and reveal ordering|Show approved results sequence|Publication rollback stops reveal and shows holding scene
broadcast|P3|/arena-live/[eventId]/bracket|Arena bracket|Public display|Current match, prior winners, round and next pairing|Display current competition bracket|Large brackets focus current round instead of shrinking all names
broadcast|P3|/arena-live/[eventId]/holding|Arena holding scene|Public display|Event identity, approved schedule message, sponsor loop and support contact if appropriate|Wait for authorized live scene|No fabricated countdown when resume time is unknown
system|P1|/access-denied|Access denied|Any user|Current account, unavailable scope and safe help path|Switch authorized context or request help|Do not reveal whether a protected resource exists
system|P3|/offline|Offline and reconnect|Any user|Available cached functions, pending operations, last sync and retry action|Resume supported local work|Payments, publishing and identity approval remain unavailable offline
system|P1|/maintenance|Planned maintenance|Any user|Service status, impact, verified next update and support|Check service status or return later|Avoid unsourced recovery-time promises
system|P1|/not-found|Not found template|Any user|Clear explanation, event search and home/help links|Recover navigation|Missing private resource uses non-disclosing response; this also represents framework 404 boundaries
system|P1|/error|Unexpected-error template|Any user|Safe error description, retry, preserved input and support reference|Retry or report issue|No tokens, personal details or stack traces in user-visible errors
'''

PROFILES = {
 'public': ('Spectacle', 'Single-column mobile; editorial wide-screen composition; compact hero in short landscape; preserve filters and navigation on rotation.', 'Published content and projections only; draft/preview authorization separate.'),
 'identity': ('Tactical', 'Single-column form at all narrow widths; keyboard-aware scrolling; no essential image column; preserve safe redirect and form state.', 'Firebase identity plus Rust authorization; no user-selected privileged roles.'),
 'portal': ('Tactical', 'Phone task flow and compact record lists; tablet optional detail pane; desktop sidebar; sticky actions must clear keyboard and safe area.', 'Own identity, authorized dependent or crew scope; private evidence never enters public projections.'),
 'admin': ('Tactical', 'Desktop data workspace; tablet master/detail; phone record list with full detail and actions; controlled table overflow where necessary.', 'Server checks chapter, event, action and current assignment; mutation audit and optimistic concurrency.'),
 'console': ('Tactical', 'Landscape tablet is optimized; portrait and short screens reflow to scrolling sections; minimum primary control 56px; draft survives rotation.', 'Assigned event/stage/entry only; explicit revisions, operation IDs and acknowledgements for commands.'),
 'broadcast': ('Broadcast', '16:9, 16:10, 21:9 and 9:16 scene presets; safe margins; no browser scrollbars; calibrated readable text and match-focused views.', 'Published projection only; separate authenticated controller; no private participant data.'),
 'system': ('Shared', 'Readable single-column layout in every orientation; actions remain reachable at 400% zoom.', 'No sensitive diagnostic output; private route existence protected.')
}

def main():
    records=[]
    for line in DATA.strip().splitlines():
        parts=line.split('|')
        assert len(parts)==8, line
        surface,phase,route,title,roles,content,action,edge=parts
        records.append(dict(id=f'PAGE-{len(records)+1:03}', surface=surface, phase=phase, route=route,
            title=title, roles=roles, content=content.split('; '), primary_action=action,
            critical_case=edge, responsive=PROFILES[surface][1], authority=PROFILES[surface][2]))
    assert len({r['route'] for r in records})==len(records)
    OUT.mkdir(parents=True,exist_ok=True)
    (OUT/'pages.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    intro=f'''# Complete page and screen catalogue

{len(records)} identified route templates and system screen families. All are planned,
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
'''
    for r in records: intro+=f"| {r['id']} | `{r['route']}` | {r['title']} | {r['phase']} |\n"
    for group,(surface,responsive,authority) in PROFILES.items():
        intro+=f'\n## {group.title()} screens — {surface}\n\n**Responsive contract:** {responsive}\n\n**Data and authority:** {authority}\n'
        for r in records:
            if r['surface']!=group: continue
            intro+=f"\n### {r['id']} — {r['title']}\n\n- **Route / phase:** `{r['route']}` · {r['phase']}.\n- **Users:** {r['roles']}.\n- **Content in reading order:** {'; '.join(r['content'])}.\n- **Primary action and completion:** {r['primary_action']}; show the resulting destination or a traceable receipt.\n- **Critical exception / acceptance case:** {r['critical_case']}.\n- **Layout and authority:** inherits the {group} contract above and the responsive matrix.\n"
    (OUT/'03-page-catalogue.md').write_text(intro,encoding='utf-8')
    print(f'Generated {len(records)} unique page specifications.')

if __name__=='__main__': main()
