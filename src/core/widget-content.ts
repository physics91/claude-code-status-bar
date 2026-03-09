import { Chalk } from 'chalk';
import type { Theme } from '../themes/types.js';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { BehaviorConfigType } from '../config/schema.js';
import type { TranscriptData } from '../utils/transcript-cache.js';
import type { GitInfo } from '../utils/git-async.js';
import {
  shortenModelName,
  formatTokens,
  formatCost,
  formatDuration,
  shortenPath,
  formatPercent,
} from '../utils/format.js';
import { getModelMaxTokens } from '../types/claude-input.js';
import { t } from '../i18n/index.js';
import { formatUsageSummary, type UsageSnapshot } from '../utils/usage-probe.js';

const chalk = new Chalk({ level: 3 });

export interface WidgetContentContext {
  transcriptData?: TranscriptData;
  gitInfo?: GitInfo;
  usageSnapshot?: UsageSnapshot;
  behavior?: BehaviorConfigType;
}

function formatUsageContent(snapshot: UsageSnapshot): string {
  return formatUsageSummary(snapshot, {
    fiveHour: t('renderer:labels.usage5h'),
    weekly: t('renderer:labels.usageWeek'),
  });
}

export function getWidgetContent(
  widgetId: string,
  data: ClaudeInputData,
  theme: Theme,
  context: WidgetContentContext = {}
): string | null {
  try {
    const transcriptData = context.transcriptData;
    const gitInfo = context.gitInfo;

    switch (widgetId) {
      case 'model':
        return shortenModelName(
          data.model?.display_name || data.model?.id || t('renderer:labels.unknown')
        );

      case 'git': {
        if (!gitInfo?.branch) {
          return null;
        }

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

      case 'usage':
        return context.usageSnapshot ? formatUsageContent(context.usageSnapshot) : null;

      case 'cwd':
        return shortenPath(data.cwd || data.workspace?.current_dir || process.cwd(), 20);

      case 'context': {
        const contextTokens = transcriptData?.tokenUsage.contextTokens ?? 0;
        const maxTokens = getModelMaxTokens(data.model?.id || '');
        const usagePercent = Math.min((contextTokens / maxTokens) * 100, 100);
        return `${t('renderer:labels.ctx')} ${formatPercent(usagePercent)}`;
      }

      case 'todo': {
        const todoProgress = transcriptData?.todoProgress ?? {
          completed: 0,
          inProgress: 0,
          pending: 0,
          total: 0,
        };

        if (todoProgress.total === 0) {
          return null;
        }

        const percent = Math.round((todoProgress.completed / todoProgress.total) * 100);
        return `${t('renderer:labels.todo')} ${todoProgress.completed}/${todoProgress.total} [${percent}%]`;
      }

      case 'memory': {
        const memory = process.memoryUsage();
        const usedMB = Math.round(memory.heapUsed / 1024 / 1024);
        return `${t('renderer:labels.mem')} ${usedMB}MB`;
      }

      case 'files': {
        const filesChanged = gitInfo?.filesChanged ?? 0;

        if (filesChanged === 0) {
          return null;
        }

        return `${filesChanged} ${t('renderer:labels.files')}`;
      }

      default:
        return null;
    }
  } catch {
    return null;
  }
}
