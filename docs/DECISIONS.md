# Decisions

Reversible engineering decisions are recorded here with their rationale. Update this file
when a decision changes.

## D-001 — pnpm monorepo workspace

**Decision:** One pnpm workspace with `apps/*` (desktop) and `packages/*` (shared packages).

**Why:** The product spans an Electron app, a DSH supervisor, agent presets, and a mock
provider. A workspace gives shared tooling (TS/ESLint/Prettier/Vitest), atomic cross-package
versioning, and clean dependency boundaries while keeping a single `pnpm check`.

## D-002 — DSH runs as a child process, pinned exactly

**Decision:** The desktop main process spawns the `dsh` CLI as an isolated child on a random
`127.0.0.1` port and talks HTTP. `@deepseek-ai/dsh` is locked to `0.1.0-rc.6` (exact, never
`latest`).

**Why:** Keeps the agent runtime out of Electron main, makes crash recovery a process
concern, honors the "no core fork" rule, and guarantees reproducible behavior across
upgrades.

## D-003 — Isolation modes are DSH agent presets, not prompts

**Decision:** Chat / Work / Code are implemented as distinct DSH agent presets (tool sets +
sandbox policy + prompt sections) mounted per session, rather than a single preset with
prompt-level restrictions.

**Why:** The goal requires capability isolation that cannot be satisfied by wording alone.
DSH's preset composition is the native mechanism for this.

## D-004 — Deterministic mock provider, dependency-free HTTP

**Decision:** `@closerai/mock-provider` uses Node's built-in `http` module (no framework)
and an FNV-1a digest for determinism, exposing an OpenAI-compatible `/v1/chat/completions`
and `/v1/models`.

**Why:** Lets the whole stack be tested and used with no API key, keeps the dependency tree
small, and gives byte-stable responses for assertions.

## D-005 — TypeScript config strategy

**Decision:** A shared `tsconfig.base.json` extended by per-package configs; `typecheck` runs
`tsc --noEmit` per package; ESLint uses the non-type-aware recommended presets.

**Why:** Avoids composite-project/reference complexity for a small monorepo while keeping
strict checking and editor support.

## D-006 — Local git identity placeholder

**Decision:** Initial commits use `user.name=CloserAI` and
`user.email=sb1733831438-maker@users.noreply.github.com` (repo-local), with commit signing
disabled.

**Why:** No global identity or signing key exists in this environment. The email routes to
the owner's GitHub account without exposing a real address. **Revisit:** replace with the
maintainer's real name/email and enable signing if desired.

## D-007 — Repository name and first-version branch policy

**Decision:** The public repository is `sb1733831438-maker/DSH-closerAI`, matching the local
directory name and the product's "CloserAI" identity. v0.0.1 was built directly on `main`
because the repository had no prior `main` to diverge from; from v0.0.2 onward every minor
version gets a `release/v0.0.x-<short-name>` branch merged back into `main`.

**Why:** The directory name reflects the user's chosen identity. Bootstrap work on `main` is
safe only when the repository is empty; the release-branch rule applies once a stable `main`
exists to protect.
