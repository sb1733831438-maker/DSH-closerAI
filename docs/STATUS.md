# Status

> Last updated: 2026-08-14 — v0.0.4 released.

## Current milestone

**v0.0.4 — Chat / Work / Code Profiles: complete.** Next up: **v0.0.5 — Daily
Conversation** (session persistence, history, projects, restart recovery, file handling).

## Repository

- <https://github.com/sb1733831438-maker/DSH-closerAI>
- `main` branch, annotated `v0.0.1`–`v0.0.4` tags, matching Releases, CI green on
  Linux/macOS/Windows.

## What is done (v0.0.4)

- Three permission-isolated agent presets shipped and installed into the DSH
  agent-presets root:
  - **Chat** — web + ask-user + todo, no shell and no filesystem.
  - **Work** — filesystem + editor in the app-private sandbox, no shell.
  - **Code** — full shell, filesystem, terminal, plan, subagents, workflows over the
    user-authorized directory.
- Active mode is routed into DSH's default preset and the child working directory
  (the sandbox workspace root), and is switchable over the IPC bridge.

## What is blocked

Nothing at the moment.

## Known limitations (v0.0.4)

- The Code-mode directory picker is not wired into a UI yet; the workspace directory
  is set programmatically (`app-config.json`) or falls back to the app workspace.
- Per-session sandbox-mode selection relies on DSH's default preset; explicit
  `workspace-write`/`danger-full-access` toggling lands with the mode UI.

## Next steps (v0.0.5)

1. Session persistence and history (search/rename/delete/import/export).
2. Projects and workspaces.
3. Restart recovery.
4. Image and common file handling.
