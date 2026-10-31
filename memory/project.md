# Project context

Source: `docs/product-brief.txt`, provided by the user on 2026-10-29.
Status: proposed requirements, not an official rules source.

WSB aims to replace manual registration, payments, judging, and results tracking
across international and regional chapters. Proposed stack: PWA, Firebase Auth,
Firestore, Storage, Cloud Functions, FCM, and possibly Realtime Database for
venue state. Updated stack decision: Next.js App Router with React/TypeScript,
Rust Axum/Tokio for business logic, and Firestore as the primary database.
The supplied Firebase project is model-palace-346207. Deployment region remains
undecided pending inspection of its Firestore location. See docs/architecture.md.

Domains: chapter hierarchy; crew and dancer onboarding; age and residency checks;
consent; music compliance; split payments; QR check-in; offline judging; battle
brackets; stage monitoring; controlled result publication; advancement.

The proposed visual direction uses obsidian surfaces, volt accents, crimson
alerts, bold display type, and tabular scoring data. Venue usability,
accessibility, reduced motion, and low bandwidth take priority over effects.

Sensitive domains include minors, identity documents, payment transactions, and
unpublished scores. Development knowledge must contain synthetic examples only.


## User goal reaffirmed — 2026-10-30

Implement the complete paperless, multi-chapter WSB competition operating system
from `docs/product-brief.txt`: crew/dancer onboarding, verification and consent,
localized and split payments, audio compliance, offline judging, venue operations,
published results and advancement, with global/chapter administration. The user
explicitly requested proceeding with all implementation and remembering this goal.
A visual prototype or the existence of all 116 routes does not meet that goal.
Unverified rulebook proposals still require provenance before production use.
See `docs/implementation-audit-2026-10-30.md` for actual capability gaps and gates.

## Native forms requirement — 2026-10-30

The user explicitly requires our own forms tailored to the WSB system, rather
than redirecting core workflows to the older website or external form services.
Treat this as part of the full implementation goal. `docs/native-workflows.md`
records the redirect/form audit and acceptance criteria; `native-system-forms`
is an active task. Source links may provide evidence but do not replace native
registration, consent, payments, support or administration.

## Payment provider choice — 2026-10-31

The user selected PayMongo as the payment medium and asked for local emulation
until keys are available. Keep PayMongo server credentials outside client and
chapter records. The local emulator must be clearly synthetic and never move money.
