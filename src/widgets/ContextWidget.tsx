import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { formatPercent } from '../utils/format.js';
import {
  parseTranscript,
  calculateContextUsage,
} from '../utils/transcript.js';
import { getModelMaxTokens } from '../types/claude-input.js';

/**
 * 프로그레스 바 생성
 */
function createProgressBar(
  percent: number,
  width = 10,
  filledChar = '█',
  emptyChar = '░'
): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return filledChar.repeat(filled) + emptyChar.repeat(empty);
}

/**
 * 컨텍스트 윈도우 사용률 위젯 컴포넌트
 */
const ContextWidgetComponent: React.FC<WidgetProps> = ({ data, theme }) => {
  let usagePercent = 0;

  // Transcript에서 컨텍스트 사용률 계산
  if (data.transcript_path) {
    try {
      const messages = parseTranscript(data.transcript_path);
      const maxTokens = getModelMaxTokens(data.model?.id || '');
      usagePercent = calculateContextUsage(messages, maxTokens);
    } catch {
      // 파싱 실패 시 0으로 유지
    }
  }

  // 상태에 따른 색상 결정
  let statusColor = theme.colors.progress.filled;
  if (usagePercent >= 90) {
    statusColor = theme.colors.progress.critical;
  } else if (usagePercent >= 70) {
    statusColor = theme.colors.progress.warning;
  }

  const progressBar = createProgressBar(usagePercent);
  const percentText = formatPercent(usagePercent);

  return (
    <Text>
      CTX <Text color={statusColor}>{progressBar}</Text> {percentText}
    </Text>
  );
};

/**
 * 컨텍스트 윈도우 사용률 위젯 정의
 */
export const ContextWidget: WidgetDefinition = {
  id: 'context',
  name: 'Context Window',
  description: 'Displays context window usage percentage',
  defaultEnabled: true,
  defaultOrder: 6,
  colorKey: 'context',
  Component: ContextWidgetComponent,
};
