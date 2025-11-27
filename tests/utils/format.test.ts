import { describe, it, expect } from 'vitest';
import {
  formatTokens,
  formatCost,
  formatDuration,
  shortenPath,
  formatPercent,
  shortenModelName,
} from '../../src/utils/format.js';

describe('formatTokens', () => {
  it('formats tokens under 1000', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats tokens in thousands', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(12345)).toBe('12.3K');
  });

  it('formats tokens in millions', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
    expect(formatTokens(1500000)).toBe('1.5M');
  });
});

describe('formatCost', () => {
  it('formats small costs with 4 decimals', () => {
    expect(formatCost(0.0001)).toBe('$0.0001');
    expect(formatCost(0.0099)).toBe('$0.0099');
  });

  it('formats medium costs with 3 decimals', () => {
    expect(formatCost(0.01)).toBe('$0.010');
    expect(formatCost(0.123)).toBe('$0.123');
  });

  it('formats large costs with 2 decimals', () => {
    expect(formatCost(1.23)).toBe('$1.23');
    expect(formatCost(10.5)).toBe('$10.50');
  });
});

describe('formatDuration', () => {
  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('formats minutes', () => {
    expect(formatDuration(60000)).toBe('1m');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(300000)).toBe('5m');
  });

  it('formats hours', () => {
    expect(formatDuration(3600000)).toBe('1h');
    expect(formatDuration(5400000)).toBe('1h 30m');
  });
});

describe('shortenPath', () => {
  it('shortens long paths', () => {
    const longPath = '/home/user/projects/very/long/path/to/file';
    const shortened = shortenPath(longPath, 30);
    expect(shortened.length).toBeLessThanOrEqual(35); // Allow some flexibility
    expect(shortened).toContain('...');
  });

  it('keeps short paths unchanged', () => {
    const shortPath = '/home/user';
    expect(shortenPath(shortPath, 30)).toBe('/home/user');
  });
});

describe('formatPercent', () => {
  it('formats percentages', () => {
    expect(formatPercent(0)).toBe('0%');
    expect(formatPercent(50)).toBe('50%');
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(75.6)).toBe('76%');
  });
});

describe('shortenModelName', () => {
  it('shortens Claude model names', () => {
    expect(shortenModelName('claude-sonnet-4-20250514')).toBe('sonnet-4');
    expect(shortenModelName('claude-opus-4-5-20251101')).toBe('opus-4.5');
    expect(shortenModelName('claude-3-5-sonnet-20241022')).toBe('sonnet-3.5');
    expect(shortenModelName('claude-3-5-haiku-20241022')).toBe('haiku-3.5');
  });

  it('truncates unknown model names', () => {
    const longName = 'some-very-long-model-name-12345';
    const shortened = shortenModelName(longName);
    expect(shortened.length).toBeLessThanOrEqual(18);
  });
});
