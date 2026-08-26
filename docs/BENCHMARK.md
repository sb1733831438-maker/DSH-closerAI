# 竞品对标：同类开源项目对比（Benchmark）

> 本文件是 CloserAI 长期开源基线的一部分，与 `docs/REVIEW_<date>.md`、`docs/ROADMAP.md` 配套。
> 撰写日期：2026-08-26 · 数据采集：2026-08（实时 web + GitHub 主源；除注明外均为研究时点快照）。
> 证据规则：每一项结论均以主源（GitHub README / 官方文档 / 官方 release / 源码）为引用；不凭记忆下结论。
> 分角色审查的原始材料见 `docs/review/pass-*.md` 与 `docs/review/research-*.md`。

---

## 1. 目的与方法

CloserAI 是一个 local-first、model-agnostic、permission-transparent 的桌面 AI 工作台：在加固的 Electron 外壳中，把 DeepSeek Harness（DSH）作为隔离子进程托管，提供 Chat / Work / Code 三种权限隔离模式、MCP 服务器管理、OS 钥匙串密钥、自动更新、三平台安装包。

对标的目的是回答三个问题：

1. **CloserAI 在同类项目中的定位是否清晰、是否有差异化；**
2. **同类项目有哪些已被验证的功能/安全/生态模式值得借鉴；**
3. **哪些反模式要避免。**

对标分为两组：

- **A 组 · 桌面 AI 客户端**（最直接可比）：Jan、Cherry Studio、AnythingLLM、Chatbox；
- **B 组 · 平台 / 运行时 / 权限参考**：Open WebUI、LobeChat、DeepSeek Harness（被托管的运行时）、LM Studio（闭源功能参考）、Cline / Roo Code（权限透明 / 审批 UX 参考）。

> 数字（star / fork / issue / 版本）为采集时点快照，发布 BENCHMARK 前建议用 GitHub API 复核。

---

## 2. CloserAI 定位快照（对标基准）

| 维度     | CloserAI                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------- |
| 形态     | Electron 桌面客户端（main/preload/renderer 三进程）+ 加固外壳                                        |
| 运行时   | 托管 DeepSeek Harness（`@deepseek-ai/dsh@0.1.0-rc.6` 精确锁定）为**子进程**，HTTP 通信               |
| 权限模型 | Chat/Work/Code 三模式 = DSH agent preset（工具集 + 沙箱策略），管理页权限清单                        |
| 密钥     | Electron safeStorage（macOS Keychain / Windows DPAPI / Linux libsecret）→ 加密文件 → 子进程 env 注入 |
| MCP      | v0.7.0 管理 UI：stdio/HTTP 服务器增删改启停 + 导出标准 `mcp.json`（**未挂载进运行中的 DSH**）        |
| 许可     | MIT                                                                                                  |
| 分发     | Windows NSIS / macOS dmg（未签名）/ Linux AppImage；electron-updater 自动更新                        |
| 供应     | SBOM（CycloneDX，973 组件）+ 许可门禁                                                                |

---

## 3. A 组 · 桌面 AI 客户端对比矩阵

