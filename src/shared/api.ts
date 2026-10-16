// claude.ai endpoints and validation of their (undocumented) responses.
// Everything here is pure so it can be tested without a browser.

import {
  LIMIT_IDS,
  type ExtraUsage,
  type FetchStatus,
  type Limit,
  type LimitId,
  type Limits,
  type UsageSnapshot,
} from './model';

export const ORGS_PATH = '/api/organizations';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isOrgId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function usagePath(orgId: string): string {
  if (!isOrgId(orgId)) throw new Error('Invalid organization id');
  return `/api/organizations/${orgId}/usage`;
}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A finite, non-negative number, otherwise null. */
const amount = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;

function isoDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const time = Date.parse(v);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

/** `undefined` means the field is missing or unusable, `null` means "not in plan". */
function parseLimit(v: unknown): Limit | null | undefined {
  if (v === null) return null;
  if (!isObject(v)) return undefined;
  const utilization = amount(v.utilization);
  const resetsAt = isoDate(v.resets_at);
  if (utilization === null && resetsAt === null) return undefined;
  return { utilization, resetsAt, locked: v.locked_reason != null };
}

/** Kinds in the generic `limits[]` list, used when the named fields are missing. */
const FALLBACK_KINDS: Readonly<Record<string, LimitId>> = {
  session: 'five_hour',
  weekly_all: 'seven_day',
};

function parseFallbackLimits(v: unknown, limits: Limits): void {
  if (!Array.isArray(v)) return;
  for (const item of v) {
    if (!isObject(item) || typeof item.kind !== 'string') continue;
    const id = FALLBACK_KINDS[item.kind];
    if (!id || limits[id] !== undefined) continue;
    const utilization = amount(item.percent);
    const resetsAt = isoDate(item.resets_at);
    if (utilization === null && resetsAt === null) continue;
    limits[id] = { utilization, resetsAt, locked: false };
  }
}

function parseExtra(v: unknown): ExtraUsage | null {
  if (!isObject(v) || typeof v.is_enabled !== 'boolean') return null;
  const usedMinor = amount(v.used_credits);
  const limitMinor = amount(v.monthly_limit);
  if (usedMinor === null || limitMinor === null) return null;
  const decimals =
    typeof v.decimal_places === 'number' &&
    Number.isInteger(v.decimal_places) &&
    v.decimal_places >= 0 &&
    v.decimal_places <= 4
      ? v.decimal_places
      : 2;
  const currency =
    typeof v.currency === 'string' && /^[A-Z]{3}$/.test(v.currency) ? v.currency : 'USD';
  return {
    enabled: v.is_enabled,
    utilization: amount(v.utilization),
    usedMinor,
    limitMinor,
    currency,
    decimals,
  };
}

/**
 * Validates a usage response. Returns null when it does not look like the
 * expected format at all (treated as "API changed").
 */
export function parseUsage(json: unknown): UsageSnapshot | null {
  if (!isObject(json)) return null;
  const limits: Limits = {};
  for (const id of LIMIT_IDS) {
    const limit = parseLimit(json[id]);
    if (limit !== undefined) limits[id] = limit;
  }
  parseFallbackLimits(json.limits, limits);
  if (limits.five_hour === undefined && limits.seven_day === undefined) return null;
  return { limits, extra: parseExtra(json.extra_usage) };
}

/**
 * Picks the organization to show: the one from the `lastActiveOrg` cookie if
 * present, otherwise the first with chat capability, otherwise the first.
 */
export function pickOrg(json: unknown, preferred?: string): string | null {
  if (!Array.isArray(json)) return null;
  const orgs = json.filter(isObject).filter((o) => isOrgId(o.uuid));
  const byId = (id: string) => orgs.find((o) => o.uuid === id);
  const chat = orgs.find((o) => Array.isArray(o.capabilities) && o.capabilities.includes('chat'));
  const org = (preferred && byId(preferred)) || chat || orgs[0];
  return org && isOrgId(org.uuid) ? org.uuid : null;
}

export function statusFromHttp(status: number): Exclude<FetchStatus, 'ok'> {
  if (status === 401 || status === 403) return 'loggedOut';
  if (status === 404) return 'apiChanged';
  return 'network';
}
