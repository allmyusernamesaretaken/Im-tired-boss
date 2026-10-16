import { mount } from '../mount';
import { AccessNotice } from '../AccessNotice';
import { Diagnostics } from '../Diagnostics';
import { useNow, useSettings, useSnapshot } from '../hooks';
import { t } from '../i18n';
import { Preview } from '../Preview';
import { StatusLine } from '../StatusLine';
import { UpdateNow } from '../UpdateNow';

/** Opens our entry in the claude.ai settings dialog (see content/settings-page.ts). */
const SETTINGS_URL = 'https://claude.ai/new#settings/im-tired-boss';

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

mount(<Popup />);