| 维度                      | **Jan**                               | **Cherry Studio**                                                               | **AnythingLLM**                                              | **Chatbox**                                          | **CloserAI**                                               |
| ------------------------- | ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------- |
| 仓库                      | janhq/jan                             | CherryHQ/cherry-studio                                                          | Mintplex-Labs/anything-llm                                   | chatboxai/chatbox                                    | sb1733831438-maker/DSH-closerAI                            |
| 运行时                    | **Tauri (Rust)** + React 19           | **Electron** + React                                                            | **Electron** 桌面 + Node Docker 服务端                       | **Electron** + React (.erb)                          | **Electron** + React                                       |
| 本地推理                  | llama.cpp（Rust 插件）                | Ollama / LM Studio                                                              | Ollama / LM Studio / LocalAI / llama.cpp                     | Ollama                                               | 依赖 DSH + 远程/离线 provider                              |
| 云端 provider             | OpenAI/Anthropic/Mistral/Groq…        | 50+                                                                             | 最广（OpenAI/Bedrock/DeepSeek…）                             | OpenAI/Azure/Claude/Gemini/Ollama                    | DeepSeek + 任意 OpenAI 兼容 + Mock                         |
| MCP                       | MCP client，per-model 端点            | **完整 MCP client**（stdio/SSE/streamableHTTP/In-memory）+ 计划中的 Marketplace | 桌面端 **Tools-only**（无 Resources/Prompts），JSON 配置文件 | settings 面板 MCP client（stdio+HTTP）+ 深链一键安装 | 管理 UI（stdio/HTTP）+ 导出 `mcp.json`（**未挂载运行时**） |
| 密钥处理                  | OS keyring + 加密文件兜底             | **Electron safeStorage** + 日志脱敏                                             | env/settings；曾出 CVE-2026-24477                            | 本地存储，per-provider 密钥                          | **Electron safeStorage**（无明文兜底，失败即抛错）         |
| 许可                      | Apache-2.0                            | **AGPL-3.0**                                                                    | MIT                                                          | **GPLv3**                                            | **MIT**                                                    |
| Star / Fork / Open issues | ~44k / ~2.9k / ~435                   | ~51k / ~4.9k / ~1,368                                                           | ~65k / ~7.2k / ~333                                          | ~41k / ~4.2k / ~1,247                                | 新建（~0）                                                 |
| 最新 release              | v0.8.4 (2026-07-21)                   | v2.0.9 (2026-08-24)                                                             | v1.16.0 (2026-08-13)                                         | v1.22.3 (2026-08-09)                                 | v0.7.0 (2026-08-26)                                        |
| 自动更新                  | Tauri 自定义 updater（**HMAC 签名**） | electron-updater                                                                | electron-updater                                             | electron-updater                                     | electron-updater（**无代码签名**）                         |
| 移动/Web                  | 无                                    | 规划中                                                                          | 服务端 Docker                                                | iOS/Android/Web                                      | 无                                                         |

---

## 4. A 组 · 逐项目要点与教训

### 4.1 Jan（janhq/jan）— Tauri + 隐私优先 + 本地推理

