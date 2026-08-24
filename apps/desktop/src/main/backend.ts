import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { startMockServer, type MockServer } from '@closerai/mock-provider'
import type { Capabilities, Mode, ProviderProfile } from '../shared/types.js'
import { DEFAULT_CAPABILITIES } from './capabilities.js'
import { writeDshAgentPresetDefault, writeDshProviderSettings } from './dsh-settings.js'
import { startDsh, type RunningDsh } from './dsh.js'
import { installPresets } from './presets.js'

export interface RunningBackend {
  dsh: RunningDsh
  mockServer: MockServer | null
  /** The profile actually applied (null in system-sync mode). */
  profile: ProviderProfile | null
  /** The mode actually applied (null in system-sync mode). */
  mode: Mode | null
}

export interface LaunchBackendOptions {
  home: string
  profile: ProviderProfile | null
  apiKey: string
  mode: Mode | null
  /** Workspace root for the mode: app sandbox (work) or authorized dir (code). */
  workspaceDir: string
  /** Capability toggles rendered into the installed agent presets. */
  capabilities?: Capabilities
  /**
   * true (default) = CloserAI manages the home: installs Chat/Work/Code
   * presets and writes provider/preset settings. false = system-sync: boot
   * the user's own DSH untouched (shared sessions, profiles, plugins and
   * settings from their web DSH), never writing into that home.
   */
  manage?: boolean
}

/**
 * Bring up the provider backend for one profile, install the Chat/Work/Code
 * agent presets, select the active preset, and boot DSH against the chosen
 * workspace directory. In system-sync mode (manage=false) it just boots the
 * user's own DSH with no config writes.
 */
export async function launchBackend(options: LaunchBackendOptions): Promise<RunningBackend> {
  const { home, profile, apiKey, mode, workspaceDir, capabilities, manage = true } = options

  if (manage === false) {
    const dsh = await startDsh(home, { cwd: workspaceDir })
    return { dsh, mockServer: null, profile: null, mode: null }
  }

  if (profile === null) {
    throw new Error('managed backend requires a provider profile')
  }
  let effective: ProviderProfile = profile
  let mockServer: MockServer | null = null

  if (profile.kind === 'mock') {
    mockServer = await startMockServer()
    effective = { ...profile, baseUrl: mockServer.url + '/v1' }
  }

  const settingsPath = join(home, 'settings.yaml')
  await installPresets(home, capabilities ?? DEFAULT_CAPABILITIES)
  mkdirSync(workspaceDir, { recursive: true })
  writeDshProviderSettings(settingsPath, effective)
  writeDshAgentPresetDefault(settingsPath, mode ?? 'chat')

  const dsh = await startDsh(home, {
    apiKey: profile.kind === 'mock' ? 'mock-key' : apiKey,
    cwd: workspaceDir,
  })

  return { dsh, mockServer, profile: effective, mode }
}
