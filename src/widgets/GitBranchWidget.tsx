import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { getGitInfo } from '../utils/git.js';

/**
 * Git 브랜치 위젯 컴포넌트
 */
const GitBranchWidgetComponent: React.FC<WidgetProps> = ({ data, theme }) => {
  const gitInfo = getGitInfo(data.cwd || data.workspace?.current_dir);

  if (!gitInfo.branch) {
    return null;
  }

  const branchIcon = theme.symbols.branch;
  const modifiedIcon = gitInfo.isDirty ? ` ${theme.symbols.modified}` : '';

  return (
    <Text>
      {branchIcon ? `${branchIcon} ` : ''}
      {gitInfo.branch}
      {modifiedIcon}
    </Text>
  );
};

/**
 * Git 브랜치 위젯 정의
 */
export const GitBranchWidget: WidgetDefinition = {
  id: 'git',
  name: 'Git Branch',
  description: 'Displays the current Git branch name',
  defaultEnabled: true,
  defaultOrder: 1,
  colorKey: 'git',
  Component: GitBranchWidgetComponent,
};
