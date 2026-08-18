import type { Mode, ModePermissions } from '../shared/types.js'

/**
 * The designed permission surface for each mode, mirroring the checked-in
 * agent presets. This is the manifest users see in the management page; the
 * actual enabled tools additionally depend on the capability toggles.
 */
export const MODE_PERMISSIONS: ModePermissions[] = [
  {
    mode: 'chat',
    entries: [
      { tool: '对话', permission: '只与模型对话，读取用户共享的附件' },
      { tool: '联网搜索', permission: '发起 Web 搜索（可关）' },
      { tool: '网页抓取', permission: '读取搜索结果页面（默认关）' },
      { tool: '询问用户', permission: '向用户提问以澄清需求' },
      { tool: '任务清单', permission: '维护任务清单' },
    ],
  },
  {
    mode: 'work',
    entries: [
      { tool: '对话', permission: '与模型对话' },
      { tool: '应用沙箱文件', permission: '读写应用私有沙箱目录（无 Shell）' },
      { tool: '文件编辑', permission: '在沙箱内编辑文本文件' },
      { tool: '文件搜索', permission: '在沙箱内搜索文件' },
      { tool: '联网搜索 / 抓取', permission: '按能力开关决定' },
      { tool: '询问用户 / 任务清单', permission: '澄清与跟踪任务' },
    ],
  },
  {
    mode: 'code',
    entries: [
      { tool: 'Shell 终端', permission: '在授权目录内执行 Shell（Windows 用 PowerShell）' },
      { tool: '文件系统', permission: '读写用户授权的目录' },
      { tool: '文件编辑 / 搜索', permission: '编辑与搜索授权目录' },
      { tool: '计划模式', permission: '先计划后执行' },
      { tool: '子代理 / 工作流 / Ralph', permission: '委派与并行执行' },
      { tool: '技能 Skills', permission: '调用已安装技能（可关）' },
      { tool: '联网搜索 / 抓取', permission: '按能力开关决定' },
      { tool: '询问用户 / 任务清单', permission: '澄清与跟踪任务' },
    ],
  },
]

export function permissionsFor(mode: Mode): ModePermissions | undefined {
  return MODE_PERMISSIONS.find((item) => item.mode === mode)
}
