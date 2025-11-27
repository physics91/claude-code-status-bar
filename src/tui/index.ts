import React from 'react';
import { render } from 'ink';
import { ConfigApp } from './ConfigApp.js';

/**
 * TUI 설정 화면 실행
 */
export async function runConfigTUI(): Promise<void> {
  const { waitUntilExit } = render(React.createElement(ConfigApp));
  await waitUntilExit();
}

export { ConfigApp } from './ConfigApp.js';
