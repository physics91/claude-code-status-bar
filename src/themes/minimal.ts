import type { Theme } from './types.js';

export const minimal: Theme = {
  id: 'minimal',
  name: 'Minimal (ASCII)',
  symbols: {
    separator: '>',
    separatorThin: '|',
    branch: '',
    readonly: '[RO]',
    modified: '*',
  },
  colors: {
    segments: {
      model: { bg: '#6366f1', fg: '#ffffff' },
      git: { bg: '#22c55e', fg: '#ffffff' },
      tokens: { bg: '#3b82f6', fg: '#ffffff' },
      cost: { bg: '#f59e0b', fg: '#ffffff' },
      session: { bg: '#6b7280', fg: '#ffffff' },
      cwd: { bg: '#6366f1', fg: '#ffffff' },
      context: { bg: '#a855f7', fg: '#ffffff' },
      todo: { bg: '#14b8a6', fg: '#ffffff' },
    },
    status: {
      normal: '#22c55e',
      warning: '#f59e0b',
      error: '#ef4444',
      success: '#22c55e',
    },
    progress: {
      filled: '#3b82f6',
      empty: '#374151',
      warning: '#f59e0b',
      critical: '#ef4444',
    },
  },
};
