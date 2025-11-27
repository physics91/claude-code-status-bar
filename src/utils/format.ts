/**
 * 토큰 수 포맷 (1.2K, 15.3K, 1.5M)
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}

/**
 * 비용 포맷 ($0.0123)
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  if (cost < 1) {
    return `$${cost.toFixed(3)}`;
  }
  return `$${cost.toFixed(2)}`;
}

/**
 * 시간 포맷 (1h 23m, 5m 30s)
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}m` : ''}`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m${remainingSeconds > 0 ? ` ${remainingSeconds}s` : ''}`;
  }

  return `${seconds}s`;
}

/**
 * 경로 축약 (홈 디렉토리를 ~로, 긴 경로 축약)
 */
export function shortenPath(path: string, maxLength = 30): string {
  // 홈 디렉토리를 ~로 치환
  const home = process.env.HOME || process.env.USERPROFILE || '';
  let shortened = path;

  if (home && path.startsWith(home)) {
    shortened = '~' + path.slice(home.length);
  }

  // Windows 경로 정규화
  shortened = shortened.replace(/\\/g, '/');

  // 최대 길이 초과 시 축약
  if (shortened.length > maxLength) {
    const parts = shortened.split('/');
    if (parts.length > 3) {
      // 처음과 마지막 2개만 유지
      const first = parts[0];
      const last = parts.slice(-2).join('/');
      shortened = `${first}/.../${last}`;
    }
  }

  return shortened;
}

/**
 * 퍼센트 포맷
 */
export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * 모델명 축약 (claude-3-5-sonnet -> sonnet-3.5)
 */
export function shortenModelName(modelId: string): string {
  // 공통 패턴 처리
  const patterns: [RegExp, string][] = [
    [/claude-opus-4-5/i, 'opus-4.5'],
    [/claude-sonnet-4-5/i, 'sonnet-4.5'],
    [/claude-sonnet-4/i, 'sonnet-4'],
    [/claude-3-5-sonnet/i, 'sonnet-3.5'],
    [/claude-3-5-haiku/i, 'haiku-3.5'],
    [/claude-3-opus/i, 'opus-3'],
    [/claude-3-sonnet/i, 'sonnet-3'],
    [/claude-3-haiku/i, 'haiku-3'],
  ];

  for (const [pattern, replacement] of patterns) {
    if (pattern.test(modelId)) {
      return replacement;
    }
  }

  // 패턴 매치 실패 시 원본 반환 (앞 15자만)
  return modelId.length > 15 ? modelId.slice(0, 15) + '...' : modelId;
}
