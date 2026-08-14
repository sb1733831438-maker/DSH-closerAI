# Status

> Last updated: 2026-08-14 — v0.0.3 released.

## Current milestone

**v0.0.3 — Onboarding and Providers: complete.** Next up: **v0.0.4 — Chat / Work / Code
Profiles** (three permission-isolated modes as DSH agent presets).

## Repository

- <https://github.com/sb1733831438-maker/DSH-closerAI>
- `main` branch, annotated `v0.0.1`–`v0.0.3` tags, matching Releases, CI green on
  Linux/macOS/Windows.

## What is done (v0.0.3)

- First-run onboarding UI (React + Vite, Chinese) with three modes: DeepSeek,
  OpenAI-compatible, and Mock (offline).
- Provider profiles persisted separately from secrets; the API key is encrypted with Electron
  `safeStorage` (macOS Keychain / Windows DPAPI / Linux libsecret) and never lands in settings,
  logs, or git.
- The endpoint + model catalog are written into DSH's `llm-deepseek` settings section; the key is
  injected only through the DSH child environment (`DEEPSEEK_API_KEY`).
- Connectivity probe against the chat-completions endpoint with clear success/failure feedback.
- Mock mode runs the bundled `@closerai/mock-provider` locally and points DSH at it.
- Smoke test now verifies both the onboarding UI and the DSH UI mount (exit 0).

## What is blocked

Nothing at the moment.

## Next steps (v0.0.4)

1. Author Chat / Work / Code agent presets as DSH compositions.
2. Chat: no directory, no shell, web + attachments only.
3. Work: app-private sandbox, document preview/export.
4. Code: explicitly authorized directory, shell/git/terminal/approval.
