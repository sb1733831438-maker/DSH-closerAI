# Research: Comparable Open-Source Desktop AI Clients (for CloserAI BENCHMARK.md)

**Date of research:** 2026-08 (live web + primary GitHub/docs sources)
**Scope:** Four comparable open-source desktop AI clients — Jan, Cherry Studio, AnythingLLM, Chatbox — evaluated on (a) tech stack/architecture, (b) security model, (c) desktop-workbench features (modes, MCP, plugins, agents), (d) cross-platform + auto-update + packaging, (e) community health, (f) lessons for a new local-first desktop AI client. All claims cited to source URLs. No facts from memory.

---

## Summary

All four are successful, actively-developed desktop AI clients, but they diverge sharply in architecture and licensing: **Jan** is the only Tauri (Rust) app, privacy-first and Apache-2.0, focused on local llama.cpp inference plus cloud; **Cherry Studio** is an Electron/React app (AGPL-3.0) with a full-featured MCP client, safeStorage secret encryption and the largest feature surface; **AnythingLLM** (MIT) ships both a desktop app and a self-hostable Docker server with RAG/agents and Tools-only MCP; **Chatbox** (GPLv3) is an Electron app spanning desktop, web and mobile with a settings-panel MCP client and a work-mode with approvals/code execution. CloserAI's differentiators (MIT, model-agnostic, permission-transparent with Chat/Work/Code modes, MCP server management, OS-keychain secrets, hosting DSH as a child process) map most closely against Cherry Studio's MCP management and Jan's privacy posture, while avoiding the copyleft (AGPL/GPL) licensing of Cherry Studio and Chatbox.

## Comparison Table

| Dimension                   | **Jan**                                                              | **Cherry Studio**                                                                      | **AnythingLLM**                                                     | **Chatbox**                                                    |
| --------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| Repo                        | janhq/jan                                                            | CherryHQ/cherry-studio                                                                 | Mintplex-Labs/anything-llm                                          | chatboxai/chatbox                                              |
| Runtime                     | **Tauri (Rust)** + React 19                                          | **Electron** + React                                                                   | **Electron** desktop + Node Docker server                           | **Electron** + React (.erb)                                    |
| Local inference             | llama.cpp (Rust plugin/cortex)                                       | via Ollama/LM Studio                                                                   | via Ollama/LM Studio/LocalAI/llama.cpp                              | via Ollama                                                     |
| Cloud providers             | OpenAI, Anthropic, Mistral, Groq, MiniMax...                         | 50+ providers                                                                          | Very broad (OpenAI, Anthropic, Bedrock, DeepSeek...)                | OpenAI, Azure, Claude, Gemini, Ollama...                       |
| MCP support                 | MCP client; per-model MCP endpoints                                  | **Full MCP client** (stdio, SSE, streamableHTTP, inMemory) + MCP Marketplace (planned) | Desktop: **Tools only** (no Resources/Prompts); config JSON file    | MCP client via settings panel; stdio + HTTP; deep-link install |
| Secret handling             | OS keyring (backend store), encrypted-file fallback; local JSON data | **Electron safeStorage** at-rest encryption; log redaction                             | API keys via env vars / settings; had CVE-2026-24477 (fixed 1.10.0) | Local storage; per-provider keys                               |
| License                     | Apache-2.0                                                           | AGPL-3.0                                                                               | MIT                                                                 | GPLv3                                                          |
| Stars / Forks / Open issues | ~44k / ~2.9k / ~435                                                  | ~51k / ~4.9k / ~1,368                                                                  | ~65k / ~7.2k / ~333                                                 | ~41k / ~4.2k / ~1,247                                          |
| Latest release              | v0.8.4 (2026-07-21)                                                  | v2.0.9 (2026-08-24)                                                                    | v1.16.0 (2026-08-13)                                                | v1.22.3 (2026-08-09)                                           |
| Auto-update                 | Tauri custom updater (HMAC signing)                                  | electron-updater                                                                       | electron-updater                                                    | electron-updater                                               |
| Mobile/Web                  | No                                                                   | No (HarmonyOS/Android/iOS planned)                                                     | No (server via Docker)                                              | Yes (iOS/Android/web)                                          |

---

## 1. Jan (janhq/jan)

### (a) Tech stack & architecture

