// Template engine for the text line above each bar.
//
// Placeholders: {name} {pct} {reset[:fmt]} {left[:fmt]} {spent} {none}
//   {reset}            automatic format following the system/locale
//   {reset:12h|24h}    automatic format with a fixed hour cycle
//   {reset:<pattern>}  Unicode LDML subset: yyyy M MM d dd EEE EEEE H HH h hh mm a 'text'
//   {left}             time until reset, automatic (2h 14m, 2d 6h, 16d)
//   {left:<pattern>}   d H HH m mm 'text' (H/m are totals when the larger unit is absent)
// Unknown placeholders are left as they are. Output is plain text, never HTML.
// No eval and no user-supplied regular expressions.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface TemplateContext {
  name: string;
  /** Percent used, unclamped. */
  pct: number | null;
  resetsAt: Date | null;
  /** Preformatted amount for extra usage, e.g. "$12.00 / $100.00". */
  spent?: string;
  now: Date;
  /** BCP 47 locale, defaults to the browser's. */
  locale?: string;
}

const PLACEHOLDER = /\{(name|pct|reset|left|spent|none)(?::([^{}]*))?\}/g;

export function renderTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(PLACEHOLDER, (_match, key: string, arg: string | undefined) => {
    switch (key) {
      case 'name':
        return ctx.name;
      case 'pct':
        return ctx.pct === null ? '–' : String(Math.round(ctx.pct));
      case 'reset':
        return ctx.resetsAt ? formatReset(ctx.resetsAt, arg, ctx) : '';
      case 'left':
        return ctx.resetsAt ? formatLeft(ctx.resetsAt.getTime() - ctx.now.getTime(), arg) : '';
      case 'spent':
        return ctx.spent ?? '';
      default:
        return '';
    }
  });
}

// --- {reset} ---------------------------------------------------------------

function formatReset(date: Date, arg: string | undefined, ctx: TemplateContext): string {
  if (arg === undefined || arg === '' || arg === 'system') return smartReset(date, ctx, undefined);
  if (arg === '12h') return smartReset(date, ctx, true);
  if (arg === '24h') return smartReset(date, ctx, false);
  return formatPattern(date, arg, ctx.locale);
}

/** Time only within a day, weekday + time within a week, otherwise the date. */
function smartReset(date: Date, ctx: TemplateContext, hour12: boolean | undefined): string {
  const diff = date.getTime() - ctx.now.getTime();
  const time: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12 };
  if (diff < DAY) return new Intl.DateTimeFormat(ctx.locale, time).format(date);
  if (diff < 7 * DAY) {
    return new Intl.DateTimeFormat(ctx.locale, { weekday: 'short', ...time }).format(date);
  }
  return new Intl.DateTimeFormat(ctx.locale, { day: '2-digit', month: '2-digit' }).format(date);
}

// '' is a literal quote, also inside a quoted run ('o''clock').
const QUOTED = "''|'((?:[^']|'')+)'";
const unquote = (literal: string | undefined) =>
  literal === undefined ? "'" : literal.replace(/''/g, "'");

const DATE_TOKEN = new RegExp(`${QUOTED}|yyyy|EEEE|EEE|MM|M|dd|d|HH|H|hh|h|mm|a`, 'g');
const pad = (n: number) => String(n).padStart(2, '0');

export function formatPattern(date: Date, pattern: string, locale?: string): string {
  return pattern.replace(DATE_TOKEN, (token, literal: string | undefined) => {
    if (token.startsWith("'")) return unquote(literal);
    const h = date.getHours();
    const h12 = h % 12 || 12;
    switch (token) {
      case 'yyyy':
        return String(date.getFullYear());
      case 'MM':
        return pad(date.getMonth() + 1);
      case 'M':
        return String(date.getMonth() + 1);
      case 'dd':
        return pad(date.getDate());
      case 'd':
        return String(date.getDate());
      case 'EEEE':
        return new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date);
      case 'EEE':
        return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
      case 'HH':
        return pad(h);
      case 'H':
        return String(h);
      case 'hh':
        return pad(h12);
      case 'h':
        return String(h12);
      case 'mm':
        return pad(date.getMinutes());
      case 'a':
        return dayPeriod(date, locale);
      default:
        return token;
    }
  });
}

function dayPeriod(date: Date, locale?: string): string {
  const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true }).formatToParts(
    date,
  );
  return parts.find((p) => p.type === 'dayPeriod')?.value ?? (date.getHours() < 12 ? 'AM' : 'PM');
}

// --- {left} ----------------------------------------------------------------

const LEFT_TOKEN = new RegExp(`${QUOTED}|d|HH|H|mm|m`, 'g');

export function formatLeft(ms: number, pattern?: string): string {
  const total = Math.max(0, ms);
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / 60_000);

  if (!pattern) {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Without a larger unit in the pattern, the smaller one shows the total.
  const unquoted = pattern.replace(new RegExp(QUOTED, 'g'), '');
  const hasDays = /d/.test(unquoted);
  const hasHours = /H/.test(unquoted);
  const h = hasDays ? hours : Math.floor(total / HOUR);
  const m = hasHours || hasDays ? minutes : Math.floor(total / 60_000);

  return pattern.replace(LEFT_TOKEN, (token, literal: string | undefined) => {
    if (token.startsWith("'")) return unquote(literal);
    switch (token) {
      case 'd':
        return String(days);
      case 'HH':
        return pad(h);
      case 'H':
        return String(h);
      case 'mm':
        return pad(m);
      case 'm':
        return String(m);
      default:
        return token;
    }
  });
}
