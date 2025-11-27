import { z } from 'zod';

/**
 * Claude Code stdin JSON 스키마
 * /statusline 명령이 전달하는 데이터 구조
 * 대부분의 필드를 optional로 설정하여 유연하게 처리
 */
export const ClaudeInputSchema = z.object({
  session_id: z.string().optional().default(''),
  transcript_path: z.string().optional().default(''),
  model: z.object({
    id: z.string().optional().default('unknown'),
    display_name: z.string().optional().default('Claude'),
  }).optional().default({ id: 'unknown', display_name: 'Claude' }),
  workspace: z.object({
    current_dir: z.string().optional().default(''),
    project_dir: z.string().optional().default(''),
  }).optional().default({ current_dir: '', project_dir: '' }),
  cost: z.object({
    // Claude Code 실제 필드명
    total_cost_usd: z.number().optional(),
    total_duration_ms: z.number().optional(),
    total_api_duration_ms: z.number().optional(),  // 실제 API 호출 시간
    total_lines_added: z.number().optional(),
    total_lines_removed: z.number().optional(),
    // 이전 버전 호환성
    api_cost: z.number().optional(),
    duration_ms: z.number().optional(),
    lines_added: z.number().optional(),
    lines_removed: z.number().optional(),
  }).optional(),
  version: z.string().optional(),
  cwd: z.string().optional().default(''),
  // Claude Code가 전달할 수 있는 추가 필드들 허용
}).passthrough();

export type ClaudeInputData = z.infer<typeof ClaudeInputSchema>;

/**
 * Transcript 메시지 타입
 */
export interface TranscriptMessage {
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result';
  content?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_result?: unknown;
  timestamp?: string;
}

/**
 * Todo 항목 타입
 */
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

/**
 * 모델별 최대 토큰 수
 */
export const MODEL_MAX_TOKENS: Record<string, number> = {
  'claude-opus-4-5-20251101': 200000,
  'claude-sonnet-4-5-20250929': 200000,
  'claude-sonnet-4-20250514': 200000,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-5-haiku-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-sonnet-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
};

export function getModelMaxTokens(modelId: string): number {
  // 정확한 매치 시도
  if (MODEL_MAX_TOKENS[modelId]) {
    return MODEL_MAX_TOKENS[modelId];
  }

  // 부분 매치 시도 (모델명에 포함된 경우)
  for (const [key, value] of Object.entries(MODEL_MAX_TOKENS)) {
    if (modelId.includes(key) || key.includes(modelId)) {
      return value;
    }
  }

  // 기본값
  return 200000;
}
