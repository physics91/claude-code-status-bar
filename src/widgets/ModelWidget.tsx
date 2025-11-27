import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { shortenModelName } from '../utils/format.js';

/**
 * 모델명 위젯 컴포넌트
 */
const ModelWidgetComponent: React.FC<WidgetProps> = ({ data }) => {
  const modelName = shortenModelName(
    data.model?.display_name || data.model?.id || 'unknown'
  );

  return <Text>{modelName}</Text>;
};

/**
 * 모델명 위젯 정의
 */
export const ModelWidget: WidgetDefinition = {
  id: 'model',
  name: 'Model',
  description: 'Displays the current Claude model name',
  defaultEnabled: true,
  defaultOrder: 0,
  colorKey: 'model',
  Component: ModelWidgetComponent,
};
