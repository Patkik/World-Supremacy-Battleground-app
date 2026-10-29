# World Supremacy Battlegrounds workspace

Project foundation for the multi-chapter competition platform: Next.js / React /
TypeScript frontend, Rust Axum/Tokio API, and Firebase. Initial application code
is in `apps/web` and `apps/api`; cloud resources have not been deployed.

See [architecture](docs/architecture.md) for the selected stack and boundaries,
and [development setup](docs/development.md) for commands and validation limits.
Run `npm run dev` for the frontend after installing dependencies.

The [complete website plan](docs/website-plan/README.md) specifies 116 pages and
screen families, roles, features, landing-page direction, content and responsive
behavior for the planned full platform.

The [interactive design preview](http://localhost:3000/preview) includes public
pages, a crew workspace, registration, a judge desk and an arena display. Run
`npm run dev` to serve it. [Validation and limitations](docs/prototype-validation.md)
describe the browser-local sample interactions and tested viewport sizes.

## Start here

1. Read [project context](memory/project.md) and [current status](memory/status.md).
2. Choose a workflow from the [skill library](docs/skill-library.md).
3. Use the [agent role briefs](agents/roles.md) when assigning specialized work.
4. Review [open decisions](docs/open-questions.md) before implementing domain rules.

From this directory, using Python 3.10 or newer:

```powershell
python tools/workspace.py check
python tools/workspace.py dag
python tools/workspace.py index
python tools/workspace.py search "offline judging score conflicts"
python -m unittest discover -s tests -v
```

Retrieval uses local TF-IDF vectors and cosine similarity with source citations.
It needs no service, credentials, package downloads, or external data transfer.
This is lexical vector retrieval, not neural semantic embeddings. See
[memory and retrieval](docs/memory.md) for its limits and upgrade path.

The roadmap in `workflows/tasks.json` is a directed acyclic graph. The command
validates dependencies and reports tasks ready to start; it does not execute
tasks or start agents. Edit statuses with evidence as work progresses.

Skills live under `.agents/skills/`; `AGENTS.md` also routes agents explicitly
to this library. Everything here is scoped to this project.
