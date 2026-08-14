export interface LogLine {
  stream: 'stdout' | 'stderr'
  text: string
  at: number
}

/** Bounded ring buffer of recent child log lines for diagnostics export. */
export class LogBuffer {
  readonly capacity: number
  private readonly lines: LogLine[] = []

  constructor(capacity = 2000) {
    this.capacity = capacity
  }

  push(stream: LogLine['stream'], text: string, at = Date.now()): void {
    this.lines.push({ stream, text, at })
    if (this.lines.length > this.capacity) {
      this.lines.splice(0, this.lines.length - this.capacity)
    }
  }

  get size(): number {
    return this.lines.length
  }

  entries(): LogLine[] {
    return [...this.lines]
  }

  clear(): void {
    this.lines.length = 0
  }
}
