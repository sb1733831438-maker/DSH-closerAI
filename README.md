## Status

**v0.0.8 — Windows installer available.** The latest Windows installer
(`CloserAI-0.0.8-Setup-x64.exe` + SHA-256) is attached to the [v0.0.8
release](https://github.com/sb1733831438-maker/DSH-closerAI/releases). The
project is under active construction toward a v0.1.0 daily-use release. See [`docs/STATUS.md`](docs/STATUS.md) for the current milestone and
[`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md) for the full roadmap.

### Milestones

| Version | Scope                                                                            | Status      |
| ------- | -------------------------------------------------------------------------------- | ----------- |
| v0.0.1  | Bootstrap: monorepo, tooling, mock provider, CI                                  | Released    |
| v0.0.2  | Desktop shell: DSH supervisor + hardened Electron window                         | Released    |
| v0.0.3  | Onboarding, OS-keychain secrets, DeepSeek/OpenAI-compatible providers, mock mode | Released    |
| v0.0.4  | Chat / Work / Code permission-isolated profiles                                  | Released    |
| v0.0.5  | Daily conversation: session persistence, history, projects, file handling        | Released    |
| v0.0.6  | Extensions and Web: search, MCP, skills, plugin manifest, agent UI               | In progress |

### What works today

- Hardened Electron shell: single instance, deep links, strict CSP, locked-down navigation,
