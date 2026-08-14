# AGENTS.md

Guidance for AI agents (and humans) working in this repository.

## What this is

CloserAI — a local-first, model-agnostic, permission-transparent desktop AI workbench built
on DeepSeek Harness. See [`README.md`](README.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Hard rules

- `main` must always build and pass `pnpm check`.
- DSH (`@deepseek-ai/dsh`) is pinned to an exact version — never `latest`.
- Do not fork or patch DSH core; extend via presets, plugins, and a compatibility layer.
- Never commit secrets, tokens, keys, or logs containing them.
- Never weaken or delete tests to make them pass.
- Conventional Commits; significant commits add `Milestone:`, `Constraint:`, `Rejected:`,
  `Confidence:`, `Scope-risk:`, `Not-tested:` metadata.
- Before any non-trivial change, read [`docs/STATUS.md`](docs/STATUS.md) and
  [`docs/DECISIONS.md`](docs/DECISIONS.md); update the former after every task.

## Tooling

| Command             | What it does                     |
| ------------------- | -------------------------------- |
| `pnpm install`      | Install workspace dependencies   |
| `pnpm check`        | format + lint + typecheck + test |
| `pnpm format:check` | Prettier check                   |
| `pnpm format`       | Prettier write                   |
| `pnpm lint`         | ESLint                           |
| `pnpm typecheck`    | `tsc --noEmit` per package       |
| `pnpm test`         | Vitest per package               |
| `pnpm build`        | Compile packages                 |

## Layout

- `apps/*` — the Electron desktop application (v0.0.2+).
- `packages/*` — shared packages: mock provider (v0.0.1), supervisor, agent presets, ...
- `docs/` — architecture, execution plan, status, decisions.

## TypeScript

- ESM with `moduleResolution: NodeNext`; relative imports must use explicit `.js` extensions.
- Type-only imports via `import type` (enforced by ESLint).
- Strict mode with `noUncheckedIndexedAccess`.
