# Foundation validation — 2026-10-29

Executed locally:

- `npm run build`: passed, production route prerendered successfully.
- `npm run typecheck`: passed.
- Rust 1.99.1 `cargo test --workspace` in Docker: passed, three tests covering
  chapter/role checks, malformed tokens, public health and protected session.
- `cargo check --locked --workspace --all-features` in Docker: passed, including
  the optional Firestore gRPC adapter.
- `cargo fmt --all --check`: passed on Windows.
- Native Windows Rust compile-and-run smoke check: passed after installing
  Microsoft Visual Studio 2022 C++ Build Tools and Windows SDK.
- `npm run test:rules`: passed, two tests against demo-wsb Firestore emulator.
  Covered public published/draft visibility, anonymous membership denial,
  same-chapter self read, cross-chapter denial, self-promotion denial and direct
  score-write denial. Expected permission-denied messages are successful negative
  assertions, not test failures.

Limits:

- Full backend tests ran in Linux containers; Windows validation covers the
  compiler/linker smoke check and formatting, not the entire backend test suite.
- CI is configured but has not executed remotely.
- Real-project Firebase connectivity, auth providers, Firestore location,
  deployed security rules and Storage flows have not been inspected.
- Browser interaction, offline recovery, load targets, payment integration and
  business rules are not validated by these checks.
- No deployment occurred. Production readiness is not claimed.
