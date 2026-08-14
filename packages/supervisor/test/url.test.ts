import { describe, expect, it } from 'vitest'
import { parseDshUrl, urlToHostPort } from '../src/url.js'

describe('parseDshUrl', () => {
  it('extracts the URL from a ready line', () => {
    expect(parseDshUrl('dsh web: http://127.0.0.1:52750')).toBe('http://127.0.0.1:52750')
  })

  it('is case-insensitive', () => {
    expect(parseDshUrl('DSH WEB: http://127.0.0.1:1')).toBe('http://127.0.0.1:1')
  })

  it('returns null for unrelated lines', () => {
    expect(parseDshUrl('some other output')).toBeNull()
    expect(parseDshUrl('')).toBeNull()
  })
})

describe('urlToHostPort', () => {
  it('parses host and port', () => {
    expect(urlToHostPort('http://127.0.0.1:52750')).toEqual({ host: '127.0.0.1', port: 52750 })
  })

  it('rejects missing or invalid ports', () => {
    expect(urlToHostPort('http://127.0.0.1')).toBeNull()
    expect(urlToHostPort('http://127.0.0.1:0')).toBeNull()
    expect(urlToHostPort('http://127.0.0.1:99999')).toBeNull()
  })

  it('rejects non-http protocols', () => {
    expect(urlToHostPort('ws://127.0.0.1:1234')).toBeNull()
  })
})
