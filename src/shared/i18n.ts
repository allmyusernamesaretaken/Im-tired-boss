// UI strings come from _locales via browser.i18n, so they can be translated later.
// The English fallback keeps the code readable and covers missing keys.

export function t(key: string, fallback: string): string {
  try {
    return browser.i18n.getMessage(key) || fallback;
  } catch {
    return fallback;
  }
}
