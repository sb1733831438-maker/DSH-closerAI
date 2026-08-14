# Architecture

This document describes CloserAI's architecture. It is updated as milestones land; the
version tagged here reflects the current state of `main`.

## Top-level shape

```
┌─────────────────────────────── Electron (hardened) ───────────────────────────────┐
│                                                                                    │
│  Main process                                 Renderer process                     │
│  ├─ Single-instance lock                      ├─ DSH web UI (embedded)             │
│  ├─ Deep-link handler                         ├─ CloserAI onboarding/shell UI      │
│  ├─ DSH Supervisor (spawn / health / logs)    └─ preload: minimal typed whitelist  │
│  ├─ Tray / notifications / auto-update                                             │
│  └─ Keychain-backed provider store                                                 │
│                                                                                    │
│        │ spawn `dsh web --port <random loopback>`                                  │
│        ▼                                                                           │
│  DeepSeek Harness process (isolated child)                                         │
│  ├─ Host composition: registries, sandbox/approval, persistence, model route       │
│  └─ Agent preset (profile) per session → Chat / Work / Code capability surface     │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## Hard boundaries

1. **DSH is a child process, not a library.** The desktop main process never imports DSH
   code; it spawns the `dsh` CLI on a random `127.0.0.1` port and speaks HTTP to it. This
   keeps the agent runtime out of Electron main and makes crash recovery a process concern.
2. **DSH is pinned.** `@deepseek-ai/dsh` is locked to an exact version (not `latest`).
3. **No core fork.** CloserAI extends DSH through agent presets, plugins, and a compatibility
   layer — never by patching DSH core.
4. **Modes are capability compositions.** Chat / Work / Code isolation is enforced by
   mounting different DSH agent presets (tool sets, sandbox policy, and prompt sections),
   not by prompt wording alone.

## Processes and responsibilities

### Electron main

- Single-instance enforcement and deep-link routing.
- DSH Supervisor: spawn, random loopback port allocation, `/health` polling, structured log
  capture, crash detection and restart, graceful shutdown.
- Provider credential storage backed by the OS keychain (never files/logs/renderer).
- Tray, native notifications, optional launch-at-login, auto-update scaffolding.

### Renderer

- Loads the DSH web UI for chat/agent interaction.
- CloserAI-specific shell UI: onboarding, provider configuration, diagnostics export.
- Hardened BrowserWindow: `contextIsolation`, `nodeIntegration: false`, `sandbox: true`,
  strict CSP, navigation locked down, external links to the system browser.
- Preload exposes only a minimal, typed, allow-listed API bridge.

### DeepSeek Harness (child)

- The agent runtime: tool registry, sandbox and approval stack, session persistence, model
  route.
- Receives an agent preset per session that defines the granted capability surface.

## Isolation modes (Chat / Work / Code)

Each mode is a DSH agent preset derived from the same host composition:

| Mode        | Shell | Filesystem              | Notes                                |
| ----------- | ----- | ----------------------- | ------------------------------------ |
| Chat        | none  | attachments only        | no directory required; web + images  |
| Work        | none  | app-private sandbox     | document processing, preview, export |
| Code/Cowork | yes   | user-approved directory | files, git, terminal, LSP, approvals |

See [`packages/profiles/`](../packages/profiles/) once v0.0.4 lands.

## Packages

| Package                   | Purpose                                       | Milestone |
| ------------------------- | --------------------------------------------- | --------- |
| `@closerai/mock-provider` | Deterministic OpenAI-compatible mock provider | v0.0.1    |
| `@closerai/supervisor`    | DSH child-process supervisor                  | v0.0.2    |
| `@closerai/profiles`      | Chat / Work / Code agent presets              | v0.0.4    |
| `apps/desktop`            | Electron application                          | v0.0.2    |

## Data and secrets

- API keys enter the OS keychain directly from a dialog; the renderer never sees them and
  they never appear in logs or git.
- The mock provider exists so the whole stack is testable and usable without any key.

## Security

See [`SECURITY.md`](../SECURITY.md) for the report process and the guarantee checklist under
construction.
