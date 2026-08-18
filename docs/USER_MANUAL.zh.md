# CloserAI 用户手册

CloserAI 是基于 DeepSeek Harness (DSH) 运行时构建的本地优先、模型无关的桌面 AI
工作台。本文档面向 v0.0.8 Windows 安装包。英文版见 [USER_MANUAL.md](USER_MANUAL.md)。

## 安装

1. 从 [v0.0.8 Release](https://github.com/sb1733831438-maker/DSH-closerAI/releases) 下载
   `CloserAI-0.0.8-Setup-x64.exe`。
2. 用 `SHA256SUMS.txt` 校验 SHA-256（Windows 用 `Get-FileHash`）。
3. 运行安装包（若出现 SmartScreen 提示：更多信息 → 仍要运行，直到应用完成代码签名）。

## 首次运行

- 引导页需要配置 Provider（DeepSeek、OpenAI 兼容接口，或**Mock 模式**免密钥）。
- Mock 模式可在无 API 密钥的情况下体验界面与工作流。
- 密钥存储在系统钥匙串中，绝不落盘到配置文件。

## Chat / Work / Code 模式

| 模式 | 能力                                      |
| ---- | ----------------------------------------- |
| Chat | 联网搜索 + 附件，无 shell、无本地文件访问 |
| Work | 应用私有沙箱，文档处理，无 shell          |
| Code | 指定目录，shell/git/终端（需批准）        |

可在托盘（工作区）或管理页切换模式。

## 管理页

- **提供者**：管理 API 密钥并测试连通性。
- **工作区/项目**：创建命名项目；每个项目固定模式与工作目录，重启后恢复。
- **会话**：列出、删除、导出、导入 DSH 会话。
- **能力**：按模式开关联网搜索/抓取/技能。
- **权限**：各模式设计能力清单。
- **诊断与日志**：监督器实时状态 + 脱敏子进程日志；可导出用于支持。
- **开机启动**：登录时启动 CloserAI。

## 数据位置

- 应用配置：`%APPDATA%/@closerai`（Windows）。
- 会话：`%APPDATA%/@closerai/dsh-home/sessions/<workspace>/session-<uuid>/`。
- 密钥：系统钥匙串。

## 获取帮助

参见 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)。如未覆盖，请导出诊断并在
GitHub 上提 Issue。
