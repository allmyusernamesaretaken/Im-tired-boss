// Turns settings + usage into the rows the renderer draws. Pure.

import type { ExtraUsage, UsageSnapshot } from './model';
import { resolveColor, resolveTemplate } from './resolve';
import { BAR_IDS, type BarId, type Settings } from './settings';
import { formatLeft, renderTemplate } from './template';

export interface BarRow {
  id: BarId;
  name: string;
  left: string;
  right: string;
  /** 0–100, for the bar width. */
  width: number;
  /** Unclamped, for aria. */
  pct: number | null;
  color: string;
  /** Tooltip with the full reset information. */
  title: string;
}

export function formatSpent(extra: ExtraUsage, locale?: string): string {
  const fmt = new Intl.NumberFormat(locale, { style: 'currency', currency: extra.currency });
  const factor = 10 ** extra.decimals;
  return `${fmt.format(extra.usedMinor / factor)} / ${fmt.format(extra.limitMinor / factor)}`;
}

export function buildRows(
  settings: Settings,
  snapshot: UsageSnapshot | null,
  now: Date,
  locale?: string,
): BarRow[] {
  if (!snapshot) return [];
  const rows: BarRow[] = [];
  for (const id of BAR_IDS) {
    if (!settings.bars[id].on) continue;

    let pct: number | null;
    let resetsAt: Date | null = null;
    let spent: string | undefined;
    if (id === 'extra_usage') {
      const extra = snapshot.extra;
      if (!extra?.enabled) continue;
      pct = extra.utilization;
      spent = formatSpent(extra, locale);
    } else {
      const limit = snapshot.limits[id];
      if (!limit) continue;
      pct = limit.utilization;
      resetsAt = limit.resetsAt ? new Date(limit.resetsAt) : null;
    }

    const name = settings.bars[id].name;
    const template = resolveTemplate(settings, id);
    const ctx = { name, pct, resetsAt, spent, now, locale };
    const title = resetsAt
      ? `${name}: resets ${resetsAt.toLocaleString(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' })} (in ${formatLeft(resetsAt.getTime() - now.getTime())})`
      : spent
        ? `${name}: ${spent}`
        : name;

    rows.push({
      id,
      name,
      left: renderTemplate(template.left, ctx),
      right: renderTemplate(template.right, ctx),
      width: pct === null ? 0 : Math.min(100, Math.max(0, pct)),
      pct,
      color: resolveColor(settings, id, pct),
      title,
    });
  }
  return rows;
}
