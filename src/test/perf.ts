export interface LatencyStats {
  count: number
  mean: number
  p50: number
  p95: number
  max: number
}

export function summarize(samplesMs: number[]): LatencyStats {
  const sorted = [...samplesMs].sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.ceil(q * sorted.length) - 1)]
  return {
    count: sorted.length,
    mean: sorted.reduce((sum, ms) => sum + ms, 0) / sorted.length,
    p50: at(0.5),
    p95: at(0.95),
    max: sorted[sorted.length - 1],
  }
}

// One line per measurement, prefixed so a CI log can be grepped for '[perf]'.
export function report(label: string, stats: LatencyStats, extra = '') {
  const ms = (value: number) => `${value.toFixed(1)}ms`
  console.info(
    `[perf] ${label}: n=${stats.count} mean=${ms(stats.mean)} p50=${ms(stats.p50)} p95=${ms(stats.p95)} max=${ms(stats.max)}${extra ? ` ${extra}` : ''}`,
  )
}

// Runs `count` tasks keeping at most `limit` in flight, results in task order —
// how a browser actually drives them (6 connections per origin on HTTP/1.1,
// ~100 streams on HTTP/2), rather than hundreds of sockets opened at once.
export async function withConcurrency<T>(count: number, limit: number, task: (i: number) => Promise<T>): Promise<T[]> {
  const results: T[] = []
  let next = 0
  async function worker() {
    while (next < count) {
      const i = next++
      results[i] = await task(i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, count) }, worker))
  return results
}

export async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = performance.now()
  const result = await fn()
  return { result, ms: performance.now() - start }
}
