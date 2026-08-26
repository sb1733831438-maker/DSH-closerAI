# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this
project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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