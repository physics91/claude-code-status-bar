import React from 'react';
import { render } from 'ink';
import { ConfigApp } from './ConfigApp.js';
import type { AppConfigType } from '../config/schema.js';

/**
 * TUI 설정 화면 실행
 */
export async function runConfigTUI(
  initialConfig: AppConfigType,
  configPath: string
): Promise<void> {
  const { waitUntilExit } = render(
    React.createElement(ConfigApp, {
      initialConfig,
      configPath,
    })
  );
  await waitUntilExit();
}

export { ConfigApp } from './ConfigApp.js';
