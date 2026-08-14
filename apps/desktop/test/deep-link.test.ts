import { describe, expect, it } from 'vitest'
import { DEEP_LINK_SCHEME, parseDeepLink } from '../src/main/deep-link.js'

describe('parseDeepLink', () => {
  it('parses a closerai:// deep link', () => {
    const link = parseDeepLink('closerai://open/session/abc?focus=true')
    expect(link).not.toBeNull()
    expect(link!.action).toBe('open')
    expect(link!.path).toBe('/session/abc')
    expect(link!.query).toEqual({ focus: 'true' })
  })

  it('accepts an empty action', () => {
    const link = parseDeepLink('closerai:///path')
    expect(link).not.toBeNull()
    expect(link!.action).toBe('')
    expect(link!.path).toBe('/path')
  })

  it('rejects other schemes and malformed input', () => {
    expect(parseDeepLink('https://example.com/')).toBeNull()
    expect(parseDeepLink('not a url')).toBeNull()
    expect(parseDeepLink('')).toBeNull()
  })

  it('exposes the configured scheme constant', () => {
    expect(DEEP_LINK_SCHEME).toBe('closerai')
  })
})
