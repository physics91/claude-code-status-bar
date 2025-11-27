import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { getGitInfo } from '../utils/git.js';

/**
 * 파일 변경 위젯 컴포넌트
 * Git에서 추가/삭제된 라인 수를 표시합니다.
 */
const FilesWidgetComponent: React.FC<WidgetProps> = ({ data }) => {
  const gitInfo = getGitInfo(data.cwd || data.workspace?.current_dir);

  const linesAdded = gitInfo.linesAdded;
  const linesRemoved = gitInfo.linesRemoved;

  // 변경사항이 없으면 표시하지 않음
  if (linesAdded === 0 && linesRemoved === 0) {
    return <Text>no changes</Text>;
  }

  return <Text>+{linesAdded}/-{linesRemoved}</Text>;
};

/**
 * 파일 변경 위젯 정의
 */
export const FilesWidget: WidgetDefinition = {
  id: 'files',
  name: 'File Changes',
  description: 'Displays lines added/removed in working directory',
  defaultEnabled: false,
  defaultOrder: 9,
  colorKey: 'files',
  Component: FilesWidgetComponent,
};
