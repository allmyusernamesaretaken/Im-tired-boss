import { mount } from '../mount';
import { AccessNotice } from '../AccessNotice';
import { Diagnostics } from '../Diagnostics';
import { UsageKey, useNow, useSettings, useSnapshot } from '../hooks';
import { isUsageKey } from '../../shared/messages';
import { t } from '../../shared/i18n';
import { Preview } from '../Preview';
import { StatusLine } from '../StatusLine';
import { UpdateNow } from '../UpdateNow';

/** Opens our entry in the claude.ai settings dialog (see content/settings-page.ts). */
const SETTINGS_URL = 'https://claude.ai/new#settings/im-tired-boss';

/**
 * The org shown in the active claude.ai tab, which may belong to another account
 * than the one updated last (containers). Null elsewhere: then the latest is shown.
 */
async function activeTabKey(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return null;
  try {
    const key: unknown = await browser.tabs.sendMessage(
      tab.id,
      { type: 'currentOrg' },
      { frameId: 0 },
    );
    return isUsageKey(key) ? key : null;
  } catch {
    return null; // Not a claude.ai tab, or its content script is not ready.
  }
}

function Popup() {
  const [settings] = useSettings();
  const snapshot = useSnapshot();
  const now = useNow();

  return (
    <main class="popup">
      <h1>I'm Tired, Boss</h1>
      <AccessNotice mode="open-onboarding" />
      {settings && <Preview settings={settings} snapshot={snapshot} now={now} />}
      <StatusLine />
      <div class="popup-actions">
        <UpdateNow />
        <button
          type="button"
          class="link-btn"
          onClick={() => {
            void browser.tabs.create({ url: SETTINGS_URL });
            window.close();
          }}
        >
          {t('openSettings', 'Settings')}
        </button>
      </div>
      <Diagnostics />
    </main>
  );
}

mount(
  <UsageKey.Provider value={activeTabKey}>
    <Popup />
  </UsageKey.Provider>,
);
