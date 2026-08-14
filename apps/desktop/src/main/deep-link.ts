export const DEEP_LINK_SCHEME = 'closerai'

export interface DeepLink {
  /** The hostname part, e.g. `open` in `closerai://open`. */
  action: string
  path: string
  query: Record<string, string>
}

/** Parse a `closerai://...` deep link; returns null for anything else. */
export function parseDeepLink(input: string): DeepLink | null {
  try {
    const url = new URL(input)
    if (url.protocol !== `${DEEP_LINK_SCHEME}:`) return null
    const query: Record<string, string> = {}
    for (const [key, value] of url.searchParams) query[key] = value
    return { action: url.hostname || '', path: url.pathname, query }
  } catch {
    return null
  }
}
