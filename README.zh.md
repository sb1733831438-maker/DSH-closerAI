# CloserAI

> 本地优先、模型无关、权限透明的开源桌面 AI 工作台，用于交付真实的 Chat + Work +
> Code/Cowork 成果。**基于 DeepSeek Harness 构建。**

[English](README.md) | 简体中文

CloserAI 是一款开源桌面应用，它在加固的 Electron 外壳中托管一个
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 进程。它不是简单套壳：它在保留
DSH 作为 Agent 运行时的同时，新增了桌面监督器（Supervisor）、三种权限隔离工作模式
（Chat / Work / Code）、本地优先的会话存储、基于系统钥匙串的密钥管理，以及插件安全模型。

## 状态

**预发布 —— v0.0.4。** 项目正在向 v0.1.0 可日常使用版本持续开发。当前里程碑见
[`docs/STATUS.md`](docs/STATUS.md)，完整路线图见
[`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md)。

### 里程碑

| 版本   | 范围                                                              | 状态   |
| ------ | ----------------------------------------------------------------- | ------ |
| v0.0.1 | Bootstrap：monorepo、工具链、Mock Provider、CI                    | 已发布 |
| v0.0.2 | 桌面外壳：DSH 监督器 + 加固 Electron 窗口                         | 已发布 |
| v0.0.3 | 首次引导、OS 钥匙串密钥、DeepSeek/OpenAI 兼容 Provider、Mock 模式 | 已发布 |
| v0.0.4 | Chat / Work / Code 权限隔离模式                                   | 已发布 |
| v0.0.5 | 日常对话：会话持久化、历史、项目、文件处理                        | 进行中 |

### 目前可用

- 加固 Electron 外壳：单实例、深链、严格 CSP、导航锁定、沙箱 preload。
- 带崩溃恢复的 DSH 子进程监督器，绑定随机回环端口。
- 中文首次引导界面：DeepSeek、任意 OpenAI 兼容 Provider、或离线 Mock。
- API Key 经操作系统钥匙串加密，仅注入 DSH 子进程环境，绝不落盘。
- 三种隔离模式：**Chat**（无 Shell/文件系统）、**Work**（应用沙箱内文件系统、无 Shell）、
  **Code**（授权目录内的完整 Shell/文件系统/终端/计划/子代理）。

## 原则

- **本地优先 & BYOK** —— 自带 API Key；密钥存放在操作系统钥匙串中，绝不进入日志、文件或渲染进程。
- **模型无关** —— 支持 DeepSeek 与任意 OpenAI-compatible Provider，并提供确定性的 Mock Provider
  用于离线使用。
- **权限透明** —— 三种能力隔离模式通过 DSH Agent Preset 与沙箱工作区根目录实现，而非仅靠提示词约束。
- **独立身份** —— CloserAI 拥有自己的名称与界面，仅注明「Built on DeepSeek Harness」。

## 仓库结构

```
apps/        Electron 桌面应用（主进程、preload、引导界面、agent presets）
packages/    共享包（mock provider、DSH supervisor）
docs/        架构、执行计划、状态与决策记录
```

## 开发

要求：Node.js >= 20.19，pnpm 11。

```bash
pnpm install
pnpm check                 # 格式化 + lint + 构建 + 类型检查 + 测试
pnpm --filter @closerai/desktop start   # 启动桌面应用
pnpm --filter @closerai/desktop smoke   # 无头端到端冒烟测试
```

## 许可证

[MIT](LICENSE)。CloserAI 是独立项目，与 DeepSeek 无隶属关系。
