/**
 * 시스템 로케일 감지
 */

import { execSync } from 'child_process';
import { supportedLanguages, type SupportedLanguage } from './types.js';

/**
 * 시스템 로케일을 감지합니다.
 * 우선순위: LANG > LC_ALL > LC_MESSAGES > Windows 시스템 로케일
 */
export function detectLocale(): SupportedLanguage {
  // 환경 변수에서 로케일 감지
  const envLocale =
    process.env.LANG || process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANGUAGE;

  if (envLocale) {
    const lang = envLocale.split(/[._-]/)[0].toLowerCase();
    if (supportedLanguages.includes(lang as SupportedLanguage)) {
      return lang as SupportedLanguage;
    }
  }

  // Windows 전용 감지
  if (process.platform === 'win32') {
    try {
      const output = execSync(
        'powershell -Command "[System.Globalization.CultureInfo]::CurrentUICulture.Name"',
        { encoding: 'utf-8', timeout: 3000 }
      ).trim();
      const lang = output.split('-')[0].toLowerCase();
      if (supportedLanguages.includes(lang as SupportedLanguage)) {
        return lang as SupportedLanguage;
      }
    } catch {
      // PowerShell 실행 실패 시 기본값 사용
    }
  }

  // 기본값: 영어
  return 'en';
}
