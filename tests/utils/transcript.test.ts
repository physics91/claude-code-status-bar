import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  extractTodoProgress,
} from '../../src/utils/transcript.js';

describe('estimateTokens', () => {
  it('returns 0 for empty or undefined input', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens(undefined)).toBe(0);
  });

  it('estimates tokens for English text', () => {
    // Approximately 4 characters per token
    const text = 'Hello world this is a test';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(text.length); // Should be less than character count
  });

  it('estimates tokens for Korean text', () => {
    // Korean uses more tokens per character
    const text = '안녕하세요 테스트입니다';
    const tokens = estimateTokens(text);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('extractTodoProgress', () => {
  it('returns zeros for empty messages', () => {
    const result = extractTodoProgress([]);
    expect(result).toEqual({
      completed: 0,
      inProgress: 0,
      pending: 0,
      total: 0,
    });
  });

  it('extracts progress from TodoWrite tool call', () => {
    const messages = [
      {
        type: 'tool_use' as const,
        tool_name: 'TodoWrite',
        tool_input: {
          todos: [
            { content: 'Task 1', status: 'completed', activeForm: 'Doing task 1' },
            { content: 'Task 2', status: 'in_progress', activeForm: 'Doing task 2' },
            { content: 'Task 3', status: 'pending', activeForm: 'Doing task 3' },
          ],
        },
      },
    ];

    const result = extractTodoProgress(messages);
    expect(result).toEqual({
      completed: 1,
      inProgress: 1,
      pending: 1,
      total: 3,
    });
  });

  it('uses the last TodoWrite call', () => {
    const messages = [
      {
        type: 'tool_use' as const,
        tool_name: 'TodoWrite',
        tool_input: {
          todos: [
            { content: 'Task 1', status: 'pending', activeForm: 'Doing task 1' },
          ],
        },
      },
      {
        type: 'tool_use' as const,
        tool_name: 'TodoWrite',
        tool_input: {
          todos: [
            { content: 'Task 1', status: 'completed', activeForm: 'Doing task 1' },
            { content: 'Task 2', status: 'completed', activeForm: 'Doing task 2' },
          ],
        },
      },
    ];

    const result = extractTodoProgress(messages);
    expect(result.completed).toBe(2);
    expect(result.total).toBe(2);
  });
});
