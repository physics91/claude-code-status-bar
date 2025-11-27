import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { formatDuration } from '../utils/format.js';

/**
 * 세션 시간 위젯 컴포넌트
 */
const SessionWidgetComponent: React.FC<WidgetProps> = ({ data }) => {
  const durationMs = data.cost?.duration_ms ?? 0;
  const formattedDuration = formatDuration(durationMs);

  return <Text>{formattedDuration}</Text>;
};

/**
 * 세션 시간 위젯 정의
 */
export const SessionWidget: WidgetDefinition = {
  id: 'session',
  name: 'Session Time',
  description: 'Displays the session duration',
  defaultEnabled: true,
  defaultOrder: 4,
  colorKey: 'session',
  Component: SessionWidgetComponent,
};
