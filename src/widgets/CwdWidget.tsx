import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { shortenPath } from '../utils/format.js';

/**
 * 작업 디렉토리 위젯 컴포넌트
 */
const CwdWidgetComponent: React.FC<WidgetProps> = ({ data, config }) => {
  const cwd = data.cwd || data.workspace?.current_dir || process.cwd();
  const maxLength = (config.options?.maxLength as number) ?? 25;
  const shortenedPath = shortenPath(cwd, maxLength);

  return <Text>{shortenedPath}</Text>;
};

/**
 * 작업 디렉토리 위젯 정의
 */
export const CwdWidget: WidgetDefinition = {
  id: 'cwd',
  name: 'Working Directory',
  description: 'Displays the current working directory',
  defaultEnabled: true,
  defaultOrder: 5,
  colorKey: 'cwd',
  Component: CwdWidgetComponent,
};
