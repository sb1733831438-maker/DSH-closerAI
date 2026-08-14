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

**Pre-release — v0.0.1 Bootstrap.** The repository is under active construction. See
[`docs/STATUS.md`](docs/STATUS.md) for the current milestone and
[`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md) for the roadmap. Nothing here is yet a
daily-use release.

## Principles

- **Local-first & BYOK** — bring your own API key; secrets live in the OS keychain, never in
  logs, files, or the renderer.
- **Model-agnostic** — DeepSeek and any OpenAI-compatible provider, plus a deterministic mock
  provider for offline use.
- **Permission-transparent** — three capability-isolated modes enforced through DSH agent
  presets, not prompt wording alone.
- **Own identity** — CloserAI has its own name and UI; it only credits "Built on DeepSeek
  Harness".

## Repository layout

```
apps/        Electron desktop application (v0.0.2+)
packages/    Shared packages (mock provider, DSH supervisor, agent presets, ...)
docs/        Architecture, execution plan, status, and decision records
```

## Development

Requirements: Node.js >= 20.19, pnpm 11.

```bash
pnpm install
pnpm check   # format + lint + typecheck + test
```

## License

[MIT](LICENSE). CloserAI is an independent project and is not affiliated with DeepSeek.
