import { beforeAll, describe, expect, it } from 'vitest';
import { getWidgetContent } from '../../src/core/widget-content.js';
import { powerlineDark } from '../../src/themes/powerline-dark.js';
import { initI18n } from '../../src/i18n/index.js';
import type { TranscriptData } from '../../src/utils/transcript-cache.js';
import type { UsageSnapshot } from '../../src/utils/usage-probe.js';

const transcriptData: TranscriptData = {
  messages: [],
  tokenUsage: {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalConsumed: 0,
    contextTokens: 120000,
  },
  todoProgress: {
    completed: 0,
    inProgress: 0,
    pending: 0,
    total: 0,
  },
};

const usageSnapshot: UsageSnapshot = {
  fiveHour: {
    percentUsed: 4,
    resetText: '6pm (Asia/Seoul)',
  },
  weekly: {
    percentUsed: 14,
    resetText: 'Mar 13, 12:59pm (Asia/Seoul)',
  },
  source: 'cli-usage',
  capturedAt: Date.now(),
  stale: false,
};

beforeAll(() => {
  initI18n('en');
});

describe('widget content', () => {
  it('renders context usage as a percentage only', () => {
    const output = getWidgetContent(
      'context',
      { model: { id: 'claude-sonnet-4-20250514' } },
      powerlineDark,
      {
        transcriptData,
      }
    );

    expect(output).toBe('context 60%');
  });

  it('uses localized memory labels', () => {
    const output = getWidgetContent('memory', {}, powerlineDark);
    expect(output).toMatch(/^MEM \d+MB$/);
  });

  it('renders combined usage content', () => {
    const output = getWidgetContent('usage', {}, powerlineDark, {
      usageSnapshot,
    });

    expect(output).toBe('5h 4% | Wk 14%');
  });
});
