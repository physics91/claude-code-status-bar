/**
 * i18n 타입 정의
 */

export const namespaces = ['cli', 'tui', 'widgets', 'renderer'] as const;
export type Namespace = (typeof namespaces)[number];

export const supportedLanguages = ['en', 'ko'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

// CLI 네임스페이스 타입
export interface CliTranslations {
  description: string;
  commands: {
    render: {
      description: string;
      demo: string;
    };
    config: {
      description: string;
      show: string;
      reset: string;
      theme: string;
    };
    themes: {
      description: string;
    };
    widgets: {
      description: string;
    };
  };
  messages: {
    configReset: string;
    themeSet: string;
    invalidTheme: string;
    availableThemes: string;
    availableWidgets: string;
    current: string;
    error: string;
  };
}

// TUI 네임스페이스 타입
export interface TuiTranslations {
  header: {
    title: string;
  };
  tabs: {
    widgets: string;
    themes: string;
  };
  footer: {
    instructions: string;
    saved: string;
  };
  labels: {
    current: string;
  };
}

// 위젯 네임스페이스 타입
export interface WidgetTranslation {
  name: string;
  description: string;
}

export interface WidgetsTranslations {
  model: WidgetTranslation;
  git: WidgetTranslation;
  tokens: WidgetTranslation;
  cost: WidgetTranslation;
  session: WidgetTranslation;
  cwd: WidgetTranslation;
  context: WidgetTranslation;
  todo: WidgetTranslation;
  memory: WidgetTranslation;
  files: WidgetTranslation;
}

// 렌더러 네임스페이스 타입
export interface RendererTranslations {
  noWidgets: string;
  truncated: string;
  labels: {
    tok: string;
    ctx: string;
    todo: string;
    noChanges: string;
    unknown: string;
  };
}

// 전체 리소스 타입
export interface Resources {
  cli: CliTranslations;
  tui: TuiTranslations;
  widgets: WidgetsTranslations;
  renderer: RendererTranslations;
}
