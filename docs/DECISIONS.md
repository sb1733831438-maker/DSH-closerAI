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

## D-008 — DSH child runs as `ELECTRON_RUN_AS_NODE` + `--expose-internals`

**Decision:** The Electron main spawns the bundled `@deepseek-ai/dsh` bin as
`process.execPath` with `ELECTRON_RUN_AS_NODE=1` and the `--expose-internals` V8 flag, using no
shell.

**Why:** `process.execPath` in Electron is `electron.exe`; without `ELECTRON_RUN_AS_NODE` the
child would boot a second Electron app instead of running the DSH script. DSH's web profile
includes an HMR loader that requires V8 internals under Electron's bundled Node (v24.18); the
flag makes it apply cleanly. No shell avoids `.cmd` shim quoting and Node's DEP0190 warning.
This also matches the packaging goal: the app ships DSH and Node (via Electron) with no
user-installed prerequisites.

## D-009 — CSP allows inline/eval scripts for the DSH SPA

**Decision:** The renderer CSP uses `script-src 'self' 'unsafe-inline' 'unsafe-eval'` while
keeping `default-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'none'`,
`form-action 'none'`, and `frame-ancestors 'none'`.

**Why:** DSH's production SPA emits inline boot scripts and evaluates code at runtime, so a
fully strict `script-src` breaks it (verified via renderer console). The compromise preserves
the important boundaries — no remote origins, no object/frame/form/base escape — while keeping
the UI usable. **Revisit** in v0.0.8 to replace the inline scripts with exact hashes if DSH's
build allows it.

## D-010 — Sandboxed preload is hand-written CommonJS

**Decision:** `apps/desktop/src/preload/index.cjs` is plain CommonJS (not TypeScript) copied
verbatim to `dist/preload/index.cjs` at build time; ESLint is configured to allow `require`
there.

**Why:** Electron sandboxed preload scripts cannot be ESM, and TypeScript 5.x no longer emits
CommonJS via `--outFile`. A hand-written `.cjs` file is the smallest correct artifact and keeps
the preload trivially auditable.

## D-011 — API keys via safeStorage + environment injection

**Decision:** Provider API keys are encrypted with Electron `safeStorage` (macOS Keychain,
Windows DPAPI, Linux libsecret) into a separate secrets file, and injected into the DSH child
only as the `DEEPSEEK_API_KEY` environment variable. The provider profile file and DSH
`settings.yaml` never contain a key.

**Why:** DSH's credentials seam resolves the key with the inherited process environment at the
highest precedence, so an env injection is the least invasive way to feed a keychain-held secret
without materializing it on disk or into DSH-managed files. This satisfies the "key never in
files/logs/renderer" requirement.

## D-012 — DeepSeek adapter doubles as the OpenAI-compatible adapter

**Decision:** The generic OpenAI-compatible provider reuses DSH's `deepseek-official` route with
a custom `baseURL` and model catalog rather than shipping a separate adapter.

**Why:** DSH's `dsh-llm-deepseek` adapter speaks the OpenAI chat-completions protocol and accepts
an arbitrary `baseURL`, so it already covers any OpenAI-compatible endpoint. Reusing it avoids a
second adapter to maintain while still satisfying "model-agnostic" configuration.

## D-013 — Modes are agent presets + child working directory

**Decision:** Chat/Work/Code isolation is implemented as three DSH agent presets (tool-set
differences: Chat has no shell/fs, Work has fs without shell, Code has the full set) plus the DSH
child's working directory, which becomes the sandbox workspace root. The active mode selects the
default preset and the child cwd.

**Why:** DSH enforces the workspace-write filesystem fence against the session workspace root
(derived from the child cwd / session cwd), so pointing the DSH child at the app sandbox or the
authorized directory gives real containment rather than prompt-level restriction. The preset
tool-set is the capability surface, which the goal requires to be a profile combination, not
wording alone.

## D-014 — Session history is file-level, DSH owns the content

**Decision:** CloserAI manages sessions at the directory level under
`DSH_HOME/sessions/<workspaceKey>/session-<uuid>/` — list with id/workspace/size/mtime,
delete, export, and import. It never parses or rewrites `session.jsonl.zstd`.

**Why:** DSH renders titles and messages in its own UI and owns the zstd-encoded records;
reading them in-app would require a zstd dependency plus re-encoding risk. Whole-directory
operations are safe, sufficient for backup/restore, and keep a hard ownership boundary.

## D-015 — Projects materialize into the existing AppConfig

**Decision:** Activating a project writes the project's mode + workspace into the legacy
`app-config.json` (the same values the mode switcher used), then restarts DSH.

**Why:** The backend, presets, and workspace routing already key off AppConfig; materializing
avoids touching the proven mode-routing path while giving projects the same effect. The old
mode IPC stays functional for backwards compatibility.

## D-016 — Navigation lock exempts the app's own renderer entry

**Decision:** The hardened window's `will-navigate` handler allows navigation to the app's
own renderer `index.html` (any query — the onboarding and manage views), while everything
else stays locked to the DSH origin or is denied.

**Why:** Loading `index.html?view=manage` from the DSH UI was blocked by the same-origin
rule and crashed the renderer mid-navigation. Exempting one trusted app file keeps the lock
strict for everything else and fixes the manage page. **Revisit** in v0.0.8 when the CSP
script hashes land.

## D-017 — Diagnostics logs are redacted in the main process

**Decision:** Diagnostic log lines are passed through a sanitizer in the main process
(sk- keys, bearer tokens, key=value secrets, env echoes) before they reach the renderer or
an export file.

**Why:** Guarantees secrets never leave the main process even if a DSH child once echoed
one; the requirement is absolute.

## D-018 — Capability toggles render presets as a block-scoped text transform

**Decision:** Capability toggles (web search/fetch/skills) are applied to the app-owned
preset YAML with a line-based, block-scoped transform keyed on top-level `- id:` entries,
not a YAML AST edit.

**Why:** The checked-in presets use YAML tags such as `!!js` that plain js-yaml cannot
parse; a precise text transform on files the app owns is safe and testable.

## D-019 — Permission manifest mirrors the designed presets

**Decision:** The management page shows a static per-mode permission manifest that mirrors
the checked-in presets; the actual enabled tools additionally depend on the capability
toggles.

**Why:** DSH's bundled runtime exposes no stable API to query its live tool roster, so a
designed-surface manifest is honest and sufficient for transparency.
