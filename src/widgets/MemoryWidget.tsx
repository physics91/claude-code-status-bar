import React from 'react';
import { Text } from 'ink';
import type { WidgetDefinition, WidgetProps } from './types.js';

/**
 * 바이트를 사람이 읽기 쉬운 형식으로 변환
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)}GB`;
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(0)}MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(0)}KB`;
  }
  return `${bytes}B`;
}

/**
 * 메모리 사용량 위젯 컴포넌트
 * Node.js 프로세스의 힙 메모리 사용량을 표시합니다.
 */
const MemoryWidgetComponent: React.FC<WidgetProps> = () => {
  const memory = process.memoryUsage();
  const usedMemory = formatBytes(memory.heapUsed);

  return <Text>{usedMemory}</Text>;
};

/**
 * 메모리 사용량 위젯 정의
 */
export const MemoryWidget: WidgetDefinition = {
  id: 'memory',
  name: 'Memory Usage',
  description: 'Displays process memory usage',
  defaultEnabled: false,
  defaultOrder: 8,
  colorKey: 'memory',
  Component: MemoryWidgetComponent,
};