- **架构**：Tauri (Rust) + React 19，Rust 层通过 Tauri IPC 桥接；本地推理走 llama.cpp（Rust 插件），并暴露 **OpenAI 兼容本地 API（localhost:1337）** 供其他工具复用。[GitHub README](https://github.com/janhq/jan) · [DeepWiki](https://deepwiki.com/janhq/jan) · [PR #7171](https://github.com/janhq/jan/pull/7171)
- **安全**：100% 离线可用；数据存本地 JSON（可自定义目录）；近期把凭据从 localStorage 迁到 **OS keyring + 加密文件兜底** 的后端存储。[隐私页](https://www.jan.ai/privacy) · [数据目录](https://www.jan.ai/docs/desktop/data-folder) · [PR #8388](https://github.com/janhq/jan/pull/8388)
- **更新**：Tauri 自定义 updater，更新请求 **HMAC 签名**。[PR #7377](https://github.com/janhq/jan/pull/7377)
- **社区**：~44k star，Apache-2.0，v0.8.4。
- **对 CloserAI 的教训**：
  - Tauri 证明 **Electron 之外有更小体积的桌面壳**（CloserAI 托管 DSH 子进程，理论上未来可评估非 Electron 外壳，但当前 Electron 是稳妥选择）。
  - **OS keyring + 加密文件兜底** 与 CloserAI 现状一致，且说明把密钥移出 localStorage 是正确的基线。
  - 内置 **OpenAI 兼容本地 API** 能显著提升互操作价值（CloserAI 的 Mock provider 已是雏形，可考虑扩展为可选的本地 OpenAI 兼容端点）。
  - Jan 偏推理中心化（自带 llama.cpp）；CloserAI 的 model-agnostic + harness 子进程是更宽的架构。

### 4.2 Cherry Studio（CherryHQ/cherry-studio）— MCP 最完整、功能面最大的 Electron 客户端

- **架构**：Electron 三进程 + AI core；electron-builder 打包。[架构总览](https://github.com/CherryHQ/cherry-studio/blob/9ea7e850/docs/references/architecture-overview.md)
- **安全**：**Electron safeStorage** 加密持久化密钥（含 device-code OAuth token）；曾专门修复 API key 泄漏到启动日志与明文持久化（[issue #11934](https://github.com/CherryHQ/cherry-studio/issues/11934)）；但 v2 把凭据与启动配置混在 `~/.cherrystudio` 的“catch-all”目录被社区点名（[issue #14411](https://github.com/CherryHQ/cherry-studio/issues/14411)）。[PR #13703](https://github.com/CherryHQ/cherry-studio/pull/13703)
- **MCP**：**完整 MCP client**——多传输（stdio / SSE / streamableHTTP / In-memory）、连接生命周期管理、provider 同步、注册表管理，规划 MCP Marketplace。[DeepWiki MCP 架构](https://deepwiki.com/CherryHQ/cherry-studio/6.1-mcp-architecture) · [MCP 服务器管理](https://deepwiki.com/CherryHQ/cherry-studio/6.2-mcp-server-management)
- **更新**：electron-updater（自定义 AppUpdater）。[AppUpdater.ts](https://github.com/CherryHQ/cherry-studio/blob/0989f9b8/src/main/services/AppUpdater.ts)
- **社区**：~51k star，**AGPL-3.0**，v2.0.9（2026-08-24）。
- **对 CloserAI 的教训**：
  - **CloserAI 的 MCP 管理在功能定位上的最直接对标就是 Cherry Studio**。下一步（把 MCP 服务器真正挂载进运行中的 DSH，而非仅导出 `mcp.json`）就是向“完整 MCP client”收敛的关键差距。
  - **safeStorage + 日志脱敏 + 落盘加密** 是应镜像的安全基线（CloserAI 已具备前两者，注意 MCP 凭据的落盘处理）。
  - **AGPL-3.0 是关键的许可对照**：CloserAI 的 MIT 是与 Cherry Studio copyleft 的差异化卖点，应写入对外文档。
  - **反模式**：凭据目录与启动配置分离，避免“catch-all”秘密目录。

### 4.3 AnythingLLM（Mintplex-Labs/anything-llm）— 桌面 + 自托管服务端的 MIT 大项目

- **架构**：Electron 桌面 + Node/Docker 自托管服务端；内置 RAG、向量库、agent、文档管线；provider 最广（含 DeepSeek）。[GitHub README](https://github.com/Mintplex-Labs/anything-llm)
- **安全**：MIT + 公开 SECURITY.md；曾出 **CVE-2026-24477**（未鉴权 `/api/setup-complete` 泄露 Qdrant/Weaviate API key），v1.10.0 修复——服务端类暴露的典型反面教材。[SECURITY.md](https://github.com/Mintplex-Labs/anything-llm/blob/master/SECURITY.md) · [安全 wiki](https://wiki.linux-server-admin.com/web-apps/genai/anythingllm/security)
- **MCP**：桌面端 v1.8.0+ 支持 **Tools-only**（明确无 Resources/Prompts/Sampling），通过 JSON 配置文件 `anythingllm_mcp_servers.json` 增删，文档警示“不要运行不信任的 MCP”。[MCP 桌面文档](https://docs.anythingllm.com/mcp-compatibility/desktop) · [MCP 总览](https://docs.anythingllm.com/mcp-compatibility/overview)
- **更新**：electron-updater（macOS 用 dmg 重装覆盖）。[更新文档](https://docs.anythingllm.com/installation-desktop/update)
- **社区**：~65k star，**MIT**，v1.16.0（2026-08-13）。
- **对 CloserAI 的教训**：
  - **纯 local-first、无服务端的姿态避免了服务端密钥暴露这一类攻击面**（CVE 教训），是 CloserAI 的安全差异化。
  - MCP 的 **Tools-only + JSON 配置文件** 是务实的轻量集成，但也证明没有生命周期管理的局限（vs Cherry Studio 完整 client）。CloserAI 的 `mcp.json` 导出已具备“可提交到仓库的便携配置”这一好属性。
  - **MIT 在 ~65k star 规模下可行**，验证了 CloserAI 的 MIT 选择。

### 4.4 Chatbox（chatboxai/chatbox）— 多端 + 审批式 Work Mode

- **架构**：Electron（.erb）+ TypeScript，桌面 / Web / iOS / Android 共享代码库。[仓库结构](https://github.com/Bin-Huang/chatbox) · [DeepWiki](https://deepwiki.com/chatboxai/chatbox/1.1-features-and-capabilities)
- **权限/审批**：**Work Mode** 提供长任务、审批、代码执行需批准——与 CloserAI 的 Chat/Work/Code 权限模式最接近的参考。[Work Mode 配置指南](https://chatboxai.app/en/guide/work-mode/configuration)
- **MCP**：settings 面板配置（本地 stdio + 远程 HTTP），**深链协议一键安装**；无便携配置文件（不可提交仓库，是反模式）。[ConnectorZone](https://connector.zone/clients/chatbox/) · [DeepWiki MCP](https://deepwiki.com/chatboxai/chatbox/7.2-mcp-server-integration)
- **更新**：electron-updater。[electron-builder.yml](https://github.com/chatboxai/chatbox/blob/a9d87cfe4480947daef8d432e01db887dac633f2/electron-builder.yml)
- **社区**：~41k star，**GPLv3**，v1.22.3。
- **对 CloserAI 的教训**：
  - **Work Mode 的审批/代码执行 UX 是权限透明的强参考**，可纳入 CloserAI 权限审批 UX 的对标。
  - **深链一键安装 MCP** 是聪明的 onboarding 机制（CloserAI 已有 `closerai://` 深链基础设施，可扩展）。
  - **没有便携 MCP 配置文件**是反模式——CloserAI 的 `mcp.json` 导出正好相反，应继续保持并宣传。

---

## 5. B 组 · 平台 / 运行时 / 权限参考

| 项目                 | 是什么                                                                                       | 许可                                       | 权限/信任模型                                                                                                                 | 与 CloserAI 的相关性                                         |
| -------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **Open WebUI**       | 自托管 Web AI 平台（多用户、RAG、agent）                                                     | MIT + 商业                                 | 3 层 RBAC：Roles / Permissions / Groups，默认安全（首个用户成为 admin、新用户 pending）                                       | 功能完整度与 RBAC 粒度参考                                   |
| **LobeChat**         | 自托管 chat 平台 + “Chief Agent Operator”                                                    | MIT                                        | 组织/团队访问控制（非代码 agent 权限模型）                                                                                    | MCP/插件 **Marketplace + 一键安装** UX 的最强参考            |
| **DeepSeek Harness** | CloserAI 托管的运行时：一切皆插件（Cordis）、sandbox+approval 权限预设、append-only 会话日志 | MIT，**developer preview（有破坏性变更）** | 权限预设层：`sandbox/mode` + `approval/policy` 两个旋钮打包成 Permissions 选择器（默认 workspace-write / danger-full-access） | **直接依赖**：必须精确锁定版本、子进程隔离以吸收变更         |
| **LM Studio**        | 闭源本地桌面 LLM + 服务                                                                      | 专有（仅功能参考）                         | 单用户本地工具，无权限模型                                                                                                    | 本地服务 + SDK + OpenAI/Anthropic 兼容 + 本地 MCP 的功能参考 |
| **Cline**            | 开源编码 agent（IDE + CLI + Kanban + SDK）                                                   | Apache-2.0                                 | **每工具策略** `{autoApprove:true/false, enabled:false}` + 交互审批 + 分级/条件审批 + Plan/Act                                | **权限透明 / 审批 UX 的首要参考**                            |
| **Roo Code**         | 开源 VS Code 编码 agent（Cline 系）                                                          | Apache-2.0                                 | **按类别自动批准**（readOnly/write/mcp/execute/modeSwitch/subtasks/followupQuestions）+ 醒目安全警告                          | 按类别/按模式权限粒度的参考                                  |

---

## 6. B 组 · 逐项目要点与教训

### 6.1 Open WebUI — 功能最完整的 Web 参考

- 3 层 RBAC（Roles/Permissions/Groups）、默认安全（首个用户成为 admin、新用户 pending 需审批）、RAG、插件体系（Filters/Actions/Pipes/Tools/Skills）、通过 **MCP / MCPO / OpenAPI** 连接外部服务。[README](https://github.com/open-webui/open-webui/blob/HEAD/README.md) · [RBAC 文档](https://docs.openwebui.com/features/authentication-access/rbac/) · [加固文档](https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/hardening.md)
- **教训**：权限**粒度与默认安全**是成熟产品级参照；CloserAI 的 per-mode 权限清单可借鉴其“默认受限、可见、可逐项授予”的精神。

### 6.2 LobeChat — MCP/插件生态 UX 的最强参考

- 定位“Chief Agent Operator”，agents 作为工作单元；插件网关（Vercel Edge Function）；宣称 **10,000+ Skills / MCP 兼容插件 / MCP Marketplace 一键安装**。[README](https://github.com/lobehub/lobe-chat/blob/next/README.md) · [插件网关](https://github.com/lobehub/chat-plugins-gateway)
- **教训**：**Marketplace + 一键安装**是壮大本地 AI 生态的成熟路径；CloserAI 的 MCP 管理 UI 中期可向“插件/MCP 市场 + 一键安装（含深链）”演进。

### 6.3 DeepSeek Harness — 被托管的运行时（最关键的依赖）

- 一切皆插件（Cordis）、profile/bundle 分层组合、append-only `SessionEvent` 日志（“model-visible means logged”）、`ctx.tools` 注册表 + `ctx.sandbox` 进程沙箱 + `ctx.fs` 文件策略。[README](https://github.com/deepseek-ai/deepseek-harness) · [architecture.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md)
- **权限预设**：`sandbox/mode` + `approval/policy` 打包为 Permissions 选择器，默认 `workspace-write`（workspace-write+ask）与 `danger-full-access`（danger-full-access+never）。[权限预设文档](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/permission-presets) · [包 README](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/interaction/permission-presets/README.md)
- **版本风险**：官方明示 **developer preview、存在兼容性破坏变更**。
- **教训**：CloserAI 的“精确锁定 + 子进程隔离 + 预设/插件/兼容层扩展、绝不 fork 核心”策略是**正确且必要的**；权限预设设计正是 CloserAI per-mode 权限清单与审批提示的自然地基（REVIEW 中对齐）。

### 6.4 LM Studio — 闭源功能参考（仅功能）

- 本地模型服务 + `llmster` 无头守护 + `lms` CLI + TS/Python SDK + REST + OpenAI/Anthropic 兼容端点 + 状态化 REST 的**本地 MCP**（`/v1/chat`）。[开发者文档](https://lmstudio.ai/docs/developer) · [server 文档](https://lmstudio.ai/docs/developer/core/server)
- **教训**：验证了 CloserAI 的 local-first + OpenAI/Anthropic 兼容 + MCP 方向；SDK/API 表面（OpenAI/Anthropic 兼容 + REST）值得纳入长期方向。

### 6.5 Cline — 权限透明 / 审批 UX 的首要参考

- 每工具策略：`{ autoApprove: true }`（直接执行）/ `{ autoApprove: false }`（等待审批）/ `{ enabled: false }`（禁用，模型不可见）；文档明确警告**未列出的工具默认启用并自动批准**。[权限处理文档](https://docs.cline.bot/sdk/guides/permission-handling)
- 分级模式：Auto-Approve Everything（可信 CI/沙箱）、Interactive Approval（人审）、Tiered Permissions（读自动批、写需批）、Conditional Approval（按动作而非仅按工具审批）；拒绝时 agent 收到拒绝消息并可调整（不卡死）。Plan/Act 模式。[README](https://github.com/cline/cline)
- **教训**：**默认显式受限、而不是隐式放行**是 CloserAI 权限清单应坚持的原则；分级/条件审批与 Plan/Act 的 UX 是 ROADMAP 中“更细粒度权限审批”的样板。

### 6.6 Roo Code — 按类别/按模式审批

- 按类别自动批准：`alwaysAllowReadOnly / alwaysAllowWrite / alwaysAllowMcp / alwaysAllowModeSwitch / alwaysAllowSubtasks / alwaysAllowExecute / alwaysAllowFollowupQuestions`，附醒目 SECURITY WARNING。[auto-approval 源码](https://github.com/RooCodeInc/Roo-Code/blob/137d3f4f/src/core/auto-approval/index.ts) · [auto-approving-actions 文档](https://roocodeinc.github.io/Roo-Code/features/auto-approving-actions/) · [custom-modes](https://roocodeinc.github.io/Roo-Code/features/custom-modes)
- 社区正在讨论把自动批准**从全局改为 per-mode**（[issue #12002](https://github.com/RooCodeInc/Roo-Code/issues/12002)）——这正是 CloserAI per-mode 权限清单已经做到的事。
- **教训**：把自动批准**限定在模式内、可见、默认受限**，是 CloserAI 与 Roo 讨论方向一致且已经领先的差异化点。

---

## 7. 提炼：CloserAI 可借鉴 / 应规避（映射到 ROADMAP）

| #   | 教训                                                                         | 来源                                                               | 优先级        | 映射                                        |
| --- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------- | ------------------------------------------- |
| L1  | MCP 从“导出配置文件”升级为**真正挂载进运行中的 DSH**（完整生命周期管理）     | Cherry Studio（最完整 MCP client）、AnythingLLM（Tools-only 局限） | **P0-近**     | ROADMAP Track A-4                           |
| L2  | **默认显式受限**的权限/审批，拒绝时 agent 能优雅调整；把自动批准限定在模式内 | Cline、Roo Code（per-mode 讨论）                                   | **P1**        | Track B-1 权限审批 UX                       |
| L3  | 密钥安全基线：safeStorage + 日志脱敏 + 落盘加密 + **启动配置与凭据分离**     | Cherry Studio（#11934/#14411）、Jan（#8388）                       | **P1**        | REVIEW 安全发现 F4/F5（MCP 凭据、诊断脱敏） |
| L4  | 更新链路可信：**代码签名 / 更新签名验证**（Jan HMAC；CloserAI 目前无签名）   | Jan（HMAC updater）、CloserAI 现状                                 | **P1**        | REVIEW 安全发现 F6、Track A-5               |
| L5  | 便携、可提交的 MCP 配置（反例：Chatbox 无便携配置）                          | Chatbox（反模式）、CloserAI 已有 `mcp.json`                        | P2            | 保持并宣传                                  |
| L6  | Marketplace + 一键安装（含深链）壮大生态                                     | LobeChat、Chatbox 深链、Cherry Marketplace                         | **P2-中长期** | Track B-2 插件生态                          |
| L7  | 可选本地 OpenAI 兼容 API 端点提升互操作                                      | Jan（localhost:1337）、LM Studio                                   | P2            | Track B-1（可选）                           |
| L8  | 纯本地无服务端 = 避免服务端密钥暴露攻击面                                    | AnythingLLM CVE-2026-24477（反例）                                 | P2            | 写入 SECURITY 叙事                          |
| L9  | MIT 许可在桌面 AI 客户端大项目可行，是 vs AGPL/GPL 的差异化                  | AnythingLLM（MIT）、Cherry（AGPL）、Chatbox（GPL）                 | P2            | 对外文档明确                                |
| L10 | 权限粒度 + 默认安全（角色/组/能力开关）                                      | Open WebUI RBAC                                                    | P3            | Track B-3 治理                              |

---

## 8. 结论：CloserAI 的差异化定位

- **独特组合**：相比四款桌面客户端，CloserAI 同时具备——**MIT 许可**、**权限隔离三模式（对齐 Cline/Roo 的权限透明理念，且已做到 per-mode）**、**OS 钥匙串密钥（对齐 Cherry/Jan 的安全基线）**、**纯本地无服务端（避开 AnythingLLM 的攻击面）**、**以及“托管 DSH 运行时”这一独特架构（不是自建 agent 循环，而是复用 DeepSeek Harness 的完整 agent 能力）**。
- **最大短板**：MCP 尚未挂载进运行时（L1）、更新链路无签名（L4）、社区与生态为零（L6）、权限审批 UX 尚在“清单展示”而非“交互审批”（L2）。
- **建议叙事**：对外定位一句话——“a local-first, MIT, permission-transparent desktop client that hosts the DeepSeek Harness agent runtime, with Chat/Work/Code isolation modes and OS-keychain secrets”。差异化全部落在宿主层（安全/同步/多环境/生命周期），永远不改 DSH 核心。

---

## 9. 主要来源

**A 组（桌面客户端）**

- Jan: <https://github.com/janhq/jan> · <https://www.jan.ai/privacy> · <https://www.jan.ai/docs/desktop/data-folder> · <https://github.com/janhq/jan/blob/dev/docs/src/pages/docs/desktop/mcp.mdx> · <https://github.com/janhq/jan/pull/8388> · <https://github.com/janhq/jan/pull/7377> · <https://deepwiki.com/janhq/jan>
- Cherry Studio: <https://github.com/cherryhq/cherry-studio> · <https://github.com/CherryHQ/cherry-studio/blob/9ea7e850/docs/references/architecture-overview.md> · <https://github.com/CherryHQ/cherry-studio/issues/11934> · <https://github.com/CherryHQ/cherry-studio/pull/13703> · <https://deepwiki.com/CherryHQ/cherry-studio/6.1-mcp-architecture> · <https://deepwiki.com/CherryHQ/cherry-studio/6.2-mcp-server-management> · <https://github.com/CherryHQ/cherry-studio/blob/0989f9b8/src/main/services/AppUpdater.ts>
- AnythingLLM: <https://github.com/Mintplex-Labs/anything-llm> · <https://docs.anythingllm.com/mcp-compatibility/desktop> · <https://docs.anythingllm.com/mcp-compatibility/overview> · <https://github.com/Mintplex-Labs/anything-llm/blob/master/SECURITY.md> · <https://docs.anythingllm.com/installation-desktop/update>
- Chatbox: <https://github.com/Bin-Huang/chatbox> · <https://chatboxai.app/en/guide/work-mode/configuration> · <https://connector.zone/clients/chatbox/> · <https://deepwiki.com/chatboxai/chatbox/7.2-mcp-server-integration> · <https://github.com/chatboxai/chatbox/blob/main/src/main/main.ts>

**B 组（平台/运行时/权限）**

- Open WebUI: <https://github.com/open-webui/open-webui/blob/HEAD/README.md> · <https://docs.openwebui.com/features/authentication-access/rbac/> · <https://github.com/open-webui/docs/blob/main/docs/getting-started/advanced-topics/hardening.md>
- LobeChat: <https://github.com/lobehub/lobe-chat/blob/next/README.md> · <https://github.com/lobehub/chat-plugins-gateway>
- DeepSeek Harness: <https://github.com/deepseek-ai/deepseek-harness> · <https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md> · <https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/permission-presets>
- LM Studio: <https://lmstudio.ai/docs/developer> · <https://lmstudio.ai/docs/developer/core/server>
- Cline: <https://github.com/cline/cline> · <https://docs.cline.bot/sdk/guides/permission-handling>
- Roo Code: <https://github.com/RooCodeInc/Roo-Code> · <https://roocodeinc.github.io/Roo-Code/features/auto-approving-actions/> · <https://github.com/RooCodeInc/Roo-Code/blob/137d3f4f/src/core/auto-approval/index.ts>

**CloserAI 现状**：仓库内 `docs/ARCHITECTURE.md`、`docs/DECISIONS.md`、`docs/STATUS.md`、`package.json`、`apps/desktop/electron-builder.yml`（2026-08-26 快照）。
