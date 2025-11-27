/**
 * 비동기 명령어 실행 유틸리티
 * execSync 대신 비동기 실행을 위한 래퍼 함수들을 제공합니다.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export interface ExecOptions {
  /** 작업 디렉토리 */
  cwd?: string;
  /** 타임아웃 (밀리초) */
  timeout?: number;
  /** 인코딩 */
  encoding?: BufferEncoding;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
}

/**
 * 비동기로 명령어 실행
 * @param command 실행할 명령어
 * @param options 실행 옵션
 * @returns stdout 문자열
 */
export async function executeAsync(
  command: string,
  options?: ExecOptions
): Promise<string> {
  const { cwd, timeout = 500, encoding = 'utf8' } = options ?? {};

  try {
    const result = await execPromise(command, {
      cwd: cwd || process.cwd(),
      timeout,
      encoding,
      windowsHide: true,
    });
    return result.stdout.trim();
  } catch (error) {
    // 타임아웃 또는 에러 시 빈 문자열 반환
    return '';
  }
}

/**
 * 여러 명령어를 병렬로 실행
 * @param commands 실행할 명령어 배열
 * @param options 실행 옵션
 * @returns 각 명령어의 stdout 배열
 */
export async function batchExecute(
  commands: string[],
  options?: ExecOptions
): Promise<string[]> {
  const results = await Promise.allSettled(
    commands.map(cmd => executeAsync(cmd, options))
  );

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : ''
  );
}

/**
 * 비동기 함수 실행 with fallback
 * 에러 발생 시 기본값 반환
 * @param asyncFn 실행할 비동기 함수
 * @param fallback 에러 시 반환할 기본값
 */
export async function executeWithFallback<T>(
  asyncFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    return await asyncFn();
  } catch {
    return fallback;
  }
}

/**
 * 비동기 함수 실행 with 타임아웃
 * @param asyncFn 실행할 비동기 함수
 * @param timeout 타임아웃 (밀리초)
 * @param fallback 타임아웃 시 반환할 기본값
 */
export async function executeWithTimeout<T>(
  asyncFn: () => Promise<T>,
  timeout: number,
  fallback: T
): Promise<T> {
  return Promise.race([
    asyncFn(),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeout);
    }),
  ]);
}

/**
 * 중복 요청 방지 래퍼
 * 동일한 키에 대해 진행 중인 요청이 있으면 해당 Promise를 재사용
 */
export class DedupedExecutor<T> {
  private pending = new Map<string, Promise<T>>();

  async execute(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // 진행 중인 요청이 있으면 재사용
    const existing = this.pending.get(key);
    if (existing) {
      return existing;
    }

    // 새 요청 시작
    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * 진행 중인 요청 수 반환
   */
  get pendingCount(): number {
    return this.pending.size;
  }
}
