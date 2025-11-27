/**
 * i18n 초기화 및 export
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { detectLocale } from './detection.js';
import type { SupportedLanguage } from './types.js';

// 번역 리소스 import
import enCli from './locales/en/cli.json' assert { type: 'json' };
import enTui from './locales/en/tui.json' assert { type: 'json' };
import enWidgets from './locales/en/widgets.json' assert { type: 'json' };
import enRenderer from './locales/en/renderer.json' assert { type: 'json' };
import koCli from './locales/ko/cli.json' assert { type: 'json' };
import koTui from './locales/ko/tui.json' assert { type: 'json' };
import koWidgets from './locales/ko/widgets.json' assert { type: 'json' };
import koRenderer from './locales/ko/renderer.json' assert { type: 'json' };

export const resources = {
  en: {
    cli: enCli,
    tui: enTui,
    widgets: enWidgets,
    renderer: enRenderer,
  },
  ko: {
    cli: koCli,
    tui: koTui,
    widgets: koWidgets,
    renderer: koRenderer,
  },
} as const;

let initialized = false;
let currentLocale: SupportedLanguage = 'en';

/**
 * i18n 초기화
 * @param locale 로케일 설정 ('auto', 'en', 'ko')
 */
export function initI18n(locale: string = 'auto'): typeof i18next {
  if (initialized) return i18next;

  // 로케일 결정
  if (locale === 'auto') {
    currentLocale = detectLocale();
  } else if (locale === 'en' || locale === 'ko') {
    currentLocale = locale;
  } else {
    currentLocale = 'en';
  }

  i18next.use(initReactI18next).init({
    lng: currentLocale,
    fallbackLng: 'en',
    defaultNS: 'cli',
    ns: ['cli', 'tui', 'widgets', 'renderer'],
    resources,
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
  });

  initialized = true;
  return i18next;
}

/**
 * 현재 로케일 반환
 */
export function getCurrentLocale(): SupportedLanguage {
  return currentLocale;
}

/**
 * 번역 함수 (타입 안전)
 */
export const t = i18next.t.bind(i18next);

/**
 * 언어 변경
 */
export const changeLanguage = i18next.changeLanguage.bind(i18next);

export { i18next };
