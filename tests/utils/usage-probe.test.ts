import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearUsageProbeCache,
  formatUsageSummary,
  getUsageSnapshot,
  parseUsageSnapshot,
} from '../../src/utils/usage-probe.js';

const USAGE_FIXTURE = `
Current session
██ 4% used
Resets 6pm (Asia/Seoul)

Current week (all models)
███████ 14% used
Resets Mar 13, 12:59pm (Asia/Seoul)

Current week (Sonnet only)
█▌ 3% used
Resets 5:59pm (Asia/Seoul)

Extra usage
Extra usage not enabled • /extra-usage to enable
`;

const ANSI_USAGE_FIXTURE = `
\u001b[?2026h
Welcome back
Current session
\u001b[48;5;102m\u001b[38;5;153m██\u001b[39m\u001b[49m 2% used
Resets 5pm (Asia/Seoul)

Current week (all models)
\u001b[48;5;102m\u001b[38;5;153m███████\u001b[39m\u001b[49m 11% used
Resets Mar 12, 12:59pm (Asia/Seoul)

Current session
\u001b[48;5;102m\u001b[38;5;153m██\u001b[39m\u001b[49m 4% used
Resets 6pm (Asia/Seoul)

Current week (all models)
\u001b[48;5;102m\u001b[38;5;153m███████\u001b[39m\u001b[49m 14% used
Resets Mar 13, 12:59pm (Asia/Seoul)
`;

describe.sequential('usage probe', () => {
  beforeEach(() => {
    clearUsageProbeCache();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-09T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    clearUsageProbeCache();
  });

  it('parses a usage snapshot from terminal output', () => {
    const snapshot = parseUsageSnapshot(USAGE_FIXTURE);

    expect(snapshot).toMatchObject({
      fiveHour: {
        percentUsed: 4,
        resetText: '6pm (Asia/Seoul)',
      },
      weekly: {
        percentUsed: 14,
        resetText: 'Mar 13, 12:59pm (Asia/Seoul)',
      },
      source: 'cli-usage',
      stale: false,
    });
  });

  it('keeps the last matching usage section in noisy ANSI output', () => {
    const snapshot = parseUsageSnapshot(ANSI_USAGE_FIXTURE);

    expect(snapshot?.fiveHour.percentUsed).toBe(4);
    expect(snapshot?.weekly.percentUsed).toBe(14);
  });

  it('caches fresh usage probes', async () => {
    const runner = vi.fn(async () => USAGE_FIXTURE);

    const first = await getUsageSnapshot(undefined, runner);
    const second = await getUsageSnapshot(undefined, runner);

    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(second?.stale).toBe(false);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it('falls back to the last good stale snapshot when a refresh fails', async () => {
    const initialRunner = vi.fn(async () => USAGE_FIXTURE);
    await getUsageSnapshot(undefined, initialRunner);

    vi.advanceTimersByTime(61_000);

    const failingRunner = vi.fn(async () => '');
    const staleSnapshot = await getUsageSnapshot(undefined, failingRunner);

    expect(staleSnapshot?.stale).toBe(true);
    expect(staleSnapshot?.fiveHour.percentUsed).toBe(4);
    expect(failingRunner).toHaveBeenCalledTimes(1);
  });

  it('formats the combined widget text', () => {
    const snapshot = parseUsageSnapshot(USAGE_FIXTURE);

    expect(snapshot).toBeDefined();
    expect(formatUsageSummary(snapshot!)).toBe('5h 4% | Wk 14%');
  });
});
