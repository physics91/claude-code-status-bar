/**
 * 트랜스크립트 데이터 캐싱
 * 한 번의 파싱으로 tokens, context, todo 데이터를 모두 추출하고 캐싱합니다.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { createCache } from './cache.js';
import type { TodoItem, TranscriptMessage } from '../types/claude-input.js';

/**
 * 토큰 사용량 정보
 */
export interface TokenUsageData {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalConsumed: number;
  contextTokens: number;
}

/**
 * Todo 진행 상황
 */
export interface TodoProgressData {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
}

/**
 * 트랜스크립트에서 추출한 모든 데이터
 */
export interface TranscriptData {
  messages: TranscriptMessage[];
  tokenUsage: TokenUsageData;
  todoProgress: TodoProgressData;
}

// 캐시 인스턴스 (2초 TTL)
const transcriptCache = createCache<TranscriptData>({ ttl: 2000, maxSize: 10 });

/**
 * 기본 트랜스크립트 데이터
 */
function getDefaultData(): TranscriptData {
  return {
    messages: [],
    tokenUsage: {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      totalTokens: 0,
      totalConsumed: 0,
      contextTokens: 0,
    },
    todoProgress: {
      completed: 0,
      inProgress: 0,
      pending: 0,
      total: 0,
    },
  };
}

/**
 * 트랜스크립트 라인 타입
 */
interface TranscriptLine {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; tool_use_id?: string; content?: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: unknown;
}

/**
 * 트랜스크립트 파일에서 모든 데이터를 한 번에 추출 (캐싱 적용)
 * @param transcriptPath 트랜스크립트 파일 경로
 * @returns 추출된 모든 데이터
 */
export function getTranscriptData(transcriptPath: string): TranscriptData {
  if (!transcriptPath || !existsSync(transcriptPath)) {
    return getDefaultData();
  }

  try {
    // 파일 수정 시간 확인
    const stats = statSync(transcriptPath);
    const currentMtime = stats.mtimeMs;

    // 캐시 유효성 검사
    if (transcriptCache.isValid(transcriptPath, currentMtime)) {
      const cached = transcriptCache.get(transcriptPath);
      if (cached) {
        return cached;
      }
    }

    // 파일 파싱
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    const messages: TranscriptMessage[] = [];
    let lastUsage: TranscriptLine['message']['usage'] | null = null;
    let totalConsumed = 0;
    let outputTokens = 0;
    let latestTodos: TodoItem[] = [];

    for (const line of lines) {
      try {
        const parsed: TranscriptLine = JSON.parse(line);

        // user/assistant 메시지 처리
        if (parsed.type === 'user' || parsed.type === 'assistant') {
          let textContent = '';

          if (parsed.message?.content) {
            if (typeof parsed.message.content === 'string') {
              textContent = parsed.message.content;
            } else if (Array.isArray(parsed.message.content)) {
              textContent = parsed.message.content
                .map(item => item.text || item.content || '')
                .join(' ');
            }
          }

          messages.push({
            type: parsed.type as 'user' | 'assistant',
            content: textContent,
          });

          // assistant 메시지에서 usage 추출
          if (parsed.type === 'assistant' && parsed.message?.usage) {
            const usage = parsed.message.usage;
            lastUsage = usage;
            totalConsumed += (usage.input_tokens || 0) +
                           (usage.output_tokens || 0) +
                           (usage.cache_creation_input_tokens || 0);
            outputTokens += usage.output_tokens || 0;
          }
        }

        // tool_use 처리
        if (parsed.type === 'tool_use' || parsed.tool_name) {
          messages.push({
            type: 'tool_use',
            tool_name: parsed.tool_name,
            tool_input: parsed.tool_input,
          });

          // TodoWrite 도구 호출 추적
          if (parsed.tool_name === 'TodoWrite' && parsed.tool_input) {
            const input = parsed.tool_input as { todos?: TodoItem[] };
            if (input.todos && Array.isArray(input.todos)) {
              latestTodos = input.todos;
            }
          }
        }

        // tool_result 처리
        if (parsed.type === 'tool_result' || parsed.tool_result !== undefined) {
          messages.push({
            type: 'tool_result',
            tool_result: parsed.tool_result,
          });
        }
      } catch {
        // 개별 라인 파싱 실패 무시
      }
    }

    // 결과 데이터 생성
    const result: TranscriptData = {
      messages,
      tokenUsage: {
        inputTokens: lastUsage?.input_tokens || 0,
        outputTokens,
        cacheCreationTokens: lastUsage?.cache_creation_input_tokens || 0,
        cacheReadTokens: lastUsage?.cache_read_input_tokens || 0,
        totalTokens: totalConsumed,
        totalConsumed,
        contextTokens: (lastUsage?.input_tokens || 0) +
                      (lastUsage?.cache_creation_input_tokens || 0) +
                      (lastUsage?.cache_read_input_tokens || 0),
      },
      todoProgress: {
        completed: latestTodos.filter(t => t.status === 'completed').length,
        inProgress: latestTodos.filter(t => t.status === 'in_progress').length,
        pending: latestTodos.filter(t => t.status === 'pending').length,
        total: latestTodos.length,
      },
    };

    // 캐시에 저장
    transcriptCache.set(transcriptPath, result, currentMtime);

    return result;
  } catch {
    return getDefaultData();
  }
}

/**
 * 트랜스크립트 캐시 초기화
 */
export function clearTranscriptCache(): void {
  transcriptCache.clear();
}

/**
 * 캐시 크기 반환 (디버깅용)
 */
export function getTranscriptCacheSize(): number {
  return transcriptCache.size;
}
