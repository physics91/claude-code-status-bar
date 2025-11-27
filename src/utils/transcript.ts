import { readFileSync, existsSync } from 'fs';
import type { TodoItem, TranscriptMessage } from '../types/claude-input.js';

/**
 * Transcript 파일 파싱
 */
export function parseTranscript(transcriptPath: string): TranscriptMessage[] {
  if (!existsSync(transcriptPath)) {
    return [];
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const data = JSON.parse(content);

    // 배열인 경우 직접 반환
    if (Array.isArray(data)) {
      return data;
    }

    // messages 필드가 있는 경우
    if (data.messages && Array.isArray(data.messages)) {
      return data.messages;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * 토큰 수 추정 (대략적 계산)
 * 영어: 약 4글자 = 1토큰
 * 한글: 약 1.5글자 = 1토큰
 */
export function estimateTokens(text: string | undefined): number {
  if (!text) return 0;

  // 한글 문자 수
  const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length;
  // 비한글 문자 수
  const otherChars = text.length - koreanChars;

  // 대략적인 토큰 계산
  const koreanTokens = koreanChars / 1.5;
  const otherTokens = otherChars / 4;

  return Math.ceil(koreanTokens + otherTokens);
}

/**
 * Transcript에서 총 토큰 사용량 추정
 */
export function calculateTotalTokens(messages: TranscriptMessage[]): number {
  return messages.reduce((sum, msg) => {
    let tokens = 0;

    // 메시지 내용
    if (typeof msg.content === 'string') {
      tokens += estimateTokens(msg.content);
    }

    // 도구 입력
    if (msg.tool_input) {
      tokens += estimateTokens(JSON.stringify(msg.tool_input));
    }

    // 도구 결과
    if (msg.tool_result) {
      tokens += estimateTokens(
        typeof msg.tool_result === 'string'
          ? msg.tool_result
          : JSON.stringify(msg.tool_result)
      );
    }

    return sum + tokens;
  }, 0);
}

/**
 * Transcript에서 마지막 Todo 상태 추출
 */
export function extractTodoProgress(messages: TranscriptMessage[]): {
  completed: number;
  inProgress: number;
  pending: number;
  total: number;
} {
  // TodoWrite 도구 호출 찾기 (역순으로)
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.tool_name === 'TodoWrite' && msg.tool_input) {
      const input = msg.tool_input as { todos?: TodoItem[] };
      if (input.todos && Array.isArray(input.todos)) {
        const todos = input.todos;
        return {
          completed: todos.filter((t) => t.status === 'completed').length,
          inProgress: todos.filter((t) => t.status === 'in_progress').length,
          pending: todos.filter((t) => t.status === 'pending').length,
          total: todos.length,
        };
      }
    }
  }

  return { completed: 0, inProgress: 0, pending: 0, total: 0 };
}

/**
 * 컨텍스트 사용률 계산
 */
export function calculateContextUsage(
  messages: TranscriptMessage[],
  maxTokens: number
): number {
  const usedTokens = calculateTotalTokens(messages);
  return Math.min((usedTokens / maxTokens) * 100, 100);
}
