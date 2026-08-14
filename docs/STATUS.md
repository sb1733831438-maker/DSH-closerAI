# Status

> Last updated: 2026-08-14 — v0.0.2 released.

## Current milestone

**v0.0.2 — Desktop Shell: complete.** Next up: **v0.0.3 — Onboarding and Providers**
(first-run onboarding, OS keychain, DeepSeek + OpenAI-compatible providers, mock mode).

## Repository

- <https://github.com/sb1733831438-maker/DSH-closerAI>
- `main` branch, annotated `v0.0.1` and `v0.0.2` tags, matching Releases, CI green on
  Linux/macOS/Windows.

## What is done (v0.0.2)

- `packages/supervisor` — pure-Node DSH child-process supervisor: spawn `dsh web` on a random
  loopback port, parse the ready URL from stdout, TCP health checks, crash-restart with backoff
  and a reset-on-stable window, graceful shutdown. 11 tests against a fake-dsh child, plus a
  local smoke against the real `dsh`.
- `apps/desktop` — hardened Electron shell: single-instance lock, deep-link routing
  (`closerai://`), strict CSP, navigation locked to the DSH origin, external links to the system
  browser, all permission requests denied, and a minimal frozen `contextBridge` preload.
- DSH is bundled as `@deepseek-ai/dsh@0.1.0-rc.6` and launched as
  `ELECTRON_RUN_AS_NODE=1 electron --expose-internals <dsh-bin> web` — no shell, no `.cmd`
  shims, no second Electron app.
- `--smoke-test` mode launches the real app, starts bundled DSH, loads the UI in the hardened
  window, asserts the React app mounted, and exits 0 (verified locally on Windows).

## What is blocked

Nothing at the moment.

## Next steps (v0.0.3)

1. First-run onboarding flow in the renderer.
2. OS keychain secret storage (no keys in files/logs/renderer).
3. DeepSeek + generic OpenAI-compatible provider configuration and connectivity test.
4. Wire the deterministic mock provider as the no-API-key mode.
