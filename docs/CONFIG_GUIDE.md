# Config guide

`package.json` cannot hold comments (JSON forbids them), so every line is explained here instead.
All other config files carry line-by-line comments with the same three tags:

- **[TWEAK]** safe to change
- **[CAREFUL]** changeable, but other code depends on it
- **[LOCKED]** do not touch (breaks determinism, saves, or the architecture rules)

## Where do I tweak the game mechanics?

| I want to change… | Edit | Tag |
|---|---|---|
| Health cap (30) | `MAX_HEALTH` in `src/engine/types.ts`, plus `tests/smoke.test.ts` | TWEAK |
| Court Card HP / ATK dice | `src/engine/data/` (Phase 2) | TWEAK |
| Major Arcana HP / ATK / text | `src/engine/data/` (Phase 2) | TWEAK |
| A boss passive or spell | `src/engine/bosses/` (Phase 4) | CAREFUL |
| Starting hand size, deck sizes | `src/engine/data/` (Phase 2) | TWEAK |
| How RNG works, state shape, save `version` | `src/engine/types.ts` | LOCKED |

## package.json: scripts

| Script | Runs | Tag |
|---|---|---|
| `dev` | Vite dev server with live reload | LOCKED |
| `build` | Production build into `dist/` | LOCKED |
| `preview` | Serves the built `dist/` locally | TWEAK |
| `test` | Vitest, one pass (CI uses this) | LOCKED |
| `test:watch` | Vitest, re-runs on save | TWEAK |
| `typecheck` | `svelte-check` against `tsconfig.json` | LOCKED |
| `lint` | ESLint, including the engine purity guard | LOCKED |
| `format` / `format:check` | Prettier write / verify | TWEAK |
| `check` | typecheck + lint + test + build in one go | TWEAK |

Other fields: `"private": true` stops an accidental npm publish (LOCKED). `"type": "module"`
makes every `.js` file use `import`/`export` (LOCKED, the config files depend on it).

## package.json: dependencies (all dev-only)

| Package | Why it is here | Tag |
|---|---|---|
| `vite` | Dev server and bundler | LOCKED |
| `svelte` | UI framework (v5, runes mode) | LOCKED |
| `@sveltejs/vite-plugin-svelte` | Lets Vite compile `.svelte` files | LOCKED |
| `typescript` | Type checking. **Pinned to 6.x on purpose**: TypeScript 7 is not yet supported by `typescript-eslint` or `svelte-check`. Upgrade only after both add support. | LOCKED |
| `vitest` | Test runner | LOCKED |
| `svelte-check` | Type-checks `.svelte` files | LOCKED |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`, `globals` | Linting, including the rule that keeps the engine DOM-free and deterministic | LOCKED |
| `prettier`, `prettier-plugin-svelte` | Code formatting | TWEAK |

## The engine purity guard (ESLint)

Inside `src/engine/` the linter fails on `Math.random`, `Date.now`, `new Date()`, `window`,
`document`, `localStorage` and `indexedDB`. This protects "same seed + same actions = same game"
and the zero-UI-code rule. Verified in Phase 1 with a probe file that failed all five checks.
