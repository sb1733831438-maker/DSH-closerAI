# Execution Plan

Roadmap toward the v0.1.0 daily-use release. Each minor version has its own branch
`release/v0.0.x-<short-name>`, quality gates, annotated tag, GitHub Release, CHANGELOG entry,
and test evidence.

## v0.0.1 — Bootstrap

- [x] Repository initialization (git, `main` branch)
- [x] MIT license, README, CONTRIBUTING, SECURITY
- [x] Architecture / status / decisions / execution-plan docs
- [x] pnpm workspace, TypeScript, ESLint, Prettier, Vitest
- [x] Deterministic mock provider with unit tests
- [x] GitHub Actions CI (format / lint / typecheck / build / test on 3 OS)
- [x] Pin `@deepseek-ai/dsh` exact version (0.1.0-rc.6)
- [x] Push to GitHub and create v0.0.1 tag + Release

## v0.0.2 — Desktop Shell

- [x] Electron main process
- [x] DSH Supervisor (spawn, random port, health check, logs, crash recovery)
- [x] Hardened BrowserWindow (contextIsolation / sandbox / CSP / navigation lock)
- [x] Single instance + deep links
- [x] Open and use the existing DSH UI stably

## v0.0.3 — Onboarding and Providers

- [x] First-run onboarding
- [x] OS keychain secret storage
- [x] DeepSeek + generic OpenAI-compatible provider configuration
- [x] Model selection, connectivity test, clear error messages
- [x] Mock mode (no API key)

## v0.0.4 — Chat / Work / Code Profiles

- [x] Three permission-isolated modes as DSH agent presets
- [x] Chat: no directory, no shell, web + attachments
- [x] Work: app-private sandbox, document processing, no shell
- [x] Code: authorized directory, shell/git/terminal/approval
- [x] Mode routing (default preset + child working directory) on switch

## v0.0.5 — Daily Conversation

- [x] Session persistence verified end-to-end (DSH_HOME/sessions across restarts)
- [x] History list/delete/export/import (management page; in-app title rename stays in DSH UI)
- [x] Projects and workspaces (named Chat/Work/Code projects, active project drives preset + cwd)
- [x] Restart recovery (stable DSH_HOME + active project restored on relaunch)
- [x] File handling (DSH attachments + app-level session file management); image handling is native to the DSH UI

## v0.0.6 — Extensions and Web

- [x] Web Search / Fetch capability toggles (rendered into presets at install time)
- [ ] MCP server management (deferred: DSH config schema not discoverable; do not guess)
- [x] Skills capability toggle (mount/unmount tool-skill in the Code preset)
- [x] Plugin permission manifest (per-mode designed capability surface in the management page)
- [ ] Subagent / plan / task status UI (rendered natively by the DSH UI; adopted)

## v0.0.7 — Native Desktop

- [ ] Tray, notifications, launch-at-login
- [ ] Auto-update framework
- [ ] Log viewer and diagnostics export
- [ ] System permission guidance

## v0.0.8 — Packaging and Security

- [ ] Windows / macOS / Linux CI builds
- [ ] Installers + SHA-256 checksums
- [ ] CSP / Origin / token / preload / navigation security tests
- [ ] Dependency and license audit
- [ ] SBOM, THIRD_PARTY_NOTICES, SECURITY

## v0.0.9 — Release Candidate

- [ ] Clean-environment install test
- [ ] Long-running, crash-recovery, offline, invalid-key, disk-error tests
- [ ] Complete bilingual README, user manual, plugin dev docs, troubleshooting
- [ ] Resolve all P0/P1 defects
- [ ] Publish v0.1.0-rc.1 (then rc.2, rc.3 as needed)

## v0.1.0 — Daily-use Release

Only after all acceptance criteria in the goal are verified from a clean clone/install.
