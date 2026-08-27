# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-08-27

### Security (REVIEW R-01/R-11/R-12/R-13/R-15)

- **IPC sender validation (R-01, P1)**: every privileged bridge call now rejects
  senders that are not the app's own `file://` page, so XSS inside the DSH SPA
  (which shares the hardened window and preload) can no longer reach the
  bridge.
- **MCP credentials encrypted at rest (R-12)**: MCP `env`/`header` values are
  encrypted with the OS keychain (safeStorage) as `enc:<base64>`, legacy
  plaintext stays readable, the renderer sees masked values, and export uses
  the real values.
- **Log sanitization (R-13)**: diagnostics now also redact JSON-formatted
  secrets (`"password":"x"`), not just `KEY=VALUE` and Authorization lines.
- **safeStorage backend honesty (R-15)**: Linux `basic_text` (obfuscation, not
  encryption) is surfaced with a clear message.
- **Live navigation lock (R-11)**: the in-window nav lock follows the current
  backend origin, so a backend restart on a new port stays usable.

### Correctness (R-02/R-03/R-26/R-27/R-28/R-29)

- **Backend restart serialized (R-02, P1)**: rapid mode/project switches queue
  restarts instead of racing stop against launch (no double DSH instance).
- **Atomic + corruption-tolerant stores (R-03, P1)**: every app store writes
  via temp-write + rename, and a corrupt/unreadable store self-heals to safe
  defaults instead of crashing the app; `boot()` catches unexpected failures.
- **Supervisor races (R-27)**: start() waits for an in-flight stop, clears a
  pending restart timer (no double-spawn), clears the startup timer on ready.
- **Updater (R-26/R-28)**: `check()` no longer clobbers a downloaded update;
  `install()` stops the DSH child before the updater quits the app.
- **Deep link / sessions (R-29)**: chat deep-link with no backend shows the app
  page instead of doing nothing; session list is cached with invalidation;
  session import pre-flights conflicts and rolls back partial copies.

### Shipped P1 defects fixed

- **R-34**: MCP "添加服务器" always failed (sentinel misroute) — now adds.
- **R-33**: preload bridge was missing 6 methods (capabilities, diagnostics
  export, launch-at-login) — added, with a contract test that pins every
  channel and bridge method.

### MCP runtime mounting (ROADMAP A-4 / BENCHMARK L1)

- Enabled MCP servers are now **mounted into the running DSH**: plugin rows go
  into the headless profile's `cordis.patch.yml`, `dsh-mcp-client` connects and
  registers tools as `mcp__<server>__<tool>`. Credentials are injected through
  the child environment (`!!js process.env.*`), never written to disk.
  System-sync mode is untouched. Verified with a real DSH boot E2E.

### Renderer fixes

- R-06 permission hint rendered the literal `${MODE_LABEL[...]}` — fixed.
- R-07 diagnostics log viewer printed `[object Object]` — now shows the text.

### Engineering gates

- CI: SBOM freshness gate, coverage gate (desktop), Electron smoke job, and a
  release-gate packaged smoke; cross-installer verify fails loudly.
- Version single-sourced from `app.getVersion()`; root/desktop aligned.
- commitlint (Conventional Commits) enforced in CI.

### Community & docs

- Issue/PR templates, dependabot, CODE_OF_CONDUCT, FUNDING, CODEOWNERS.
- SECURITY.md contact + honest security model; user manuals to v0.8.0;
  EXECUTION_PLAN reconciled; README/CONTRIBUTING updated.

### Verified

- `pnpm check` green (157 desktop + 13 supervisor + 17 mock-provider tests),
  coverage gate above thresholds, local packaged-style smoke exit 0, MCP-mount
  E2E against the real DSH.

## [0.7.0] - 2026-08-26

### MCP 服务器管理 UI

- New **MCP 服务器** card in the workspace page: list servers with enable
  toggles, add / edit / remove stdio (command+args+env) and HTTP (url+headers)
  servers, and **导出 mcp.json** to any folder (standard `mcpServers` map for
  Claude Code / Kimi Code / editors / DSH plugins).
- Config lives in CloserAI userData (`mcp-servers.json`) — works in both
  system-sync and managed modes and never touches the user's DSH settings.
- Backed by `McpStoreFile` (9 new tests).

### Verified

- `pnpm check` green (**145 tests** + SBOM gate).

## [0.6.2] - 2026-08-26

### Tray icon + CI npm env fix

- System-tray icon is now the official DeepSeek black orca (32x32 transparent),
  matching the app icon (was a blank placeholder).
- Release workflow: `NODE_OPTIONS` for the runtime npm install now set via the
  step `env` (works for both pwsh and bash), fixing the Windows pwsh syntax
  failure.

## [0.6.1] - 2026-08-26

### Cross-platform fixes

