import type { Theme } from './types.js';

export const powerlineLight: Theme = {
  id: 'powerline-light',
  name: 'Powerline Light',
  symbols: {
    separator: '\ue0b0',      //
    separatorThin: '\ue0b1',  //
    branch: '\ue0a0',         //
    readonly: '\ue0a2',       //
    modified: '●',
  },
  colors: {
    segments: {
      model: { bg: '#7986cb', fg: '#1a237e' },
      git: { bg: '#ffffff', fg: '#37474f' },
      tokens: { bg: '#64b5f6', fg: '#0d47a1' },
      cost: { bg: '#ffb74d', fg: '#e65100' },
      session: { bg: '#90a4ae', fg: '#263238' },
      cwd: { bg: '#7986cb', fg: '#1a237e' },
      context: { bg: '#ba68c8', fg: '#4a148c' },
      todo: { bg: '#4db6ac', fg: '#004d40' },
      memory: { bg: '#f48fb1', fg: '#880e4f' },
      files: { bg: '#81c784', fg: '#1b5e20' },
    },
    status: {
      normal: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      success: '#4caf50',
    },
    progress: {
      filled: '#2196f3',
      empty: '#bdbdbd',
      warning: '#ff9800',
      critical: '#f44336',
    },
  },
};
