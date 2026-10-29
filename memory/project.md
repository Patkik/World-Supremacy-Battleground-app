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
