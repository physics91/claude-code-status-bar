import { getTheme } from './themes/index.js';
import { widgetRegistry, registerBuiltinWidgets } from './widgets/index.js';
import { loadConfig } from './config/loader.js';
import { renderStatusBar } from './core/renderer.js';
import type { ClaudeInputData } from './types/claude-input.js';

/**
 * Status Bar 렌더링 및 출력
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

  // Status Bar 렌더링
  const output = renderStatusBar(data, theme, widgets, config.widgets);

  // stdout에 출력
  console.log(output);
}

/**
 * 텍스트 출력 (간단한 버전)
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
