/**
 * 위젯 렌더링 캐시
 * 위젯별 데이터 해시 기반으로 캐시 키를 생성하여 불필요한 재계산을 방지합니다.
 */

import { createHash } from 'crypto';
import { createCache } from '../utils/cache.js';
import type { ClaudeInputData } from '../types/claude-input.js';

// 위젯 캐시 (1초 TTL, 최대 50개)
const widgetCache = createCache<string | null>({ ttl: 1000, maxSize: 50 });

/**
 * 위젯별로 관련 데이터만 추출하여 해시 생성
 */
function computeDataHash(widgetId: string, data: ClaudeInputData): string {
  let relevantData: string;

  switch (widgetId) {
    case 'model':
      relevantData = JSON.stringify({
        id: data.model?.id,
        name: data.model?.display_name,
      });
      break;

    case 'git':
    case 'files':
      // git과 files 위젯은 동일한 데이터 소스 사용
      relevantData = JSON.stringify({
        cwd: data.cwd || data.workspace?.current_dir,
      });
      break;

    case 'tokens':
    case 'context':
    case 'todo':
      // transcript 기반 위젯들
      relevantData = data.transcript_path || '';
      break;

    case 'cwd':
      relevantData = data.cwd || data.workspace?.current_dir || '';
      break;

    case 'cost':
      relevantData = JSON.stringify({
        cost: data.cost?.total_cost_usd ?? data.cost?.api_cost,
      });
      break;

    case 'session':
      relevantData = JSON.stringify({
        duration: data.cost?.total_duration_ms ?? data.cost?.duration_ms,
      });
      break;

    case 'memory':
      // 메모리 위젯은 매번 새로 계산 (프로세스 상태 변경)
      relevantData = Date.now().toString();
      break;

    default:
      // 알 수 없는 위젯은 전체 데이터 사용
      relevantData = JSON.stringify(data);
  }

  // MD5 해시의 처음 8자리 사용
  return createHash('md5').update(relevantData).digest('hex').slice(0, 8);
}

/**
 * 위젯 캐시 키 생성
 */
export function getWidgetCacheKey(widgetId: string, data: ClaudeInputData): string {
  const hash = computeDataHash(widgetId, data);
  return `${widgetId}:${hash}`;
}

/**
 * 캐시된 위젯 콘텐츠 조회
 * @returns 캐시된 값 (null 포함), 캐시 미스 시 undefined
 */
export function getCachedWidgetContent(key: string): string | null | undefined {
  return widgetCache.get(key);
}

/**
 * 위젯 콘텐츠 캐싱
 */
export function setCachedWidgetContent(key: string, content: string | null): void {
  widgetCache.set(key, content);
}

/**
 * 특정 위젯 또는 전체 캐시 무효화
 */
export function invalidateWidgetCache(widgetId?: string): void {
  if (widgetId) {
    // 특정 위젯의 모든 캐시 무효화는 현재 지원하지 않음
    // 전체 무효화로 대체
    widgetCache.clear();
  } else {
    widgetCache.clear();
  }
}

/**
 * 캐시 크기 반환 (디버깅용)
 */
export function getWidgetCacheSize(): number {
  return widgetCache.size;
}
