# Status

> Last updated: 2026-08-18 — v0.0.7 released.

## Current milestone

**v0.0.7 — Native Desktop: complete.** Tray, native notifications, and launch-at-login ship;
projects/workspaces, session history). Next up:
**v0.0.8 — Packaging and Security** (Windows installer, checksums, security tests).

## Repository

- <https://github.com/sb1733831438-maker/DSH-closerAI>
- `main` branch, annotated `v0.0.1`–`v0.0.5` tags, matching Releases, CI green on
  Linux/macOS/Windows.

## What is done (v0.0.7)

- System tray with quick actions; close-to-tray keeps the app running in the background.
- Native notifications on DSH crash and recovery.
- Launch-at-login toggle (tray + management page), applied via the OS login item.

## What is done (v0.0.6)

- Capability toggles (web search / web fetch / skills) rendered into the Chat / Work / Code
  presets at install time; no DSH core changes.
- Diagnostics view + export: DSH supervisor state, summary, and recent child logs with
  in-process redaction (secrets never leave the main process).
- Per-mode permission manifest in the management page.

## What is done (v0.0.5)

- DSH session persistence verified end-to-end: a headless DSH run against the mock
  provider creates a durable `session.jsonl.zstd` under `DSH_HOME/sessions`, and prior
  records survive a second run (restart recovery).
- Session history service (`SessionStore`): list/delete/export/import of DSH session
  directories, all paths validated to stay inside the sessions root.
- Projects (`ProjectStore`): named Chat/Work/Code projects with optional Code workspace
  directory; the active project drives the DSH preset + child working directory and is
  restored on relaunch (restart recovery).
- Management page (CloserAI 工作区) via menu / `Ctrl+Shift+M` / `closerai://manage`:
  project create/activate/delete, session list/delete/export/import with native folder
  pickers, and back-to-chat.
- Navigation lock fixed so the app's own renderer entry page is navigable from the DSH UI.
- Smoke test now covers onboarding, DSH UI mount, and the management page's real content.

## v0.1.0 gap list (verified from current state)

The following acceptance items from the v0.1.0 daily-use goal are still open; each is
tracked in docs/EXECUTION_PLAN.md under the matching milestone:

1. **Conversation UI polish (in DSH, adopted)** — stream stability, stop/retry/resend,
   Markdown rendering, and session rename/switch inside the DSH UI are inherited from DSH;
   needs manual acceptance on Windows before v0.1.0.
2. **Mode picker UI** — Code-mode workspace directory picker is not wired into a UI yet;
   today it is set via the manage page project form (v0.0.5) or app-config.json.
3. **Web Search / Fetch** (v0.0.6).
4. **MCP server management** (v0.0.6).
5. **Skills management** (v0.0.6).
6. **Plugin permission manifest, pinned versions, source + hash display** (v0.0.6).
7. **Subagent / plan / task status UI** (v0.0.6).
8. **Tray, notifications, launch-at-login, log viewer, diagnostics export** (v0.0.7).
9. **Windows x64 installer + SHA-256 + fresh-environment smoke** (v0.0.8).
10. **CSP/eval hardening replacement** — D-009 revisit (exact hashes) in v0.0.8.
11. **Clean-install, long-running, crash/offline/disk-error tests** (v0.0.9).
12. **Bilingual user manual + plugin dev docs + troubleshooting** (v0.0.9).
13. **Release assets/checksums + GitHub Topics aligned with actual capability** (v0.0.9–v0.1.0).

## What is blocked

Nothing at the moment.

## Known limitations (v0.0.5)

- Session titles and message content are rendered by the DSH UI; the management page
  works on session files (id, workspace, size, mtime) and does not parse zstd session
  content, so in-app rename is not offered there.
- Import expects a folder literally named `session-<uuid>` containing
  `session.jsonl.zstd` (the DSH export shape).
- Project creation on first run materializes into the legacy `AppConfig`; the old mode
  switcher IPC remains functional for backwards compatibility.

## Next steps

1. v0.0.8: Windows x64 installer (electron-builder), SHA-256 checksums, CI release builds,
   CSP/eval hardening replacement (D-009 revisit).
2. v0.0.9 → v0.1.0: release-candidate hardening, docs, and full acceptance.
3. v0.0.9 → v0.1.0: release-candidate hardening, docs, and full acceptance.

## Packaging status (v0.0.8 — RELEASED)

- The Windows installer `CloserAI-0.0.8-Setup-x64.exe` + `SHA256SUMS.txt` are built by
  a Windows CI runner (electron-builder native; no wine) via the release-build workflow.
- Packaged runtime fix: an afterPack hook overlays a flat npm install of the DSH runtime
  (no symlinks, Windows natives, includes the peer/optional plugins the collector drops)
  onto the collected app node_modules.
- Verified end-to-end: fresh install to a clean directory, packaged-app smoke passes
  (onboarding → DSH UI → management page, exit 0); SHA-256 matches.
