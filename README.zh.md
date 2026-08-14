# CloserAI

> 本地优先、模型无关、权限透明的开源桌面 AI 工作台，用于交付真实的 Chat + Work +
> Code/Cowork 成果。**基于 DeepSeek Harness 构建。**

[English](README.md) | 简体中文

CloserAI 是一款开源桌面应用，它在加固的 Electron 外壳中托管一个
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 进程。它不是简单套壳：它在保留
DSH 作为 Agent 运行时的同时，新增了桌面监督器（Supervisor）、三种权限隔离工作模式
（Chat / Work / Code）、本地优先的会话存储、基于系统钥匙串的密钥管理，以及插件安全模型。

## 状态

**预发布 —— v0.0.1 Bootstrap。** 仓库正在积极开发中。当前里程碑与路线图见
[`docs/STATUS.md`](docs/STATUS.md) 与 [`docs/EXECUTION_PLAN.md`](docs/EXECUTION_PLAN.md)。目前尚不构成
可日常使用的发布版本。

## 原则

- **本地优先 & BYOK** —— 自带 API Key；密钥存放在操作系统钥匙串中，绝不进入日志、文件或渲染进程。
- **模型无关** —— 支持 DeepSeek 与任意 OpenAI-compatible Provider，并提供确定性的 Mock Provider
  用于离线使用。
- **权限透明** —— 三种能力隔离模式通过 DSH Agent Preset 实现，而非仅靠提示词约束。
- **独立身份** —— CloserAI 拥有自己的名称与界面，仅注明「Built on DeepSeek Harness」。

## 仓库结构

```
apps/        Electron 桌面应用（v0.0.2 起）
packages/    共享包（mock provider、DSH supervisor、agent presets 等）
docs/        架构、执行计划、状态与决策记录
```

## 开发

要求：Node.js >= 20.19，pnpm 11。

```bash
pnpm install
pnpm check   # 格式化 + lint + 类型检查 + 测试
```

## 许可证

[MIT](LICENSE)。CloserAI 是独立项目，与 DeepSeek 无隶属关系。
