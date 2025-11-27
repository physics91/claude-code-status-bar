import { readFileSync, existsSync, statSync, openSync, readSync, closeSync } from 'fs';
import type { TodoItem, TranscriptMessage } from '../types/claude-input.js';

/**
 * JSONL 파일에서 각 라인을 파싱하여 메시지 추출
 */
interface TranscriptLine {
  type?: string;
  message?: {
    role?: string;
    content?: string | Array<{ type: string; text?: string; tool_use_id?: string; content?: string }>;
    usage?: TokenUsage;
  };
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: unknown;
}

/**
 * Claude API 토큰 사용량 정보
 */
interface TokenUsage {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Transcript 파일 파싱 (JSONL 형식 지원)
 */
export function parseTranscript(transcriptPath: string): TranscriptMessage[] {
  if (!existsSync(transcriptPath)) {
    return [];
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const messages: TranscriptMessage[] = [];

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
              // content가 배열인 경우 text 추출
              textContent = parsed.message.content
                .map(item => item.text || item.content || '')
                .join(' ');
            }
          }

          messages.push({
            type: parsed.type as 'user' | 'assistant',
            content: textContent,
          });
        }

        // tool_use 처리
        if (parsed.type === 'tool_use' || parsed.tool_name) {
          messages.push({
            type: 'tool_use',
            tool_name: parsed.tool_name,
            tool_input: parsed.tool_input,
          });
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

    return messages;
  } catch {
    return [];
  }
}

/**
 * 파일의 마지막 N 바이트만 읽기 (성능 최적화)
 */
function readLastBytes(filePath: string, bytes: number): string {
  try {
    const stats = statSync(filePath);
    const fileSize = stats.size;

    if (fileSize <= bytes) {
      return readFileSync(filePath, 'utf-8');
    }

    const fd = openSync(filePath, 'r');
    const buffer = Buffer.alloc(bytes);
    const startPos = fileSize - bytes;

    readSync(fd, buffer, 0, bytes, startPos);
    closeSync(fd);

    return buffer.toString('utf-8');
  } catch {
    return readFileSync(filePath, 'utf-8');
  }
}

/**
 * Transcript 파일에서 세션 총 토큰 소모량 추출 (전체 파일 읽기)
 */
export function extractActualTokenUsage(transcriptPath: string): {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalConsumed: number;  // 세션 총 소모 토큰
  contextTokens: number;  // 현재 컨텍스트 크기
} {
  const result = {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 0,
    totalConsumed: 0,
    contextTokens: 0,
  };

  if (!existsSync(transcriptPath)) {
    return result;
  }

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());

    let lastUsage: TokenUsage | null = null;

    // 모든 라인을 순회하며 토큰 합산
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);

        // assistant 메시지에서 usage 추출
        if (parsed.type === 'assistant' && parsed.message?.usage) {
          const usage = parsed.message.usage;
          lastUsage = usage;

          // 세션 총 소모 토큰 누적 (input + output + cache_creation)
          // cache_read는 이미 캐시된 것을 읽는 것이므로 "소모"에 포함하지 않음
          result.totalConsumed += (usage.input_tokens || 0) +
                                   (usage.output_tokens || 0) +
                                   (usage.cache_creation_input_tokens || 0);
          result.outputTokens += usage.output_tokens || 0;
        }
      } catch {
        // 개별 라인 파싱 실패 무시
      }
    }

    // 마지막 usage에서 현재 컨텍스트 크기 계산
    if (lastUsage) {
      result.inputTokens = lastUsage.input_tokens || 0;
      result.cacheCreationTokens = lastUsage.cache_creation_input_tokens || 0;
      result.cacheReadTokens = lastUsage.cache_read_input_tokens || 0;
      result.contextTokens = result.inputTokens + result.cacheCreationTokens + result.cacheReadTokens;
    }

    // totalTokens는 세션 총 소모 토큰으로 설정
    result.totalTokens = result.totalConsumed;

    return result;
  } catch {
    return result;
  }
}

/**
 * 토큰 수 추정 (대략적 계산) - fallback용
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
 * Transcript에서 총 토큰 사용량 계산 (실제 usage 우선, 없으면 추정)
 */
export function calculateTotalTokens(messages: TranscriptMessage[], transcriptPath?: string): number {
  // transcriptPath가 있으면 실제 usage 정보 사용
  if (transcriptPath) {
    const usage = extractActualTokenUsage(transcriptPath);
    if (usage.totalTokens > 0) {
      return usage.totalTokens;
    }
  }

  // fallback: 추정치 사용
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
