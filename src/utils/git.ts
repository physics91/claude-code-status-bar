import { execSync, type ExecSyncOptionsWithStringEncoding } from 'child_process';
import { createCache } from './cache.js';

interface ParsedDiffStats {
  added: number;
  removed: number;
  files: Set<string>;
}

interface GitInfo {
  branch: string | null;
  isDirty: boolean;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
}

// 캐시 (5초 TTL)
const gitCache = createCache<GitInfo>({ ttl: 5000, maxSize: 5 });

function parseDiffStats(diff: string): ParsedDiffStats {
  if (!diff) {
    return {
      added: 0,
      removed: 0,
      files: new Set<string>(),
    };
  }

  let added = 0;
  let removed = 0;
  const files = new Set<string>();

  for (const line of diff.split('\n')) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const [addedRaw, removedRaw, filePath] = parts;
      const parsedAdded = parseInt(addedRaw, 10);
      const parsedRemoved = parseInt(removedRaw, 10);

      if (!isNaN(parsedAdded)) {
        added += parsedAdded;
      }
      if (!isNaN(parsedRemoved)) {
        removed += parsedRemoved;
      }
      files.add(filePath);
    }
  }

  return { added, removed, files };
}

function getBranchLabel(branchRef: string, shortSha: string): string | null {
  if (!branchRef) {
    return null;
  }

  if (branchRef === 'HEAD') {
    return shortSha ? `detached@${shortSha}` : 'detached';
  }

  return branchRef;
}

/**
 * Git 브랜치명 가져오기 (캐싱 적용)
 */
export function getGitInfo(cwd?: string): GitInfo {
  const workDir = cwd || process.cwd();

  // 캐시 확인
  const cached = gitCache.get(workDir);
  if (cached) {
    return cached;
  }

  try {
    const options: ExecSyncOptionsWithStringEncoding = {
      encoding: 'utf8',
      timeout: 500,
      stdio: ['pipe', 'pipe', 'ignore'],
      cwd: workDir,
    };

    // 브랜치명 가져오기
    const branchRef = execSync('git rev-parse --abbrev-ref HEAD', options).trim();
    const shortSha = branchRef ? execSync('git rev-parse --short HEAD', options).trim() : '';
    const branch = getBranchLabel(branchRef, shortSha);

    // 변경사항 확인
    let isDirty = false;
    let linesAdded = 0;
    let linesRemoved = 0;
    let filesChanged = 0;
    try {
      const status = execSync('git status --porcelain', options).trim();
      isDirty = status.length > 0;

      // git diff --numstat로 추가/삭제 라인 수 가져오기 (staged + unstaged)
      if (isDirty) {
        // unstaged changes
        const diffUnstaged = execSync('git diff --numstat', options).trim();
        // staged changes
        const diffStaged = execSync('git diff --cached --numstat', options).trim();

        const unstaged = parseDiffStats(diffUnstaged);
        const staged = parseDiffStats(diffStaged);
        linesAdded = unstaged.added + staged.added;
        linesRemoved = unstaged.removed + staged.removed;
        filesChanged = new Set([...unstaged.files, ...staged.files]).size;
      }
    } catch {
      // ignore
    }

    const result: GitInfo = { branch: branch || null, isDirty, linesAdded, linesRemoved, filesChanged };
    gitCache.set(workDir, result);
    return result;
  } catch {
    const result: GitInfo = { branch: null, isDirty: false, linesAdded: 0, linesRemoved: 0, filesChanged: 0 };
    gitCache.set(workDir, result);
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
  gitCache.clear();
}
