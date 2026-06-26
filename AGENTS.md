# E-Plant Claude Instructions

## Project Overview

This is a Django + DRF backend with a React + Vite + TypeScript frontend for an e-commerce workflow.

## Working Rules

- Make the smallest change that solves the request.
- Do not overwrite user changes or touch unrelated files.
- Prefer fixing the root cause over adding temporary workarounds.
- Keep edits consistent with the existing code style.
- When you change backend models, update serializers, migrations, and any API docs together.
- When you change frontend API payloads, keep the request shape aligned with the backend serializer.
- Everything needs to be tested.
- Before every commit, run `check-all.sh` and fix any errors if they occur.

## Token Efficiency — MANDATORY

These rules apply to every response, no exceptions:

### Reading files
1. **Grep first, Read second.** Use `Grep` to find the exact symbol/pattern, then `Read` only those lines with `offset` + `limit`. Never `Read` a whole file speculatively.
2. **Targeted reads.** If you need a function, grep for it, note the line number, then `Read` ±30 lines around it.
3. **Parallel reads.** When you need multiple independent files, issue all `Read`/`Grep` calls in a single message, not one-by-one.
4. **Never read a file just to understand structure.** Use `Glob` to find files, `Grep` for symbols. Read only when you need the exact content to make an edit.

### Exploration
 5. **Use a read-only exploration subagent** for any open-ended codebase question ("how does X work?", "where is Y defined?"). It returns a summary — the raw file content never lands in this context window.
 6. **Do not explore and then repeat the work yourself.** If you delegate to the exploration subagent, use its summary directly.
 7. **For project history and context**, ask claude-mem about prior decisions, architectural notes, known issues, and completed work. It returns a summary of project knowledge without cluttering the context window.

### Edits
7. **Edit, don't rewrite.** Use `Edit` with the smallest `old_string` that uniquely identifies the change. Never rewrite a whole file with `Write` unless it's a new file.
8. **One read per file per session.** Cache what you read mentally. Don't re-read the same file later.

### Validation
9. **Run tests with `docker compose exec -T backend pytest <specific-test-file>`**, not the full suite, unless a full run is explicitly needed.
10. **Lint only changed files** when possible.


## Backend

- Backend lives in `backend/`.
- Main app areas:
  - `backend/products/`
  - `backend/orders/`
  - `backend/users/`
- Use Django management commands for data imports and maintenance tasks.
- Product API endpoints are under `/api/products/`.

## Frontend

- Frontend lives in `frontend/`.
- Use the existing React Query and API client patterns already in the repo.
- Keep forms and `FormData` payloads in sync with the backend field names.
- Design is designed in ./claude/design

## Common Commands

### Backend

```bash
make test
make lint
make format
make migrate
make makemigrations
docker-compose up
```

### Frontend

```bash
cd frontend
npm install
npm run dev
npm run lint
npm run test
npm run build
```

## Testing Guidance

- Use prepared check-all.sh for testing and just add tests.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
