# CloserAI User Manual

CloserAI is a local-first, model-agnostic desktop AI workbench built on the
DeepSeek Harness (DSH) runtime. This manual covers the v0.0.8 Windows
installer. 简体中文版见 [USER_MANUAL.zh.md](USER_MANUAL.zh.md).

## Installing

1. Download `CloserAI-0.0.8-Setup-x64.exe` from the [v0.0.8
   release](https://github.com/sb1733831438-maker/DSH-closerAI/releases).
2. Verify the SHA-256 against `SHA256SUMS.txt` (`Get-FileHash` on Windows).
3. Run the installer (SmartScreen: More info → Run anyway until the app is
   code-signed).

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
