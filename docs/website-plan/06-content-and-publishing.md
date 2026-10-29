# Content inventory, ownership and communication

## Editorial voice

Public voice: energetic, direct, grounded in dancers and community. Operational
voice: concise and precise. Use sentence case for instructions, labels and body
copy. Reserve uppercase display treatment for short public headlines. Do not
gamify financial, identity, consent or error states. Avoid jargon such as JWT,
Firestore or transaction conflict in ordinary user copy.

Suggested public copy is draft creative work, not approved brand claims.
Examples: “Own the stage. Represent your world.”; “Find your next event.”;
“Bring your crew. We’ll help you get stage-ready.” Do not invent current champions,
testimonials, turnout numbers, country counts, sponsors or prize amounts.

## Content records and owners

| Record | Required fields | Accountable owner | Release gate |
|---|---|---|---|
| Brand assets | Original mark, approved variants, clear space, usage rights, alt text | Brand lead | Approved reproduction and asset source |
| Hero media | Rights, performer consent, event context, crops, poster, captions | Brand/editorial | Media rights and accessible fallback |
| Chapter | Name, slug, territory, currency, timezone default, contact, director | Chapter director | Verified operating chapter and contact |
| Event | Name, slug, chapter, timezone, venue, dates, stages, registration window, status | Event manager | Approved rules, fees, accessibility/contact and publication review |
| Division | Name, description, eligibility, roster limits, criteria and source version | Rules owner | Official source and effective applicability |
| Fee schedule | Currency, minor-unit amounts, cross-entry/add-ons, discount/refund terms | Finance | Provider/account and policy confirmation |
| Venue | Address, map link, entry instructions, accessibility, backstage zones, contact | Event operations | Local verification and useful arrival guidance |
| Crew public profile | Display name, chapter, biography, image rights, publication opt-in | Crew manager/editor | Consent and privacy review |
| Story | Title, deck, body, author, publish date, media/credits, related event | Editor/publisher | Fact check, accessibility and rights |
| Result | Event/division, ranking, official totals, rule/publication revision | Head judge/publisher | Locked validated source snapshot |
| Rule document | Original source, version, applicability, effective dates, owner, summary | Rules administrator | Approved authoritative rulebook |
| Consent document | Exact text, version, jurisdiction, signer requirements, language | Authorized policy owner | Appropriate legal/business review |
| Sponsor | Approved name/logo, destination, event/term scope, placement limits | Partnership owner | Active agreement and asset rights |
| Help article | Task, prerequisites, steps, errors/recovery, updated date | Support/content | Matches deployed behavior |
| Notification template | Trigger, audience, variables, channel, priority, retention | Domain owner | Audience/permission and wording check |

## Page content readiness checklist

Every public route needs title, description, canonical URL, share image, main
heading, content owner, publication status, review date and meaningful empty
state. Every actionable event page needs exact local timezone, deadlines, fees
with currency, contact, cancellation/refund link and approved eligibility source.
Every private task needs visible context, purpose, required fields, success
receipt, failure recovery and help path. All media require rights, accessible
description and suitable crops; filenames are not acceptable alt text.

Launch media request: original vector logo; 3–5 approved hero candidates; at least
one portrait and one landscape performance image per featured event; consented
crew portraits; venue directions/maps; approved sponsor assets; short captioned
show reel with a still poster. Until supplied, use clearly identified synthetic
fixtures in development and factual text-first public content.

## Form field and validation inventory

| Form | Fields / validation design |
|---|---|
| Account | Email, password, display name, locale; server/provider validation; paste and password manager support |
| Crew | Display name, chapter, contact role, optional approved photo; length/Unicode limits; no invented global uniqueness rule |
| Event entry | Event/division IDs, rule version, crew, roster snapshot, required acknowledgements; server revalidation |
| Dancer | Legal fields only when required, preferred name, birth date, representation, contact; private/public separation |
| Guardian | Verified relationship, authorized signer identity, exact dependent/event/document; no implicit manager authority |
| Music | File, format, verified duration, version; actual file inspection and deadline rules |
| Checkout | Server quote, payer, allocations, billing fields required by provider, policy acknowledgement; no client-calculated final amount |
| Judge score | Approved criterion IDs, bounded precision/values, optional notes, expected revision; assignment and lock validation |
| Deduction | Entry, rule code/version, permitted points, explanation and evidence reference; role-limited |
| Support | Topic, event context, message, safe attachments, reply channel; no identity-document uploads in normal support |
| Event setup | Timezone, windows, venue/stages, capacity, divisions, fees and contacts; prevent contradictory dates |

Limits such as maximum name length and supported file size must be explicit
shared contract values before implementation. Validate on client for feedback
and server for authority. Allow international names, Unicode, accents and multiple
word orders. Show ambiguous dates in written-month format; store instants in UTC
with an IANA event timezone. Financial reports preserve currency and decimal rules.

## Notification plan

| Trigger | Audience | Channel / action | Deduplication and privacy |
|---|---|---|---|
| Crew invite | Named recipient | Email/in-app; accept scoped invite | Expiry and one-use/revocation controls; no full roster |
| Guardian consent needed | Verified guardian | Email/in-app; review exact document | No minor's full identity in preview text |
| Correction requested | Responsible dancer/manager | In-app plus optional email | Case/revision key; actionable reason without sensitive attachment |
| Payment confirmed/failed | Actual payer; manager gets summary | In-app/email; receipt or recovery | Provider event key; mask payment details |
| Registration approved | Manager and authorized members | In-app/email; next readiness task | Entry transition key |
| Music deadline approaching | Manager | In-app/optional email | Respect event timezone and user preferences |
| On-deck call | Event crew | In-app plus opt-in push | Stage revision key; visible freshness; push is best-effort |
| Result published/corrected | Relevant crew/followers | In-app/optional push/email | Publication revision; link to current result |
| Event cancelled/rescheduled | Affected registrants/attendees | In-app/email, push if enabled | Event revision; explain payment/support route |
| Assignment changed | Staff member | In-app/email | Scope/expiry; revoke access server-side immediately |

Permission prompts occur when the benefit is clear. No browser push prompt on
first landing-page load. Optional marketing consent is separate from necessary
operational communication. Each notification links to an authenticated route
that rechecks access. Delivery status is not proof that a participant read it.

## Search, SEO and migration

Public search indexes published event, chapter, rule-summary and editorial data
only. Private search runs within current role/chapter scope. Use metadata and
structured event information only where supported by visible factual content.
Exclude private consoles, accounts, invitation tokens and preview routes from
sitemaps/indexing; robots directives supplement, not replace, authorization.
Pagination/filter URLs preserve useful state; define canonical handling to avoid
duplicate indexing. Share previews never disclose private entry/payment status.

Audit existing WSB URLs before launch and map old event, registration and rule
destinations to maintained pages. Preserve official source documents and archive
dates. External Jotform/Google Form links may remain during staged migration,
with clear destination disclosure and no duplicate registration assumption.

## Localization and approvals

English is the initial authoring language; do not assume all chapters operate in
English. Externalize messages, dates, money and pluralization. Use locale-aware
formatting and test 40% text expansion, long country names and RTL layout.
Translation of legal/eligibility content requires an accountable reviewer and
version linkage. A missing translation must be labeled instead of silently
presenting a different rule version.

Publishing lifecycle: draft -> in review -> approved -> scheduled/published ->
superseded/archived. Media rights expiration can unpublish a media asset while
preserving the text record. Preview uses the same layout system as production.
Content change records include owner, reason and affected event/locale.
