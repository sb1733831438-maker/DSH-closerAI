const READY_LINE = /dsh\s+web:\s+(https?:\/\/\S+)/i

/** Extract the URL from DSH's `dsh web: http://host:port` ready line. */
export function parseDshUrl(line: string): string | null {
  const match = line.match(READY_LINE)
  return match?.[1] ?? null
}

/** Parse `http://host:port` into its host and numeric port. */
export function urlToHostPort(url: string): { host: string; port: number } | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    const port = Number(parsed.port)
    if (!Number.isInteger(port) || port < 1 || port > 65535) return null
    return { host: parsed.hostname, port }
  } catch {
    return null
  }
}
