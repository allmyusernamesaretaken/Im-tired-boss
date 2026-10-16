// Renders the settings UI into a shadow root inside claude.ai's settings dialog.
// Being part of the page (not an iframe), it inherits claude.ai's font and design
// tokens, so it looks like the native settings.

import { render } from 'preact';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { SettingsApp } from '../ui/SettingsApp';
import { DirectRefresh } from '../ui/UpdateNow';
import { refreshNow } from './fetcher';
import styles from '../ui/styles.css';

/** Mounts the settings into `host` and returns a function that unmounts them. */
export function mountSettingsPanel(host: HTMLElement): () => void {
  const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = styles;
  const root = document.createElement('div');
  shadow.replaceChildren(style, root);
  render(
    <ErrorBoundary>
      <DirectRefresh.Provider value={refreshNow}>
        <SettingsApp embedded />
      </DirectRefresh.Provider>
    </ErrorBoundary>,
    root,
  );
  return () => render(null, root);
}
