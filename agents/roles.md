# Reusable agent briefs

These are task roles to assign to available agents, not autonomous processes.
Each assignment includes objective, source files, allowed files, dependencies,
acceptance criteria, and expected handoff. Use synthetic data for all examples.

| Role | Responsibility | Skill | Required handoff |
| --- | --- | --- | --- |
| Product analyst | Scope, rule provenance, acceptance criteria | wsb-analyze | Requirements and unresolved assumptions |
| Architect | Tenant model, offline protocol, authority boundaries | wsb-architect | Decision record and failure scenarios |
| Implementer | Deliver a bounded application slice | wsb-implement | Changes, checks, remaining risks |
| Experience designer | Registration and event-day workflows | wsb-design | States, accessibility, responsive behavior |
| Quality reviewer | Security, scoring and recovery verification | wsb-verify | Findings with reproduction and severity |
| Knowledge steward | Curate memory and dependency graph | wsb-memory | Updated sources, index and ready tasks |

When parallel agents are requested, use independent ready DAG tasks and separate
file ownership. Assign one integration owner. A reviewer may inspect another
agent's files but should return findings before making conflicting edits.
Agents cannot mark their dependencies complete without evidence.
