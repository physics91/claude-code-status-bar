import { Chalk } from 'chalk';
// Force color output even when stdout is not a TTY (required for Claude Code statusline)
const chalk = new Chalk({ level: 3 });
import type { Theme } from '../themes/types.js';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { WidgetDefinition } from '../widgets/types.js';
import type { WidgetConfig } from '../types/state.js';
import type { BehaviorConfigType } from '../config/schema.js';
import { getGitInfo } from '../utils/git.js';
import { getTranscriptData } from '../utils/transcript-cache.js';
import { getTerminalWidth, getDisplayWidth } from '../utils/terminal.js';
import { t } from '../i18n/index.js';
import { getWidgetContent } from './widget-content.js';

/**
 * 위젯 데이터 추출 (에러 경계 포함)
 */
/**
 * Powerline 세그먼트 렌더링
 * @param isLastInLine - true이면 해당 라인의 마지막 세그먼트 (ANSI 리셋 필요)
 */
function renderSegment(
  content: string,
  bgColor: string,
  fgColor: string,
  nextBgColor: string | null,
  separator: string,
  isLastInLine = false
): string {
  // 내용 렌더링 - ANSI 코드가 이미 포함되어 있으면 배경색만 추가
  const hasAnsi = content.includes('\x1b[');
  let segment: string;

  if (hasAnsi) {
    // 이미 색상이 적용된 경우: 공백만 배경색 적용
    const prefix = chalk.bgHex(bgColor)(' ');
    const suffix = chalk.bgHex(bgColor)(' ');
    segment = prefix + content + suffix;
  } else {
    // 색상이 없는 경우: 전체에 색상 적용
    segment = chalk.bgHex(bgColor).hex(fgColor)(` ${content} `);
  }

  // 구분자 렌더링
  let sep = '';
  if (isLastInLine) {
    // 라인 끝: ANSI 리셋으로 색상 번짐 방지
    sep = chalk.hex(bgColor)(separator) + '\x1b[0m';
  } else if (nextBgColor) {
    sep = chalk.bgHex(nextBgColor).hex(bgColor)(separator);
  } else {
    sep = chalk.hex(bgColor)(separator) + '\x1b[0m';
  }

  return segment + sep;
}

/**
 * 세그먼트의 표시 너비 계산 (ANSI 제외, 패딩 포함)
 */
function getSegmentDisplayWidth(content: string, separator: string): number {
  // 콘텐츠 너비 + 좌우 패딩(2) + 구분자(1)
  return getDisplayWidth(content) + 2 + getDisplayWidth(separator);
}

/**
 * 터미널 너비에 맞게 세그먼트 필터링
 * 수정: 모든 세그먼트를 반환하고 멀티라인으로 처리
 */
function fitSegmentsToWidth(
  segments: Array<{ widget: WidgetDefinition; content: string }>,
  _separator: string,
  _maxWidth: number
): Array<{ widget: WidgetDefinition; content: string }> {
  // 모든 세그먼트를 반환 - 멀티라인 처리는 renderStatusBar에서 수행
  return segments;
}

/**
 * 전체 Status Bar 렌더링
 */
export function renderStatusBar(
  data: ClaudeInputData,
  theme: Theme,
  widgets: WidgetDefinition[],
  widgetConfigs: Record<string, WidgetConfig>,
  behaviorConfig?: BehaviorConfigType
): string {
  const gitInfo = getGitInfo(data.cwd || data.workspace?.current_dir);
  const transcriptData = data.transcript_path
    ? getTranscriptData(data.transcript_path)
    : undefined;

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

  // 각 위젯의 내용 추출 (null 제외)
  let segments: Array<{ widget: WidgetDefinition; content: string }> = [];

  for (const widget of activeWidgets) {
    const content = getWidgetContent(widget.id, data, theme, {
      gitInfo,
      transcriptData,
      behavior: behaviorConfig,
    });
    if (content !== null) {
      segments.push({ widget, content });
    }
  }

  if (segments.length === 0) {
    return chalk.gray(t('renderer:noWidgets'));
  }

  // 터미널 너비 가져오기
  const terminalWidth = getTerminalWidth();
  const separator = theme.symbols.separator;

  // fitSegmentsToWidth는 이제 모든 세그먼트를 반환
  segments = fitSegmentsToWidth(segments, separator, terminalWidth);

  if (segments.length === 0) {
    return chalk.gray(t('renderer:truncated'));
  }

  // 멀티라인 Powerline 렌더링
  let output = '';
  let currentLineWidth = 0;

  // 현재 라인의 세그먼트들을 저장
  interface LineSegment {
    widget: WidgetDefinition;
    content: string;
    colors: { bg: string; fg: string };
  }
  let lineSegments: LineSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const { widget, content } = segments[i];
    const colors = theme.colors.segments[widget.colorKey];
    const segmentWidth = getSegmentDisplayWidth(content, separator);

    // 현재 라인에 추가하면 너비를 초과하는 경우
    if (currentLineWidth > 0 && currentLineWidth + segmentWidth > terminalWidth) {
      // 현재 라인의 세그먼트들 렌더링
      for (let j = 0; j < lineSegments.length; j++) {
        const seg = lineSegments[j];
        const isLast = j === lineSegments.length - 1;
        const nextSeg = lineSegments[j + 1];
        const nextBgColor = isLast ? null : nextSeg?.colors.bg;
        output += renderSegment(seg.content, seg.colors.bg, seg.colors.fg, nextBgColor, separator, isLast);
      }
      output += '\n';
      lineSegments = [];
      currentLineWidth = 0;
    }

    lineSegments.push({ widget, content, colors });
    currentLineWidth += segmentWidth;
  }

  // 남은 세그먼트들 렌더링
  for (let j = 0; j < lineSegments.length; j++) {
    const seg = lineSegments[j];
    const isLast = j === lineSegments.length - 1;
    const nextSeg = lineSegments[j + 1];
    const nextBgColor = isLast ? null : nextSeg?.colors.bg;
    output += renderSegment(seg.content, seg.colors.bg, seg.colors.fg, nextBgColor, separator, isLast);
  }

  return output;
}
