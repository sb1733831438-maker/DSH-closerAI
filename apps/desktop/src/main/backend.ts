import { join } from 'node:path'
import { startMockServer, type MockServer } from '@closerai/mock-provider'
import { writeDshProviderSettings } from './dsh-settings.js'
import { startDsh, type RunningDsh } from './dsh.js'
import type { ProviderProfile } from './providers.js'

export interface RunningBackend {
  dsh: RunningDsh
  mockServer: MockServer | null
  /** The profile actually applied (mock gets a concrete local baseUrl). */
  profile: ProviderProfile
}

/**
 * Bring up the provider backend for one profile and then boot DSH against it.
 *
 * - Mock: starts the local OpenAI-compatible mock server and points the
 *   profile at its loopback URL.
 * - DeepSeek / OpenAI-compatible: uses the profile's baseUrl directly.
 *
 * The endpoint + model catalog land in DSH's settings.yaml; the API key is
 * injected into the DSH child environment only.
 */
export async function launchBackend(
  home: string,
  profile: ProviderProfile,
  apiKey: string,
): Promise<RunningBackend> {
  let effective = profile
  let mockServer: MockServer | null = null

  if (profile.kind === 'mock') {
    mockServer = await startMockServer()
    effective = { ...profile, baseUrl: `${mockServer.url}/v1` }
  }

  writeDshProviderSettings(join(home, 'settings.yaml'), effective)
  const dsh = await startDsh(home, {
    apiKey: profile.kind === 'mock' ? 'mock-key' : apiKey,
  })

  return { dsh, mockServer, profile: effective }
}
