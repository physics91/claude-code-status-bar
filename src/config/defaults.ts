import type { AppConfigType } from './schema.js';

/**
 * 기본 앱 설정
 */
export const defaultConfig: AppConfigType = {
  version: 1,
  theme: 'powerline-dark',
  locale: 'auto',
  widgets: {
    model: { enabled: true, order: 0 },
    git: { enabled: true, order: 1 },
    tokens: { enabled: true, order: 2 },
    cost: { enabled: true, order: 3 },
    session: { enabled: true, order: 4 },
    usage: { enabled: false, order: 5 },
    cwd: { enabled: true, order: 6 },
    context: { enabled: true, order: 7 },
    todo: { enabled: false, order: 8 },
    memory: { enabled: false, order: 9 },
    files: { enabled: false, order: 10 },
  },
  behavior: {
    contextWarningThreshold: 70,
    contextDangerThreshold: 90,
    usageRefreshMs: 60_000,
    usageProbeTimeoutMs: 8_000,
    usageStaleMaxMs: 600_000,
    claudeExecutable: 'claude',
  },
};

/**
 * 위젯 기본 설정 가져오기
 */
export function getDefaultWidgetConfig(widgetId: string): {
  enabled: boolean;
  order: number;
} {
  return (
    defaultConfig.widgets[widgetId] || {
      enabled: true,
      order: 99,
    }
  );
}
