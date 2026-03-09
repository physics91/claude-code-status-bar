import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { clearGitCache, getGitInfo } from '../../src/utils/git.js';
import { clearGitAsyncCache, getGitInfoAsync } from '../../src/utils/git-async.js';

function run(command: string, cwd: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore'],
  }).trim();
}

function createRepo(prefix: string, branchName: string): string {
  const repoDir = mkdtempSync(join(tmpdir(), prefix));
  run('git init', repoDir);
  run('git config user.email test@example.com', repoDir);
  run('git config user.name "Test User"', repoDir);
  writeFileSync(join(repoDir, 'file.txt'), 'base\n');
  run('git add file.txt', repoDir);
  run('git commit -m init', repoDir);
  run(`git branch -m ${branchName}`, repoDir);
  return repoDir;
}

describe.sequential('git helpers', () => {
  const tempPaths: string[] = [];

  afterEach(() => {
    clearGitCache();
    clearGitAsyncCache();

    for (const tempPath of tempPaths.splice(0)) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  });

  it('shows detached HEAD as a valid git branch label', () => {
    const repoDir = createRepo('claude-status-bar-detached-', 'main');
    tempPaths.push(repoDir);

    const commit = run('git rev-parse HEAD', repoDir);
    run(`git checkout --detach ${commit}`, repoDir);

    const gitInfo = getGitInfo(repoDir);

    expect(gitInfo.branch).toMatch(/^detached@/);
  });

  it('deduplicates files changed across staged and unstaged diffs', async () => {
    const repoDir = createRepo('claude-status-bar-files-', 'main');
    tempPaths.push(repoDir);

    writeFileSync(join(repoDir, 'file.txt'), 'base\nstaged\n');
    run('git add file.txt', repoDir);
    writeFileSync(join(repoDir, 'file.txt'), 'base\nstaged\nunstaged\n');

    const gitInfo = await getGitInfoAsync(repoDir);

    expect(gitInfo.filesChanged).toBe(1);
    expect(gitInfo.linesAdded).toBe(2);
  });

  it('keeps sync cache isolated per working directory', () => {
    const repoA = createRepo('claude-status-bar-repo-a-', 'repo-a');
    const repoB = createRepo('claude-status-bar-repo-b-', 'repo-b');
    tempPaths.push(repoA, repoB);

    const first = getGitInfo(repoA);
    const second = getGitInfo(repoB);

    expect(first.branch).toBe('repo-a');
    expect(second.branch).toBe('repo-b');
  });
});
