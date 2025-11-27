import type { Theme } from './types.js';

export const powerlineDark: Theme = {
  id: 'powerline-dark',
  name: 'Powerline Dark',
  symbols: {
    separator: '\ue0b0',      //
    separatorThin: '\ue0b1',  //
    branch: '\ue0a0',         //
    readonly: '\ue0a2',       //
    modified: '●',
  },
  colors: {
    segments: {
      model: { bg: '#5c6bc0', fg: '#ffffff' },
      git: { bg: '#ffffff', fg: '#37474f' },
      tokens: { bg: '#42a5f5', fg: '#0d47a1' },
      cost: { bg: '#ffa726', fg: '#e65100' },
      session: { bg: '#78909c', fg: '#263238' },
      cwd: { bg: '#5c6bc0', fg: '#ffffff' },
      context: { bg: '#ab47bc', fg: '#ffffff' },
      todo: { bg: '#26a69a', fg: '#004d40' },
    },
    status: {
      normal: '#66bb6a',
      warning: '#ffa726',
      error: '#ef5350',
      success: '#66bb6a',
    },
    progress: {
      filled: '#42a5f5',
      empty: '#424242',
      warning: '#ffa726',
      critical: '#ef5350',
    },
  },
};
