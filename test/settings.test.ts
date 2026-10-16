import { describe, expect, it } from 'vitest';
import { compileEasy, enableExpert, resolveColor, resolveTemplate } from '../src/shared/resolve';
import { DEFAULTS, normalizeSettings, type Settings } from '../src/shared/settings';

const clone = (): Settings => structuredClone(DEFAULTS);

describe('normalizeSettings', () => {
  it('returns the defaults for empty or broken input', () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULTS);
    expect(normalizeSettings('garbage')).toEqual(DEFAULTS);
  });

  it('keeps valid values and fills in missing ones', () => {
    const s = normalizeSettings({ bars: { seven_day_opus: { on: true } } });
    expect(s.bars.seven_day_opus).toEqual({ on: true, name: 'Opus' });
    expect(s.bars.five_hour.on).toBe(true);
  });

  it('migrates the old default color from version 1', () => {
    expect(normalizeSettings({ version: 1, color: { base: '#D97757' } }).color.base).toBe(
      '#c6613f',
    );
    expect(normalizeSettings({ color: { base: '#d97757' } }).color.base).toBe('#c6613f');
  });

  it('keeps a color the user picked on purpose', () => {
    expect(normalizeSettings({ version: 1, color: { base: '#123456' } }).color.base).toBe(
      '#123456',
    );
    expect(normalizeSettings({ version: 2, color: { base: '#d97757' } }).color.base).toBe(
      '#d97757',
    );
  });

  it('replaces invalid values with defaults', () => {
    const s = normalizeSettings({
      color: { base: 'red', steps: [{ from: 0, color: '#123456' }] },
      easy: { resetAs: 'sometime' },
      expert: { all: { left: 'x'.repeat(500) }, perBar: { five_hour: { color: 'javascript:' } } },
    });
    expect(s.color.base).toBe(DEFAULTS.color.base);
    expect(s.color.steps[0]).toEqual({ from: 70, color: '#123456' });
    expect(s.easy.resetAs).toBe('time');
    expect(s.expert.all.left).toBe(DEFAULTS.expert.all.left);
    expect(s.expert.perBar.five_hour.color).toBeNull();
  });
});

describe('compileEasy', () => {
  it('builds the default line', () => {
    expect(compileEasy(DEFAULTS.easy, 'five_hour')).toEqual({
      left: '{name} · {pct}%',
      right: '{reset}',
    });
  });

  it('follows the toggles', () => {
    const easy = { ...DEFAULTS.easy, showName: false, resetAs: 'left' as const };
    expect(compileEasy(easy, 'seven_day')).toEqual({ left: '{pct}%', right: '{left}' });
    expect(compileEasy({ ...DEFAULTS.easy, timeFormat: '24h' }, 'seven_day').right).toBe(
      '{reset:24h}',
    );
    expect(compileEasy({ ...DEFAULTS.easy, showReset: false }, 'seven_day').right).toBe('');
  });

  it('shows the amount instead of a reset for extra usage', () => {
    expect(compileEasy(DEFAULTS.easy, 'extra_usage').right).toBe('{spent}');
  });
});

describe('resolveTemplate', () => {
  it('uses easy mode unless expert mode is on', () => {
    const s = clone();
    s.expert.all = { left: 'ALL', right: 'ALL' };
    expect(resolveTemplate(s, 'five_hour').left).toBe('{name} · {pct}%');
    s.expert.enabled = true;
    expect(resolveTemplate(s, 'five_hour')).toEqual({ left: 'ALL', right: 'ALL' });
  });

  it('lets per-bar values override All bars, field by field', () => {
    const s = clone();
    s.expert.enabled = true;
    s.expert.all = { left: 'ALL', right: 'ALL' };
    s.expert.perBar.seven_day.right = 'OWN';
    expect(resolveTemplate(s, 'seven_day')).toEqual({ left: 'ALL', right: 'OWN' });
  });
});

describe('resolveColor', () => {
  it('uses the base color, or the per-bar color in expert mode', () => {
    const s = clone();
    expect(resolveColor(s, 'five_hour', 95)).toBe('#c6613f');
    s.expert.perBar.five_hour.color = '#000000';
    expect(resolveColor(s, 'five_hour', 95)).toBe('#c6613f');
    s.expert.enabled = true;
    expect(resolveColor(s, 'five_hour', 95)).toBe('#000000');
  });

  it('switches color by usage thresholds', () => {
    const s = clone();
    s.color.byUsage = true;
    expect(resolveColor(s, 'five_hour', 50)).toBe('#c6613f');
    expect(resolveColor(s, 'five_hour', 70)).toBe('#ef9f27');
    expect(resolveColor(s, 'five_hour', 95)).toBe('#e24b4a');
    expect(resolveColor(s, 'five_hour', null)).toBe('#c6613f');
  });
});

describe('enableExpert', () => {
  it('starts All bars from the current easy mode', () => {
    const s = clone();
    s.easy.resetAs = 'left';
    s.easy.showName = false;
    enableExpert(s);
    expect(s.expert.enabled).toBe(true);
    expect(s.expert.all).toEqual({ left: '{pct}%', right: '{left}' });
  });

  it('keeps All bars once the user edited it', () => {
    const s = clone();
    s.expert.all = { left: 'MINE', right: '' };
    s.expert.allCustom = true;
    enableExpert(s);
    expect(s.expert.all.left).toBe('MINE');
  });

  it('keeps the amount on the right for extra usage', () => {
    const s = clone();
    enableExpert(s);
    expect(resolveTemplate(s, 'extra_usage').right).toBe('{spent}');
    expect(resolveTemplate(s, 'five_hour').right).toBe('{reset}');
  });
});
