import React from 'react';
import { Box, Text } from 'ink';
import { Segment } from './Segment.js';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { Theme } from '../themes/types.js';
import type { WidgetDefinition } from '../widgets/types.js';
import type { WidgetConfig } from '../types/state.js';

export interface StatusBarProps {
  data: ClaudeInputData;
  theme: Theme;
  widgets: WidgetDefinition[];
  widgetConfigs: Record<string, WidgetConfig>;
}

/**
 * 메인 Status Bar 컴포넌트
 */
export const StatusBar: React.FC<StatusBarProps> = ({
  data,
  theme,
  widgets,
  widgetConfigs,
}) => {
  // 활성화된 위젯만 필터링하고 순서대로 정렬
  const activeWidgets = widgets
    .filter((widget) => {
      const config = widgetConfigs[widget.id];
      return config ? config.enabled : widget.defaultEnabled;
    })
    .sort((a, b) => {
      const orderA = widgetConfigs[a.id]?.order ?? a.defaultOrder;
      const orderB = widgetConfigs[b.id]?.order ?? b.defaultOrder;
      return orderA - orderB;
    });

  // 각 위젯을 렌더링하고 null이 아닌 것만 필터링
  const renderedWidgets: Array<{
    widget: WidgetDefinition;
    element: React.ReactNode;
  }> = [];

  for (const widget of activeWidgets) {
    const config = widgetConfigs[widget.id] || {
      enabled: widget.defaultEnabled,
      order: widget.defaultOrder,
    };

    const element = (
      <widget.Component
        key={widget.id}
        data={data}
        config={config}
        theme={theme}
      />
    );

    // null 체크를 위해 임시로 추가 (실제로는 React가 처리)
    renderedWidgets.push({ widget, element });
  }

  if (renderedWidgets.length === 0) {
    return <Text color="gray">No widgets enabled</Text>;
  }

  return (
    <Box>
      {renderedWidgets.map(({ widget, element }, index) => {
        const colors = theme.colors.segments[widget.colorKey];
        const nextWidget = renderedWidgets[index + 1];
        const nextColors = nextWidget
          ? theme.colors.segments[nextWidget.widget.colorKey]
          : null;

        return (
          <Segment
            key={widget.id}
            theme={theme}
            colors={colors}
            nextColors={nextColors}
            isFirst={index === 0}
            isLast={index === renderedWidgets.length - 1}
          >
            {element}
          </Segment>
        );
      })}
    </Box>
  );
};

export default StatusBar;
