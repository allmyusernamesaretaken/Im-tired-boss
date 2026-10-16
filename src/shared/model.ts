// Normalized usage data. Only these shapes are stored; raw responses never are.

export const LIMIT_IDS = [
  'five_hour',
  'seven_day',
  'seven_day_opus',
  'seven_day_sonnet',
  'seven_day_oauth_apps',
  'seven_day_cowork',
] as const;

export type LimitId = (typeof LIMIT_IDS)[number];

export interface Limit {
  /** Percent used. Can exceed 100. Null when the endpoint gives no number. */
  utilization: number | null;
  /** ISO timestamp of the next reset. */
  resetsAt: string | null;
  /** The endpoint reports a lock reason (limit reached). */
  locked: boolean;
}

/**
 * Per limit: a `Limit`, `null` when the limit is not part of the user's plan,
 * or no key at all when the endpoint did not mention it.
 */
export type Limits = Partial<Record<LimitId, Limit | null>>;

export interface ExtraUsage {
  enabled: boolean;
  utilization: number | null;
  /** Amounts in minor units (e.g. cents), see `decimals`. */
  usedMinor: number;
  limitMinor: number;
  currency: string;
  decimals: number;
}

export interface UsageSnapshot {
  limits: Limits;
  extra: ExtraUsage | null;
}

export type FetchStatus = 'ok' | 'loggedOut' | 'apiChanged' | 'network';

export interface OrgUsage {
  /** Result of the last attempt. */
  status: FetchStatus;
  /** Time of the last attempt (ms). */
  fetchedAt: number;
  /** Consecutive failed attempts, drives the backoff. */
  failures: number;
  /** Last successful snapshot, kept while later attempts fail. */
  snapshot: UsageSnapshot | null;
  snapshotAt: number | null;
}
