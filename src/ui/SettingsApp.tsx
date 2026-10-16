// The whole settings UI. Used on the standalone options page and, rendered into
// a shadow root, inside claude.ai's settings dialog.

import { AccessNotice } from './AccessNotice';
import { useNow, useSettings, useSnapshot } from './hooks';
import { t } from '../shared/i18n';
import { Preview } from './Preview';
import { SettingsForm } from './SettingsForm';
import { StatusLine } from './StatusLine';
import { UpdateNow } from './UpdateNow';

export function SettingsApp({ embedded }: { embedded: boolean }) {
  const [settings, update] = useSettings();
  const snapshot = useSnapshot();
  const now = useNow();

  return (
    <main class={embedded ? 'page embedded' : 'page'}>
      <header class="page-head">
        <h1>I'm Tired, Boss</h1>
        <p class="muted">
          {t('tagline', 'A usage meter for Claude. Not affiliated with Anthropic.')}
        </p>
      </header>
      <AccessNotice mode="request" />
      {settings && (
        <>
          <div class="preview-card">
            <Preview settings={settings} snapshot={snapshot} now={now} />
            <div class="status-row">
              <StatusLine />
              <UpdateNow />
            </div>
          </div>
          <SettingsForm settings={settings} snapshot={snapshot} update={update} />
        </>
      )}
    </main>
  );
}
