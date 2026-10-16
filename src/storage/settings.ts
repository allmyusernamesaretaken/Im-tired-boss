// Settings in storage.local. All writes go through updateSettings(), which reads
// the current value right before writing, so two open pages do not overwrite
// each other's changes with stale copies.

import { normalizeSettings, type Settings } from '../shared/settings';

export const SETTINGS_KEY = 'settings';

export async function readSettings(): Promise<Settings> {
  const raw: Record<string, unknown> = await browser.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(raw[SETTINGS_KEY]);
}

export async function updateSettings(change: (current: Settings) => Settings): Promise<Settings> {
  const next = normalizeSettings(change(await readSettings()));
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}
