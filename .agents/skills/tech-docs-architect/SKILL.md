---
name: tech-docs-architect
description: Write, structure, or review READMEs, developer onboarding, API and schema references, system manuals, technical specifications, and Architecture Decision Records using Diataxis and docs-as-code practices.
---

# Tech Docs Architect

Create clear, scannable technical documentation grounded in the actual project. Use Diataxis to keep learning, task completion, reference lookup, and architectural reasoning distinct.

## 1. Classify the document

Identify the audience, purpose, source of truth, and requested output. Choose one or more quadrants and separate them into documents or clearly labeled sections:

| Quadrant | Reader goal | Document shape |
| --- | --- | --- |
| Tutorial | Learn through a first working result | Guided, sequential path with expected results |
| How-to | Complete a specific task | Prerequisites, steps, verification, recovery |
| Reference | Look up exact machinery | Contracts, parameters, types, constraints, examples |
| Explanation | Understand context and trade-offs | Concepts, architecture, rationale, alternatives |

A README can orient readers and link to all four; avoid mixing a beginner walkthrough with exhaustive reference tables in one section. Preserve established repository conventions when editing existing docs.

## 2. Lead with the outcome

Open each document or major section with a one- or two-sentence summary explaining what the system or module does and why it exists. Put prerequisites, a usable quick start, and high-level architecture near the top as appropriate to the document type. Put uncommon cases and implementation detail later.

Verify runtime versions, service dependencies, commands, ports, environment names, and paths against current source and configuration. Do not label proposed or untested behavior as implemented. Distinguish required setup, optional configuration, and unresolved external dependencies.

## 3. Make instructions concrete

- Provide copy-pasteable commands with the correct working directory and shell. State exact required runtime versions and services for setup documents.
- Show expected results and a way to confirm success. Include recovery steps for likely failures when relevant.
- Use environment templates with clearly marked placeholders such as `<YOUR_API_KEY>`; never copy actual secrets or personal records into examples.
- Use realistic synthetic JSON and cURL examples. Align required fields, types, status codes, authorization, and response bodies with the implemented API.
- For API references, describe scope, authentication, request/response contracts, validation failures, pagination, idempotency, and concurrency semantics where implemented.
- Use Mermaid architecture, sequence, or entity diagrams when they explain relationships more clearly than prose. Keep names consistent with code; distinguish logical architecture from deployed infrastructure.

Keep tutorials focused on one successful learning path. Put complete flags, schemas, and error catalogs in reference material linked from that path.

## 4. Record architectural decisions

When documenting a technology or design choice, use an ADR with a short title and status, followed by:

- **Context:** The problem, constraints, and supporting evidence.
- **Decision:** The selected approach and its boundaries.
- **Alternatives considered:** Plausible alternatives and why they were rejected.
- **Consequences:** Benefits, accepted costs, operational effects, and limitations.

Include the date and source links when available. Use proposed status for unapproved decisions. Preserve historical ADRs and document supersession rather than rewriting the record to imply a different original decision.

## 5. Verify and deliver

Check all fenced blocks have language tags, placeholders are explicit, relative links resolve, and installation steps follow a logical zero-to-running sequence. Test safe local commands when feasible; report commands that could not be verified. Check Mermaid syntax and labels, and ensure diagrams reflect current source.

Keep paragraphs at four sentences or fewer. Convert longer passages into a concise list, table, or diagram when useful. Provide an entry point and links for multi-document output; avoid duplicating contracts across files. Use the project's documentation checks when available, and report material gaps without claiming completion from document existence alone.
