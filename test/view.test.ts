import { describe, expect, it } from 'vitest';
import type { UsageSnapshot } from '../src/shared/model';
import { DEFAULTS, type Settings } from '../src/shared/settings';
import { buildRows } from '../src/shared/view';

const now = new Date('2026-10-15T12:00:00Z');
const snapshot: UsageSnapshot = {
  limits: {
    five_hour: { utilization: 37, resetsAt: '2026-10-15T14:14:00.000Z', locked: false },
    seven_day: { utilization: 123, resetsAt: '2026-10-17T21:00:00.000Z', locked: false },
    seven_day_opus: null,
  },
  extra: {
    enabled: true,
    utilization: 12,
    usedMinor: 1200,
    limitMinor: 10000,
    currency: 'USD',
    decimals: 2,
  },
};
const settings = (change?: (s: Settings) => void): Settings => {
  const s = structuredClone(DEFAULTS);
  s.easy.timeFormat = '24h';
  change?.(s);
  return s;
};

describe('buildRows', () => {
  it('renders the bars that are on and available', () => {
    const rows = buildRows(settings(), snapshot, now, 'en-US');
    expect(rows.map((r) => r.id)).toEqual(['five_hour', 'seven_day']);
    expect(rows[0]).toMatchObject({
      left: '5h · 37%',
      right: '14:14',
      width: 37,
      color: '#c6613f',
    });
  });

  it('clamps the width but keeps the real percent in the text', () => {
    const row = buildRows(settings(), snapshot, now, 'en-US')[1];
    expect(row?.width).toBe(100);
    expect(row?.left).toBe('Week · 123%');
  });

  it('skips bars that are not in the plan', () => {
    const rows = buildRows(
      settings((s) => (s.bars.seven_day_opus.on = true)),
      snapshot,
      now,
    );
    expect(rows.map((r) => r.id)).not.toContain('seven_day_opus');
  });

  it('shows extra usage only when enabled, with the amount', () => {
    const on = settings((s) => (s.bars.extra_usage.on = true));
    const row = buildRows(on, snapshot, now, 'en-US').find((r) => r.id === 'extra_usage');
    expect(row?.right).toBe('$12.00 / $100.00');
    const disabled = { ...snapshot, extra: { ...snapshot.extra!, enabled: false } };
    expect(buildRows(on, disabled, now).some((r) => r.id === 'extra_usage')).toBe(false);
  });

  it('returns nothing without data', () => {
    expect(buildRows(settings(), null, now)).toEqual([]);
  });
});
