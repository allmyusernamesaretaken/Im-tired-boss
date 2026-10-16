// Decides which template and color apply to a bar. The only place that knows
// about easy mode, "All bars" and per-bar overrides.
// Order (expert mode): per bar → All bars. Easy mode compiles from its toggles.

import type { BarId, Settings, Template } from './settings';

export function compileEasy(easy: Settings['easy'], barId: BarId): Template {
  const left = [easy.showName && '{name}', easy.showPct && '{pct}%'].filter(Boolean).join(' · ');
  let right = '';
  if (easy.showReset) {
    if (barId === 'extra_usage') right = '{spent}';
    else if (easy.resetAs === 'left') right = '{left}';
    else right = easy.timeFormat === 'system' ? '{reset}' : `{reset:${easy.timeFormat}}`;
  }
  return { left, right };
}

export function resolveTemplate(settings: Settings, barId: BarId): Template {
  if (!settings.expert.enabled) return compileEasy(settings.easy, barId);
  const own = settings.expert.perBar[barId];
  return {
    left: own.left || settings.expert.all.left,
    right: own.right || settings.expert.all.right,
  };
}

export function resolveColor(settings: Settings, barId: BarId, pct: number | null): string {
  const own = settings.expert.enabled ? settings.expert.perBar[barId].color : null;
  const base = own ?? settings.color.base;
  if (!settings.color.byUsage || pct === null) return base;
  const reached = [...settings.color.steps]
    .sort((a, b) => b.from - a.from)
    .find((step) => pct >= step.from);
  return reached?.color ?? base;
}

/**
 * Turns expert mode on. "All bars" starts from what easy mode currently shows,
 * unless the user already edited it. Extra usage has no reset time, so it keeps
 * showing the amount on the right unless it has its own template.
 */
export function enableExpert(settings: Settings): Settings {
  settings.expert.enabled = true;
  if (!settings.expert.allCustom) {
    settings.expert.all = compileEasy(settings.easy, 'five_hour');
  }
  const extra = settings.expert.perBar.extra_usage;
  if (!extra.right) extra.right = compileEasy(settings.easy, 'extra_usage').right || '{spent}';
  return settings;
}
