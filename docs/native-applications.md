# Native chapter and studio proposal intake

The public `/community/apply` page accepts chapter, studio hub and brand/event
partnership proposals inside WSB. It collects the organization name and region,
the requester's role and contact, an optional public URL, and a short proposal.
The applicant selects a regional chapter; the Rust inquiry command stores a
chapter-scoped private conversation and returns its durable reference. A
capability key allows the requester to continue the conversation without a
chapter account. Exact retries keep the original receipt.

The selected chapter's support or chapter-director role can read the request,
reply, and update the conversation status using the existing server-authorized
support queue. Incorrect keys, cross-chapter access and unauthorized staff
actions continue to use the inquiry access checks. Request text is private and
does not enter a public chapter or studio directory.

This is a **proposal intake and follow-up**, not an affiliation approval. It
does not create a chapter, studio listing or partner agreement, issue a license,
promise a response time, or assert that WSB accepted the proposal. A global HQ application
queue, HQ membership provisioning, review rubric, decision states, and approved
privacy/retention lifecycle remain unfinished. Until those exist, the form routes
requests to an existing selected chapter's support team and says so before
submission.

Only demo-wsb data is used for local verification. Browser fixtures use
synthetic organizations, names, emails and messages. `tests/applications-browser.cjs`
checks chapter, studio and partner proposals, chapter reviewer replies,
wrong-key denial, and requester recovery after reload at desktop and mobile
widths.
