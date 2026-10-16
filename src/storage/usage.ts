// Usage data in storage.local, keyed by hashed organization ID.
// Kept separate from the settings key so fetches never overwrite settings.

import type { OrgUsage } from '../shared/model';
import { applyResult, type FetchResult } from '../shared/usage';

export const USAGE_KEY = 'usage';
export const LAST_ORG_KEY = 'usageLastOrg';

export type UsageStore = Record<string, OrgUsage>;

export interface UsageState {
  store: UsageStore;
  /** Key of the organization that was updated most recently. */
  lastOrg: string | null;
}

export async function readUsage(): Promise<UsageState> {
  const raw: Record<string, unknown> = await browser.storage.local.get([USAGE_KEY, LAST_ORG_KEY]);
  const store = raw[USAGE_KEY];
  const lastOrg = raw[LAST_ORG_KEY];
  return {
    store: typeof store === 'object' && store !== null ? (store as UsageStore) : {},
    lastOrg: typeof lastOrg === 'string' ? lastOrg : null,
  };
}

export async function recordResult(key: string, result: FetchResult, now: number): Promise<void> {
  const { store } = await readUsage();
  const next = applyResult(store[key], result, now);
  await browser.storage.local.set({ [USAGE_KEY]: { ...store, [key]: next }, [LAST_ORG_KEY]: key });
}
