import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  parseClaudeInputRaw,
  writeDebugInput,
} from '../../src/cli/stdin-handler.js';

describe.sequential('stdin handler', () => {
  const originalHome = process.env.HOME;
  const originalDebug = process.env.DEBUG_STATUSLINE;
  const tempPaths: string[] = [];

  afterEach(() => {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }

    if (originalDebug === undefined) {
      delete process.env.DEBUG_STATUSLINE;
    } else {
      process.env.DEBUG_STATUSLINE = originalDebug;
    }

    for (const tempPath of tempPaths.splice(0)) {
      rmSync(tempPath, { recursive: true, force: true });
    }
  });

  it('returns empty for blank input', () => {
    expect(parseClaudeInputRaw('   ')).toEqual({ status: 'empty' });
  });

  it('returns invalid for malformed input instead of demo data', () => {
    const result = parseClaudeInputRaw('{invalid json');

    expect(result.status).toBe('invalid');
  });

  it('parses valid Claude input payloads', () => {
    const result = parseClaudeInputRaw(
      JSON.stringify({
        cwd: '/tmp/project',
        model: { id: 'claude-sonnet-4-20250514' },
      })
    );

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.data.cwd).toBe('/tmp/project');
      expect(result.data.model?.id).toBe('claude-sonnet-4-20250514');
    }
  });

  it('writes debug input only when DEBUG_STATUSLINE=1', () => {
    const homeDir = mkdtempSync(join(tmpdir(), 'claude-status-bar-debug-'));
    tempPaths.push(homeDir);
    process.env.HOME = homeDir;

    const logPath = join(homeDir, '.claude', 'statusline-debug.json');
    const payload = {
      cwd: '/tmp/project',
      model: { id: 'claude-sonnet-4-20250514', display_name: 'Claude Sonnet 4' },
    };

    delete process.env.DEBUG_STATUSLINE;
    writeDebugInput(payload);
    expect(existsSync(logPath)).toBe(false);

    process.env.DEBUG_STATUSLINE = '1';
    writeDebugInput(payload);

    expect(existsSync(logPath)).toBe(true);
    expect(JSON.parse(readFileSync(logPath, 'utf-8'))).toEqual(payload);
  });
});
