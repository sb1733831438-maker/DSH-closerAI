# CloserAI User Manual

CloserAI is a local-first, model-agnostic desktop AI workbench built on the
DeepSeek Harness (DSH) runtime. This manual covers the v0.8.0 release.
简体中文版见 [USER_MANUAL.zh.md](USER_MANUAL.zh.md).

## Installing

1. Download the installer for your platform from the [latest
   release](https://github.com/sb1733831438-maker/DSH-closerAI/releases):
   `CloserAI-<version>-Setup-x64.exe` (Windows), `CloserAI-<version>-*.dmg`
   (macOS), or `CloserAI-<version>.AppImage` (Linux).
2. Verify the SHA-256 against `SHA256SUMS.txt` (`Get-FileHash` on Windows).
3. Run the installer. Until the app is code-signed, Windows SmartScreen shows
   "More info → Run anyway"; macOS builds are unsigned for now (see
   `docs/ROADMAP.md`).

## First run

- The onboarding page asks you to configure a provider (DeepSeek,
  OpenAI-compatible, or **Mock mode** with no key).
- In Mock mode you can try the UI and workflows without any API key.
- Keys are stored in the OS keychain, never in the config files.

## Chat / Work / Code modes

| Mode | What it can do                                                  |
| ---- | --------------------------------------------------------------- |
| Chat | Web + attachments, no shell, no local file access               |
| Work | App-private sandbox, document processing, no shell              |
| Code | Your chosen directory, shell/git/terminal with approval prompts |

Switch modes from the tray (工作区) or the management page.

## Management page (管理页)

- **提供者**: manage API keys and run a connectivity test.
- **工作区/项目**: create named projects; each project pins a mode and a
  working directory, restored on relaunch.
- **会话**: list, delete, export, and import DSH sessions.
- **能力**: toggle web search / fetch / skills per mode.
- **权限**: the designed capability surface of each mode.
- **MCP 服务器**: add stdio or HTTP MCP servers; toggle, edit, and delete
  them, and export a standard `mcp.json`. Credential values (env / headers)
  are encrypted at rest with the OS keychain and shown masked in the UI —
  editing keeps the stored secret unless you type a new value.
- **诊断与日志**: live supervisor state and redacted child logs; export for
  support.
- **开机启动**: launch CloserAI at login.

## Data locations

- App config: `%APPDATA%/@closerai` (Windows).
- Sessions: `%APPDATA%/@closerai/dsh-home/sessions/<workspace>/session-<uuid>/`.
- Secrets: OS keychain.

## Getting help

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md). If it is not covered, export
diagnostics and open an issue.
