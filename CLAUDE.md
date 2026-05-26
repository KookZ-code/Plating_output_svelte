# CLAUDE.md — SvelteKit Professional Frontend

Behavioral + project-specific guidelines for AI coding agents.

---

## Behavioral Guidelines

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

### 5. Function-First Thinking

**Before writing code, ask: should this be a function?**

- If logic runs more than once → extract a function, don't copy-paste.
- If a utility already exists in `$lib/utils/` → use it, don't recreate it.
- If a query/mutation already exists in `$lib/queries/` → reuse it.
- Prefer composing small, named functions over large inline blocks.
- Minimum code: if a one-liner solves it, don't write ten lines.

### 6. No Hardcoding

**All environment-specific values belong in `.env` or a config file.**

- Never hardcode URLs, ports, API endpoints, secrets, or feature flags in source code.
- Read from `import.meta.env.VITE_*` (client) or `process.env.*` (server/config) only.
- Add every new env variable to `.env.example` with a placeholder value.
- If a value might change between dev / staging / prod → it must be an env var.

### 7. Requirements Discovery First

**Before starting any non-trivial task, align on requirements.**

- Ask **ONE question at a time** until you fully understand the requirements. Don't batch multiple questions.
- Once requirements are clear, write a design summary (200–300 words) and ask: *"Does this match what you want?"* Wait for approval before writing code.
- Every significant decision or plan must be written as a Markdown file:
  - `/docs/plan/` — implementation plans, feature breakdowns
  - `/docs/discussion/` — tradeoff analyses, architecture decisions, rejected alternatives

### 8. Comment Complex Functions

**Long or non-obvious functions must explain their intent.**

- If a function is longer than ~30 lines or contains non-obvious logic, add a comment block above it explaining: *what it does*, *why it exists*, and *any tricky edge cases*.
- Inline comments for logic that isn't self-evident from the variable/function names.
- Don't comment obvious code (`// increment counter` above `count++` is noise).

### 9. Use Existing Agents First

**Before creating new tooling, check what agents already exist.**

- Review the available agent list before building custom logic: `architect`, `planner`, `tdd-guide`, `security-reviewer`, `typescript-reviewer`, `e2e-runner`, etc.
- Match the agent to the task: planning → `planner`, TypeScript errors → `typescript-reviewer`, E2E → `e2e-runner`.
- Only create new agents/tools if no existing agent covers the need.

### 10. Design System Compliance

**All visual values come from `DESIGN.md`. Zero exceptions.**

`DESIGN.md` is the single source of truth for every color, font, radius, spacing, and component spec. It was extracted directly from the Microchip production CSS.

- **Before writing any CSS or Tailwind class**, read `DESIGN.md` to find the correct token.
- **Colors** → use only hex values listed under `colors:` in `DESIGN.md`. Never invent a shade.
- **Typography** → sizes, weights, and line-heights must match `typography:` in `DESIGN.md`.
- **Spacing / radii** → use values from `rounded:` and `spacing:` — do not freestyle `px` values.
- **Components** → `button-solid`, `button-outline`, `card`, `input`, `chip`, `table-*` specs are in `components:` — implement them exactly.
- **Tailwind CSS 4 tokens** → define design tokens as CSS custom properties in `src/app.css` under `@theme`. Map every token from `DESIGN.md` once there; components reference `var(--color-primary)`, `var(--font-size-h1)`, etc. — never hardcode.
- If a visual decision is not covered by `DESIGN.md`, **stop and ask** — do not guess.

---

## Project Overview

Professional SvelteKit frontend. Target stack:
- **Svelte 5** with Runes syntax (`$state`, `$derived`, `$effect`)
- **SvelteKit 2** for routing and SSR/SSG
- **TanStack** (Query / Table / Form) for server state, tables, and form management
- **Tailwind CSS 4** for styling
- **TypeScript** — strict, no `any`
- **Vite 6** for dev server and build
- Deployed on **IIS Windows Server** via `sveltekit-adapter-iis`
- API backend endpoint is **user-defined** via `.env` — never hardcoded in source.

---

## Architecture

> **Before every session**, scan the actual filesystem to get the current structure.
> Do **not** rely on a static tree here — the project evolves and the file below may be stale.
> Use the file-search / list-dir tools to load the real layout before editing.
> Use the official Svelte/SvelteKit structure as the reference (svelte.dev / kit.svelte.dev), then map your current folders to that reference.

Expected folder roles (may grow over time):

| Path | Purpose |
|---|---|
| `src/lib/types/index.ts` | All shared TypeScript interfaces |
| `src/lib/utils/api.ts` | Typed API client — single entry for all HTTP calls |
| `src/lib/utils/` | Pure utility functions (reuse before creating new ones) |
| `src/lib/components/` | Shared UI components |
| `src/lib/stores/` | Svelte 5 rune-based reactive state |
| `src/lib/queries/` | TanStack Query/Mutation factories |
| `src/routes/` | SvelteKit file-based routes |
| `src/routes/+layout.svelte` | Root layout — QueryClient provider lives here |

---

## Deployment (IIS)

- Adapter: `sveltekit-adapter-iis` — generates `web.config` automatically.
- Set `ORIGIN` in `.env` to match the IIS site URL before building for production.
- Set `BASE_PATH` in `.env` if deploying to a sub-path (e.g. `/myapp`).

```env
# .env
ORIGIN=https://myapp.example.com
# BASE_PATH=/myapp   # uncomment if sub-path
```

---

## Testing

- **Unit** (Vitest): pure functions, utility helpers, type guards in `src/lib/`.
- **Integration** (Vitest + jsdom): component logic with mocked API.
- **E2E** (Playwright MCP): use the Playwright MCP tool for actual browser tests against the running dev server. Prefer this over mocked assertions for UI flows.

Playwright MCP workflow:
0. Have Playwright MCP ? no require user `claude mcp add playwright npx @playwright/mcp@latest`
1. Start dev server (`npm run dev`).
2. Use Playwright MCP tools (`open_browser_page`, `click_element`, `type_in_page`, `screenshot_page`) to drive the browser.
3. Assert via `read_page` or screenshot comparison — not just code-level assertions.
4. Critical flows to always cover: data load, create, update, delete, pagination, error states.

Test files live next to source: `foo.ts` → `foo.test.ts`.

---

## Do Not

- Do not use Svelte 4 `writable` / `readable` / `derived` stores in new code.
- Do not `fetch` directly in components — use the API client.
- Do not use `any` in TypeScript.
- Do not add dependencies without confirming the need — keep `package.json` lean.
- Do not commit `.env` (only `.env.example`).
- Do not bypass `npm run check` errors before committing.
- Do not hardcode URLs, ports, secrets, or environment-specific values — use `.env`.
- Do not duplicate logic that already exists in `$lib/utils/` or `$lib/queries/` — reuse it.
- Do not assume the project structure is what CLAUDE.md shows — always scan the filesystem first.
- Do not write inline logic that could be a named, reusable function.
- Do not add caching unless there is a proven performance bottleneck and the caching strategy (keys/TTL/invalidation) is agreed upfront.
- Do not hardcode any color hex, font size, border-radius, or spacing pixel value — all visual values must come from `DESIGN.md` tokens defined in `src/app.css`.
- Do not deviate from the Microchip design system (Open Sans font, flat/engineering aesthetic, approved color palette) — if unsure, read `DESIGN.md` first.