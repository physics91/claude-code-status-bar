import { beforeAll, describe, expect, it } from 'vitest';
import { Chalk } from 'chalk';
import { getWidgetContent, createProgressBar } from '../../src/core/widget-content.js';
import { powerlineDark } from '../../src/themes/powerline-dark.js';
import { initI18n } from '../../src/i18n/index.js';
import type { TranscriptData } from '../../src/utils/transcript-cache.js';

const chalk = new Chalk({ level: 3 });

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

beforeAll(() => {
  initI18n('en');
});

describe('widget content', () => {
  it('applies configured context warning thresholds', () => {
    const output = getWidgetContent(
      'context',
      { model: { id: 'claude-sonnet-4-20250514' } },
      powerlineDark,
      {
        transcriptData,
        behavior: {
          contextWarningThreshold: 50,
          contextDangerThreshold: 90,
        },
      }
    );

    const expectedBar = chalk.hex(powerlineDark.colors.progress.warning)(
      createProgressBar(60, 8)
    );

    expect(output).toContain(expectedBar);
    expect(output).toContain('60%');
  });

  it('uses localized memory labels', () => {
    const output = getWidgetContent('memory', {}, powerlineDark);
    expect(output).toMatch(/^MEM \d+MB$/);
  });
});
