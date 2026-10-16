// Small diagnostics record written by the content script for the popup.
// Contains no usage data and no IDs, only which slots were found.

export const DIAGNOSTICS_KEY = 'diagnostics';

export interface Diagnostics {
  slots: Record<string, boolean>;
  checkedAt: number;
}

export async function readDiagnostics(): Promise<Diagnostics | null> {
  const raw: Record<string, unknown> = await browser.storage.local.get(DIAGNOSTICS_KEY);
  const value = raw[DIAGNOSTICS_KEY];
  return typeof value === 'object' && value !== null ? (value as Diagnostics) : null;
}

export function writeDiagnostics(value: Diagnostics): Promise<void> {
  return browser.storage.local.set({ [DIAGNOSTICS_KEY]: value });
}
