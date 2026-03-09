import { widgetRegistry } from './registry.js';
import { ModelWidget } from './ModelWidget.js';
import { GitBranchWidget } from './GitBranchWidget.js';
import { TokensWidget } from './TokensWidget.js';
import { CostWidget } from './CostWidget.js';
import { SessionWidget } from './SessionWidget.js';
import { CwdWidget } from './CwdWidget.js';
import { ContextWidget } from './ContextWidget.js';
import { TodoWidget } from './TodoWidget.js';
import { MemoryWidget } from './MemoryWidget.js';
import { FilesWidget } from './FilesWidget.js';

export * from './types.js';
export * from './registry.js';

const builtinWidgets = [
  ModelWidget,
  GitBranchWidget,
  TokensWidget,
  CostWidget,
  SessionWidget,
  CwdWidget,
  ContextWidget,
  TodoWidget,
  MemoryWidget,
  FilesWidget,
];

// 모든 내장 위젯 등록
export function registerBuiltinWidgets(): void {
  for (const widget of builtinWidgets) {
    if (!widgetRegistry.get(widget.id)) {
      widgetRegistry.register(widget);
    }
  }
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
  MemoryWidget,
  FilesWidget,
};
