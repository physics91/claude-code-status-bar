import { z } from 'zod';

/**
 * 위젯 설정 스키마
 */
export const WidgetConfigSchema = z.object({
  enabled: z.boolean().default(true),
  order: z.number().int().min(0).default(0),
  options: z.record(z.unknown()).optional(),
});

/**
 * 동작 설정 스키마
 */
export const BehaviorConfigSchema = z.object({
  contextWarningThreshold: z.number().min(0).max(100).default(70),
  contextDangerThreshold: z.number().min(0).max(100).default(90),
});

/**
 * 앱 설정 스키마
 */
export const AppConfigSchema = z.object({
  version: z.literal(1).default(1),
  theme: z.string().default('powerline-dark'),
  locale: z.enum(['auto', 'en', 'ko']).default('auto'),
  widgets: z.record(WidgetConfigSchema).default({}),
  behavior: BehaviorConfigSchema.default({}),
});

export type WidgetConfigType = z.infer<typeof WidgetConfigSchema>;
export type BehaviorConfigType = z.infer<typeof BehaviorConfigSchema>;
export type AppConfigType = z.infer<typeof AppConfigSchema>;
