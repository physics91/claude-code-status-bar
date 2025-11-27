import { execSync } from 'child_process';

interface GitInfo {
  branch: string | null;
  isDirty: boolean;
  linesAdded: number;
  linesRemoved: number;
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
    let linesAdded = 0;
    let linesRemoved = 0;
    try {
      const status = execSync('git status --porcelain', options).trim();
      isDirty = status.length > 0;

      // git diff --numstat로 추가/삭제 라인 수 가져오기 (staged + unstaged)
      if (isDirty) {
        // unstaged changes
        const diffUnstaged = execSync('git diff --numstat', options).trim();
        // staged changes
        const diffStaged = execSync('git diff --cached --numstat', options).trim();

        const parseDiff = (diff: string) => {
          if (!diff) return { added: 0, removed: 0 };
          let added = 0, removed = 0;
          for (const line of diff.split('\n')) {
            const parts = line.split('\t');
            if (parts.length >= 2) {
              const a = parseInt(parts[0], 10);
              const r = parseInt(parts[1], 10);
              if (!isNaN(a)) added += a;
              if (!isNaN(r)) removed += r;
            }
          }
          return { added, removed };
        };

        const unstaged = parseDiff(diffUnstaged);
        const staged = parseDiff(diffStaged);
        linesAdded = unstaged.added + staged.added;
        linesRemoved = unstaged.removed + staged.removed;
      }
    } catch {
      // ignore
    }

    const result: GitInfo = { branch: branch || null, isDirty, linesAdded, linesRemoved };
    gitCache = { value: result, expires: now + CACHE_TTL };
    return result;
  } catch {
    const result: GitInfo = { branch: null, isDirty: false, linesAdded: 0, linesRemoved: 0 };
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
