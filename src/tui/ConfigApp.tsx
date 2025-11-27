import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useTranslation } from 'react-i18next';
import { loadConfig, saveConfig } from '../config/loader.js';
import { getAvailableThemes, getTheme } from '../themes/index.js';
import { widgetRegistry, registerBuiltinWidgets } from '../widgets/index.js';
import { renderStatusBar } from '../core/renderer.js';
import { createMockClaudeInput } from '../cli/stdin-handler.js';
import { getWidgetName, getWidgetDescription } from '../widgets/types.js';
import type { AppConfigType } from '../config/schema.js';

type Tab = 'widgets' | 'themes';

export const ConfigApp: React.FC = () => {
  const { exit } = useApp();
  const { t } = useTranslation('tui');
  const [config, setConfig] = useState<AppConfigType>(loadConfig());
  const [activeTab, setActiveTab] = useState<Tab>('widgets');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saved, setSaved] = useState(false);

  // 위젯 등록
  registerBuiltinWidgets();
  const widgets = widgetRegistry.getAll();
  const themes = getAvailableThemes();

  // 현재 탭의 아이템 수
  const itemCount = activeTab === 'widgets' ? widgets.length : themes.length;

  // 키 입력 처리
  useInput((input, key) => {
    // 저장 메시지 초기화
    if (saved) setSaved(false);

    // 탭 전환
    if (key.tab || input === 'Tab') {
      setActiveTab(activeTab === 'widgets' ? 'themes' : 'widgets');
      setSelectedIndex(0);
      return;
    }

    // 위/아래 이동
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : itemCount - 1));
      return;
    }
    if (key.downArrow) {
      setSelectedIndex((prev) => (prev < itemCount - 1 ? prev + 1 : 0));
      return;
    }

    // 선택 (스페이스 또는 엔터)
    if (input === ' ' || key.return) {
      if (activeTab === 'widgets') {
        // 위젯 토글
        const widget = widgets[selectedIndex];
        const currentEnabled = config.widgets[widget.id]?.enabled ?? widget.defaultEnabled;
        const newWidgets = {
          ...config.widgets,
          [widget.id]: {
            ...config.widgets[widget.id],
            enabled: !currentEnabled,
            order: config.widgets[widget.id]?.order ?? widget.defaultOrder,
          },
        };
        setConfig({ ...config, widgets: newWidgets });
      } else {
        // 테마 선택
        const theme = themes[selectedIndex];
        setConfig({ ...config, theme: theme.id });
      }
      return;
    }

    // 저장
    if (input === 's' || input === 'S') {
      saveConfig(config);
      setSaved(true);
      return;
    }

    // 종료
    if (input === 'q' || input === 'Q' || key.escape) {
      exit();
      return;
    }
  });

  // 미리보기 생성
  const mockData = createMockClaudeInput();
  const theme = getTheme(config.theme);
  const preview = renderStatusBar(mockData, theme, widgets, config.widgets);

  return (
    <Box flexDirection="column" padding={1}>
      {/* 헤더 */}
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {t('header.title')}
        </Text>
      </Box>

      {/* 탭 */}
      <Box marginBottom={1}>
        <Text
          bold={activeTab === 'widgets'}
          color={activeTab === 'widgets' ? 'green' : 'gray'}
        >
          [{t('tabs.widgets')}]
        </Text>
        <Text> </Text>
        <Text
          bold={activeTab === 'themes'}
          color={activeTab === 'themes' ? 'green' : 'gray'}
        >
          [{t('tabs.themes')}]
        </Text>
      </Box>

      {/* 미리보기 */}
      <Box marginBottom={1} borderStyle="round" borderColor="gray" paddingX={1}>
        <Text>{preview}</Text>
      </Box>

      {/* 컨텐츠 */}
      <Box flexDirection="column" marginBottom={1}>
        {activeTab === 'widgets' ? (
          // 위젯 목록
          widgets.map((widget, index) => {
            const enabled = config.widgets[widget.id]?.enabled ?? widget.defaultEnabled;
            const isSelected = index === selectedIndex;
            const checkbox = enabled ? '[x]' : '[ ]';

            return (
              <Box key={widget.id}>
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                  inverse={isSelected}
                >
                  {' '}{checkbox} {getWidgetName(widget)}
                </Text>
                {isSelected && (
                  <Text color="gray"> - {getWidgetDescription(widget)}</Text>
                )}
              </Box>
            );
          })
        ) : (
          // 테마 목록
          themes.map((themeItem, index) => {
            const isCurrent = themeItem.id === config.theme;
            const isSelected = index === selectedIndex;
            const indicator = isCurrent ? '●' : '○';

            return (
              <Box key={themeItem.id}>
                <Text
                  color={isSelected ? 'cyan' : undefined}
                  bold={isSelected}
                  inverse={isSelected}
                >
                  {' '}{indicator} {themeItem.name}
                </Text>
                {isCurrent && <Text color="green"> {t('labels.current')}</Text>}
              </Box>
            );
          })
        )}
      </Box>

      {/* 푸터 */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Text color="gray">
          {t('footer.instructions')}
        </Text>
        {saved && <Text color="green"> | {t('footer.saved')}</Text>}
      </Box>
    </Box>
  );
};

export default ConfigApp;
