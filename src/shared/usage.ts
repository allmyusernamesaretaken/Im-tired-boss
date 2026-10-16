// Refresh timing and how fetch results update the stored state. Pure functions.

import type { FetchStatus, OrgUsage, UsageSnapshot } from './model';

export const REFRESH_INTERVAL_MS = 5 * 60_000;
export const MAX_BACKOFF_MS = 60 * 60_000;

export type FetchResult =
  { status: 'ok'; snapshot: UsageSnapshot } | { status: Exclude<FetchStatus, 'ok'> };

/** Earliest time (ms) for the next attempt. 0 means "now". */
export function nextFetchAt(entry: OrgUsage | undefined, interval = REFRESH_INTERVAL_MS): number {
  if (!entry) return 0;
  // Errors other than "logged out" back off exponentially, so a broken endpoint is not hammered.
  const backoff = entry.status !== 'ok' && entry.status !== 'loggedOut';
  const wait = backoff
    ? Math.min(interval * 2 ** Math.max(0, entry.failures - 1), MAX_BACKOFF_MS)
    : interval;
  return entry.fetchedAt + wait;
}

export function applyResult(
  prev: OrgUsage | undefined,
  result: FetchResult,
  now: number,
): OrgUsage {
  if (result.status === 'ok') {
    return {
      status: 'ok',
      fetchedAt: now,
      failures: 0,
      snapshot: result.snapshot,
      snapshotAt: now,
    };
  }
  return {
    status: result.status,
    fetchedAt: now,
    failures: (prev?.failures ?? 0) + 1,
    snapshot: prev?.snapshot ?? null,
    snapshotAt: prev?.snapshotAt ?? null,
  };
}

/**
 * Storage key for an organization, so raw org IDs are never stored.
 * FNV-1a (64 bit) in plain JS: it only needs to be stable and not reveal the ID,
 * and avoids Web Crypto, which is awkward across Firefox's content-script boundary.
 */
export function orgKey(orgId: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let i = 0; i < orgId.length; i++) {
    hash ^= BigInt(orgId.charCodeAt(i));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}
