import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { parseTranscript, extractTodoProgress } from '../utils/transcript.js';

/**
 * Todo 진행률 위젯 컴포넌트
 */
const TodoWidgetComponent: React.FC<WidgetProps> = ({ data, theme }) => {
  let todoProgress = { completed: 0, inProgress: 0, pending: 0, total: 0 };

  // Transcript에서 Todo 진행률 추출
  if (data.transcript_path) {
    try {
      const messages = parseTranscript(data.transcript_path);
      todoProgress = extractTodoProgress(messages);
    } catch {
      // 파싱 실패 시 기본값 유지
    }
  }

  // Todo가 없으면 표시하지 않음
  if (todoProgress.total === 0) {
    return null;
  }

  const percent = Math.round(
    (todoProgress.completed / todoProgress.total) * 100
  );

  // 진행 상태에 따른 색상
  let statusColor = theme.colors.status.normal;
  if (todoProgress.inProgress > 0) {
    statusColor = theme.colors.status.warning;
  }
  if (percent === 100) {
    statusColor = theme.colors.status.success;
  }

  return (
    <Text>
      TODO{' '}
      <Text color={statusColor}>
        {todoProgress.completed}/{todoProgress.total}
      </Text>{' '}
      [{percent}%]
    </Text>
  );
};

/**
 * Todo 진행률 위젯 정의
 */
export const TodoWidget: WidgetDefinition = {
  id: 'todo',
  name: 'Todo Progress',
  description: 'Displays todo list progress',
  defaultEnabled: false, // 기본 비활성화
  defaultOrder: 7,
  colorKey: 'todo',
  Component: TodoWidgetComponent,
};
