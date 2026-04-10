# AI Agent Workflow Log

## Agents Used

- **Claude (claude.ai / Claude Code)** — primary agent for architecture, code generation, refactoring, bug identification, and documentation
- **GitHub Copilot** — inline completions for boilerplate (import statements, type annotations)
- **Cursor Agent** — used for multi-file refactoring (moving domain logic from components to `core/application/`)

---

## Prompts & Outputs

### Example 1 — Hexagonal architecture scaffolding

**Prompt:**
> "Set up a Node.js + TypeScript project using hexagonal architecture with directories: core/domain, core/application, core/ports, adapters/inbound/http, adapters/outbound/postgres, infrastructure/db, infrastructure/server. Create placeholder files following ports-and-adapters pattern."

**Output (Claude):**
Generated the full directory tree, `entities.ts` with domain interfaces, `repositories.ts` port interfaces, and `useCases.ts` skeleton — all with zero framework dependencies in core.

**Refinement:**
Had to correct brace-expansion in the initial shell command (`mkdir -p src/{core/{domain,application,ports},...}`) which created literal directory names like `{core` instead of nested dirs. Fixed manually and re-scaffolded.

---

### Example 2 — Route comparison bug fix

**Prompt:**
> "The `/routes/comparison` endpoint returns 404. The router registers `/:routeId/baseline` before `/comparison`. Fix the route ordering."

**Output (Claude):**
Identified that Express matches routes in registration order — `/:routeId` would capture the string `"comparison"` as a param. Moved `/comparison` GET handler above the `/:routeId` POST handler.

**Validation:**
Confirmed fix by testing `GET /routes/comparison` returned comparison data instead of 404.

---

### Example 3 — Frontend API base URL fix

**Prompt:**
> "API calls from the frontend return 404. The `BASE` is set to `'/'` and paths don't have leading slashes. Fix so Vite proxy intercepts correctly."

**Output (Claude):**
Changed `BASE` from `'/'` to `''` and prefixed all paths with `/` (e.g., `'/routes'`, `'/compliance/cb'`). Vite proxy matches on paths starting with `/routes`, `/compliance`, etc.

---

### Example 4 — Frontend core use cases

**Prompt:**
> "Extract pure domain logic (isCompliant, computeCB, computePercentDiff, validatePoolSum) into `frontend/src/core/application/useCases.ts` with no React dependencies, so they can be unit-tested."

**Output (Claude):**
Generated `useCases.ts` with typed exports and matching Vitest test cases in `domain.test.ts` covering surplus/deficit/zero edge cases.

---

## Validation / Corrections

| Change | How Validated |
|--------|--------------|
| Route ordering fix | Manual curl: `GET /routes/comparison` returned 200 with data |
| API base URL fix | Browser network tab showed requests going to correct proxied URLs |
| Seed data | `GET /routes` returned all 5 routes with correct GHG values |
| CB formula | Unit test confirms `(89.3368 − 88.0) × (5000 × 41000) > 0` |
| Pool validation | Unit tests for sum ≥ 0, deficit/surplus rules |

---

## Observations

**Where agent saved time:**
- Generating all boilerplate (handlers, repositories, port interfaces) in one shot
- Writing comprehensive mock-based unit tests for use cases
- Drafting README with architecture diagrams and API tables

**Where agent failed or hallucinated:**
- Initial brace-expansion scaffold created literal `{core` directory names — bash brace expansion doesn't work inside `mkdir -p` with nested braces in all shells
- Agent initially placed `/comparison` route after `/:routeId/baseline` — a subtle Express ordering bug that required correction
- `BASE = '/'` in api.ts caused double-slash URLs — agent missed this initially

**How tools were combined:**
- Claude for architecture decisions and multi-file generation
- Copilot for quick type annotation completions within existing files
- Cursor's multi-file context for refactoring components to extract pure functions

---

## Best Practices Followed

- Used Claude's `tasks.md`-style prompts: one clear goal per prompt with explicit output format
- Validated every generated snippet against the assignment spec before accepting
- Kept core domain files free of `express`, `react`, or `pg` imports
- Used Copilot only for low-risk completions (imports, interface stubs), not logic
- Committed incrementally: scaffold → domain → backend use cases → handlers → frontend components → tests → docs
