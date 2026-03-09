import { execFile } from 'child_process';
import { promisify } from 'util';
import { createCache } from './cache.js';
import { DedupedExecutor } from './async-executor.js';
import type { BehaviorConfigType } from '../config/schema.js';

export interface UsageWindow {
  percentUsed: number;
  resetText?: string;
}

export interface UsageSnapshot {
  fiveHour: UsageWindow;
  weekly: UsageWindow;
  source: 'cli-usage';
  capturedAt: number;
  stale: boolean;
}

export interface UsageSummaryLabels {
  fiveHour: string;
  weekly: string;
}

type UsageProbeBehavior = Pick<
  BehaviorConfigType,
  'usageRefreshMs' | 'usageProbeTimeoutMs' | 'usageStaleMaxMs' | 'claudeExecutable'
>;

export type UsageProbeRunner = (
  executable: string,
  timeoutMs: number
) => Promise<string>;

const DEFAULT_USAGE_BEHAVIOR: UsageProbeBehavior = {
  usageRefreshMs: 60_000,
  usageProbeTimeoutMs: 8_000,
  usageStaleMaxMs: 600_000,
  claudeExecutable: 'claude',
};

const usageCache = createCache<UsageSnapshot>({ ttl: 86_400_000, maxSize: 4 });
const usageExecutor = new DedupedExecutor<UsageSnapshot | undefined>();
const execFileAsync = promisify(execFile);

export function resolveUsageProbeBehavior(
  behavior?: Partial<UsageProbeBehavior>
): UsageProbeBehavior {
  return {
    usageRefreshMs: behavior?.usageRefreshMs ?? DEFAULT_USAGE_BEHAVIOR.usageRefreshMs,
    usageProbeTimeoutMs: behavior?.usageProbeTimeoutMs ?? DEFAULT_USAGE_BEHAVIOR.usageProbeTimeoutMs,
    usageStaleMaxMs: behavior?.usageStaleMaxMs ?? DEFAULT_USAGE_BEHAVIOR.usageStaleMaxMs,
    claudeExecutable: behavior?.claudeExecutable ?? DEFAULT_USAGE_BEHAVIOR.claudeExecutable,
  };
}

export function sanitizeUsageOutput(rawOutput: string): string {
  return rawOutput
    .replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b\[(\d+)C/g, (_match, count: string) => ' '.repeat(Number(count)))
    .replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '')
    .replace(/\r/g, '\n')
    .replace(/[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function escapeShellArg(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function findLastIndex(lines: string[], predicate: (line: string) => boolean): number {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (predicate(lines[index])) {
      return index;
    }
  }

  return -1;
}

function extractUsageWindow(
  lines: string[],
  headings: string[]
): UsageWindow | undefined {
  const headingIndex = findLastIndex(lines, (line) =>
    headings.some((heading) => line.toLowerCase() === heading.toLowerCase())
  );

  if (headingIndex === -1) {
    return undefined;
  }

  let percentUsed: number | undefined;
  let resetText: string | undefined;

  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (
      headings.some((heading) => line.toLowerCase() === heading.toLowerCase()) ||
      line.toLowerCase().startsWith('current week') ||
      line.toLowerCase().startsWith('extra usage')
    ) {
      break;
    }

    if (percentUsed === undefined) {
      const percentMatch = line.match(/(\d+)%\s+used/i);
      if (percentMatch) {
        percentUsed = Number(percentMatch[1]);
      }
    }

    if (resetText === undefined) {
      const resetMatch = line.match(/^rese.*?\s+(.+)$/i);
      if (resetMatch) {
        resetText = resetMatch[1].trim();
      }
    }
  }

  if (percentUsed === undefined) {
    return undefined;
  }

  return {
    percentUsed,
    resetText,
  };
}

export function parseUsageSnapshot(rawOutput: string): UsageSnapshot | undefined {
  const sanitized = sanitizeUsageOutput(rawOutput);

  if (!sanitized) {
    return undefined;
  }

  const lines = sanitized.split('\n');
  const fiveHour = extractUsageWindow(lines, ['Current session', 'Current 5-hour window']);
  const weekly = extractUsageWindow(lines, ['Current week (all models)', 'Current week']);

  if (!fiveHour || !weekly) {
    return undefined;
  }

  return {
    fiveHour,
    weekly,
    source: 'cli-usage',
    capturedAt: Date.now(),
    stale: false,
  };
}

function cloneSnapshot(snapshot: UsageSnapshot, stale: boolean): UsageSnapshot {
  return {
    ...snapshot,
    fiveHour: { ...snapshot.fiveHour },
    weekly: { ...snapshot.weekly },
    stale,
  };
}

function getUsageCacheKey(behavior: UsageProbeBehavior): string {
  return behavior.claudeExecutable;
}

function getStaleSnapshot(
  key: string,
  staleMaxMs: number
): UsageSnapshot | undefined {
  const entry = usageCache.peekEntry(key);
  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.timestamp > staleMaxMs) {
    return undefined;
  }

  return cloneSnapshot(entry.value, true);
}