- Built on **Tauri (Rust backend)** with a **React 19** frontend (TypeScript); layered architecture bridging React UI to native capabilities via Tauri IPC. [GitHub README](https://github.com/janhq/jan), [DeepWiki](https://deepwiki.com/janhq/jan)
- Local inference is driven by **llama.cpp**; the llama.cpp backend management was migrated into a Rust Tauri plugin (`tauri-plugin-llamacpp`), and the app exposes an **OpenAI-compatible local API server on `localhost:1337`** so other tools can use Jan's models. [PR #7171](https://github.com/janhq/jan/pull/7171), [GitHub README](https://github.com/janhq/jan)
- Providers plug in through an engine/extension model (`OAIEngine`, `LocalOAIEngine`, `RemoteOAIEngine`) plus cloud adapters (OpenAI, Anthropic, Mistral, Groq, MiniMax). [Jan core repo structure](https://github.com/janhq/jan)

### (b) Security model

- Privacy-first and runs **100% offline**; conversations/data do not leave the device unless cloud integration is used. [Jan Privacy](https://www.jan.ai/privacy), [FAQ](https://mintlify.wiki/janhq/jan/help/faq)
- Data stored **locally in JSON** in a user-customizable data folder (Windows `%APPDATA%/Jan/data`, macOS `~/Library/Application Support/Jan/data`, Linux via XDG_DATA_HOME). [Jan Data Folder](https://www.jan.ai/docs/desktop/data-folder)
- Recent change moved settings/credentials **off localStorage into a backend store with OS keyring** (encrypted-file fallback), with localStorage migration. [PR #8388](https://github.com/janhq/jan/pull/8388)

### (c) Feature highlights (desktop workbench)

- Local model download/run from HuggingFace (Llama, Gemma, Qwen, GPT-oss); custom assistants; OpenAI-compatible API server; **MCP client** for agentic capabilities (per-model MCP endpoints); RAG and vector DB extensions; native web search/fetch tools added in v0.8.4. [GitHub README](https://github.com/janhq/jan), [docs desktop index](https://github.com/janhq/jan/blob/dev/docs/src/pages/docs/desktop/index.mdx)
- MCP transport roadmap: stdio first, then sse/streamable HTTP. [Issue #4824](https://github.com/janhq/jan/issues/4824)

### (d) Cross-platform + auto-update + packaging

- Windows (`.exe`, Microsoft Store), macOS (`.dmg`), Linux (`.deb`, AppImage, Flathub). [GitHub README](https://github.com/janhq/jan)
- Uses a **Tauri custom updater** (Rust `core::updater`) with **HMAC request signing** for secure update checks. [PR #7377](https://github.com/janhq/jan/pull/7377)

### (e) Community health

- ~44k stars, ~2.9k forks, ~435 open issues; top contributor `urmauur` (~1464 contributions). [GitHub](https://github.com/janhq/jan)
- **License: Apache-2.0** (README explicitly states it). [GitHub README](https://github.com/janhq/jan)
- Latest release **v0.8.4** (changelog dated 2026-07-21). [docs desktop index](https://github.com/janhq/jan/blob/dev/docs/src/pages/docs/desktop/index.mdx)

### (f) Lessons for CloserAI

- A **Tauri (Rust) shell dramatically reduces footprint vs Electron** while keeping a web frontend — relevant since CloserAI hosts DSH as a child process and is Electron-based; Jan shows a viable alternative shell.
- **OS keyring + encrypted-file fallback for secrets** and **local JSON data folder** are the pattern CloserAI already targets; Jan validates keeping secrets out of localStorage.
- Bundling an **OpenAI-compatible local API server** increases interop value beyond the UI.
- Caveat: Jan is **inference-centric** (bundled llama.cpp); CloserAI's model-agnostic + harness-child-process model is a different, broader architecture.

---

## 2. Cherry Studio (CherryHQ/cherry-studio)

### (a) Tech stack & architecture

- **Electron** application with three process types (main, renderer, preload) and an AI core; monorepo; packaged with electron-builder. [architecture-overview.md](https://github.com/CherryHQ/cherry-studio/blob/9ea7e850/docs/references/architecture-overview.md), [DeepWiki](https://deepwiki.com/CherryHQ/cherry-studio)
- Supports **50+ LLM providers** (OpenAI, Gemini, Anthropic) + AI web services (Claude, Perplexity, Poe) + local models via **Ollama and LM Studio**. [GitHub README](https://github.com/cherryhq/cherry-studio)

### (b) Security model

- **Electron `safeStorage` (OS-level encryption)** is used for at-rest secret encryption, including device-code OAuth tokens. [PR #13703](https://github.com/CherryHQ/cherry-studio/pull/13703), [Electron safeStorage](https://www.electron.build/docs/features/auto-update/) / [Electron safeStorage docs](https://electronjs.org/docs/latest/api/safe-storage)
- A dedicated security fix (issue #11934) addressed **API-key leakage to startup logs** (log redaction) and **plaintext secrets persisted to disk/localStorage**, adding transparent encryption for persisted secrets. [Issue #11934](https://github.com/CherryHQ/cherry-studio/issues/11934)
- Note: v2 stores sensitive credentials under `~/.cherrystudio`; a community issue flags that this "catch-all" directory mixes boot config and secrets. [Issue #14411](https://github.com/CherryHQ/cherry-studio/issues/14411)

### (c) Feature highlights (desktop workbench)

- 300+ pre-configured assistants, custom assistants, multi-model simultaneous conversations, document processing (text/images/Office/PDF), WebDAV file management/backup, Mermaid, code highlighting, global search, topic management, translation, mini programs. [GitHub README](https://github.com/cherryhq/cherry-studio)
- **Full MCP client**: supports multiple transports (stdio, SSE, streamableHTTP, in-memory) with complete lifecycle management of server connections, plus provider sync and registry management; a "MCP Marketplace" is on the roadmap. [DeepWiki MCP architecture](https://deepwiki.com/CherryHQ/cherry-studio/6.1-mcp-architecture), [DeepWiki MCP server management](https://deepwiki.com/CherryHQ/cherry-studio/6.2-mcp-server-management), [GitHub README](https://github.com/cherryhq/cherry-studio)

### (d) Cross-platform + auto-update + packaging

- Windows, macOS, Linux via electron-builder. [GitHub README](https://github.com/cherryhq/cherry-studio)
- **Auto-update via `electron-updater`** (custom `AppUpdater` service, `latest.yml` metadata; patched to support Windows ARM upgrades). [AppUpdater.ts](https://github.com/CherryHQ/cherry-studio/blob/0989f9b8/src/main/services/AppUpdater.ts), [PR #5337](https://github.com/CherryHQ/cherry-studio/pull/5337)

### (e) Community health

- ~51k stars, ~4.9k forks, ~1,368 open issues; top contributor `kangfenmao` (~2319 contributions). [GitHub](https://github.com/cherryhq/cherry-studio)
- **License: AGPL-3.0** (affero copyleft). [GitHub License](https://github.com/CherryHQ/cherry-studio?tab=License-1-ov-file)
- Latest release **v2.0.9** (2026-08-24). [Release v2.0.9](https://github.com/CherryHQ/cherry-studio/releases/tag/v2.0.9)

### (f) Lessons for CloserAI

- **Closest functional analog for MCP management**: Cherry Studio shows the value of a _full_ MCP client (multiple transports, lifecycle management, settings UI, marketplace direction) — directly relevant to CloserAI's "MCP server management" feature.
- **Electron `safeStorage` + log redaction + at-rest encryption** is the concrete security baseline CloserAI should mirror (CloserAI already uses OS-keychain secrets).
- **AGPL-3.0** is a critical licensing contrast: CloserAI's MIT choice differentiates it from Cherry Studio's copyleft; a benchmark should note this.
- Its security also reveals a lesson: keep **boot config separate from credentials** to avoid a "catch-all" secret directory (issue #14411).

---

## 3. AnythingLLM (Mintplex-Labs/anything-llm)

### (a) Tech stack & architecture

- Ships both a **desktop app (Electron)** and a **self-hostable server (Node.js/Docker)** with built-in RAG, vector databases, agents, and document pipelines. [GitHub README](https://github.com/Mintplex-Labs/anything-llm)
- Provider plug-in is the broadest of the four: OpenAI, Azure OpenAI, AWS Bedrock, Anthropic, Gemini, Ollama, LM Studio, LocalAI, Together, OpenRouter, **DeepSeek**, Mistral, Groq, Cohere, xAI, and many more. [GitHub README](https://github.com/Mintplex-Labs/anything-llm)

### (b) Security model

- **MIT license** with a published SECURITY.md. [GitHub README](https://github.com/Mintplex-Labs/anything-llm), [SECURITY.md](https://github.com/Mintplex-Labs/anything-llm/blob/master/SECURITY.md)
- API keys/LLM tokens configured via environment variables / settings (`.env.example` shows `JWT_SECRET`, `SIG_KEY`, `SIG_SALT`, provider tokens). [server/.env.example](https://github.com/Mintplex-Labs/anything-llm/blob/master/server/.env.example)
- Had a real API-key leak CVE: **CVE-2026-24477** (unauthenticated `/api/setup-complete` exposed Qdrant/Weaviate API keys), **fixed in v1.10.0** — a concrete cautionary example of server-side secret exposure. [linux-server-admin security wiki](https://wiki.linux-server-admin.com/web-apps/genai/anythingllm/security)

### (c) Feature highlights (desktop workbench)

- Chat-with-docs, AI agents, **no-code agent builder**, vector DBs, dynamic model routing, scheduled tasks, memories, multimodal, custom agents, Developer API, embeddable chat widget. [GitHub README](https://github.com/Mintplex-Labs/anything-llm)
- **MCP support (desktop, v1.8.0+)**: supports **Tools only** — explicitly _no_ Resources, Prompts, or Sampling. MCP servers are added by editing `anythingllm_mcp_servers.json` in the storage `plugins` directory (or via the UI), and auto-start when the "Agent Skills" page is opened or tools invoked. Docs warn: "never run MCPs you do not trust." [MCP on AnythingLLM Desktop](https://docs.anythingllm.com/mcp-compatibility/desktop), [MCP overview](https://docs.anythingllm.com/mcp-compatibility/overview)

### (d) Cross-platform + auto-update + packaging

- Desktop for Mac/Windows/Linux; server deployable via Docker/Helm/K8s/AWS/GCP. [GitHub README](https://github.com/Mintplex-Labs/anything-llm)
- **Auto-update via `electron-updater`**; macOS updates are delivered as re-installable `.dmg` that overwrite the app while preserving storage. [AnythingLLM Update docs](https://docs.anythingllm.com/installation-desktop/update)

### (e) Community health

- ~65k stars, ~7.2k forks, ~333 open issues; top contributor `timothycarambat` (~1456 contributions). [GitHub](https://github.com/Mintplex-Labs/anything-llm)
- **License: MIT**. [GitHub README](https://github.com/Mintplex-Labs/anything-llm)
- Latest release **v1.16.0** (2026-08-13). [Release v1.16.0](https://github.com/Mintplex-Labs/anything-llm/releases/tag/v1.16.0)

### (f) Lessons for CloserAI

- **Dual desktop + self-hosted server** expands the addressable market but also multiplies the attack surface (CVE-2026-24477) — CloserAI's pure local-first, no-server posture avoids that class of server-side exposure.
- MCP support demonstrates a pragmatic **Tools-only MCP integration** with a JSON config file, but also shows its limits (no Resources/Prompts) vs Cherry Studio's full client.
- **MIT licensing at scale (~65k stars)** validates that MIT is viable for a large desktop+server AI project — the same license CloserAI chose.

---

## 4. Chatbox (chatboxai/chatbox)

### (a) Tech stack & architecture

- **Electron** app based on the electron-react-boilerplate (`.erb`), TypeScript, with desktop + web + iOS/Android clients sharing a common codebase. [Repo structure](https://github.com/Bin-Huang/chatbox), [DeepWiki](https://deepwiki.com/chatboxai/chatbox/1.1-features-and-capabilities)
- Providers plug in through a provider layer: OpenAI (ChatGPT), Azure OpenAI, Claude, Google Gemini Pro, **Ollama** (local models), ChatGLM-6B. [GitHub README](https://github.com/Bin-Huang/chatbox)

### (b) Security model

- **Local-first data storage** — data remains on the device ("never gets lost and maintains your privacy"). [GitHub README](https://github.com/Bin-Huang/chatbox)
- Per-provider API keys are configured in settings; the app is the **GPLv3 Community Edition** (open-sourced "again" from the pro repo). [GitHub README](https://github.com/Bin-Huang/chatbox)

### (c) Feature highlights (desktop workbench)

- Multiple providers, image generation (DALL-E-3), local data storage, markdown/LaTeX/code highlighting, prompt library, message quoting, **team collaboration (share OpenAI API resources)**, streaming, dark theme, multilingual. [GitHub README](https://github.com/Bin-Huang/chatbox)
- **Work Mode** for long-running tasks, approvals, and command compatibility; **code execution with approval**; web search; **skills**; knowledge base (RAG). [Chatbox Guide](https://chatboxai.app/en/guide/work-mode/configuration), [Release notes](https://github.com/chatboxai/chatbox/releases)
- **MCP support**: MCP servers configured through a settings panel (local stdio and remote HTTP endpoints), plus a **deep-link protocol for one-click server installation**. Note: no documented portable MCP config file, so setups can't easily be committed to a repo. [ConnectorZone Chatbox MCP](https://connector.zone/clients/chatbox/), [DeepWiki MCP integration](https://deepwiki.com/chatboxai/chatbox/7.2-mcp-server-integration)

### (d) Cross-platform + auto-update + packaging

- Windows (Setup.exe), macOS (Intel/Apple Silicon), Linux (AppImage), plus iOS/Android/web. [GitHub README](https://github.com/Bin-Huang/chatbox)
- **Auto-update via `electron-updater`** (`AppUpdater` class; electron-builder.yml). [main.ts](https://github.com/chatboxai/chatbox/blob/main/src/main/main.ts), [electron-builder.yml](https://github.com/chatboxai/chatbox/blob/a9d87cfe4480947daef8d432e01db887dac633f2/electron-builder.yml)

### (e) Community health

- ~41k stars, ~4.2k forks, ~1,247 open issues; top contributor `themez` (~559 contributions). [GitHub](https://github.com/chatboxai/chatbox)
- **License: GPLv3**. [GitHub](https://github.com/chatboxai/chatbox), [README](https://github.com/chatboxai/chatbox/blob/main/README.md)
- Latest release **v1.22.3** (2026-08-09). [Releases](https://github.com/chatboxai/chatbox/releases)

### (f) Lessons for CloserAI

- **Permission/approval UX** (Work Mode with approvals and code execution) is the closest analog to CloserAI's Chat/Work/Code permission modes — a strong benchmark reference for permission-transparency UX.
- **Deep-link one-click MCP install** is a clever onboarding mechanic for MCP server management.
- The lack of a **portable MCP config file** is an anti-pattern worth noting (CloserAI should support portable/committable MCP configs).
- **GPLv3** is another copyleft contrast reinforcing CloserAI's MIT choice; also shows a desktop+web+mobile multi-target strategy on one codebase.

---

## Sources

### Kept

- Jan README — https://github.com/janhq/jan — primary: stack, features, license, packaging, OpenAI-compatible server
- Jan Data Folder — https://www.jan.ai/docs/desktop/data-folder — local JSON storage paths (primary doc)
- Jan privacy — https://www.jan.ai/privacy — privacy/offline posture
- Jan MCP doc — https://github.com/janhq/jan/blob/dev/docs/src/pages/docs/desktop/mcp.mdx — MCP client support
- Jan PR #8388 (backend store/keyring) — https://github.com/janhq/jan/pull/8388 — secrets off localStorage
- Jan PR #7377 (custom updater/HMAC) — https://github.com/janhq/jan/pull/7377 — Tauri updater
- Jan DeepWiki — https://deepwiki.com/janhq/jan — architecture confirmation (Tauri/Rust + React 19)
- Cherry Studio README — https://github.com/cherryhq/cherry-studio — features, providers, MCP, packaging
- Cherry Studio architecture-overview — https://github.com/CherryHQ/cherry-studio/blob/9ea7e850/docs/references/architecture-overview.md — Electron process model
- Cherry Studio security fix #11934 — https://github.com/CherryHQ/cherry-studio/issues/11934 — log redaction + safeStorage at-rest encryption
- Cherry Studio PR #13703 — https://github.com/CherryHQ/cherry-studio/pull/13703 — safeStorage OAuth tokens
- Cherry Studio DeepWiki MCP — https://deepwiki.com/CherryHQ/cherry-studio/6.1-mcp-architecture — full MCP client, transports
- Cherry Studio AppUpdater.ts — https://github.com/CherryHQ/cherry-studio/blob/0989f9b8/src/main/services/AppUpdater.ts — electron-updater
- Cherry Studio release v2.0.9 — https://github.com/CherryHQ/cherry-studio/releases/tag/v2.0.9 — latest release
- AnythingLLM README — https://github.com/Mintplex-Labs/anything-llm — features, providers, license, dual desktop+server
- AnythingLLM MCP desktop — https://docs.anythingllm.com/mcp-compatibility/desktop — Tools-only MCP, JSON config
- AnythingLLM SECURITY.md — https://github.com/Mintplex-Labs/anything-llm/blob/master/SECURITY.md — security policy
- AnythingLLM security wiki (CVE-2026-24477) — https://wiki.linux-server-admin.com/web-apps/genai/anythingllm/security — API-key leak CVE, fixed 1.10.0
- AnythingLLM update docs — https://docs.anythingllm.com/installation-desktop/update — macOS dmg re-install update
- AnythingLLM release v1.16.0 — https://github.com/Mintplex-Labs/anything-llm/releases/tag/v1.16.0 — latest release
- Chatbox README — https://github.com/Bin-Huang/chatbox — providers, local-first, GPLv3, cross-platform
- Chatbox Guide (work mode config) — https://chatboxai.app/en/guide/work-mode/configuration — modes/approvals/MCP/skills
- Chatbox MCP (ConnectorZone) — https://connector.zone/clients/chatbox/ — MCP settings panel, deep-link install, no portable config
- Chatbox DeepWiki MCP — https://deepwiki.com/chatboxai/chatbox/7.2-mcp-server-integration — MCP config persistence
- Chatbox main.ts / electron-builder.yml — https://github.com/chatboxai/chatbox/blob/main/src/main/main.ts and https://github.com/chatboxai/chatbox/blob/a9d87cfe4480947daef8d432e01db887dac633f2/electron-builder.yml — electron-updater
- Chatbox releases — https://github.com/chatboxai/chatbox/releases — v1.22.3

### Dropped

- Blog comparison posts (houseoffoss, aicoolies, sumguy, towardsai, ossalt) — secondary/opinion commentary; facts superseded by primary repos/docs
- Jan FAQ mintlify mirror / tecnobits MCP guide — mirrored/derivative of primary docs; used only for redundancy
- Community star-history/leaderboard mirrors — third-party aggregate; star counts taken directly from GitHub metadata instead
- raqueljezweb/anythingllm-mcp-server (third-party MCP server) — not the AnythingLLM core project; out of scope

---

## Gaps

- **Exact current star/contributor counts drift rapidly**; figures here are snapshot values from GitHub metadata at research time and should be re-verified against the repos before publishing BENCHMARK.md (they trend: Jan ~44k, Cherry ~51k, AnythingLLM ~65k, Chatbox ~41k).
- **Jan license metadata inconsistency**: GitHub API lists license as "Other" while the README and repo LICENSE state Apache-2.0; recommended to confirm against the LICENSE file directly.
- **Secret-storage internals** (exact OS-keychain vs encrypted-file behavior, what is/isn't encrypted) for Jan/Chatbox are only described at a high level in primary sources; deeper verification would require reading the relevant source files (`settings_store.rs`, `provider_secrets.rs` for Jan; Chatbox settings store).
- **Cherry Studio v2 storage layout** is flagged in an open issue (#14411) as a known weakness (credentials mixed with boot config under `~/.cherrystudio`); status of any fix is not confirmed.
- AnythingLLM desktop MCP page returned 403 to direct fetch; details were taken from the search-synthesized copy of that doc plus the overview page — worth re-fetching from a non-blocked route if precise wording is needed.
- **Suggested next steps**: (1) pull live GitHub API numbers for all four repos at BENCHMARK-writing time; (2) read Jan `settings_store.rs`/`provider_secrets.rs` and Chatbox settings store to confirm secret-at-rest details; (3) confirm Jan license file; (4) verify AnythingLLM desktop MCP doc wording from a mirror/cache.

## Supervisor coordination

No blocking decisions needed. This research task is complete and returned as a structured brief; no supervisor contact required.
