# CloserAI

> A local-first, model-agnostic, permission-transparent desktop AI workbench for real
> Chat + Work + Code/Cowork outcomes. **Built on DeepSeek Harness.**

[简体中文](README.zh.md) | English

CloserAI is an open-source desktop application that wraps a
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) process in a hardened
Electron shell. It is not a reskin: it adds a desktop supervisor, three permission-isolated
working modes (Chat / Work / Code), local-first session storage, provider management with
OS-keychain secrets, and a plugin safety model — while delegating the agent runtime to DSH.

## Status

**Pre-release — v0.0.4.** The project is under active construction toward a v0.1.0 daily-use
release. See [`docs/STATUS.md`](docs/STATUS.md) for the current milestone and
[`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md) for the full roadmap.

### Milestones

| Version | Scope                                                                            | Status      |
| ------- | -------------------------------------------------------------------------------- | ----------- |
| v0.0.1  | Bootstrap: monorepo, tooling, mock provider, CI                                  | Released    |
| v0.0.2  | Desktop shell: DSH supervisor + hardened Electron window                         | Released    |
| v0.0.3  | Onboarding, OS-keychain secrets, DeepSeek/OpenAI-compatible providers, mock mode | Released    |
| v0.0.4  | Chat / Work / Code permission-isolated profiles                                  | Released    |
| v0.0.5  | Daily conversation: session persistence, history, projects, file handling        | In progress |

### What works today

- Hardened Electron shell: single instance, deep links, strict CSP, locked-down navigation,
  sandboxed preload.
- Crash-recovering DSH child-process supervisor with a random loopback port.
- First-run onboarding (Chinese UI) for DeepSeek, any OpenAI-compatible provider, or offline mock.
- API keys encrypted with the OS keychain and injected only into the DSH child environment.
- Three isolation modes: **Chat** (no shell/filesystem), **Work** (app-sandbox filesystem, no
  shell), **Code** (full shell/filesystem/terminal/plans/subagents over an authorized directory).

## Principles

- **Local-first & BYOK** — bring your own API key; secrets live in the OS keychain, never in
  logs, files, or the renderer.
- **Model-agnostic** — DeepSeek and any OpenAI-compatible provider, plus a deterministic mock
  provider for offline use.
- **Permission-transparent** — three capability-isolated modes enforced through DSH agent
  presets and the sandbox workspace root, not prompt wording alone.
- **Own identity** — CloserAI has its own name and UI; it only credits "Built on DeepSeek
  Harness".

## Repository layout

```
apps/        Electron desktop application (main, preload, onboarding renderer, agent presets)
packages/    Shared packages (mock provider, DSH supervisor)
docs/        Architecture, execution plan, status, and decision records
```

## Development

Requirements: Node.js >= 20.19, pnpm 11.

```bash
pnpm install
pnpm check                 # format + lint + build + typecheck + test
pnpm --filter @closerai/desktop start   # launch the desktop app
pnpm --filter @closerai/desktop smoke   # headless end-to-end smoke test
```

## License

[MIT](LICENSE). CloserAI is an independent project and is not affiliated with DeepSeek.
