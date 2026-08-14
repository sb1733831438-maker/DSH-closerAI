import { safeStorage } from 'electron'
import type { SecretCipher } from './secrets.js'

/**
 * Host cipher backed by Electron safeStorage: macOS Keychain, Windows DPAPI,
 * or Linux libsecret. Fails loudly when encryption is unavailable rather than
 * silently storing plaintext.
 */
export function createSafeStorageCipher(): SecretCipher {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption is unavailable on this system')
  }
  return {
    encrypt: (plaintext) => safeStorage.encryptString(plaintext),
    decrypt: (ciphertext) => safeStorage.decryptString(ciphertext),
  }
}
