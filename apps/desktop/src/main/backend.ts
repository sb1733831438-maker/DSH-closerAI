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
  /** The profile actually applied (mock gets a concrete local baseUrl). */
  profile: ProviderProfile
  mode: Mode
}

export interface LaunchBackendOptions {
  home: string
  profile: ProviderProfile
  apiKey: string
  mode: Mode
  /** Workspace root for the mode: app sandbox (work) or authorized dir (code). */
  workspaceDir: string
  /** Capability toggles rendered into the installed agent presets. */
  capabilities?: Capabilities
}

/**
 * Bring up the provider backend for one profile, install the Chat/Work/Code
 * agent presets, select the active preset, and boot DSH against the chosen
 * workspace directory.
 */
export async function launchBackend(options: LaunchBackendOptions): Promise<RunningBackend> {
  const { home, profile, apiKey, mode, workspaceDir, capabilities } = options
  let effective = profile
  let mockServer: MockServer | null = null

  if (profile.kind === 'mock') {
    mockServer = await startMockServer()
    effective = { ...profile, baseUrl: `${mockServer.url}/v1` }
  }

  const settingsPath = join(home, 'settings.yaml')
  await installPresets(home, capabilities ?? DEFAULT_CAPABILITIES)
  mkdirSync(workspaceDir, { recursive: true })
  writeDshProviderSettings(settingsPath, effective)
  writeDshAgentPresetDefault(settingsPath, mode)

  const dsh = await startDsh(home, {
    apiKey: profile.kind === 'mock' ? 'mock-key' : apiKey,
    cwd: workspaceDir,
  })

  return { dsh, mockServer, profile: effective, mode }
}
