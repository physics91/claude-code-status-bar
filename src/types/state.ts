/**
 * 상태바 전체 상태
 */
export interface StatusBarState {
  sessionId: string;
  startTime: number;
  model: {
    id: string;
    displayName: string;
  };
  workspace: {
    currentDir: string;
    projectDir: string;
  };
  git: {
    branch: string | null;
    isDirty: boolean;
  };
  tokens: {
    used: number;
    estimated: boolean;
  };
  cost: {
    apiCost: number;
    durationMs: number;
  };
  context: {
    usagePercent: number;
    level: 'normal' | 'warning' | 'danger';
  };
  todo: {
    completed: number;
    inProgress: number;
    pending: number;
    total: number;
  };
}

/**
 * 위젯 설정
 */
export interface WidgetConfig {
  enabled: boolean;
  order: number;
  options?: Record<string, unknown>;
}

/**
 * 앱 설정
 */
export interface AppConfig {
  version: 1;
  theme: string;
  widgets: Record<string, WidgetConfig>;
  behavior: {
    contextWarningThreshold: number;
    contextDangerThreshold: number;
  };
}
