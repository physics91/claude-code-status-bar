import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { formatUsageSummary, getCachedUsageSnapshot } from '../utils/usage-probe.js';
import { t } from '../i18n/index.js';

const UsageWidgetComponent: React.FC<WidgetProps> = ({ theme }) => {
  const usageSnapshot = getCachedUsageSnapshot();

  if (!usageSnapshot) {
    return <Text color={theme.colors.status.warning}>usage unavailable</Text>;
  }

  return (
    <Text>
      {formatUsageSummary(usageSnapshot, {
        fiveHour: t('renderer:labels.usage5h'),
        weekly: t('renderer:labels.usageWeek'),
      })}
    </Text>
  );
};

export const UsageWidget: WidgetDefinition = {
  id: 'usage',
  name: 'Usage',
  description: 'Displays current 5-hour and weekly Claude usage',
  defaultEnabled: false,
  defaultOrder: 5,
  colorKey: 'usage',
  Component: UsageWidgetComponent,
};
