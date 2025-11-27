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
import type { TranscriptData } from '../utils/transcript-cache.js';
import type { GitInfo } from '../utils/git-async.js';

import { shortenModelName, formatTokens, formatCost, formatDuration, shortenPath, formatPercent } from '../utils/format.js';
import { getGitInfoAsync } from '../utils/git-async.js';
import { getTranscriptData } from '../utils/transcript-cache.js';
import { getModelMaxTokens } from '../types/claude-input.js';
import { getTerminalWidth, getDisplayWidth } from '../utils/terminal.js';
import {
  getWidgetCacheKey,
  getCachedWidgetContent,
  setCachedWidgetContent,
} from './widget-cache.js';
import { t } from '../i18n/index.js';

/**
 * 캐시된 데이터를 포함한 확장 입력 데이터
 */
interface EnrichedData extends ClaudeInputData {
  _cache?: {
    transcriptData?: TranscriptData;
    gitInfo?: GitInfo;
  };
}

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
 * 위젯 콘텐츠 추출 (캐시된 데이터 사용)
 */
function getWidgetContentWithCache(
  widgetId: string,
  data: EnrichedData,
  theme: Theme
): string | null {
  // 캐시 확인
  const cacheKey = getWidgetCacheKey(widgetId, data);
  const cached = getCachedWidgetContent(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // 콘텐츠 계산
  const content = computeWidgetContent(widgetId, data, theme);

  // 캐시에 저장
  setCachedWidgetContent(cacheKey, content);

  return content;
}

/**
 * 위젯 콘텐츠 계산
 */
function computeWidgetContent(
  widgetId: string,
  data: EnrichedData,
  theme: Theme
): string | null {
  try {
    const transcriptData = data._cache?.transcriptData;
    const gitInfo = data._cache?.gitInfo;

    switch (widgetId) {
      case 'model':
        return shortenModelName(data.model?.display_name || data.model?.id || t('renderer:labels.unknown'));

      case 'git': {
        if (!gitInfo?.branch) return null;

        const branch = chalk.hex('#37474f')(gitInfo.branch);
        const added = chalk.hex('#2e7d32').bold(`+${gitInfo.linesAdded}`);
        const removed = chalk.hex('#c62828').bold(`-${gitInfo.linesRemoved}`);

        return chalk.bgHex('#ffffff')(`${branch} ${added} ${removed}`);
      }

      case 'tokens': {
        const tokens = transcriptData?.tokenUsage.totalTokens ?? 0;
        return `${formatTokens(tokens)} ${t('renderer:labels.tok')}`;
      }

      case 'cost':
        return formatCost(data.cost?.total_cost_usd ?? data.cost?.api_cost ?? 0);

      case 'session':
        return formatDuration(data.cost?.total_duration_ms ?? data.cost?.duration_ms ?? 0);

      case 'cwd':
        return shortenPath(data.cwd || data.workspace?.current_dir || process.cwd(), 20);

      case 'context': {
        const contextTokens = transcriptData?.tokenUsage.contextTokens ?? 0;
        const maxTokens = getModelMaxTokens(data.model?.id || '');
        const usagePercent = Math.min((contextTokens / maxTokens) * 100, 100);
        const bar = createProgressBar(usagePercent, 8);
        return `${t('renderer:labels.ctx')} ${bar} ${formatPercent(usagePercent)}`;
      }

      case 'todo': {
        const todoProgress = transcriptData?.todoProgress ?? { completed: 0, total: 0 };
        if (todoProgress.total === 0) return null;
        const percent = Math.round((todoProgress.completed / todoProgress.total) * 100);
        return `${t('renderer:labels.todo')} ${todoProgress.completed}/${todoProgress.total} [${percent}%]`;
      }

      case 'memory': {
        const memory = process.memoryUsage();
        const usedMB = (memory.heapUsed / 1024 / 1024).toFixed(0);
        return `${usedMB} MB`;
      }

      case 'files': {
        if (!gitInfo) return null;
        const linesAdded = gitInfo.linesAdded;
        const linesRemoved = gitInfo.linesRemoved;

        if (linesAdded === 0 && linesRemoved === 0) {
          return t('renderer:labels.noChanges');
        }

        return `+${linesAdded}/-${linesRemoved}`;
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Powerline 세그먼트 렌더링
 */
function renderSegment(
  content: string,
  bgColor: string,
  fgColor: string,
  nextBgColor: string | null,
  separator: string
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
  if (nextBgColor) {
    sep = chalk.bgHex(nextBgColor).hex(bgColor)(separator);
  } else {
    sep = chalk.hex(bgColor)(separator);
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
 */
function fitSegmentsToWidth(
  segments: Array<{ widget: WidgetDefinition; content: string }>,
  separator: string,
  maxWidth: number
): Array<{ widget: WidgetDefinition; content: string }> {
  if (maxWidth <= 0) {
    return segments;
  }

  const result: Array<{ widget: WidgetDefinition; content: string }> = [];
  let currentWidth = 0;

  for (const segment of segments) {
    const segmentWidth = getSegmentDisplayWidth(segment.content, separator);
    if (currentWidth + segmentWidth <= maxWidth) {
      result.push(segment);
      currentWidth += segmentWidth;
    }
  }

  return result;
}

/**
 * 비동기 Status Bar 렌더링
 * 모든 데이터를 병렬로 수집 후 렌더링
 */
export async function renderStatusBarAsync(
  data: ClaudeInputData,
  theme: Theme,
  widgets: WidgetDefinition[],
  widgetConfigs: Record<string, WidgetConfig>
): Promise<string> {
  // 모든 비동기 데이터를 병렬로 수집
  const [transcriptData, gitInfo] = await Promise.all([
    // 트랜스크립트 데이터 (동기적이지만 캐싱됨)
    Promise.resolve(
      data.transcript_path ? getTranscriptData(data.transcript_path) : undefined
    ),
    // Git 정보 (비동기)
    getGitInfoAsync(data.cwd || data.workspace?.current_dir),
  ]);

  // 캐시된 데이터를 포함한 확장 데이터 생성
  const enrichedData: EnrichedData = {
    ...data,
    _cache: { transcriptData, gitInfo },
  };

  // 활성화된 위젯 필터링 및 정렬
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

  // 모든 위젯 콘텐츠를 병렬로 계산
  const widgetPromises = activeWidgets.map(async (widget) => {
    const content = getWidgetContentWithCache(widget.id, enrichedData, theme);
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

  // 터미널 너비에 맞게 세그먼트 필터링 (줄바꿈 방지)
  const terminalWidth = getTerminalWidth();
  const separator = theme.symbols.separator;
  segments = fitSegmentsToWidth(segments, separator, terminalWidth);

  if (segments.length === 0) {
    return chalk.gray(t('renderer:truncated'));
  }

  // Powerline 렌더링
  let output = '';

  for (let i = 0; i < segments.length; i++) {
    const { widget, content } = segments[i];
    const colors = theme.colors.segments[widget.colorKey];
    const nextSegment = segments[i + 1];
    const nextBgColor = nextSegment
      ? theme.colors.segments[nextSegment.widget.colorKey]?.bg
      : null;

    output += renderSegment(content, colors.bg, colors.fg, nextBgColor, separator);
  }

  return output;
}
