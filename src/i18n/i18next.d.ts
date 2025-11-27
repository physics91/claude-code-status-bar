/**
 * i18next 모듈 타입 augmentation
 * 번역 키의 타입 안전성을 제공합니다.
 */

import 'i18next';
import type { Resources } from './types.js';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'cli';
    resources: Resources;
    returnNull: false;
  }
}
