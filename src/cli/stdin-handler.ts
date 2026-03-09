import { ClaudeInputSchema, type ClaudeInputData } from '../types/claude-input.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { homedir } from 'os';

export type ClaudeInputParseResult =
  | { status: 'empty' }
  | { status: 'ok'; data: ClaudeInputData }
  | { status: 'invalid'; error: Error };

/**
 * stdin에서 JSON 데이터 읽기
 */
export async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';

    // stdin이 TTY인 경우 (대화형 모드)
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      resolve(data.trim());
    });

    process.stdin.on('error', (error) => {
      reject(error);
    });

    // 타임아웃 설정 (5초)
    setTimeout(() => {
      if (data.length === 0) {
        resolve('');
      }
    }, 5000);
  });
}

/**
 * stdin에서 Claude Code JSON 데이터 파싱
 */
function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function parseClaudeInputRaw(raw: string): ClaudeInputParseResult {
  try {
    const normalized = raw.trim();

    if (!normalized) {
      return { status: 'empty' };
    }

    const parsed = JSON.parse(normalized);
    const validated = ClaudeInputSchema.parse(parsed);
    return {
      status: 'ok',
      data: validated,
    };
  } catch (error) {
    return {
      status: 'invalid',
      error: toError(error),
    };
  }
}

export function writeDebugInput(data: ClaudeInputData): void {
  if (process.env.DEBUG_STATUSLINE !== '1') {
    return;
  }

  try {
    const logPath = join(homedir(), '.claude', 'statusline-debug.json');
    mkdirSync(dirname(logPath), { recursive: true });
    writeFileSync(logPath, JSON.stringify(data, null, 2));
  } catch {
    // 로그 저장 실패 무시
  }
}

export async function parseClaudeInput(): Promise<ClaudeInputParseResult> {
  const raw = await readStdin();

  if (process.env.DEBUG_STATUSLINE) {
    if (!raw) {
      console.error('[statusline] No stdin data received');
    } else {
      console.error('[statusline] Raw input:', raw.substring(0, 500));
    }
  }

  const result = parseClaudeInputRaw(raw);

  if (process.env.DEBUG_STATUSLINE) {
    if (result.status === 'ok') {
      console.error('[statusline] Parsed keys:', Object.keys(result.data));
    } else if (result.status === 'invalid') {
      console.error('[statusline] Parse error:', result.error);
    }
  }

  if (result.status === 'ok') {
    writeDebugInput(result.data);
  }

  return result;
}

/**
 * 모의 데이터 생성 (테스트/개발용)
 */
export function createMockClaudeInput(): ClaudeInputData {
  return {
    session_id: 'mock-session-123',
    transcript_path: '',
    model: {
      id: 'claude-sonnet-4-20250514',
      display_name: 'Claude Sonnet 4',
    },
    workspace: {
      current_dir: process.cwd(),
      project_dir: process.cwd(),
    },
    cost: {
      api_cost: 0.0523,
      duration_ms: 125000,
    },
    version: '1.0.0',
    cwd: process.cwd(),
  };
}
