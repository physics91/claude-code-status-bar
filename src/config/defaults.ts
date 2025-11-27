import type { AppConfigType } from './schema.js';

/**
 * 기본 앱 설정
 */
export const defaultConfig: AppConfigType = {
  version: 1,
  theme: 'powerline-dark',
  widgets: {
    model: { enabled: true, order: 0 },
    git: { enabled: true, order: 1 },
    tokens: { enabled: true, order: 2 },
    cost: { enabled: true, order: 3 },
    session: { enabled: true, order: 4 },
    cwd: { enabled: true, order: 5 },
    context: { enabled: true, order: 6 },
    todo: { enabled: false, order: 7 },
  },
  behavior: {
    contextWarningThreshold: 70,
    contextDangerThreshold: 90,
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
