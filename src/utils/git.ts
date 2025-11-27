import { execSync } from 'child_process';

interface GitInfo {
  branch: string | null;
  isDirty: boolean;
}

// 캐시 (5초 TTL)
let gitCache: { value: GitInfo; expires: number } | null = null;
const CACHE_TTL = 5000;

/**
 * Git 브랜치명 가져오기 (캐싱 적용)
 */
export function getGitInfo(cwd?: string): GitInfo {
  const now = Date.now();

  // 캐시 확인
  if (gitCache && gitCache.expires > now) {
    return gitCache.value;
  }

  try {
    const options = {
      encoding: 'utf8' as const,
      timeout: 500,
      stdio: ['pipe', 'pipe', 'ignore'] as const,
      cwd: cwd || process.cwd(),
    };

    // 브랜치명 가져오기
    const branch = execSync('git branch --show-current', options).trim();

    // 변경사항 확인
    let isDirty = false;
    try {
      const status = execSync('git status --porcelain', options).trim();
      isDirty = status.length > 0;
    } catch {
      // ignore
    }

    const result: GitInfo = { branch: branch || null, isDirty };
    gitCache = { value: result, expires: now + CACHE_TTL };
    return result;
  } catch {
    const result: GitInfo = { branch: null, isDirty: false };
    gitCache = { value: result, expires: now + CACHE_TTL };
    return result;
  }
}

/**
 * Git 저장소 여부 확인
 */
export function isGitRepo(cwd?: string): boolean {
  try {
    execSync('git rev-parse --git-dir', {
      encoding: 'utf8',
      timeout: 200,
      stdio: ['pipe', 'pipe', 'ignore'],
      cwd: cwd || process.cwd(),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 캐시 초기화
 */
export function clearGitCache(): void {
  gitCache = null;
}
