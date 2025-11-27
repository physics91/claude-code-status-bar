import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';
import { formatTokens } from '../utils/format.js';
import { parseTranscript, calculateTotalTokens } from '../utils/transcript.js';

/**
 * 토큰 사용량 위젯 컴포넌트
 */
const TokensWidgetComponent: React.FC<WidgetProps> = ({ data }) => {
  let tokens = 0;

  // Transcript에서 토큰 수 추정
  if (data.transcript_path) {
    try {
      const messages = parseTranscript(data.transcript_path);
      tokens = calculateTotalTokens(messages);
    } catch {
      // 파싱 실패 시 0으로 유지
    }
  }

  const formattedTokens = formatTokens(tokens);

  return <Text>{formattedTokens} tokens</Text>;
};

/**
 * 토큰 사용량 위젯 정의
 */
export const TokensWidget: WidgetDefinition = {
  id: 'tokens',
  name: 'Token Usage',
  description: 'Displays estimated token usage',
  defaultEnabled: true,
  defaultOrder: 2,
  colorKey: 'tokens',
  Component: TokensWidgetComponent,
};
