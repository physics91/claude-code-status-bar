import React from 'react';
import { Text } from 'ink';
import { Chalk } from 'chalk';
// Force color output even when stdout is not a TTY
const chalk = new Chalk({ level: 3 });

export interface ProgressBarProps {
  percent: number;
  width?: number;
  filledChar?: string;
  emptyChar?: string;
  filledColor?: string;
  emptyColor?: string;
  warningThreshold?: number;
  criticalThreshold?: number;
  warningColor?: string;
  criticalColor?: string;
}

/**
 * 프로그레스 바 컴포넌트
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  percent,
  width = 10,
  filledChar = '█',
  emptyChar = '░',
  filledColor = '#42a5f5',
  emptyColor = '#424242',
  warningThreshold = 70,
  criticalThreshold = 90,
  warningColor = '#ffa726',
  criticalColor = '#ef5350',
}) => {
  // 퍼센트 범위 제한
  const clampedPercent = Math.min(100, Math.max(0, percent));

  // 채워진 칸 수 계산
  const filledCount = Math.round((clampedPercent / 100) * width);
  const emptyCount = width - filledCount;

  // 상태에 따른 색상 결정
  let currentFilledColor = filledColor;
  if (clampedPercent >= criticalThreshold) {
    currentFilledColor = criticalColor;
  } else if (clampedPercent >= warningThreshold) {
    currentFilledColor = warningColor;
  }

  // 바 생성
  const filledBar = chalk.hex(currentFilledColor)(filledChar.repeat(filledCount));
  const emptyBar = chalk.hex(emptyColor)(emptyChar.repeat(emptyCount));

  return (
    <Text>
      [{filledBar}
      {emptyBar}]
    </Text>
  );
};

export default ProgressBar;
