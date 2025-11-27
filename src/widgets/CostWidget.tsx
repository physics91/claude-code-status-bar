import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { formatCost } from '../utils/format.js';

/**
 * API 비용 위젯 컴포넌트
 */
const CostWidgetComponent: React.FC<WidgetProps> = ({ data }) => {
  const cost = data.cost?.api_cost ?? 0;
  const formattedCost = formatCost(cost);

  return <Text>{formattedCost}</Text>;
};

/**
 * API 비용 위젯 정의
 */
export const CostWidget: WidgetDefinition = {
  id: 'cost',
  name: 'API Cost',
  description: 'Displays the API cost for this session',
  defaultEnabled: true,
  defaultOrder: 3,
  colorKey: 'cost',
  Component: CostWidgetComponent,
};
