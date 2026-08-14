import type { CloserAiBridge } from '../../shared/ipc'

declare global {
  interface Window {
    closerai: CloserAiBridge
  }
}

export {}
