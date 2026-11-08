// Content script on claude.ai: fetches usage and keeps the bar blocks in the sidebar.

import { t } from '../shared/i18n';
import { isMessage } from '../shared/messages';
import type { OrgUsage } from '../shared/model';
import { describeStatus } from '../shared/status';
import { buildRows } from '../shared/view';
import { writeDiagnostics } from '../storage/diagnostics';
import { readSettings, SETTINGS_KEY } from '../storage/settings';
import { readUsage, USAGE_KEY } from '../storage/usage';
import type { FooterStatus } from './render';
import { displayOrgKey, refreshNow, startFetcher } from './fetcher';
import { Mounts } from './mounts';
import { SettingsPage } from './settings-page';

const RERENDER_EVERY_MS = 60_000;

const settingsPage = new SettingsPage(document);
/** From the latest settings; decides whether a right-click on the bars offers our menu entry. */
let contextMenuEnabled = true;

const mounts = new Mounts(
  document,
  () => {
    settingsPage.ensure();
    void reportSlots();
  },
  { refresh: refreshNow, openSettings: () => settingsPage.open() },
);

/** The same text as the status line in the settings, e.g. "Updated 3 min ago." */
function footerStatus(entry: OrgUsage | null, now: number): FooterStatus {
  const status = describeStatus(entry, now);
  const text = t(status.key, status.fallback);
  const ago = status.ago ? t('updatedAgo', 'Updated {ago} ago.').replace('{ago}', status.ago) : '';
  return {
    text: status.kind === 'ok' ? ago : [text, ago].filter(Boolean).join(' '),
    error: status.kind === 'error',
  };
}

/** Whether a right-click target lies on our bars. Climbs out of shadow roots too. */
function isOnBars(targetElementId: number): boolean {
  let node: Node | null = browser.menus.getTargetElement(targetElementId) ?? null;
  while (node) {
    if (node instanceof HTMLElement && node.dataset.itb === 'bars') return true;
    const parent: Node | null = node.parentNode;
    node = parent instanceof ShadowRoot ? parent.host : parent;
  }
  return false;
}

let lastDiagnostics = '';

async function refresh(): Promise<void> {
  const [settings, { store }] = await Promise.all([readSettings(), readUsage()]);
  // Only this tab's org: other tabs may be logged in to other accounts (containers).
  const key = displayOrgKey();
  const entry = store[key] ?? null;
  const now = new Date();
  contextMenuEnabled = settings.contextMenu;
  mounts.render({
    rows: buildRows(settings, entry?.snapshot ?? null, now),
    status: footerStatus(entry, now.getTime()),
    positions: settings.positions,
  });
  // The toolbar badge for this tab should show this tab's org too.
  browser.runtime.sendMessage({ type: 'tabOrg', key }).catch(() => {});
  await reportSlots();
}

/** Writes diagnostics only when something changed, to avoid storage churn. */
async function reportSlots(): Promise<void> {
  const slots = { ...mounts.found(), ...settingsPage.status() };
  const serialized = JSON.stringify(slots);
  if (serialized === lastDiagnostics) return;
  lastDiagnostics = serialized;
  await writeDiagnostics({ slots, checkedAt: Date.now() });
}

function safeRefresh(): void {
  refresh().catch((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    console.warn(`[I'm Tired, Boss] render failed: ${e.name}: ${e.message}`);
  });
}

// Messages come only from our own background script and extension pages.
browser.runtime.onMessage.addListener((message: unknown, sender) => {
  if (sender.id !== browser.runtime.id || !isMessage(message)) return;
  // The context menu is opening: show our entry only on the bars.
  if (message.type === 'barsTarget') {
    return Promise.resolve(contextMenuEnabled && isOnBars(message.targetElementId));
  }
  if (message.type === 'currentOrg') return Promise.resolve(displayOrgKey());
  if (message.type === 'openSettings') settingsPage.open();
  // Returning the promise lets the sender wait until the new values are stored.
  if (message.type === 'refreshNow') return refreshNow().then(() => true);
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (USAGE_KEY in changes || SETTINGS_KEY in changes)) safeRefresh();
});

settingsPage.start();
mounts.start();
startFetcher();
safeRefresh();
// Relative times ({left}) and "reset passed" need a periodic re-render.
setInterval(safeRefresh, RERENDER_EVERY_MS);
// The sidebar may render after us; check slots again once the app has settled.
setTimeout(safeRefresh, 3_000);
