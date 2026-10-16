// Host access to claude.ai is optional in Firefox MV3 and must be granted by the user.
// Note: the permissions API is not available everywhere, e.g. not in our options
// page while it is embedded in claude.ai's settings dialog.

export const CLAUDE_ORIGINS: browser.permissions.Permissions = {
  origins: ['https://claude.ai/*'],
};

/** Whether this context can query and request permissions at all. */
export function canManagePermissions(): boolean {
  return typeof browser.permissions?.contains === 'function';
}

export function hasClaudeAccess(): Promise<boolean> {
  // Without the API (embedded in claude.ai) we are evidently running there.
  if (!canManagePermissions()) return Promise.resolve(true);
  return browser.permissions.contains(CLAUDE_ORIGINS);
}

/** Must be called from a user gesture (e.g. a click handler). */
export function requestClaudeAccess(): Promise<boolean> {
  return browser.permissions.request(CLAUDE_ORIGINS);
}
