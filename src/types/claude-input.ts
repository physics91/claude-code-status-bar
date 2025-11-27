import { z } from 'zod';

/**
 * Claude Code stdin JSON 스키마
 * /statusline 명령이 전달하는 데이터 구조
 */
export const ClaudeInputSchema = z.object({
  session_id: z.string(),
  transcript_path: z.string(),
  model: z.object({
    id: z.string(),
    display_name: z.string(),
  }),
  workspace: z.object({
    current_dir: z.string(),
    project_dir: z.string(),
  }),
  cost: z.object({
    api_cost: z.number().optional(),
    duration_ms: z.number().optional(),
    lines_added: z.number().optional(),
    lines_removed: z.number().optional(),
  }).optional(),
  version: z.string().optional(),
  cwd: z.string(),
});

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
