# CloserAI

> Local-first, model-agnostic, permission-transparent desktop AI workbench for
> real Chat + Work + Code/Cowork outcomes. **Built on DeepSeek Harness.**

[English](README.md) · [简体中文](README.zh.md)

![Release](https://img.shields.io/github/v/release/sb1733831438-maker/DSH-closerAI)
![CI](https://github.com/sb1733831438-maker/DSH-closerAI/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/github/license/sb1733831438-maker/DSH-closerAI)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)

<p align="center">
  <img src="docs/screenshot.png" alt="CloserAI" width="820"/>
</p>

CloserAI is an open-source desktop client that hosts a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
process inside a hardened Electron shell. It is **not a thin wrapper**: it keeps DSH as the agent runtime
and adds a desktop supervisor, three permission-isolated working modes, local-first session storage,
OS-keychain secrets, and a plugin security model.

## ✨ What you get

- **Hardened shell** — context isolation, sandbox, strict CSP, locked-down navigation, single instance, deep links.
- **Three permission-isolated modes** — Chat / Work / Code, so the model only gets exactly the tools and files it should.
- **Local-first sessions** — every conversation is persisted under `DSH_HOME`, with history, projects, export/import, and restart recovery.
- **Native desktop** — system tray, crash/recovery notifications, launch at login.
- **Transparent by design** — a management page shows capability toggles, a per-mode permission manifest, and redacted diagnostics.
- **Model-agnostic** — DeepSeek, any OpenAI-compatible endpoint, or fully-offline **Mock mode** (no API key needed).
- **System DSH sync** — when a system DSH home (`~/.dsh`) exists, the desktop boots your own DSH: same sessions, plugins and settings as your web DSH (and never overwrites its config).
- **Official DeepSeek orca icon** — the app, installer and taskbar use the official DeepSeek whale logo.
- **Sync experience** — a “已与系统 DSH 同步” banner in the workspace page, and a friendly hint when the shared home is locked by another DSH instead of a silent crash.
- **Auto-update** — built-in updater (electron-updater + GitHub Releases); check for updates from the workspace page.

## 🚀 Quick start

**Option A — install the Windows build (recommended)**

1. Download [CloserAI-0.4.0-Setup-x64.exe](https://github.com/sb1733831438-maker/DSH-closerAI/releases/latest).
2. Verify the SHA-256 against `SHA256SUMS.txt` (Windows: `Get-FileHash -Algorithm SHA256 .\CloserAI-0.4.0-Setup-x64.exe`).
3. Run the installer, then launch CloserAI and pick **Mock mode** to try it with zero configuration.

> The installer is not code-signed yet — if SmartScreen warns, choose _More info → Run anyway_,
> and rely on the checksum. See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md).

**Option B — run from source**

```bash
pnpm install
pnpm check          # format + lint + build + typecheck + test
pnpm smoke          # end-to-end: onboarding → DSH UI → management page
cd apps/desktop && pnpm run dev
```

Requires Node.js >= 20.19 and pnpm 11. DSH is pinned to the exact runtime version in the lockfile.

## 🧩 Modes

| Mode     | Can do                                                          | Cannot do                                                |
| -------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| **Chat** | Web search, attachments (read-only)                             | Shell, local file access                                 |
| **Work** | Document processing in an app-private sandbox                   | Shell, access outside the sandbox                        |
| **Code** | Your chosen directory, shell/git/terminal with approval prompts | Anything outside the approved directory without approval |

Switch modes from the tray or the management page; each project pins a mode + working directory and is restored on relaunch.

## 🛠 Development

```bash
git clone https://github.com/sb1733831438-maker/DSH-closerAI.git
cd DSH-closerAI
pnpm install
pnpm check
cd apps/desktop
pnpm run pack     # build the Windows installer (release/CloserAI-*-Setup-x64.exe)
```

New features must keep `pnpm check` green (136 tests) and `pnpm smoke` passing. See
[docs/PLUGIN_DEV.md](docs/PLUGIN_DEV.md) for extending modes/presets.

## 📚 Documentation

- [User manual (EN)](docs/USER_MANUAL.md) · [用户手册 (中文)](docs/USER_MANUAL.zh.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Architecture](docs/ARCHITECTURE.md) · [Decisions](docs/DECISIONS.md) · [Status](docs/STATUS.md) · [Execution plan](docs/EXECUTION_PLAN.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md) · [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md)

## 🗺 Milestones

| Version    | Scope                                                                     | Status       |
| ---------- | ------------------------------------------------------------------------- | ------------ |
| v0.0.1     | Monorepo, tooling, mock provider, CI                                      | Released     |
| v0.0.2     | Desktop shell: DSH supervisor + hardened Electron window                  | Released     |
| v0.0.3     | Onboarding, keychain secrets, DeepSeek/OpenAI-compatible + mock providers | Released     |
| v0.0.4     | Chat / Work / Code permission-isolated profiles                           | Released     |
| v0.0.5     | Daily conversation: sessions, history, projects, file handling            | Released     |
| v0.0.6     | Extensions & Web: capability toggles, diagnostics, permission manifest    | Released     |
| v0.0.7     | Native desktop: tray, notifications, launch-at-login                      | Released     |
| v0.0.8     | First Windows installer + packaged DSH runtime fix                        | Released     |
| v0.0.9     | RC hardening: notices, security & robustness suites, manuals              | Released     |
| **v0.1.0** | **Daily-use release: Windows installer + checksum**                       | **Released** |
| v0.2.0     | System DSH home sync: desktop == your web DSH                             | Released     |
| v0.2.1     | Official DeepSeek orca app icon                                           | Released     |
| v0.3.0     | Sync experience: workspace banner + friendly concurrent-DSH handling      | Released     |
| **v0.4.0** | **Auto-update (electron-updater) + stale-lock self-heal**                 | **Released** |

## 📄 License

[MIT](LICENSE) © CloserAI contributors. CloserAI does not fork or modify the DeepSeek Harness core;
it hosts it as the agent runtime.
