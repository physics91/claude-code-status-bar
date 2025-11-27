import type { FC } from 'react';
import type { z } from 'zod';
import type { ClaudeInputData } from '../types/claude-input.js';
import type { Theme } from '../themes/types.js';
import type { WidgetConfig } from '../types/state.js';

/**
 * 위젯 렌더링에 전달되는 Props
 */
export interface WidgetProps {
  data: ClaudeInputData;
  config: WidgetConfig;
  theme: Theme;
  isFirst?: boolean;
  isLast?: boolean;
  nextColor?: string;
}

/**
 * 위젯 렌더링 결과
 */
export interface WidgetRenderResult {
  content: string;
  icon?: string;
  style?: 'normal' | 'warning' | 'error' | 'success';
}

/**
 * 위젯 정의
 */
export interface WidgetDefinition {
  /** 고유 식별자 */
  id: string;

  /** 표시 이름 */
  name: string;

  /** 위젯 설명 */
  description: string;

  /** 기본 활성화 여부 */
  defaultEnabled: boolean;

  /** 기본 순서 (낮을수록 왼쪽) */
  defaultOrder: number;

  /** 세그먼트 색상 키 */
  colorKey: keyof Theme['colors']['segments'];

  /** React 컴포넌트 */
  Component: FC<WidgetProps>;

  /** 옵션 스키마 (선택) */
  optionsSchema?: z.ZodSchema;
}

/**
 * 위젯 레지스트리 인터페이스
 */
export interface IWidgetRegistry {
  register(widget: WidgetDefinition): void;
  get(id: string): WidgetDefinition | undefined;
  getAll(): WidgetDefinition[];
  getEnabled(widgetConfigs: Record<string, WidgetConfig>): WidgetDefinition[];
}
