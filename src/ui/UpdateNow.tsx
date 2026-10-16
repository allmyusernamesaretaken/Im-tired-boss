// "Update now": asks claude.ai to fetch the usage right away. Inside claude.ai
// (embedded settings) the fetch runs directly; elsewhere (popup, options page)
// the request goes to an open claude.ai tab, because fetching there uses your
// login reliably.

import { createContext } from 'preact';
import { useContext, useState } from 'preact/hooks';
import { t } from './i18n';

/** Provided by the embedded settings in claude.ai to fetch without messaging. */
export const DirectRefresh = createContext<(() => Promise<void>) | null>(null);

async function refreshViaTabs(): Promise<boolean> {
  const tabs = await browser.tabs.query({ url: 'https://claude.ai/*' });
  if (tabs.length === 0) return false;
  // Prefer the active tab, then the most recently used one.
  const sorted = [...tabs].sort(
    (a, b) => Number(b.active) - Number(a.active) || (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0),
  );
  for (const tab of sorted) {
    if (tab.id === undefined) continue;
    try {
      await browser.tabs.sendMessage(tab.id, { type: 'refreshNow' });
      return true;
    } catch {
      // Tab without our content script (e.g. still loading): try the next one.
    }
  }
  return false;
}

type State = 'idle' | 'busy' | 'noTab';

export function UpdateNow() {
  const direct = useContext(DirectRefresh);
  const [state, setState] = useState<State>('idle');

  const run = async () => {
    setState('busy');
    try {
      if (direct) {
        await direct();
        setState('idle');
      } else {
        setState((await refreshViaTabs()) ? 'idle' : 'noTab');
      }
    } catch {
      setState('idle');
    }
  };

  return (
    <span class="update-now">
      <button
        type="button"
        class="link-btn inline"
        disabled={state === 'busy'}
        onClick={() => void run()}
      >
        <svg
          class={state === 'busy' ? 'spin' : ''}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 11a8 8 0 1 0-2.34 5.66" />
          <path d="M20 4v7h-7" />
        </svg>
        {state === 'busy' ? t('updating', 'Updating…') : t('updateNow', 'Update now')}
      </button>
      {state === 'noTab' && (
        <span class="hint">{t('updateNoTab', 'Open claude.ai to update.')}</span>
      )}
    </span>
  );
}
