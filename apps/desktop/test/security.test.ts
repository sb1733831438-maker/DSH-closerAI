import { describe, expect, it } from 'vitest'
import {
  buildContentSecurityPolicy,
  externalNavigationAction,
  hardenedWebPreferences,
  isAllowedInternalNavigation,
  isSameOrigin,
} from '../src/main/security.js'

describe('buildContentSecurityPolicy', () => {
  it('locks down scripts, objects, and frames', () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain("base-uri 'none'")
  })
})

describe('isSameOrigin', () => {
  it('matches the same origin regardless of path', () => {
    expect(isSameOrigin('http://127.0.0.1:55182/x', 'http://127.0.0.1:55182/')).toBe(true)
  })

  it('rejects a different port or host', () => {
    expect(isSameOrigin('http://127.0.0.1:9999/', 'http://127.0.0.1:55182/')).toBe(false)
    expect(isSameOrigin('https://example.com/', 'http://127.0.0.1:55182/')).toBe(false)
  })

  it('returns false for malformed URLs', () => {
    expect(isSameOrigin('not a url', 'http://127.0.0.1:55182/')).toBe(false)
  })
})

describe('isAllowedInternalNavigation', () => {
  const origin = 'http://127.0.0.1:55182/'
  it('allows same-origin navigation only', () => {
    expect(isAllowedInternalNavigation('http://127.0.0.1:55182/chat', origin)).toBe(true)
    expect(isAllowedInternalNavigation('https://example.com/', origin)).toBe(false)
    expect(isAllowedInternalNavigation('file:///etc/passwd', origin)).toBe(false)
  })
})

describe('externalNavigationAction', () => {
  it('opens https and http links in the system browser', () => {
    expect(externalNavigationAction('https://example.com/')).toBe('open')
    expect(externalNavigationAction('http://example.com/')).toBe('open')
  })

  it('denies non-web schemes', () => {
    expect(externalNavigationAction('file:///etc/passwd')).toBe('deny')
    expect(externalNavigationAction('javascript:alert(1)')).toBe('deny')
    expect(externalNavigationAction('garbage')).toBe('deny')
  })
})

describe('hardenedWebPreferences', () => {
  it('enables isolation, sandbox, and disables node integration', () => {
    const prefs = hardenedWebPreferences('/path/to/preload.cjs')
    expect(prefs.contextIsolation).toBe(true)
    expect(prefs.nodeIntegration).toBe(false)
    expect(prefs.sandbox).toBe(true)
    expect(prefs.webSecurity).toBe(true)
    expect(prefs.allowRunningInsecureContent).toBe(false)
    expect(prefs.preload).toBe('/path/to/preload.cjs')
  })
})
describe('buildContentSecurityPolicy (RC hardening)', () => {
  it('locks down form, media, connect, worker and font sources', () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).toContain("form-action 'none'")
    expect(csp).toContain("connect-src 'self'")
    expect(csp).toContain("img-src 'self' data: blob:")
    expect(csp).toContain("font-src 'self' data:")
    expect(csp).toContain("media-src 'self' blob:")
    expect(csp).toContain("worker-src 'self' blob:")
  })

  it('never allows remote origins or data: scripts', () => {
    const csp = buildContentSecurityPolicy()
    expect(csp).not.toContain('https://')
    expect(csp).not.toContain('*://')
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval' data:")
  })

  it('is a single header-safe string (no newlines)', () => {
    expect(buildContentSecurityPolicy()).not.toMatch(/[\r\n]/)
  })
})

describe('externalNavigationAction (RC hardening)', () => {
  it('denies data:, blob:, and ftp: schemes', () => {
    expect(externalNavigationAction('data:text/html,<script>alert(1)</script>')).toBe('deny')
    expect(externalNavigationAction('blob:https://example.com/abc')).toBe('deny')
    expect(externalNavigationAction('ftp://example.com/file')).toBe('deny')
  })

  it('denies unknown schemes and empty strings', () => {
    expect(externalNavigationAction('')).toBe('deny')
    expect(externalNavigationAction('chrome://settings')).toBe('deny')
  })
})

describe('isSameOrigin (RC hardening)', () => {
  it('rejects different schemes on the same host', () => {
    expect(isSameOrigin('http://127.0.0.1:8080/', 'https://127.0.0.1:8080/')).toBe(false)
  })

  it('treats a bare origin with no port consistently', () => {
    expect(isSameOrigin('http://127.0.0.1/', 'http://127.0.0.1:80/')).toBe(true)
  })
})

describe('hardenedWebPreferences (RC hardening)', () => {
  it('returns an exact, exhaustive hardening contract', () => {
    expect(hardenedWebPreferences('/x.cjs')).toEqual({
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: '/x.cjs',
    })
  })
})
