// Fetches usage from claude.ai while this tab is visible and the stored data is stale.
// No coordination between tabs: a rare double fetch from two visible tabs is harmless.

import { isOrgId, ORGS_PATH, parseUsage, pickOrg, statusFromHttp, usagePath } from '../shared/api';
import type { FetchStatus } from '../shared/model';
import { nextFetchAt, orgKey } from '../shared/usage';
import { readUsage, recordResult } from '../storage/usage';

const CHECK_EVERY_MS = 30_000;
/** Storage key for failed org lookups while no org is known yet (logged out, fresh install). */
export const NO_ORG_KEY = 'no-org';

type JsonResult = { ok: true; json: unknown } | { ok: false; status: Exclude<FetchStatus, 'ok'> };

let orgId: string | null = null;
/** The lastActiveOrg cookie when orgId was resolved; a change means the user switched org. */
let orgCookie: string | undefined;
let busy = false;

/** Storage key of this tab's organization, once known. */
export function currentOrgKey(): string | null {
  return orgId ? orgKey(orgId) : null;
}

function readCookie(name: string): string | undefined {
  const entry = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  if (!entry) return undefined;
  try {
    return decodeURIComponent(entry.slice(name.length + 1));
  } catch {
    return undefined;
  }
}

async function getJson(path: string): Promise<JsonResult> {
  let res: Response;
  try {
    res = await fetch(path, { credentials: 'include', headers: { accept: 'application/json' } });
  } catch {
    return { ok: false, status: 'network' };
  }
  if (!res.ok) return { ok: false, status: statusFromHttp(res.status) };
  try {
    return { ok: true, json: (await res.json()) as unknown };
  } catch {
    return { ok: false, status: 'apiChanged' };
  }
}

/** `force` ("Update now") skips the visibility and staleness checks. Exported for tests. */
export async function tick(force = false): Promise<void> {
  if (busy || (!force && document.visibilityState !== 'visible')) return;
  busy = true;
  try {
    const now = Date.now();
    const { store, lastOrg } = await readUsage();

    // claude.ai can switch the org without a reload: resolve it again right away.
    const cookie = readCookie('lastActiveOrg');
    const switched = !!orgId && cookie !== orgCookie && !!cookie && isOrgId(cookie);
    if (switched) orgId = null;

    // Check staleness before any request, using the last known org if not resolved yet.
    // Failed lookups without a known org are stored under NO_ORG_KEY, so they back off too.
    const knownKey = orgId ? orgKey(orgId) : lastOrg;
    if (!force && !switched && knownKey && now < nextFetchAt(store[knownKey])) return;

    if (!orgId) {
      const orgs = await getJson(ORGS_PATH);
      const picked = orgs.ok ? pickOrg(orgs.json, cookie) : null;
      if (!picked) {
        const status = orgs.ok ? 'apiChanged' : orgs.status;
        await recordResult(knownKey ?? NO_ORG_KEY, { status }, now);
        return;
      }
      orgId = picked;
      orgCookie = cookie;
    }

    const key = orgKey(orgId);
    const usage = await getJson(usagePath(orgId));
    if (!usage.ok) {
      // Re-resolve the org next time unless it was just a network hiccup.
      if (usage.status !== 'network') orgId = null;
      await recordResult(key, { status: usage.status }, now);
      return;
    }
    const snapshot = parseUsage(usage.json);
    await recordResult(key, snapshot ? { status: 'ok', snapshot } : { status: 'apiChanged' }, now);
  } finally {
    busy = false;
  }
}

/** Runs a check; unexpected errors are logged by name and message only, never with data. */
function safeTick(force = false): Promise<void> {
  return tick(force).catch((err: unknown) => {
    const e = err instanceof Error ? err : new Error(String(err));
    console.warn(`[I'm Tired, Boss] usage check failed: ${e.name}: ${e.message}`);
  });
}

/** Fetches right away ("Update now"); resolves once the result is stored. */
export function refreshNow(): Promise<void> {
  return safeTick(true);
}

export function startFetcher(): void {
  void safeTick();
  document.addEventListener('visibilitychange', () => void safeTick());
  setInterval(() => void safeTick(), CHECK_EVERY_MS);
}
