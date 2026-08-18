import { describe, expect, it } from 'vitest'
import { MODE_PERMISSIONS, permissionsFor } from '../src/main/permissions.js'

describe('MODE_PERMISSIONS', () => {
  it('covers exactly the three modes', () => {
    expect(MODE_PERMISSIONS.map((item) => item.mode)).toEqual(['chat', 'work', 'code'])
  })

  it('chat grants no shell and no filesystem', () => {
    const chat = permissionsFor('chat')!
    const tools = chat.entries.map((e) => e.tool)
    expect(tools).not.toContain('Shell 终端')
    expect(tools).not.toContain('文件系统')
    expect(tools).toContain('联网搜索')
  })

  it('code grants shell, filesystem and delegation', () => {
    const code = permissionsFor('code')!
    const tools = code.entries.map((e) => e.tool)
    expect(tools).toContain('Shell 终端')
    expect(tools).toContain('文件系统')
    expect(tools).toContain('子代理 / 工作流 / Ralph')
  })

  it('work grants sandbox filesystem without shell', () => {
    const work = permissionsFor('work')!
    const tools = work.entries.map((e) => e.tool)
    expect(tools).toContain('应用沙箱文件')
    expect(tools).not.toContain('Shell 终端')
  })

  it('every entry has a tool name and a permission description', () => {
    for (const item of MODE_PERMISSIONS) {
      for (const entry of item.entries) {
        expect(entry.tool.length).toBeGreaterThan(0)
        expect(entry.permission.length).toBeGreaterThan(0)
      }
    }
  })
})
