import { describe, it, expect, beforeEach } from 'vitest';
import { widgetRegistry, registerBuiltinWidgets } from '../../src/widgets/index.js';

describe('WidgetRegistry', () => {
  beforeEach(() => {
    widgetRegistry.clear();
  });

  it('registers builtin widgets', () => {
    registerBuiltinWidgets();
    expect(widgetRegistry.size).toBe(8);
  });

  it('gets widget by id', () => {
    registerBuiltinWidgets();
    const modelWidget = widgetRegistry.get('model');
    expect(modelWidget).toBeDefined();
    expect(modelWidget?.id).toBe('model');
    expect(modelWidget?.name).toBe('Model');
  });

  it('returns undefined for unknown widget', () => {
    registerBuiltinWidgets();
    const unknown = widgetRegistry.get('unknown-widget');
    expect(unknown).toBeUndefined();
  });

  it('gets all widgets', () => {
    registerBuiltinWidgets();
    const widgets = widgetRegistry.getAll();
    expect(widgets.length).toBe(8);
    expect(widgets.map((w) => w.id)).toContain('model');
    expect(widgets.map((w) => w.id)).toContain('context');
    expect(widgets.map((w) => w.id)).toContain('todo');
  });

  it('gets enabled widgets with default config', () => {
    registerBuiltinWidgets();
    const enabled = widgetRegistry.getEnabled({});

    // Todo is disabled by default
    expect(enabled.map((w) => w.id)).not.toContain('todo');
    // Others are enabled by default
    expect(enabled.map((w) => w.id)).toContain('model');
    expect(enabled.map((w) => w.id)).toContain('context');
  });

  it('respects widget config for enabled state', () => {
    registerBuiltinWidgets();
    const enabled = widgetRegistry.getEnabled({
      model: { enabled: false, order: 0 },
      todo: { enabled: true, order: 7 },
    });

    expect(enabled.map((w) => w.id)).not.toContain('model');
    expect(enabled.map((w) => w.id)).toContain('todo');
  });

  it('sorts widgets by order', () => {
    registerBuiltinWidgets();
    const enabled = widgetRegistry.getEnabled({
      cost: { enabled: true, order: 0 },
      model: { enabled: true, order: 1 },
    });

    const ids = enabled.map((w) => w.id);
    expect(ids.indexOf('cost')).toBeLessThan(ids.indexOf('model'));
  });
});
