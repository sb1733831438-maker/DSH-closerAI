# 更新方向路线图（Roadmap）

> 本文件是 CloserAI 长期开源基线的一部分，与 `docs/REVIEW_2026-08-26.md`（发现编号 R-xx）、`docs/BENCHMARK.md`（教训编号 L-x）配套。
> 撰写日期：2026-08-26。
> 原则：**先修短板、再上生态、长期差异化全部落在宿主层（安全/同步/多环境/生命周期），永不 fork DSH 核心。**

---

## 0. 路线图总览

| 里程碑        | 主题                                                        | 目标                                    | 阻塞发布条件          |
| ------------- | ----------------------------------------------------------- | --------------------------------------- | --------------------- |
| **v0.8.x**    | 审查发现修复 + 质量门禁 + 社区面                            | P1 清零、CI 门禁补齐、社区模板就位      | P1 未清零即阻塞       |
| **v0.9.x**    | MCP 运行时挂载 + 签名/分发 + 渲染层测试                     | MCP live-mount、代码签名调研、E2E 入 CI | 渲染层已知缺陷未修    |
| **v1.0**      | 权限审批 UX + 技能管理 + 文档站点 + 发布自动化              | 达到“稳定日常可用 + 对外可贡献”         | 版本漂移/文档矛盾未清 |
| **1.0+ 长期** | 插件生态 / Marketplace、per-project 隔离、多环境/离线、治理 | 成为“personal AI workstation”           | —                     |

---

## 1. Track A — 近期里程碑（v0.8.x / v0.9.x，先修短板）

> 每一项都映射到 REVIEW 的 R- 编号与 BENCHMARK 的 L- 编号，并给出验收标准。

### A-1. 修复 P1 缺陷（v0.8.x 核心，阻塞项）

| 子项                               | 映射                     | 建议做法                                                                                                                                               | 验收标准                                                                  |
| ---------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **IPC 发送方校验**                 | R-01（security F1）；L2  | 每个 `ipcMain.handle` 校验 `event.senderFrame`/`event.sender.getURL()` 必须命中 app 自身 `file://` 入口；长期把 DSH UI 移到独立窗口/会话、不带 preload | 新增测试：模拟来自 DSH origin 的 invoke 被拒绝；`pnpm check` 绿           |
| **后端重启串行化**                 | R-02（correctness F1）   | `index.ts` 用单飞 promise 串行化 `startBackendForActiveProfile`，为 managed 分支补 try/catch + notify                                                  | 新增测试：连续触发两次 `onComplete` 只有一个 DSH 子进程存活；无未处理拒绝 |
| **Store 损坏容错 + 原子写**        | R-03（correctness F2）   | project/provider/mode store 对 JSON 解析失败降级为默认值（可选留 `.corrupt` 备份）；`writeFileSync` 改为 temp+rename 原子写；`boot()` 顶部 try/catch   | 新增 3 个 store 的损坏文件测试；`boot()` 损坏时落 onboarding 而非崩溃     |
| **SBOM 门禁接入 CI**               | R-04（qa F-01 / oss F4） | `ci.yml` 增加 `pnpm sbom:gen`（或直接 `pnpm check`）                                                                                                   | CI 上新增依赖无许可证 → PR 失败                                           |
| **Smoke/E2E 入 CI + release 门禁** | R-05（qa F-02）          | CI 增加桌面 smoke（ubuntu xvfb-run）；`release.yml` 至少在打 tag 前跑 `pnpm check`（test+typecheck+sbom）                                              | 打 tag 到 broken commit 不再能产出安装包；release job 失败显式            |

### A-2. 修复已确认的渲染层与契约缺陷（v0.8.x）

| 子项                                                            | 映射                                   | 建议做法                                                                                                                                                                                   | 验收标准                                                     |
| --------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 渲染层两处真实缺陷                                              | R-06、R-07（qa F-03/F-04，已核验源码） | `Manage.tsx` 权限提示改为模板表达式；日志视图 `.map(l => l.text).join('\n')`                                                                                                               | 修复后管理页显示真实模式名与日志文本；新增 renderer 测试覆盖 |
| **v0.7.0 已发布缺陷：MCP 添加必败**                             | R-34（architecture，已核验）           | “＋ 添加服务器”的 `mcpEditId` 哨兵改为 `null \|\| ''` 都走 `addMcpServer`（或独立 show-form 布尔）                                                                                         | 新增服务器成功；新增 Manage 组件测试覆盖添加路径             |
| **v0.7.0 已发布缺陷：preload 桥缺 6 方法 → 管理页四项动作报错** | R-33（architecture，已核验）           | 给 preload api 补齐 `getCapabilities/setCapabilities/getDiagnostics/exportDiagnostics/getLaunchAtLogin/setLaunchAtLogin` + 新增 preload 契约测试（断言 `CloserAiBridge` 每个成员都被暴露） | 管理页诊断/能力/开机启动可用；契约测试拦截未来漂移           |
| preload 契约单一来源 + 类型检查                                 | R-08（qa F-05）                        | 频道名抽到 shared 模块（preload 用 tiny .cjs/JSON require）；加入 tsconfig include 或加契约测试                                                                                            | 重命名频道在编译/测试期即失败                                |
| 版本单一来源                                                    | R-09（qa F-06）                        | 用 `app.getVersion()` 作为唯一版本源，删除 preload/ipc 硬编码                                                                                                                              | 诊断报告显示真实版本；新增测试                               |
| 覆盖率门禁                                                      | R-10（qa F-07）                        | vitest coverage（v8），`src/main`/`src/shared` 设温和阈值（warning 级）                                                                                                                    | `pnpm test` 输出覆盖率；CI 有 coverage artifact              |
| 渲染层测试基建                                                  | R-19（qa §1）                          | 引入 jsdom + @testing-library，为 App/Manage 增加组件测试（权限清单、MCP 表单、日志视图）                                                                                                  | 关键交互有测试；补 A-2 中两处缺陷的回归用例                  |

