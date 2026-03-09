import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { defaultConfig } from '../../src/config/defaults.js';
import {
  loadConfigWithSource,
  saveConfig,
} from '../../src/config/loader.js';

describe.sequential('config loader', () => {
  const originalCwd = process.cwd();
  const originalHome = process.env.HOME;
  const tempPaths: string[] = [];

  afterEach(() => {
    process.chdir(originalCwd);

    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    for (const tempPath of tempPaths.splice(0)) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  });

  it('prefers project-local config and reports its source path', () => {
    const root = mkdtempSync(join(tmpdir(), 'claude-status-bar-config-'));
    const projectDir = join(root, 'project');
    const homeDir = join(root, 'home');
    tempPaths.push(root);

    mkdirSync(projectDir, { recursive: true });
    mkdirSync(join(homeDir, '.claude-status-bar'), { recursive: true });

    writeFileSync(
      join(projectDir, '.claude-status-bar.json'),
      JSON.stringify({
        ...defaultConfig,
        theme: 'minimal',
        locale: 'en',
      })
    );
    writeFileSync(
      join(homeDir, '.claude-status-bar', 'config.json'),
      JSON.stringify({
        ...defaultConfig,
        theme: 'powerline-light',
      })
    );

    process.env.HOME = homeDir;
    process.chdir(projectDir);

    const result = loadConfigWithSource();

    expect(result.config.theme).toBe('minimal');
    expect(result.sourcePath).toBe(join(projectDir, '.claude-status-bar.json'));
  });

  it('validates and persists a complete config shape on save', () => {
    const root = mkdtempSync(join(tmpdir(), 'claude-status-bar-save-'));
    const outputPath = join(root, 'config.json');
    tempPaths.push(root);

    saveConfig(defaultConfig, outputPath);

    const saved = JSON.parse(readFileSync(outputPath, 'utf-8'));
    expect(saved.locale).toBe('auto');
    expect(saved.widgets.usage).toEqual({ enabled: false, order: 5 });
    expect(saved.widgets.memory).toEqual({ enabled: false, order: 9 });
    expect(saved.widgets.files).toEqual({ enabled: false, order: 10 });
    expect(saved.behavior.usageRefreshMs).toBe(60_000);
  });
});
