// Runs at document_start, before claude.ai's app can rewrite the URL. When the
// page was opened with our settings route (e.g. from the toolbar popup), leave a
// note for the main content script, which runs later.

import { SETTINGS_REQUEST_KEY, SETTINGS_ROUTE } from './settings-route';

if (location.hash === SETTINGS_ROUTE) {
  try {
    sessionStorage.setItem(SETTINGS_REQUEST_KEY, '1');
  } catch {
    // Storage blocked: the main script still checks the hash itself.
  }
}
