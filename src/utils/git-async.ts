/**
 * 비동기 Git 작업 유틸리티
 * execSync 대신 비동기 exec를 사용하여 4개의 git 명령어를 병렬로 실행합니다.
 */

import { createCache } from './cache.js';
import { batchExecute, DedupedExecutor } from './async-executor.js';

export interface GitInfo {
  branch: string | null;
  isDirty: boolean;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
}

// 캐시 (5초 TTL)
const gitCache = createCache<GitInfo>({ ttl: 5000, maxSize: 5 });

// 중복 요청 방지
const dedupedExecutor = new DedupedExecutor<GitInfo>();

/**
 * diff 출력 파싱
 */
function parseDiffStats(diff: string): { added: number; removed: number; files: number } {
  if (!diff) return { added: 0, removed: 0, files: 0 };

  let added = 0;
  let removed = 0;
  let files = 0;

  for (const line of diff.split('\n')) {
    const parts = line.split('\t');
    if (parts.length >= 3) {
      const a = parseInt(parts[0], 10);
      const r = parseInt(parts[1], 10);
      if (!isNaN(a)) added += a;
      if (!isNaN(r)) removed += r;
      files++;
    }
  }

  return { added, removed, files };
}

/**
 * 비동기로 Git 정보 가져오기
 * 4개의 git 명령어를 병렬로 실행하여 성능 향상
 */
async function fetchGitInfoAsync(cwd?: string): Promise<GitInfo> {
  const defaultResult: GitInfo = {
    branch: null,
    isDirty: false,
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
  };

  const workDir = cwd || process.cwd();
  const options = { cwd: workDir, timeout: 500 };

  // 4개의 git 명령어를 병렬로 실행
  const commands = [
    'git branch --show-current',
    'git status --porcelain',
    'git diff --numstat',
    'git diff --cached --numstat',
  ];

  const [branch, status, diffUnstaged, diffStaged] = await batchExecute(commands, options);

  // 브랜치가 없으면 git 저장소가 아님
  if (!branch) {
    return defaultResult;
  }

  const isDirty = status.length > 0;

  // diff 통계 파싱
  const unstaged = parseDiffStats(diffUnstaged);
  const staged = parseDiffStats(diffStaged);

  return {
    branch: branch || null,
    isDirty,
    linesAdded: unstaged.added + staged.added,
    linesRemoved: unstaged.removed + staged.removed,
    filesChanged: unstaged.files + staged.files,
  };
}

/**
 * 비동기로 Git 정보 가져오기 (캐싱 + 중복 요청 방지 적용)
 */
export async function getGitInfoAsync(cwd?: string): Promise<GitInfo> {
  const workDir = cwd || process.cwd();
  const cacheKey = workDir;

  // 캐시 확인
  const cached = gitCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // 중복 요청 방지하면서 비동기 실행
  const result = await dedupedExecutor.execute(cacheKey, () => fetchGitInfoAsync(cwd));

  // 캐시에 저장
  gitCache.set(cacheKey, result);

  return result;
}

/**
 * 동기 방식의 Git 정보 (캐시된 값 반환, 없으면 기본값)
 * 비동기 호출을 백그라운드에서 트리거하고 캐시된 값 또는 기본값 반환
 */
export function getGitInfoSync(cwd?: string): GitInfo {
  const workDir = cwd || process.cwd();

  // 캐시 확인
  const cached = gitCache.get(workDir);
  if (cached) {
    return cached;
  }

  // 백그라운드에서 비동기 갱신 트리거
  getGitInfoAsync(cwd).catch(() => {});

  // 기본값 반환
  return {
    branch: null,
    isDirty: false,
    linesAdded: 0,
    linesRemoved: 0,
    filesChanged: 0,
  };
}

/**
 * Git 캐시 초기화
 */
export function clearGitAsyncCache(): void {
  gitCache.clear();
}

/**
 * Git 저장소 여부 확인 (비동기)
 */
export async function isGitRepoAsync(cwd?: string): Promise<boolean> {
  const gitInfo = await getGitInfoAsync(cwd);
  return gitInfo.branch !== null;
}
