import { describe, expect, it } from 'vitest';
import {
  formatLeft,
  formatPattern,
  renderTemplate,
  type TemplateContext,
} from '../src/shared/template';

const now = new Date('2026-10-15T12:00:00Z'); // Thursday
const ctx = (over: Partial<TemplateContext> = {}): TemplateContext => ({
  name: '5h',
  pct: 37.4,
  resetsAt: new Date('2026-10-15T14:14:00Z'),
  now,
  locale: 'en-US',
  ...over,
});

describe('renderTemplate', () => {
  it('fills name and rounded percent', () => {
    expect(renderTemplate('{name} · {pct}%', ctx())).toBe('5h · 37%');
  });

  it('shows a dash for an unknown percent and keeps values above 100', () => {
    expect(renderTemplate('{pct}', ctx({ pct: null }))).toBe('–');
    expect(renderTemplate('{pct}', ctx({ pct: 104 }))).toBe('104');
  });

  it('uses time only for resets within a day', () => {
    expect(renderTemplate('{reset:12h}', ctx())).toBe('2:14 PM');
    expect(renderTemplate('{reset:24h}', ctx())).toBe('14:14');
  });

  it('adds the weekday within a week and uses the date beyond', () => {
    const inTwoDays = new Date('2026-10-17T09:00:00Z');
    expect(renderTemplate('{reset:24h}', ctx({ resetsAt: inTwoDays }))).toBe('Sat 09:00');
    const inTwoWeeks = new Date('2026-11-01T09:00:00Z');
    expect(renderTemplate('{reset}', ctx({ resetsAt: inTwoWeeks }))).toBe('11/01');
  });

  it('renders LDML patterns', () => {
    expect(renderTemplate('{reset:EEE HH:mm}', ctx())).toBe('Thu 14:14');
    expect(renderTemplate("{reset:'at' h:mm a}", ctx())).toBe('at 2:14 PM');
    expect(renderTemplate('{reset:dd.MM.yyyy}', ctx())).toBe('15.10.2026');
  });

  it('renders time left', () => {
    expect(renderTemplate('{left}', ctx())).toBe('2h 14m');
    expect(renderTemplate("{left:H'h' mm'm'}", ctx())).toBe('2h 14m');
  });

  it('leaves reset placeholders empty without a reset time', () => {
    expect(renderTemplate('{reset}|{left}', ctx({ resetsAt: null }))).toBe('|');
  });

  it('supports {spent} and {none}', () => {
    expect(renderTemplate('{spent}', ctx({ spent: '$1.00 / $100.00' }))).toBe('$1.00 / $100.00');
    expect(renderTemplate('{none}', ctx())).toBe('');
  });

  it('keeps unknown placeholders and plain text', () => {
    expect(renderTemplate('{foo} and <b>', ctx())).toBe('{foo} and <b>');
  });
});

describe('formatPattern', () => {
  const date = new Date('2026-10-05T07:03:00Z');

  it('pads and does not pad', () => {
    expect(formatPattern(date, 'd.M. H:mm')).toBe('5.10. 7:03');
    expect(formatPattern(date, 'dd.MM. HH:mm')).toBe('05.10. 07:03');
    expect(formatPattern(date, 'hh:mm a', 'en-US')).toBe('07:03 AM');
  });

  it('handles quoted literals and escaped quotes', () => {
    expect(formatPattern(date, "'day' d, h 'o''clock'")).toBe("day 5, 7 o'clock");
  });

  it('uses the locale for weekday names', () => {
    expect(formatPattern(date, 'EEEE', 'en-US')).toBe('Monday');
    expect(formatPattern(date, 'EEEE', 'de-DE')).toBe('Montag');
  });
});

describe('formatLeft', () => {
  const h = 3_600_000;

  it('picks the two largest units automatically', () => {
    expect(formatLeft(54 * h)).toBe('2d 6h');
    expect(formatLeft(2 * h + 14 * 60_000)).toBe('2h 14m');
    expect(formatLeft(5 * 60_000)).toBe('5m');
    expect(formatLeft(-1)).toBe('0m');
  });

  it('shows totals when the larger unit is missing from the pattern', () => {
    expect(formatLeft(54 * h, "H'h'")).toBe('54h');
    expect(formatLeft(54 * h, "d'd' H'h'")).toBe('2d 6h');
    expect(formatLeft(2 * h + 5 * 60_000, "m'm'")).toBe('125m');
  });
});
