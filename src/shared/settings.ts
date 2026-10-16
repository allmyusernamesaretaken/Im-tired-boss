// Settings schema, defaults and validation. Reading always merges stored values
// over DEFAULTS field by field, so new fields work without a migration and
// invalid values fall back to their default.

import { LIMIT_IDS } from './model';

export const BAR_IDS = [...LIMIT_IDS, 'extra_usage'] as const;
export type BarId = (typeof BAR_IDS)[number];

export const POSITION_IDS = ['top', 'bottom'] as const;
export type PositionId = (typeof POSITION_IDS)[number];

export type TimeFormat = 'system' | '12h' | '24h';

export interface Template {
  left: string;
  right: string;
}

export interface Settings {
  version: 2;
  positions: Record<PositionId, boolean>;
  contextMenu: boolean;
  showBadge: boolean;
  bars: Record<BarId, { on: boolean; name: string }>;
  easy: {
    showName: boolean;
    showPct: boolean;
    showReset: boolean;
    resetAs: 'time' | 'left';
    timeFormat: TimeFormat;
  };
  color: {
    base: string;
    byUsage: boolean;
    steps: [{ from: number; color: string }, { from: number; color: string }];
  };
  expert: {
    enabled: boolean;
    /** Template for all bars. `allCustom` is set once the user edits it. */
    all: Template;
    allCustom: boolean;
    /** Per-bar overrides; empty strings / null inherit from `all`. */
    perBar: Record<BarId, Template & { color: string | null }>;
  };
}

export const MAX_TEMPLATE_LENGTH = 200;
export const MAX_NAME_LENGTH = 40;

const DEFAULT_NAMES: Record<BarId, string> = {
  five_hour: '5h',
  seven_day: 'Week',
  seven_day_opus: 'Opus',
  seven_day_sonnet: 'Sonnet',
  seven_day_oauth_apps: 'OAuth apps',
  seven_day_cowork: 'Cowork',
  extra_usage: 'Extra',
};

const ON_BY_DEFAULT: ReadonlySet<BarId> = new Set(['five_hour', 'seven_day']);

const mapBars = <T>(fn: (id: BarId) => T): Record<BarId, T> =>
  Object.fromEntries(BAR_IDS.map((id) => [id, fn(id)])) as Record<BarId, T>;

export const DEFAULTS: Settings = {
  version: 2,
  positions: { top: true, bottom: false },
  contextMenu: true,
  showBadge: true,
  bars: mapBars((id) => ({ on: ON_BY_DEFAULT.has(id), name: DEFAULT_NAMES[id] })),
  easy: { showName: true, showPct: true, showReset: true, resetAs: 'time', timeFormat: 'system' },
  color: {
    base: '#c6613f',
    byUsage: false,
    steps: [
      { from: 70, color: '#ef9f27' },
      { from: 90, color: '#e24b4a' },
    ],
  },
  expert: {
    enabled: false,
    all: { left: '{name} · {pct}%', right: '{reset}' },
    allCustom: false,
    perBar: mapBars(() => ({ left: '', right: '', color: null })),
  },
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Json) : {};

const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const text = (v: unknown, d: string, max: number): string =>
  typeof v === 'string' && v.length <= max ? v : d;
const oneOf = <T extends string>(v: unknown, options: readonly T[], d: T): T =>
  options.includes(v as T) ? (v as T) : d;
const HEX = /^#[0-9a-f]{6}$/i;
const color = (v: unknown, d: string): string => (typeof v === 'string' && HEX.test(v) ? v : d);
const percent = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 100 ? v : d;

/** Returns valid settings for any input (stored data, partial objects, garbage). */
/**
 * Upgrades stored settings from older versions before validation.
 * v1 → v2: the default bar color changed from #d97757 to the brand color #c6613f;
 * a stored old default is treated as "default", not as a choice.
 */
export function migrateSettings(raw: unknown): unknown {
  const r = obj(raw);
  const version = typeof r.version === 'number' ? r.version : 1;
  if (version < 2) {
    const color = obj(r.color);
    if (typeof color.base === 'string' && color.base.toLowerCase() === '#d97757') {
      return { ...r, version: 2, color: { ...color, base: DEFAULTS.color.base } };
    }
  }
  return raw;
}

export function normalizeSettings(raw: unknown): Settings {
  const r = obj(migrateSettings(raw));
  const d = DEFAULTS;
  const positions = obj(r.positions);
  const bars = obj(r.bars);
  const easy = obj(r.easy);
  const col = obj(r.color);
  const steps = Array.isArray(col.steps) ? col.steps : [];
  const expert = obj(r.expert);
  const all = obj(expert.all);
  const perBar = obj(expert.perBar);

  const step = (i: 0 | 1) => {
    const s = obj(steps[i]);
    return {
      from: percent(s.from, d.color.steps[i].from),
      color: color(s.color, d.color.steps[i].color),
    };
  };

  return {
    version: 2,
    positions: {
      top: bool(positions.top, d.positions.top),
      bottom: bool(positions.bottom, d.positions.bottom),
    },
    contextMenu: bool(r.contextMenu, d.contextMenu),
    showBadge: bool(r.showBadge, d.showBadge),
    bars: mapBars((id) => {
      const b = obj(bars[id]);
      return {
        on: bool(b.on, d.bars[id].on),
        name: text(b.name, d.bars[id].name, MAX_NAME_LENGTH),
      };
    }),
    easy: {
      showName: bool(easy.showName, d.easy.showName),
      showPct: bool(easy.showPct, d.easy.showPct),
      showReset: bool(easy.showReset, d.easy.showReset),
      resetAs: oneOf(easy.resetAs, ['time', 'left'], d.easy.resetAs),
      timeFormat: oneOf(easy.timeFormat, ['system', '12h', '24h'], d.easy.timeFormat),
    },
    color: {
      base: color(col.base, d.color.base),
      byUsage: bool(col.byUsage, d.color.byUsage),
      steps: [step(0), step(1)],
    },
    expert: {
      enabled: bool(expert.enabled, d.expert.enabled),
      all: {
        left: text(all.left, d.expert.all.left, MAX_TEMPLATE_LENGTH),
        right: text(all.right, d.expert.all.right, MAX_TEMPLATE_LENGTH),
      },
      allCustom: bool(expert.allCustom, d.expert.allCustom),
      perBar: mapBars((id) => {
        const p = obj(perBar[id]);
        return {
          left: text(p.left, '', MAX_TEMPLATE_LENGTH),
          right: text(p.right, '', MAX_TEMPLATE_LENGTH),
          color: typeof p.color === 'string' && HEX.test(p.color) ? p.color : null,
        };
      }),
    },
  };
}
