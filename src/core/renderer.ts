import { Chalk } from 'chalk';
// Force color output even when stdout is not a TTY (required for Claude Code statusline)
const chalk = new Chalk({ level: 3 });
import type { Theme } from '../themes/types.js';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { WidgetDefinition } from '../widgets/types.js';
import type { WidgetConfig } from '../types/state.js';
import { shortenModelName, formatTokens, formatCost, formatDuration, shortenPath, formatPercent } from '../utils/format.js';
import { getGitInfo } from '../utils/git.js';
import { parseTranscript, extractActualTokenUsage, extractTodoProgress } from '../utils/transcript.js';
import { getModelMaxTokens } from '../types/claude-input.js';
import { getTerminalWidth, getDisplayWidth } from '../utils/terminal.js';
import { t } from '../i18n/index.js';

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
 * 위젯 데이터 추출 (에러 경계 포함)
 */
function getWidgetContent(
  widgetId: string,
  data: ClaudeInputData,
  theme: Theme
): string | null {
  try {
    switch (widgetId) {
      case 'model':
        return shortenModelName(data.model?.display_name || data.model?.id || t('renderer:labels.unknown'));

      case 'git': {
        const gitInfo = getGitInfo(data.cwd || data.workspace?.current_dir);
        if (!gitInfo.branch) return null;

        // 실제 git diff에서 추가/제거 라인 수 가져오기
        const linesAdded = gitInfo.linesAdded;
        const linesRemoved = gitInfo.linesRemoved;

        // 전체 흰색 배경에 각각 다른 전경색
        const branch = chalk.hex('#37474f')(gitInfo.branch);  // 진한 회색
        const added = chalk.hex('#2e7d32').bold(`+${linesAdded}`);  // 녹색
        const removed = chalk.hex('#c62828').bold(`-${linesRemoved}`);  // 빨간색

        // 전체를 흰색 배경으로 감싸기
        return chalk.bgHex('#ffffff')(`${branch} ${added} ${removed}`);
      }

      case 'tokens': {
        let tokens = 0;
        if (data.transcript_path) {
          const usage = extractActualTokenUsage(data.transcript_path);
          tokens = usage.totalTokens;
        }
        return `${formatTokens(tokens)} ${t('renderer:labels.tok')}`;
      }

      case 'cost':
        // total_cost_usd (새 필드) 우선, api_cost (이전 필드) fallback
        return formatCost(data.cost?.total_cost_usd ?? data.cost?.api_cost ?? 0);

      case 'session':
        // total_duration_ms (전체 세션 시간) 사용
        return formatDuration(data.cost?.total_duration_ms ?? data.cost?.duration_ms ?? 0);

      case 'cwd':
        return shortenPath(data.cwd || data.workspace?.current_dir || process.cwd(), 20);

      case 'context': {
        let usagePercent = 0;
        if (data.transcript_path) {
          const usage = extractActualTokenUsage(data.transcript_path);
          const maxTokens = getModelMaxTokens(data.model?.id || '');
          // 현재 컨텍스트 크기 사용 (contextTokens)
          usagePercent = Math.min((usage.contextTokens / maxTokens) * 100, 100);
        }
        const bar = createProgressBar(usagePercent, 8);
        return `${t('renderer:labels.ctx')} ${bar} ${formatPercent(usagePercent)}`;
      }

      case 'todo': {
        let todoProgress = { completed: 0, inProgress: 0, pending: 0, total: 0 };
        if (data.transcript_path) {
          const messages = parseTranscript(data.transcript_path);
          todoProgress = extractTodoProgress(messages);
        }
        if (todoProgress.total === 0) return null;
        const percent = Math.round((todoProgress.completed / todoProgress.total) * 100);
        return `${t('renderer:labels.todo')} ${todoProgress.completed}/${todoProgress.total} [${percent}%]`;
      }

      case 'memory': {
        const memory = process.memoryUsage();
        const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
        return `${t('renderer:labels.mem')} ${usedMB}MB`;
      }

      case 'files': {
        const gitInfo = getGitInfo(data.cwd || data.workspace?.current_dir);
        const filesChanged = gitInfo.filesChanged || 0;
        if (filesChanged === 0) return null;
        return `${filesChanged} ${t('renderer:labels.files')}`;
      }

      default:
        return null;
    }
  } catch (error) {
    // 에러 발생 시 해당 위젯만 건너뜀 (전체 렌더링 실패 방지)
    return null;
  }
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
  widgetConfigs: Record<string, WidgetConfig>
): string {
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
    const content = getWidgetContent(widget.id, data, theme);
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
