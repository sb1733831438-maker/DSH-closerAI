import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import type { CreateProjectInput, Mode, Project, ProjectStoreData } from '../shared/types.js'

const DEFAULT_DATA: ProjectStoreData = { activeProjectId: null, projects: [] }

function isMode(value: unknown): value is Mode {
  return value === 'chat' || value === 'work' || value === 'code'
}

function isProject(value: unknown): value is Project {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.name === 'string' &&
    isMode(record.mode) &&
    (record.workspaceDir === null || typeof record.workspaceDir === 'string') &&
    typeof record.createdAt === 'number' &&
    typeof record.updatedAt === 'number'
  )
}

function parseData(parsed: unknown): ProjectStoreData {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    return { ...DEFAULT_DATA }
  const record = parsed as Record<string, unknown>
  const projects = Array.isArray(record.projects)
    ? (record.projects.filter(isProject) as Project[])
    : []
  const activeProjectId =
    typeof record.activeProjectId === 'string' && projects.some((p) => p.id === record.activeProjectId)
      ? record.activeProjectId
      : null
  return { activeProjectId, projects }
}

function newId(): string {
  return 'project-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
}

export class ProjectStore {
  private readonly filePath: string

  constructor(filePath: string) {
    this.filePath = filePath
  }

  read(): ProjectStoreData {
    try {
      return parseData(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // fresh arrays every call: never return a shared singleton, or a
        // shallow copy would leak mutations from one instance into all others
        return { activeProjectId: null, projects: [] }
      }
      throw error
    }
  }
  write(data: ProjectStoreData): void {
    mkdirSync(dirname(this.filePath), { recursive: true })
    writeFileSync(this.filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
  }

  list(): Project[] {
    return this.read().projects
  }

  getActive(): Project | null {
    const data = this.read()
    if (data.activeProjectId === null) return null
    return data.projects.find((p) => p.id === data.activeProjectId) ?? null
  }

  create(input: CreateProjectInput): Project {
    const now = Date.now()
    const project: Project = {
      id: newId(),
      name: input.name.trim() || '未命名项目',
      mode: input.mode,
      workspaceDir: input.workspaceDir === undefined ? null : input.workspaceDir,
      createdAt: now,
      updatedAt: now,
    }
    const data = this.read()
    data.projects.push(project)
    if (data.activeProjectId === null) data.activeProjectId = project.id
    this.write(data)
    return project
  }

  update(project: Project): void {
    if (!isProject(project)) throw new Error('invalid project')
    const data = this.read()
    const index = data.projects.findIndex((p) => p.id === project.id)
    if (index === -1) throw new Error('project not found: ' + project.id)
    data.projects[index] = { ...project, updatedAt: Date.now() }
    this.write(data)
  }

  remove(id: string): void {
    const data = this.read()
    data.projects = data.projects.filter((p) => p.id !== id)
    if (data.activeProjectId === id) data.activeProjectId = null
    this.write(data)
  }

  setActive(id: string | null): void {
    const data = this.read()
    if (id !== null && !data.projects.some((p) => p.id === id))
      throw new Error('project not found: ' + id)
    data.activeProjectId = id
    this.write(data)
  }
}
