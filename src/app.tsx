import { getTheme } from './themes/index.js';
import { widgetRegistry, registerBuiltinWidgets } from './widgets/index.js';
import { loadConfig } from './config/loader.js';
import { renderStatusBar } from './core/renderer.js';
import { renderStatusBarAsync } from './core/async-renderer.js';
import type { ClaudeInputData } from './types/claude-input.js';

/**
 * Status Bar 렌더링 및 출력 (비동기 버전)
 * 비동기 렌더러를 사용하여 Git 작업을 병렬로 수행합니다.
 */
export async function renderApp(data: ClaudeInputData): Promise<void> {
  // 위젯 등록
  registerBuiltinWidgets();

  // 설정 로드
  const config = loadConfig();

  // 테마 가져오기
  const theme = getTheme(config.theme);

  // 위젯 목록 가져오기
  const widgets = widgetRegistry.getAll();

  // Status Bar 비동기 렌더링
  const output = await renderStatusBarAsync(data, theme, widgets, config.widgets);

  // stdout에 출력
  console.log(output);
}

/**
 * Status Bar 렌더링 (동기 버전 - 폴백용)
 */
export function renderAppSync(data: ClaudeInputData): void {
  registerBuiltinWidgets();
  const config = loadConfig();
  const theme = getTheme(config.theme);
  const widgets = widgetRegistry.getAll();
  const output = renderStatusBar(data, theme, widgets, config.widgets);
  console.log(output);
}

/**
 * 텍스트 출력 (간단한 버전, 동기)
 */
export function renderText(data: ClaudeInputData): string {
  // 위젯 등록
  registerBuiltinWidgets();

  // 설정 로드
  const config = loadConfig();
  const theme = getTheme(config.theme);
  const widgets = widgetRegistry.getAll();

  return renderStatusBar(data, theme, widgets, config.widgets);
}

/**
 * 텍스트 출력 (비동기 버전)
 */
export async function renderTextAsync(data: ClaudeInputData): Promise<string> {
  registerBuiltinWidgets();
  const config = loadConfig();
  const theme = getTheme(config.theme);
  const widgets = widgetRegistry.getAll();

  return renderStatusBarAsync(data, theme, widgets, config.widgets);
}
