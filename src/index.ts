import { program } from 'commander';
import { parseClaudeInput, createMockClaudeInput } from './cli/stdin-handler.js';
import { renderApp } from './app.js';
import { loadConfig, saveConfig, configExists, defaultConfig } from './config/index.js';
import { getAvailableThemes } from './themes/index.js';
import { registerBuiltinWidgets, widgetRegistry } from './widgets/index.js';
import { runConfigTUI } from './tui/index.js';

// 패키지 정보
const VERSION = '1.0.0';
const NAME = 'claude-status-bar';

program
  .name(NAME)
  .description('Powerline-style status bar for Claude Code CLI')
  .version(VERSION);

// 기본 명령: Status Bar 렌더링
program
  .command('render', { isDefault: true })
  .description('Render the status bar (reads JSON from stdin)')
  .option('--demo', 'Use demo data instead of stdin')
  .action(async (options) => {
    try {
      let data;

      if (options.demo) {
        data = createMockClaudeInput();
      } else {
        data = await parseClaudeInput();
      }

      if (!data) {
        // stdin이 없으면 데모 모드로 실행
        data = createMockClaudeInput();
      }

      await renderApp(data);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

// config 명령: 설정 관리
program
  .command('config')
  .description('Manage configuration (opens interactive TUI by default)')
  .option('--show', 'Show current configuration as JSON')
  .option('--reset', 'Reset to default configuration')
  .option('--theme <theme>', 'Set theme')
  .action(async (options) => {
    const config = loadConfig();

    if (options.show) {
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    if (options.reset) {
      saveConfig(defaultConfig);
      console.log('Configuration reset to defaults.');
      return;
    }

    if (options.theme) {
      const themes = getAvailableThemes();
      const themeIds = themes.map((t) => t.id);

      if (!themeIds.includes(options.theme)) {
        console.error(
          `Invalid theme: ${options.theme}. Available: ${themeIds.join(', ')}`
        );
        process.exit(1);
      }

      config.theme = options.theme;
      saveConfig(config);
      console.log(`Theme set to: ${options.theme}`);
      return;
    }

    // 옵션 없이 실행하면 TUI 실행
    await runConfigTUI();
  });

// themes 명령: 테마 목록
program
  .command('themes')
  .description('List available themes')
  .action(() => {
    const themes = getAvailableThemes();
    const config = loadConfig();

    console.log('Available themes:\n');
    for (const theme of themes) {
      const current = theme.id === config.theme ? ' (current)' : '';
      console.log(`  ${theme.id}${current}`);
      console.log(`    ${theme.name}`);
    }
  });

// widgets 명령: 위젯 목록
program
  .command('widgets')
  .description('List available widgets')
  .action(() => {
    registerBuiltinWidgets();
    const widgets = widgetRegistry.getAll();
    const config = loadConfig();

    console.log('Available widgets:\n');
    for (const widget of widgets) {
      const enabled = config.widgets[widget.id]?.enabled ?? widget.defaultEnabled;
      const status = enabled ? '[x]' : '[ ]';
      console.log(`  ${status} ${widget.id}`);
      console.log(`      ${widget.description}`);
    }
  });

// 프로그램 실행
program.parse();
