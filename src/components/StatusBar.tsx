import React from 'react';
import { Text } from 'ink';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { Theme } from '../themes/types.js';
import type { WidgetDefinition } from '../widgets/types.js';
import type { WidgetConfig } from '../types/state.js';
import type { BehaviorConfigType } from '../config/schema.js';
import { renderStatusBar } from '../core/renderer.js';

export interface StatusBarProps {
  data: ClaudeInputData;
  theme: Theme;
  widgets: WidgetDefinition[];
  widgetConfigs: Record<string, WidgetConfig>;
  behaviorConfig?: BehaviorConfigType;
}

/**
 * 메인 Status Bar 컴포넌트
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  data,
  theme,
  widgets,
  widgetConfigs,
  behaviorConfig,
}) => {
  const output = renderStatusBar(data, theme, widgets, widgetConfigs, behaviorConfig);
  return <Text>{output}</Text>;
};

export default StatusBar;
