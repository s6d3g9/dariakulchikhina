/**
 * Minimal cron — interval-based, no external deps. Production-grade
 * cron parsing is out of scope for W1.A; for the daily zakupki run and
 * 2-hour torgi run, an interval scheduler is sufficient.
 *
 * Format support: 5-field cron, but we only inspect minute and hour;
 * we approximate "fire at HH:MM every day" semantics. Future W2 swap-in
 * candidate: `croner` (zero-dep, MIT). Holding off on adding a
 * dependency until we hit a real need.
 */

export interface ScheduledTask {
  expression: string
  task: () => Promise<void>
  /** Optional name for logs. */
  name?: string
}

export interface CronHandle {
  stop(): void
}

interface ParsedCron {
  minutes: number[]
  hours: number[]
}

const MINUTE_RANGE = range(0, 59)
const HOUR_RANGE = range(0, 23)

function range(from: number, to: number): number[] {
  const out: number[] = []
  for (let i = from; i <= to; i += 1) out.push(i)
  return out
}

function parseField(field: string, full: number[]): number[] {
  if (field === '*') return full
  if (field.startsWith('*/')) {
    const step = Number.parseInt(field.slice(2), 10)
    if (!Number.isFinite(step) || step <= 0) return full
    return full.filter((n) => n % step === 0)
  }
  const list: number[] = []
  for (const part of field.split(',')) {
    const n = Number.parseInt(part, 10)
    if (Number.isFinite(n) && full.includes(n)) list.push(n)
  }
  return list.length ? list : full
}

function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5) {
    throw new Error(
      `[cron] expected 5 fields, got ${parts.length}: '${expression}'`,
    )
  }
  return {
    minutes: parseField(parts[0]!, MINUTE_RANGE),
    hours: parseField(parts[1]!, HOUR_RANGE),
  }
}

function shouldFire(parsed: ParsedCron, now: Date): boolean {
  return (
    parsed.minutes.includes(now.getMinutes()) &&
    parsed.hours.includes(now.getHours())
  )
}

/**
 * Runs scheduled tasks. Internally ticks once per minute (60_000 ms);
 * for each tick checks every task's cron expression. Tasks that fire
 * concurrently are awaited in parallel and isolated — a thrown task
 * does not abort the scheduler.
 *
 * Per-task concurrency guard: if a task is still running when the next
 * tick fires, the new invocation is skipped with a warn (not queued).
 * This prevents task pile-up when a run takes longer than one tick interval.
 */
export function startCron(
  tasks: readonly ScheduledTask[],
  onError: (err: unknown, task: ScheduledTask) => void,
): CronHandle {
  const parsed = tasks.map((t) => ({ ...t, parsed: parseCron(t.expression) }))
  let stopped = false
  const running = new Set<string>()

  const tick = (): void => {
    if (stopped) return
    const now = new Date()
    for (const t of parsed) {
      if (!shouldFire(t.parsed, now)) continue
      const taskKey = t.name ?? t.expression
      if (running.has(taskKey)) {
        onError(
          Object.assign(new Error(`[cron] task still running, skipping tick`), {
            code: 'cron.skipped.busy',
          }),
          t,
        )
        continue
      }
      running.add(taskKey)
      Promise.resolve()
        .then(() => t.task())
        .catch((err) => onError(err, t))
        .finally(() => running.delete(taskKey))
    }
  }

  // Align to next minute boundary for cleaner cron semantics.
  const msToNextMinute = 60_000 - (Date.now() % 60_000)
  const initialTimer = setTimeout(() => {
    tick()
    interval = setInterval(tick, 60_000)
  }, msToNextMinute)
  let interval: NodeJS.Timeout | null = null

  return {
    stop(): void {
      stopped = true
      clearTimeout(initialTimer)
      if (interval) clearInterval(interval)
    },
  }
}