- mac npm install OOM fix (`NODE_OPTIONS=--max-old-space-size=4096`) and Linux
  AppImage asset glob fix.

## [0.6.0] - 2026-08-26

### macOS + Linux installers

- Cross-platform packaging: `pack:mac` (dmg, x64 + arm64, unsigned) and
  `pack:linux` (AppImage, x64) added to electron-builder.
- Release workflow gains a cross-installer matrix job that installs the DSH
  runtime on each target OS and uploads `CloserAI-*.dmg` / `CloserAI-*.AppImage`
  plus `latest-mac.yml` / `latest-linux.yml` for per-platform auto-update.

> Note: macOS builds are unsigned (no cert yet — Gatekeeper will prompt); Linux
> node-pty uses `--ignore-scripts` so the terminal feature may be degraded
> (core chat/agent works).

## [0.5.0] - 2026-08-26

### SBOM + supply-chain gate

- New `scripts/generate-sbom.mjs` emits a **CycloneDX 1.5** SBOM (973
  components with name/version/license/purl) and fails when any component has
  no declared license.
- Wired into `pnpm check` (`pnpm sbom:gen`) so CI enforces it, and the
  release workflow uploads `SBOM.json` alongside the installer + checksum.

### Verified

- `pnpm check` green (136 tests + SBOM gate); sbom.json committed to the repo.

## [0.4.1] - 2026-08-25

### Fix

- electron-builder no longer attempts to publish at pack time (added `--publish never`),
  so the release workflow builds without a GH_TOKEN; `latest.yml` is still generated and
  uploaded by the workflow.

## [0.4.0] - 2026-08-25

### Auto-update + stale-lock self-heal

- **Auto-update** (electron-updater + GitHub Releases): the workspace page has a
  "检查更新" button; packaged builds check for new versions and can install on restart.
  The release workflow uploads `latest.yml`.
- **Stale task-board lock self-heal**: if `~/.dsh` is bricked by a leftover task-board
  ledger lock (owner process dead), CloserAI clears it and retries instead of failing —
  this fixes the "desktop and web both won't open" crash after closing the app.

### Verified

- `pnpm check` green (136 tests: +6 update controller, +3 stale-lock); smoke exit 0.

## [0.3.0] - 2026-08-25

### Sync experience polish

- Manage page shows a "已与系统 DSH 同步" banner (system-sync mode).
- Friendly message when `~/.dsh` is already owned by another DSH instead of a silent crash.
- Roadmap "Beyond v0.1.0" added to the execution plan.

## [0.2.1] - 2026-08-25

### App icon

- Official DeepSeek black orca/whale logo (from DSH web-frontend favicon.svg,
  vector-rendered 16-512px) applied to the Windows exe/installer and BrowserWindow.

## [0.2.0] - 2026-08-24

### System DSH sync

- Desktop boots the user's own DSH (DSH_HOME=~/.dsh) when it exists: shared sessions,
  profiles, plugins and settings; never overwrites the system home in sync mode.
- `CLOSERAI_DSH_HOME` / `CLOSERAI_DSH_MODE` overrides; smoke forces a fresh managed temp home.

## [0.1.0] - 2026-08-19

### Daily-use release

- Windows installer (CloserAI-0.1.0-Setup-x64.exe) + SHA256SUMS on a non-prerelease Release.
- Fresh-install smoke verified; GitHub CI all green.

## [0.0.9] - 2026-08-18

### RC hardening

- License audit + THIRD_PARTY_NOTICES, security/robustness/offline test suites,
  bilingual README/manual, troubleshooting and plugin-dev docs.

## [0.0.8] - 2026-08-18

### First Windows installer

- Windows CI packaging (tag-triggered), installer + SHA-256 checksums, packaged DSH runtime
  via a flat npm install overlaid in afterPack (no symlinks, Windows natives).

## [0.0.7] - 2026-08-18

### Native desktop

- System tray, crash/recovery notifications, launch at login.

## [0.0.6] - 2026-08-18

### Extensions and web

- Capability toggles (web search / fetch / skills), diagnostics viewer + export,
  per-mode permission manifest.

## [0.0.5] - 2026-08-18

### Daily conversation

- DSH session persistence end-to-end; history list/delete/export/import;
  projects + workspaces; restart recovery.

## [0.0.4] - 2026-08-18

### Chat / Work / Code profiles

- Three permission-isolated modes as DSH agent presets.

## [0.0.3] - 2026-08-18

### Onboarding and providers

- First-run onboarding, OS-keychain secrets, DeepSeek / OpenAI-compatible / mock providers.

## [0.0.2] - 2026-08-18

### Desktop shell

- DSH supervisor (spawn, health check, logs, crash recovery), hardened BrowserWindow,
  single instance + deep links.

## [0.0.1] - 2026-08-18

### Bootstrap

- Monorepo, tooling, CI, deterministic mock provider, docs.
