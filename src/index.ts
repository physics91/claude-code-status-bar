import { program } from 'commander';
import { parseClaudeInput, createMockClaudeInput } from './cli/stdin-handler.js';
import { renderApp } from './app.js';
import { loadConfig, saveConfig, configExists, defaultConfig } from './config/index.js';
import { getAvailableThemes } from './themes/index.js';
import { registerBuiltinWidgets, widgetRegistry } from './widgets/index.js';
import { runConfigTUI } from './tui/index.js';
import { initI18n, t } from './i18n/index.js';
import { getWidgetName, getWidgetDescription } from './widgets/types.js';

// 패키지 정보
const VERSION = '1.2.1';
const NAME = 'claude-status-bar';

// i18n 초기화 (설정에서 로케일 로드)
const config = loadConfig();
initI18n(config.locale);

program
  .name(NAME)
  .description(t('description'))
  .version(VERSION);

// 기본 명령: Status Bar 렌더링
program
  .command('render', { isDefault: true })
  .description(t('commands.render.description'))
  .option('--demo', t('commands.render.demo'))
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
      console.error(t('messages.error'), error);
      process.exit(1);
    }
  });

// config 명령: 설정 관리
program
  .command('config')
  .description(t('commands.config.description'))
  .option('--show', t('commands.config.show'))
  .option('--reset', t('commands.config.reset'))
  .option('--theme <theme>', t('commands.config.theme'))
  .action(async (options) => {
    const currentConfig = loadConfig();

    if (options.show) {
      console.log(JSON.stringify(currentConfig, null, 2));
      return;
    }

    if (options.reset) {
      saveConfig(defaultConfig);
      console.log(t('messages.configReset'));
      return;
    }

    if (options.theme) {
      const themes = getAvailableThemes();
      const themeIds = themes.map((theme) => theme.id);

      if (!themeIds.includes(options.theme)) {
        console.error(
          t('messages.invalidTheme', {
            theme: options.theme,
            available: themeIds.join(', '),
          })
        );
        process.exit(1);
      }

      currentConfig.theme = options.theme;
      saveConfig(currentConfig);
      console.log(t('messages.themeSet', { theme: options.theme }));
      return;
    }

    // 옵션 없이 실행하면 TUI 실행
    await runConfigTUI();
  });

// themes 명령: 테마 목록
program
  .command('themes')
  .description(t('commands.themes.description'))
  .action(() => {
    const themes = getAvailableThemes();
    const currentConfig = loadConfig();

    console.log(t('messages.availableThemes') + '\n');
    for (const theme of themes) {
      const current = theme.id === currentConfig.theme ? ` ${t('messages.current')}` : '';
      console.log(`  ${theme.id}${current}`);
      console.log(`    ${theme.name}`);
    }
  });

// widgets 명령: 위젯 목록
program
  .command('widgets')
  .description(t('commands.widgets.description'))
  .action(() => {
    registerBuiltinWidgets();
    const widgets = widgetRegistry.getAll();
    const currentConfig = loadConfig();

    console.log(t('messages.availableWidgets') + '\n');
    for (const widget of widgets) {
      const enabled = currentConfig.widgets[widget.id]?.enabled ?? widget.defaultEnabled;
      const status = enabled ? '[x]' : '[ ]';
      console.log(`  ${status} ${widget.id}`);
      console.log(`      ${getWidgetDescription(widget)}`);
    }
  });

// 프로그램 실행
program.parse();
