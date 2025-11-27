import type { Theme } from './types.js';
import { powerlineDark } from './powerline-dark.js';
import { powerlineLight } from './powerline-light.js';
import { minimal } from './minimal.js';

export * from './types.js';
export { powerlineDark } from './powerline-dark.js';
export { powerlineLight } from './powerline-light.js';
export { minimal } from './minimal.js';

/**
 * 사용 가능한 모든 테마
 */
export const themes: Record<string, Theme> = {
  'powerline-dark': powerlineDark,
  'powerline-light': powerlineLight,
  'minimal': minimal,
};

/**
 * 테마 ID로 테마 가져오기
 */
export function getTheme(themeId: string): Theme {
  return themes[themeId] ?? powerlineDark;
}

/**
 * 사용 가능한 테마 목록
 */
export function getAvailableThemes(): Theme[] {
  return Object.values(themes);
}
