# Status

> Last updated: 2026-08-26 — v0.7.0 (MCP server management UI).

## Review baseline (2026-08-26)

- Added the long-term open-source review baseline: `docs/REVIEW_2026-08-26.md` (full audit,
  0×P0 / 7×P1 / ~16×P2 / ~10×P3, incl. two **verified shipped P1 defects**: R-33 preload bridge
  missing 6 methods breaking manage-page diagnostics/capabilities/launch-at-login, and R-34 MCP
  “add server” always failing), `docs/BENCHMARK.md` (peer comparison: Jan / Cherry Studio /
  AnythingLLM / Chatbox / Open WebUI / LobeChat / DeepSeek Harness / LM Studio / Cline / Roo),
  and `docs/ROADMAP.md` (v0.8.x / v0.9.x / v1.0 / long-term tracks). Raw role-pass reports in
  `docs/review/`.
- Verified baseline: `pnpm check` green (145 tests), SBOM 973 components; `sbom.json` regenerated
  to component version 0.7.0 (was stale 0.6.2). Docs-only change; no source edits this pass.
  P1 fixes (incl. R-33/R-34) scheduled for v0.8.x per ROADMAP.

## Current milestone

**v0.7.0 — MCP server management UI.** The workspace page gains a **MCP 服务器**
card: list servers with enable toggles, add/edit/remove **stdio** (command +
args + env) and **HTTP** (url + headers) servers, and **export mcp.json** (a
standard `mcpServers` map) for Claude Code / Kimi Code / editors / DSH plugins.
Backed by `McpStoreFile` in app userData (`mcp-servers.json`) — works in both
system-sync and managed modes and never touches the user's DSH settings.
Verified: `pnpm check` green (**145 tests**, +9 for the store; SBOM gate).

## What is done (v0.6.x)

- v0.6.2 — macOS/Linux installers (dmg arm64 + AppImage via the cross-installer
  matrix), per-platform auto-update metadata, black-orca tray icon, and the
  pwsh `NODE_OPTIONS` env-block CI fix; all three platform builds green with 8
  release assets.

## What is done (v0.5.x)

- v0.5.0 — CycloneDX SBOM (973 components) wired into `pnpm check`
  (`pnpm sbom:gen`) and uploaded per release; feature shipped within v0.6.x.

# Status

> Last updated: 2026-08-26 — v0.6.0 (SBOM + macOS/Linux installers).

## Current milestone

**v0.6.0 — Supply-chain transparency + cross-platform.** CycloneDX SBOM
(973 components) wired into `pnpm check` and uploaded per release; macOS
(dmg x64/arm64) and Linux (AppImage) installers via a cross-installer matrix
in the release workflow (unsigned mac; Linux node-pty degraded under
`--ignore-scripts`).

## What is done (v0.4.x)

- v0.4.1 — auto-update (electron-updater + latest.yml) and stale task-board
  lock self-heal; `--publish never` pack fix.

# Status

> Last updated: 2026-08-25 — v0.3.0 (sync experience) in progress.

## Current milestone

**v0.3.0 — Sync experience polish.** Adds the manage-page "system DSH sync"
banner (AppState.dshMode) and a friendly message when `~/.dsh` is already
owned by another DSH (task-board lock) instead of a silent crash. Next up:
auto-update framework and installer code-signing.

## What is done (v0.2.x)

- v0.2.1 — official DeepSeek black orca app icon (Windows exe/installer +
  BrowserWindow), 16-512px vector-rendered from the DSH web-frontend favicon.
- v0.2.0 — System DSH home sync: the desktop boots the user's own DSH
  (shared sessions/profiles/plugins/settings) when `~/.dsh` exists, never
  overwriting its config; CLOSERAI_DSH_HOME / CLOSERAI_DSH_MODE overrides;
  smoke forces a fresh managed temp home (deterministic CI).

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

## v0.2.0 — System DSH Sync (released)

- The desktop app boots the user's own DSH (DSH_HOME=~/.dsh) when it exists,
  so sessions, profiles, plugins and settings match the web DSH; it never
  overwrites the system home in sync mode. CLOSERAI_DSH_HOME / CLOSERAI_DSH_MODE
  pin an explicit home or force a mode; fresh installs fall back to an isolated
  home. Smoke forces a fresh managed temp home (CI deterministic).
- Known limitation: a single-owner plugin (task-board ledger lock) blocks a
  second DSH on the same home, so do not run the web DSH and the desktop
  concurrently on one home.
- CI note: the runtime npm install was intermittently slow on the Windows
  runner (native-script compile); the workflow now uses --ignore-scripts
  (node-pty win32 prebuilds ship in the tarball).

## Packaging status (v0.0.8 — RELEASED)

- The Windows installer `CloserAI-0.0.8-Setup-x64.exe` + `SHA256SUMS.txt` are built by
  a Windows CI runner (electron-builder native; no wine) via the release-build workflow.
- Packaged runtime fix: an afterPack hook overlays a flat npm install of the DSH runtime
  (no symlinks, Windows natives, includes the peer/optional plugins the collector drops)
  onto the collected app node_modules.
- Verified end-to-end: fresh install to a clean directory, packaged-app smoke passes
  (onboarding → DSH UI → management page, exit 0); SHA-256 matches.
