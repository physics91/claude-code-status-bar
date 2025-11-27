import type { WidgetDefinition, IWidgetRegistry } from './types.js';
import type { WidgetConfig } from '../types/state.js';

/**
 * 위젯 레지스트리
 * 모든 위젯을 등록하고 관리
 */
class WidgetRegistry implements IWidgetRegistry {
  private widgets = new Map<string, WidgetDefinition>();

  /**
   * 위젯 등록
   */
  register(widget: WidgetDefinition): void {
    if (this.widgets.has(widget.id)) {
      console.warn(`Widget "${widget.id}" is already registered. Overwriting.`);
    }
    this.widgets.set(widget.id, widget);
  }

  /**
   * ID로 위젯 가져오기
   */
  get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  /**
   * 모든 위젯 가져오기
   */
  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  /**
   * 활성화된 위젯만 가져오기 (순서대로 정렬)
   */
  getEnabled(widgetConfigs: Record<string, WidgetConfig>): WidgetDefinition[] {
    return this.getAll()
      .filter((widget) => {
        const config = widgetConfigs[widget.id];
        return config ? config.enabled : widget.defaultEnabled;
      })
      .sort((a, b) => {
        const orderA = widgetConfigs[a.id]?.order ?? a.defaultOrder;
        const orderB = widgetConfigs[b.id]?.order ?? b.defaultOrder;
        return orderA - orderB;
      });
  }

  /**
   * 위젯 개수
   */
  get size(): number {
    return this.widgets.size;
  }

  /**
   * 레지스트리 초기화
   */
  clear(): void {
    this.widgets.clear();
  }
}

// 싱글톤 인스턴스
export const widgetRegistry = new WidgetRegistry();
