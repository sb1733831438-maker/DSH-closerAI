export interface HardenedWebPreferences {
  contextIsolation: true
  nodeIntegration: false
  sandbox: true
  webSecurity: true
  allowRunningInsecureContent: false
  preload: string
}

/**
 * The strict Content-Security-Policy applied to every DSH-served response.
 * `self` is the DSH loopback origin. Nothing is allowed to escape to remote
 * origins, and object/base/form/frame ancestors are locked down.
 */
export function buildContentSecurityPolicy(): string {
  // `self` is the DSH loopback origin. DSH's SPA emits inline boot scripts and
  // evaluates code at runtime, so script-src carries 'unsafe-inline' and
  // 'unsafe-eval'; everything else stays locked down (no remote origins, no
  // objects, no frame embedding, no form submission, no arbitrary base).
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join('; ')
}

export function isSameOrigin(candidate: string, origin: string): boolean {
  try {
    return new URL(candidate).origin === new URL(origin).origin
  } catch {
    return false
  }
}

/** Whether an in-window navigation should be allowed (same origin as DSH only). */
export function isAllowedInternalNavigation(url: string, allowedOrigin: string): boolean {
  return isSameOrigin(url, allowedOrigin)
}

/** Decide what to do with a link that wants to leave the app. */
export function externalNavigationAction(url: string): 'open' | 'deny' {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? 'open' : 'deny'
  } catch {
    return 'deny'
  }
}

export function hardenedWebPreferences(preloadPath: string): HardenedWebPreferences {
  return {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    allowRunningInsecureContent: false,
    preload: preloadPath,
  }
}
