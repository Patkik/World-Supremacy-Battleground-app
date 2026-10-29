# Durable memory and retrieval

`memory/project.md` stores stable context; `status.md` stores the current handoff;
`decisions.md` records dated decisions, rationale, and evidence. The original
proposal stays in `docs/product-brief.txt`. Avoid duplicating long documents.

The tool indexes only `.md`, `.txt`, and `.json` files within `memory`, `docs`,
`agents`, `workflows`, and `.agents/skills`. Never add sensitive personal data
or secrets to these paths. Symlinks are excluded. The index in `.workspace` is
ignored by Git. Reindexing replaces it and removes deleted sources.

Chunks carry file paths and line ranges. TF-IDF vectors are compared with cosine
similarity. Queries with no shared vocabulary return no results. This baseline
does not understand synonyms or meaning like a neural embedding model. Search
automatically refreshes a stale index. Read the cited source before making a
decision; a high similarity score does not establish truth or authority.

RAG workflow: retrieve relevant chunks, inspect originals, reason using verified
evidence, cite the files, and record only new durable conclusions. The search
tool supplies context; the coding assistant performs answer generation.

For future semantic retrieval, choose a local embedding model or an explicitly
authorized service, record model/version/dimensions in index metadata, rebuild
all vectors on change, and evaluate synonym queries and known-answer fixtures.
Do not upload this corpus to an external service by default. Production app
data retrieval requires separate tenant-scoped authorization and storage.
