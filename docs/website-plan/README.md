# WSB complete website and platform plan

Planning edition 1 · 30 October 2026 · implementation blueprint

Build one coherent street-dance championship experience: discover the culture,
find an event, register a crew, prepare to perform, run the competition, and
publish trustworthy results. This plan covers the complete intended product;
the present repository contains only the initial technical foundation.

## Read the plan

1. [Brand, reference websites and landing-page storyboard](01-brand-and-landing.md)
2. [Roles, permissions and navigation](02-roles-and-navigation.md)
3. [Every page and screen](03-page-catalogue.md)
4. [Feature workflows and state contracts](04-feature-workflows.md)
5. [Responsive layouts, orientations and accessibility](05-responsive-and-accessibility.md)
6. [Content, publishing and communication](06-content-and-publishing.md)
7. [Architecture, delivery phases and acceptance gates](07-delivery-and-architecture.md)
8. [Machine-readable page inventory](pages.json)

## Product boundaries and status

Confirmed direction: Next.js App Router, React, TypeScript; Rust Axum/Tokio;
Firebase Auth, Firestore and Storage; multi-chapter competition management;
professional visual design; supplied WSB logo; full orientation coverage.

Proposed product decisions in this plan are design recommendations. Exact
division eligibility, roster retention, cutoff dates, scoring arithmetic,
deductions, battle format, advancement, refunds and consent terms require a
versioned official source and accountable business owner before activation.
The public website's division list differs from the pasted brief; neither a
marketing heading nor an old proposal is sufficient to implement eligibility.

New supporting capabilities proposed here include guardian access, reviewer and
finance roles, content publishing, support workflows, audit review, ticketing,
privacy requests and operating-system health screens. These close real gaps in
the full journey, but do not imply all must ship in the first pilot.

## Three surfaces, one identity

| Surface | Purpose | Shared identity | Specific treatment |
|---|---|---|---|
| Spectacle | Public discovery and storytelling | WSB logo, charcoal, chrome, volt, strong display type | Editorial composition, authentic dance media, one authored hero sequence |
| Tactical | Registration, administration, judging | Same tokens, type families, labels and icon language | Quiet motion, readable forms, dense but structured data, large touch controls |
| Broadcast | Arena walls and spectator displays | Same identity and publication rules | Oversized type, safe-area composition, controlled reveals, display presets |

## First release objective

A crew manager signs in, selects a chapter and published event, creates a crew,
invites dancers, completes a synthetic registration, and sees a truthful
readiness checklist. Authorized staff can review that registration. This is the
first vertical slice; a live event release additionally needs the payment,
consent, music, check-in and competition capabilities selected for that event.

## How to use the page catalogue

Routes are proposed canonical URLs. Next.js route groups do not appear in URLs.
`[chapterId]`, `[eventId]` and other brackets indicate dynamic identifiers. Every
page inherits the shared state, accessibility, content and permission contracts
in this library. A screen can be a tab or nested route rather than a separate
visual shell; do not build duplicate applications for each role.

Phase labels: P1 identity/registration; P2 payment/readiness; P3 live competition;
P4 multi-chapter expansion and richer public content. P0 is shared design and
architecture preparation. Dependencies, rather than the labels alone, determine
implementation order. A deferred feature remains in the catalogue without
presenting a nonfunctional link to users.

## Evidence and uncertainty

Reference sites were researched on 30 October 2026. Content structure was
retrieved, but there was no complete live visual, motion or device audit of those
sites. Proposed WSB layouts below are original design decisions, not claims that
the references use identical layouts. External copy and imagery are not assets
licensed for reuse. No award status is asserted for WSB.

Plan completeness means every currently identified product surface is specified.
It does not mean business rules, translations, legal text or media have received
owner approval. Track those dependencies in the content checklist and release gates.
