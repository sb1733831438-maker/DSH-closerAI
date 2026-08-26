import type { IpcMainInvokeEvent } from 'electron'
import { describe, expect, it } from 'vitest'
import { isTrustedSender, isTrustedSenderUrl } from '../src/main/ipc.js'

/**
 * R-01: IPC sender validation. Only CloserAI's own file:// pages may invoke
 * the privileged preload bridge; the DSH SPA (http://127.0.0.1:PORT) must be
 * rejected so XSS / malicious plugin content cannot reach the bridge.
 */

function fakeEvent(frameUrl: string | null | undefined, fallbackUrl: string): IpcMainInvokeEvent {
  return {
    senderFrame: frameUrl === null ? null : { url: frameUrl },
    sender: { getURL: () => fallbackUrl },
  } as unknown as IpcMainInvokeEvent
}

describe('isTrustedSenderUrl', () => {
  it('accepts the app own file:// pages', () => {
    expect(isTrustedSenderUrl('file:///C:/Users/x/AppData/.../index.html')).toBe(true)
    expect(isTrustedSenderUrl('file:///.../index.html?view=manage')).toBe(true)
  })

  it('rejects the DSH loopback origin and remote origins', () => {
    expect(isTrustedSenderUrl('http://127.0.0.1:55182/')).toBe(false)
    expect(isTrustedSenderUrl('https://example.com/')).toBe(false)
    expect(isTrustedSenderUrl('about:blank')).toBe(false)
  })

  it('rejects missing frame urls', () => {
    expect(isTrustedSenderUrl(null)).toBe(false)
    expect(isTrustedSenderUrl(undefined)).toBe(false)
  })
})

describe('isTrustedSender', () => {
  it('accepts a file:// sender frame', () => {
    expect(isTrustedSender(fakeEvent('file:///C:/app/index.html', 'http://x'))).toBe(true)
  })

  it('rejects a DSH-origin sender frame even when the fallback is file:', () => {
    expect(isTrustedSender(fakeEvent('http://127.0.0.1:55182/', 'file:///C:/app/index.html'))).toBe(
      false,
    )
  })

  it('falls back to the top-frame url when senderFrame is null', () => {
    expect(isTrustedSender(fakeEvent(null, 'file:///C:/app/index.html'))).toBe(true)
    expect(isTrustedSender(fakeEvent(null, 'http://127.0.0.1:55182/'))).toBe(false)
  })
})
