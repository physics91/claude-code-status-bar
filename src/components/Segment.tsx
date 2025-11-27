import React from 'react';
import { Text } from 'ink';
import { Chalk } from 'chalk';
// Force color output even when stdout is not a TTY
const chalk = new Chalk({ level: 3 });
import type { Theme, SegmentColors } from '../themes/types.js';

export interface SegmentProps {
  children: React.ReactNode;
  theme: Theme;
  colors: SegmentColors;
  nextColors?: SegmentColors | null;
  isFirst?: boolean;
  isLast?: boolean;
}

/**
 * Powerline 스타일 세그먼트 컴포넌트
 */
export const Segment: React.FC<SegmentProps> = ({
  children,
  theme,
  colors,
  nextColors,
  isFirst = false,
  isLast = false,
}) => {
  // 배경색과 전경색 적용
  const bgColor = colors.bg;
  const fgColor = colors.fg;

  // 세그먼트 내용
  const content = chalk.bgHex(bgColor).hex(fgColor)(` ${children} `);

  // 구분자 (Powerline 화살표)
  let separator = '';
  if (!isLast) {
    if (nextColors) {
      // 다음 세그먼트가 있는 경우: 현재 배경색으로 화살표, 다음 배경색 위에
      separator = chalk.bgHex(nextColors.bg).hex(bgColor)(theme.symbols.separator);
    } else {
      // 마지막 세그먼트인 경우: 배경 없이 화살표
      separator = chalk.hex(bgColor)(theme.symbols.separator);
    }
  } else {
    // 마지막 세그먼트
    separator = chalk.hex(bgColor)(theme.symbols.separator);
  }

  return (
    <Text>
      {content}
      {separator}
    </Text>
  );
};

export default Segment;
