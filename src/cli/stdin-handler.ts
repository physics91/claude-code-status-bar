import { ClaudeInputSchema, type ClaudeInputData } from '../types/claude-input.js';

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
      return null;
    }

    const parsed = JSON.parse(raw);
    const validated = ClaudeInputSchema.parse(parsed);

    return validated;
  } catch (error) {
    // 파싱 실패 시 에러 출력하지 않음 (status bar가 깨지지 않도록)
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
