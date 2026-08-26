import { safeStorage } from 'electron'
import type { SecretCipher } from './secrets.js'

/**
 * Return a warning when the OS storage backend provides only obfuscation.
 * Extracted as a pure function so it is unit-testable without Electron.
 *
 * On Linux without a keyring, Electron's safeStorage can report available
 * while using the `basic_text` backend (a hardcoded key — obfuscation, not
 * real encryption). Surface that instead of pretending it is encryption.
 */
export function storageBackendWarning(backend: string | undefined): string | null {
  if (backend === 'basic_text') {
    return '[closerai] safeStorage backend is basic_text — secrets are obfuscated, not encrypted. Install a keyring (e.g. gnome-keyring / KWallet) for real protection.'
  }
  return null
}

/**
 * Host cipher backed by Electron safeStorage: macOS Keychain, Windows DPAPI,
 * or Linux libsecret. Fails loudly when encryption is unavailable rather than
 * silently storing plaintext.
 */
export function createSafeStorageCipher(): SecretCipher {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is unavailable on this system')
  }
  const warning = storageBackendWarning(safeStorage.getSelectedStorageBackend?.())
  if (warning !== null) console.log(warning)
  return {
    encrypt: (plaintext) => safeStorage.encryptString(plaintext),
    decrypt: (ciphertext) => safeStorage.decryptString(ciphertext),
  }
}
