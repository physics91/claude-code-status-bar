/**
 * 비동기 Status Bar 렌더러
 * 모든 데이터를 병렬로 수집하고 위젯을 병렬로 렌더링합니다.
 */

import { Chalk } from 'chalk';
const chalk = new Chalk({ level: 3 });

import type { Theme } from '../themes/types.js';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { WidgetDefinition } from '../widgets/types.js';
import type { WidgetConfig } from '../types/state.js';
import type { BehaviorConfigType } from '../config/schema.js';
import type { TranscriptData } from '../utils/transcript-cache.js';
import type { GitInfo } from '../utils/git-async.js';
import type { UsageSnapshot } from '../utils/usage-probe.js';

import { getGitInfoAsync } from '../utils/git-async.js';
import { getTranscriptData } from '../utils/transcript-cache.js';
import { getUsageSnapshot } from '../utils/usage-probe.js';
import { getTerminalWidth, getDisplayWidth } from '../utils/terminal.js';
import {
  getWidgetCacheKey,
  getCachedWidgetContent,
  setCachedWidgetContent,
} from './widget-cache.js';
import { t } from '../i18n/index.js';
import { getWidgetContent } from './widget-content.js';

/**
 * 위젯 콘텐츠 추출 (캐시된 데이터 사용)
 */
function getWidgetContentWithCache(
  widgetId: string,
  data: ClaudeInputData,
  theme: Theme,
  transcriptData: TranscriptData | undefined,
  gitInfo: GitInfo | undefined,
  usageSnapshot: UsageSnapshot | undefined,
  behaviorConfig?: BehaviorConfigType
): string | null {
  // 캐시 확인
  const cacheKey = getWidgetCacheKey(widgetId, data);
  const cached = getCachedWidgetContent(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // 콘텐츠 계산
  const content = getWidgetContent(widgetId, data, theme, {
    transcriptData,
    gitInfo,
    usageSnapshot,
    behavior: behaviorConfig,
  });

  // 캐시에 저장
  setCachedWidgetContent(cacheKey, content);

  return content;
}

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
  const hasAnsi = content.includes('\x1b[');
  let segment: string;

  if (hasAnsi) {
    const prefix = chalk.bgHex(bgColor)(' ');
    const suffix = chalk.bgHex(bgColor)(' ');
    segment = prefix + content + suffix;
  } else {
    segment = chalk.bgHex(bgColor).hex(fgColor)(` ${content} `);
  }

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
  // 모든 세그먼트를 반환 - 멀티라인 처리는 renderStatusBarAsync에서 수행
  return segments;
}

/**
 * 비동기 Status Bar 렌더링
 * 모든 데이터를 병렬로 수집 후 렌더링
 */
export async function renderStatusBarAsync(
  data: ClaudeInputData,
  theme: Theme,
  widgets: WidgetDefinition[],
  widgetConfigs: Record<string, WidgetConfig>,
  behaviorConfig?: BehaviorConfigType
): Promise<string> {
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

  const needsTranscript = activeWidgets.some((widget) =>
    ['tokens', 'context', 'todo'].includes(widget.id)
  );
  const needsGit = activeWidgets.some((widget) =>
    ['git', 'files'].includes(widget.id)
  );
  const needsUsage = activeWidgets.some((widget) => widget.id === 'usage');

  // 모든 비동기 데이터를 병렬로 수집
  const [transcriptData, gitInfo, usageSnapshot] = await Promise.all([
    // 트랜스크립트 데이터 (동기적이지만 캐싱됨)
    Promise.resolve(
      needsTranscript && data.transcript_path ? getTranscriptData(data.transcript_path) : undefined
    ),
    // Git 정보 (비동기)
    needsGit ? getGitInfoAsync(data.cwd || data.workspace?.current_dir) : Promise.resolve(undefined),
    needsUsage ? getUsageSnapshot(behaviorConfig) : Promise.resolve(undefined),
  ]);

  // 모든 위젯 콘텐츠를 병렬로 계산
  const widgetPromises = activeWidgets.map(async (widget) => {
    const content = getWidgetContentWithCache(
      widget.id,
      data,
      theme,
      transcriptData,
      gitInfo,
      usageSnapshot,
      behaviorConfig
    );
    return { widget, content };
  });

  const results = await Promise.all(widgetPromises);

  // null이 아닌 콘텐츠만 필터링
  let segments = results.filter(
    (r): r is { widget: WidgetDefinition; content: string } => r.content !== null
  );

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
