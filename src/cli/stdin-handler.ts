import { ClaudeInputSchema, type ClaudeInputData } from '../types/claude-input.js';
import { writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

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
export async function parseClaudeInput(): Promise<ClaudeInputData | null> {
  try {
    const raw = await readStdin();

    if (!raw) {
      // 디버그: stdin이 비어있음
      if (process.env.DEBUG_STATUSLINE) {
        console.error('[statusline] No stdin data received');
      }
      return null;
    }

    // 디버그: 받은 데이터 출력
    if (process.env.DEBUG_STATUSLINE) {
      console.error('[statusline] Raw input:', raw.substring(0, 500));
    }

    const parsed = JSON.parse(raw);

    // 디버그: 파싱된 데이터 출력
    if (process.env.DEBUG_STATUSLINE) {
      console.error('[statusline] Parsed keys:', Object.keys(parsed));
    }

    // 디버그: 파일로 저장 (Claude Code가 전달하는 실제 데이터 확인용)
    try {
      const logPath = join(homedir(), '.claude', 'statusline-debug.json');
      writeFileSync(logPath, JSON.stringify(parsed, null, 2));
    } catch {
      // 로그 저장 실패 무시
    }

    const validated = ClaudeInputSchema.parse(parsed);

    return validated;
  } catch (error) {
    // 디버그: 에러 출력
    if (process.env.DEBUG_STATUSLINE) {
      console.error('[statusline] Parse error:', error);
    }
    return null;
  }
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