function getFreshSnapshot(
  key: string,
  refreshMs: number
): UsageSnapshot | undefined {
  const entry = usageCache.peekEntry(key);
  if (!entry) {
    return undefined;
  }

  if (Date.now() - entry.timestamp > refreshMs) {
    return undefined;
  }

  return cloneSnapshot(entry.value, false);
}

async function captureUsageOutput(
  executable: string,
  timeoutMs: number
): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'script',
      ['-qefc', `${escapeShellArg(executable)} /usage`, '/dev/null'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        encoding: 'utf8',
      }
    );

    return stdout;
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'stdout' in error &&
      typeof error.stdout === 'string'
    ) {
      return error.stdout;
    }

    return '';
  }
}

export async function getUsageSnapshot(
  behavior?: Partial<UsageProbeBehavior>,
  runner: UsageProbeRunner = captureUsageOutput
): Promise<UsageSnapshot | undefined> {
  const resolvedBehavior = resolveUsageProbeBehavior(behavior);
  const key = getUsageCacheKey(resolvedBehavior);
  const cached = getFreshSnapshot(key, resolvedBehavior.usageRefreshMs);

  if (cached) {
    return cached;
  }

  return usageExecutor.execute(key, async () => {
    const freshCached = getFreshSnapshot(key, resolvedBehavior.usageRefreshMs);
    if (freshCached) {
      return freshCached;
    }

    const rawOutput = await runner(
      resolvedBehavior.claudeExecutable,
      resolvedBehavior.usageProbeTimeoutMs
    );
    const parsed = parseUsageSnapshot(rawOutput);

    if (parsed) {
      usageCache.set(key, parsed);
      return cloneSnapshot(parsed, false);
    }

    return getStaleSnapshot(key, resolvedBehavior.usageStaleMaxMs);
  });
}

export function getCachedUsageSnapshot(
  behavior?: Partial<UsageProbeBehavior>
): UsageSnapshot | undefined {
  const resolvedBehavior = resolveUsageProbeBehavior(behavior);
  const key = getUsageCacheKey(resolvedBehavior);

  return (
    getFreshSnapshot(key, resolvedBehavior.usageRefreshMs) ??
    getStaleSnapshot(key, resolvedBehavior.usageStaleMaxMs)
  );
}

export function formatUsageSummary(
  snapshot: UsageSnapshot,
  labels: UsageSummaryLabels = {
    fiveHour: '5h',
    weekly: 'Wk',
  }
): string {
  return `${labels.fiveHour} ${snapshot.fiveHour.percentUsed}% | ${labels.weekly} ${snapshot.weekly.percentUsed}%`;
}

export function clearUsageProbeCache(): void {
  usageCache.clear();
}