### A-3. 安全加固（v0.8.x~v0.9.x）

| 子项                        | 映射                    | 建议做法                                                                                         | 验收标准                                                   |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| MCP 凭据落盘加密 + 读端脱敏 | R-12（security F4）；L3 | MCP `env`/`headers` 值复用 `SecretStore`（safeStorage）加密；`mcpList` 返回前脱敏；gated by R-01 | 测试：`mcp-servers.json` 无明文 token；renderer 读不到明文 |
| 诊断脱敏覆盖 JSON 密钥      | R-13（security F5）     | 扩展 `sanitizeLogLine` 正则到引号键（`"password":"..."`），补测试                                | 新测试覆盖 JSON 形式                                       |
| 更新链路可信                | R-14（security F6）；L4 | 调研 Windows 代码签名（OV/EV 证书）+ macOS 公证/notarization；落地前在 SECURITY.md 写明信任根    | SECURITY.md 更新；签名调研结论入 doc                       |
| Linux keychain 兜底告警     | R-15（security F7）     | `getSelectedStorageBackend() === 'basic_text'` 时拒绝或警告                                      | 新测试 + 用户可见提示                                      |
| 导航锁按当前后端 URL 派生   | R-11（security F3）     | 每次导航用当前 `backend.dsh.url` 计算允许 origin，而非窗口创建时缓存                             | 新增测试覆盖 file-first → URL 切换路径                     |

### A-4. MCP 运行时挂载（v0.9.x 重点功能）

| 子项                                        | 映射                                             | 建议做法                                                                                                                                                                         | 验收标准                                                              |
| ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 把启用中的 MCP 服务器真正挂载进运行中的 DSH | L1（BENCHMARK）；对应 EXECUTION_PLAN v0.0.6 遗留 | 调研 DSH 的 MCP/工具注册机制（DSH 一切皆插件；不 fork 核心），以 preset/插件方式把 `mcp-servers.json` 中 enabled 的服务器注入 DSH 的 tool 面；启动时挂载、启停时热更新或重启 DSH | 用户在管理页添加 MCP 服务器并启用后，对话中可用对应工具；新增集成测试 |
| MCP 配置便携化保持                          | L5                                               | 保留/加强 `mcp.json` 导出（可提交仓库）                                                                                                                                          | 现有导出测试持续绿                                                    |

### A-5. 社区面补齐（v0.8.x，面向长期开源）

| 子项              | 映射                                   | 建议做法                                                                                                                                                  | 验收标准                                          |
| ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 模板与自动化      | R-20（oss F5）                         | 新增 `.github/ISSUE_TEMPLATE/*`（bug_report.yml、feature_request.yml）、`PULL_REQUEST_TEMPLATE.md`、`dependabot.yml`、`CODE_OF_CONDUCT.md`、`FUNDING.yml` | 文件存在且链接到 README/CONTRIBUTING              |
| SECURITY 联系渠道 | R-17（oss F2）                         | 写明确邮箱或启用 GitHub 私有漏洞报告                                                                                                                      | SECURITY.md 有可操作渠道                          |
| 文档对账          | R-16/R-18/R-21/R-22（oss F1/F3/F6/F7） | 手册升级到 v0.7.0 + `releases/latest`；CHANGELOG 新→旧重排 + `## [Unreleased]`；EXECUTION_PLAN 勾选框对齐；STATUS.md 压平成单一活文档                     | 三处矛盾清零；`pnpm smoke` 文档与实际一致（R-18） |
| 基础卫生          | R-24/R-25（oss F9/F12 等）             | `.pi/` 入 .gitignore；根 version 对齐或注明 private；ARCHITECTURE 指向真实 `apps/desktop/presets/`；移除/注释失效引用                                     | git status 干净；无失效引用                       |

---

## 2. Track B — 1.0 及长期差异化（"personal AI workstation"）

