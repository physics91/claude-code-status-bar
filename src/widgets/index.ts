import { widgetRegistry } from './registry.js';
import { ModelWidget } from './ModelWidget.js';
import { GitBranchWidget } from './GitBranchWidget.js';
import { TokensWidget } from './TokensWidget.js';
import { CostWidget } from './CostWidget.js';
import { SessionWidget } from './SessionWidget.js';
import { CwdWidget } from './CwdWidget.js';
import { ContextWidget } from './ContextWidget.js';
import { TodoWidget } from './TodoWidget.js';

export * from './types.js';
export * from './registry.js';

// 모든 내장 위젯 등록
export function registerBuiltinWidgets(): void {
  widgetRegistry.register(ModelWidget);
  widgetRegistry.register(GitBranchWidget);
  widgetRegistry.register(TokensWidget);
  widgetRegistry.register(CostWidget);
  widgetRegistry.register(SessionWidget);
  widgetRegistry.register(CwdWidget);
  widgetRegistry.register(ContextWidget);
  widgetRegistry.register(TodoWidget);
}

// 위젯 내보내기
export {
  ModelWidget,
  GitBranchWidget,
  TokensWidget,
  CostWidget,
  SessionWidget,
  CwdWidget,
  ContextWidget,
  TodoWidget,
};
