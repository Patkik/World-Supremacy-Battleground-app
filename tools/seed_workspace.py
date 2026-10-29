"""Initial workspace content generator; refuses to overwrite files."""
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
skills = {
 'analyze': ('Analyze WSB requirements, rule provenance, scope and acceptance criteria.',
 '''Read docs/product-brief.txt, docs/open-questions.md and current memory. Separate
user requirements, proposed design, verified rules and assumptions. For each
feature capture actor, chapter scope, trigger, success state, failure state and
acceptance criteria. Identify MVP dependencies and defer optional effects.
Do not present pasted rule claims as official. Produce a requirements document
with source references and update open questions and the task DAG.'''),
 'architect': ('Design WSB tenant boundaries, Firebase data contracts and offline protocols.',
 '''Map actors and authority before collections. Define chapter/event boundaries,
private identity storage, public result projections and server-only actions.
Specify score revisions, offline outbox IDs, acknowledgement, conflicts, locking
and recovery; do not rely on last-write-wins for scoring correctness. Model
payment ledger entries and webhook idempotency separately from roster display.
Document alternatives and migration implications in memory/decisions.md.
Verify current vendor documentation before committing SDK-specific contracts.'''),
 'implement': ('Implement a bounded WSB feature from acceptance criteria through verification.',
 '''Read the relevant acceptance criteria and architecture decision. Establish
the task dependencies and existing app structure before editing. Deliver a
vertical slice with loading, empty, error, unauthorized and offline states when
applicable. Enforce chapter scope server-side. Use synthetic fixtures and never
put secrets in client configuration or memory. Test the changed invariant,
including denial and replay paths for security, payments or scores. Report
actual checks, update task evidence and leave a clear handoff.'''),
 'design': ('Design WSB registration, judging and event-day user experiences.',
 '''Use the product brief for visual direction, not mandatory animation recipes.
Prioritize tablet judge input, visible sync/lock status, recoverable errors and
phone registration. Define responsive states, keyboard and touch interaction,
contrast, reduced motion and poor-network behavior. Never imply a score is
submitted while it only exists locally. Validate layouts with realistic long
crew names and translated labels. Deliver flow, state inventory and rationale.'''),
 'verify': ('Review WSB authorization, scoring, payments and offline recovery behavior.',
 '''Derive expected outcomes from verified requirements. Exercise cross-chapter
reads/writes, role escalation, duplicate payment events, score edits after lock,
offline reconnect conflicts, and unpublished result exposure where relevant.
Use emulator or isolated fixtures once the app exists; never use live dancer
records. Check rounding and tie handling against sourced rules. Return findings
with severity, reproduction, expected behavior and evidence. State coverage
gaps; passing checks must not be represented as a production certification.'''),
 'memory': ('Maintain WSB durable memory, cited retrieval and the task dependency DAG.',
 '''Read source changes before summarizing them. Keep durable facts in project.md,
current work in status.md, and dated decisions with rationale in decisions.md.
Mark superseded decisions; never silently rewrite history. Exclude personal
records, credentials and unpublished scores. Update workflows/tasks.json with
dependency IDs and completion evidence. Run workspace.py check, index and a
relevant search; inspect cited originals. Retrieval is evidence, not authority.
Record unresolved questions instead of converting guesses into project facts.''')
}

def write(path, text):
    p = root / path
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open('x', encoding='utf-8', newline='\n') as f:
        f.write(text)

catalog = '# Project skill library\n\nRead the matching SKILL.md before applying a workflow.\n\n'
for key, (description, body) in skills.items():
    name = 'wsb-' + key
    path = f'.agents/skills/{name}/SKILL.md'
    write(path, f'---\nname: {name}\ndescription: {description}\n---\n\n# {name}\n\n{body}\n')
    catalog += f'- [{name}](../{path}): {description}\n'
write('docs/skill-library.md', catalog)
specs = [
 ('scope', 'Define pilot and acceptance criteria', [], 'analyst', 'Prioritized requirements with sources and unresolved rules'),
 ('architecture', 'Approve data and offline contracts', ['scope'], 'architect', 'Tenant model, authority matrix and conflict protocol documented'),
 ('foundation', 'Build app and isolated development environments', ['architecture'], 'implementer', 'App starts; emulator authorization smoke checks pass'),
 ('registration', 'Crew onboarding and consent', ['foundation'], 'implementer', 'Eligibility and consent states verified with synthetic fixtures'),
 ('payments', 'Payment ledger and reconciliation', ['registration'], 'implementer', 'Verified webhook signatures, replay and refund cases pass'),
 ('judging', 'Offline scoring and authorized locks', ['foundation'], 'implementer', 'Offline recovery, conflicts and lock authorization verified'),
 ('event-ops', 'Music, check-in and stage operations', ['registration'], 'implementer', 'Compliance and venue recovery scenarios verified'),
 ('results', 'Published results and advancement', ['judging', 'registration'], 'implementer', 'Aggregation, ties, publication and eligibility match sourced rules'),
 ('pilot', 'Run a simulated event and release assessment', ['payments', 'event-ops', 'results'], 'reviewer', 'End-to-end rehearsal, access review and recovery evidence recorded')]
write('workflows/tasks.json', json.dumps({'tasks': [dict(id=i, title=t, depends_on=d, owner=o, status='todo', acceptance=a, evidence=[]) for i,t,d,o,a in specs]}, indent=2)+'\n')