> 差异化全部落在**宿主层**：安全 / 同步 / 多环境 / 生命周期 / 生态。永不修改 DSH 核心（AGENTS.md 硬约束）。

### B-1. 权限透明升级：从“清单展示”到“交互审批”（1.0，对齐 Cline/Roo）

- 映射：L2（BENCHMARK）、REVIEW 权限发现；参考 Cline 每工具策略与 Roo 按类别/按模式审批。
- 方向：
  1. 权限清单与 DSH 实际 tool 面打通（当前是“设计面”镜像，D-019 注明受 DSH API 限制；随 DSH 演进复查能否读真实 roster）。
  2. 在管理页提供**按模式/按类别的自动批准开关**（read-only 可批、write/shell 需批、MCP 需批），默认受限。
  3. 拒绝时给 agent 明确的拒绝反馈，使其可调整（对齐 Cline “不会卡死”）。
  4. Plan/Act 式先计划后执行在 Code 模式已有（DSH plan-mode），补 UX 文案。
- 验收：用户能给某个模式设置“读自动批准、写需确认”，且界面有醒目安全提示。

### B-2. 插件 / MCP 生态（1.0~长期）

- 映射：L6（Marketplace + 一键安装）、L5（便携配置）；Cherry/LobeChat/Chatbox 深链参考。
- 方向：
  1. 在 A-4 的 MCP live-mount 之上，增加 **MCP 一键安装**（`closerai://mcp/install?config=...` 深链，复用现有深链设施）。
  2. 中期评估**插件/MCP 市场**（索引 + 一键安装 + 版本/来源/哈希展示，呼应 v0.0.6 遗留的“插件权限清单、pinned version、source+hash”）。
  3. 权限清单真实强制（sandbox/permission enforcement，随 DSH 能力演进）。
- 验收：用户可通过深链一键启用某个公开 MCP 服务器；插件页展示来源与版本。

### B-3. 多环境 / 离线 / 互操作（长期）

- 映射：L7（本地 OpenAI 兼容端点）、L8（无服务端安全叙事）、L10（RBAC 粒度）。
- 方向：
  1. **per-project DSH home 隔离**与工作区切换可视化（EXECUTION_PLAN v0.5.x 遗留）。
  2. 可选的**本地 OpenAI 兼容 API 端点**（Mock provider 扩展），提升互操作（对齐 Jan/LM Studio）。
  3. 离线能力与多 provider 路由体验打磨。
  4. 把“纯本地无服务端 = 无服务端密钥暴露”写入安全叙事（L8）。
- 验收：每个项目有独立会话/工作区上下文；可选本地端点在 mock 模式外可用。

### B-4. 工程化与治理（1.0~长期）

- 映射：R-10（覆盖率）、R-23（发布自动化）、L10；参考 Open WebUI RBAC 精神。
- 方向：
  1. **发布自动化**：release-please / changesets 自动版本号 + 变更日志 + release notes（替代手动打 tag）。
  2. **docs 站点**（VitePress/MkDocs）：用户手册 + 插件开发 + 架构，中英双语。
  3. 结构化日志（现为 console + LogBuffer）。
  4. 可选**隐私遥测（opt-in）**与清晰的隐私声明。
  5. 提交规范 CI 化（commitlint/PR title 校验）与 branch protection。
- 验收：新版本一条命令发版；docs 站点可访问；`pnpm check` 更快且带覆盖率。

---

## 3. 版本化优先级排序（速查）

| 优先级 | 项                                                                                                                                             | 阻塞发布     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P0     | 无（本轮审查未发现 P0）                                                                                                                        | —            |
| P1     | R-01 发送方校验 · R-02 重启串行化 · R-03 store 容错 · R-04 SBOM 入 CI · R-05 smoke/E2E 入 CI                                                   | 是           |
| P1-近  | **R-33 preload 缺 6 方法（已发布）· R-34 MCP 添加必败（已发布）** · R-06/R-07 渲染层缺陷 · R-08 preload 契约 · R-09 版本源 · R-12 MCP 凭据加密 | 是           |
| P2     | R-10 覆盖率 · R-11 导航锁 · R-13 诊断脱敏 · R-14 签名 · R-15 Linux keychain · R-16~R-22 文档/社区 · A-4 MCP live-mount · A-5 社区面            | 否（v0.9.x） |
| P3     | R-23~R-25 卫生项 · 弱测试补强                                                                                                                  | 否           |

---

## 4. 与既有文档的关系

- 本路线图是 `docs/EXECUTION_PLAN.md`（v0.1.0 前阶段）之后的**新一代路线图**；EXECUTION_PLAN 的勾选框需按 R-22 对账修正。
- 每一项新决策按 `docs/DECISIONS.md` 追加 D-xxx 记录（如 MCP live-mount 的 D-022、权限审批 UX 的 D-023）。
- 每完成一个里程碑，更新 `docs/STATUS.md`（R-21 修复后的单一结构）。
