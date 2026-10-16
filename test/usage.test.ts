import { describe, expect, it } from 'vitest';
import type { OrgUsage, UsageSnapshot } from '../src/shared/model';
import {
  MAX_BACKOFF_MS,
  REFRESH_INTERVAL_MS,
  applyResult,
  nextFetchAt,
  orgKey,
} from '../src/shared/usage';

const snapshot: UsageSnapshot = {
  limits: { five_hour: { utilization: 10, resetsAt: null, locked: false } },
  extra: null,
};

const entry = (over: Partial<OrgUsage>): OrgUsage => ({
  status: 'ok',
  fetchedAt: 1_000,
  failures: 0,
  snapshot,
  snapshotAt: 1_000,
  ...over,
});

describe('nextFetchAt', () => {
  it('fetches immediately without stored data', () => {
    expect(nextFetchAt(undefined)).toBe(0);
  });

  it('waits one interval after success or when logged out', () => {
    expect(nextFetchAt(entry({}))).toBe(1_000 + REFRESH_INTERVAL_MS);
    expect(nextFetchAt(entry({ status: 'loggedOut', failures: 4 }))).toBe(
      1_000 + REFRESH_INTERVAL_MS,
    );
  });

  it('backs off exponentially on errors, capped', () => {
    expect(nextFetchAt(entry({ status: 'network', failures: 1 }))).toBe(
      1_000 + REFRESH_INTERVAL_MS,
    );
    expect(nextFetchAt(entry({ status: 'network', failures: 3 }))).toBe(
      1_000 + 4 * REFRESH_INTERVAL_MS,
    );
    expect(nextFetchAt(entry({ status: 'apiChanged', failures: 20 }))).toBe(1_000 + MAX_BACKOFF_MS);
  });
});

describe('applyResult', () => {
  it('stores a successful snapshot and resets failures', () => {
    const next = applyResult(
      entry({ status: 'network', failures: 3 }),
      { status: 'ok', snapshot },
      5_000,
    );
    expect(next).toEqual({
      status: 'ok',
      fetchedAt: 5_000,
      failures: 0,
      snapshot,
      snapshotAt: 5_000,
    });
  });

  it('keeps the last snapshot when a fetch fails', () => {
    const next = applyResult(entry({}), { status: 'network' }, 5_000);
    expect(next.status).toBe('network');
    expect(next.failures).toBe(1);
    expect(next.snapshot).toBe(snapshot);
    expect(next.snapshotAt).toBe(1_000);
  });

  it('starts counting failures without previous data', () => {
    expect(applyResult(undefined, { status: 'loggedOut' }, 5_000)).toEqual({
      status: 'loggedOut',
      fetchedAt: 5_000,
      failures: 1,
      snapshot: null,
      snapshotAt: null,
    });
  });
});

describe('orgKey', () => {
  it('is stable, short and does not contain the id', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const key = orgKey(id);
    expect(key).toMatch(/^[0-9a-f]{16}$/);
    expect(orgKey(id)).toBe(key);
    expect(key).not.toContain('1111-');
  });
});
