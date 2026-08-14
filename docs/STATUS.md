# Status

> Last updated: v0.0.1 bootstrap, in progress.

## Current milestone

**v0.0.1 — Bootstrap.** Repository foundation is being built locally. Nothing is pushed yet.

## What is done

- Git repository initialized on `main`.
- pnpm workspace with TypeScript, ESLint (flat config), Prettier, and Vitest wired up.
- Deterministic OpenAI-compatible mock provider (`packages/mock-provider`) with unit and
  server tests (health, models, non-streaming and streaming completions, error paths).
- MIT license, README, CONTRIBUTING, SECURITY, CHANGELOG, and `docs/` records.
- GitHub Actions CI across Linux, macOS, and Windows.
- DeepSeek Harness pinned to `@deepseek-ai/dsh@0.1.0-rc.6` (documented; dependency wiring
  lands with the supervisor in v0.0.2).

## What is blocked

- **GitHub push / Release** — the `gh` CLI is not installed and no GitHub credential is
  configured in this environment. Pushing to
  <https://github.com/sb1733831438-maker> and creating the v0.0.1 tag/Release is blocked on
  authentication.

## Next steps

1. Install dependencies and pass the full quality gate (`pnpm check`).
2. Commit the bootstrap atomically.
3. Authenticate GitHub and push; create the v0.0.1 annotated tag and Release.
4. Begin v0.0.2 (Electron shell + DSH Supervisor).
