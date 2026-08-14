import { connect } from 'node:net'

/**
 * Probe a TCP endpoint. Resolves true when a connection is accepted, false on
 * refusal or timeout. The socket is always closed before resolving.
 */
export function tcpProbe(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port })
    let settled = false
    const settle = (ok: boolean): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      socket.destroy()
      resolve(ok)
    }
    const timer = setTimeout(() => settle(false), timeoutMs)
    socket.once('connect', () => settle(true))
    socket.once('error', () => settle(false))
  })
}
