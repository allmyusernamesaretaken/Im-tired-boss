// Background script (event page). Listeners must be registered at the top level
// so Firefox can wake the event page for them.

import { resolveColor } from '../shared/resolve';
import { isMessage } from '../shared/messages';
import { hasClaudeAccess } from '../shared/permissions';
import { readSettings, SETTINGS_KEY } from '../storage/settings';
import { readUsage, USAGE_KEY } from '../storage/usage';

browser.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    // Depending on the Firefox version, host access may already be granted at install time.
    void hasClaudeAccess().then((granted) => {
      if (!granted) void openOnboarding();
    });
  }
  void updateBadge();
  createMenu();
});

browser.runtime.onStartup.addListener(() => {
  void updateBadge();
  createMenu();
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (USAGE_KEY in changes || SETTINGS_KEY in changes)) void updateBadge();
});

// --- Context menu on the bars ----------------------------------------------
// The entry exists on claude.ai pages but stays hidden unless the right-click
// landed on our bars: when the menu opens, we ask the tab about the clicked element.

const MENU_ID = 'itb-settings';
/** Counts menu openings, so a late answer for an older menu is ignored. */
let shownCount = 0;

function createMenu(): void {
  void browser.menus.removeAll().then(() =>
    browser.menus.create({
      id: MENU_ID,
      title: browser.i18n.getMessage('menuSettings') || "I'm Tired, Boss settings",
      contexts: ['all'],
      documentUrlPatterns: ['https://claude.ai/*'],
      visible: false,
    }),
  );
}

// Also on every wake-up: neither onInstalled nor onStartup fires when the add-on is re-enabled.
createMenu();

browser.menus.onShown.addListener((info, tab) => {
  const shown = ++shownCount;
  if (tab?.id === undefined || info.targetElementId === undefined) return;
  browser.tabs
    // Our content script runs in the top frame only; a target in a frame is never on the bars.
    .sendMessage(
      tab.id,
      { type: 'barsTarget', targetElementId: info.targetElementId },
      { frameId: 0 },
    )
    .then(async (onBars: unknown) => {
      if (onBars !== true || shown !== shownCount) return;
      await browser.menus.update(MENU_ID, { visible: true });
      await browser.menus.refresh();
    })
    .catch(() => {
      // No content script in that frame (e.g. a page opened before install): keep it hidden.
    });
});

browser.menus.onHidden.addListener(() => {
  shownCount++;
  void browser.menus.update(MENU_ID, { visible: false });
});

// Messages come only from our own extension pages and content scripts.
browser.runtime.onMessage.addListener((message: unknown, sender) => {
  if (sender.id !== browser.runtime.id || !isMessage(message)) return;
  if (message.type === 'openHelp') {
    void browser.tabs.create({ url: browser.runtime.getURL('ui/help.html') });
  }
});

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || tab?.id === undefined) return;
  void browser.tabs.sendMessage(tab.id, { type: 'openSettings' });
});

function openOnboarding(): Promise<browser.tabs.Tab> {
  return browser.tabs.create({ url: browser.runtime.getURL('ui/onboarding.html') });
}

/** Badge shows the 5-hour window, the limit you hit first. */
async function updateBadge(): Promise<void> {
  const [settings, { store, lastOrg }] = await Promise.all([readSettings(), readUsage()]);
  const limit = lastOrg ? store[lastOrg]?.snapshot?.limits.five_hour : undefined;
  if (!settings.showBadge || !limit || limit.utilization === null) {
    await browser.action.setBadgeText({ text: '' });
    return;
  }
  const pct = limit.utilization;
  await browser.action.setBadgeText({ text: String(Math.round(pct)) });
  await browser.action.setBadgeBackgroundColor({ color: resolveColor(settings, 'five_hour', pct) });
  await browser.action.setBadgeTextColor({ color: '#ffffff' });
}
