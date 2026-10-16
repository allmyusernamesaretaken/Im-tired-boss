// Turns the stored fetch state into a short status line for the popup and settings.

import { formatLeft } from './template';
import type { OrgUsage } from './model';

/** Data older than this is called out as stale (normal refresh is every 5 minutes). */
export const STALE_AFTER_MS = 30 * 60_000;

export type StatusKind = 'empty' | 'ok' | 'stale' | 'error';

export interface Status {
  kind: StatusKind;
  /** Message key and English fallback, plus an optional "how long ago". */
  key: string;
  fallback: string;
  ago?: string;
}

const ERRORS = {
  loggedOut: ['statusLoggedOut', 'Not logged in to claude.ai.'],
  apiChanged: [
    'statusApiChanged',
    'claude.ai changed how it reports usage. The extension needs an update.',
  ],
  network: ['statusNetwork', 'Could not reach claude.ai. Retrying automatically.'],
} as const;

export function describeStatus(entry: OrgUsage | null, now: number): Status {
  if (!entry) {
    return { kind: 'empty', key: 'statusEmpty', fallback: 'Open claude.ai to load your usage.' };
  }
  const ago = entry.snapshotAt ? formatLeft(now - entry.snapshotAt) : undefined;
  if (entry.status !== 'ok') {
    const [key, fallback] = ERRORS[entry.status];
    return { kind: 'error', key, fallback, ago };
  }
  if (entry.snapshotAt && now - entry.snapshotAt > STALE_AFTER_MS) {
    return {
      kind: 'stale',
      key: 'statusStale',
      fallback: 'Open claude.ai to refresh.',
      ago,
    };
  }
  return { kind: 'ok', key: 'statusOk', fallback: 'Up to date.', ago };
}
