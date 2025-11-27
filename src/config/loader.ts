import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { AppConfigSchema, type AppConfigType } from './schema.js';
import { defaultConfig } from './defaults.js';

/**
 * 설정 파일 검색 경로
 */
function getConfigPaths(): string[] {
  const home = homedir();
  return [
    join(process.cwd(), '.claude-status-bar.json'),
    join(home, '.claude-status-bar', 'config.json'),
    join(home, '.config', 'claude-status-bar', 'config.json'),
  ];
}

/**
 * 기본 설정 파일 경로 (저장용)
 */
export function getDefaultConfigPath(): string {
  const home = homedir();
  return join(home, '.claude-status-bar', 'config.json');
}

/**
 * 설정 로드
 */
export function loadConfig(): AppConfigType {
  for (const configPath of getConfigPaths()) {
    if (existsSync(configPath)) {
      try {
        const raw = readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(raw);
        const validated = AppConfigSchema.parse(parsed);
        return validated;
      } catch (error) {
        console.error(`Error loading config from ${configPath}:`, error);
      }
    }
  }

  // 설정 파일이 없으면 기본값 반환
  return defaultConfig;
}

/**
 * 설정 저장
 */
export function saveConfig(config: AppConfigType, path?: string): void {
  const configPath = path || getDefaultConfigPath();
  const dir = dirname(configPath);

  // 디렉토리 생성
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // 설정 저장
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 설정 파일 존재 여부 확인
 */
export function configExists(): boolean {
  return getConfigPaths().some((path) => existsSync(path));
}
