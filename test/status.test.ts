import { describe, expect, it } from 'vitest';
import type { OrgUsage } from '../src/shared/model';
import { describeStatus, STALE_AFTER_MS } from '../src/shared/status';

const now = 10_000_000;
const entry = (over: Partial<OrgUsage>): OrgUsage => ({
  status: 'ok',
  fetchedAt: now - 60_000,
  failures: 0,
  snapshot: { limits: {}, extra: null },
  snapshotAt: now - 60_000,
  ...over,
});

describe('describeStatus', () => {
  it('asks to open claude.ai without data', () => {
    expect(describeStatus(null, now).kind).toBe('empty');
  });

  it('shows how long ago the data was updated', () => {
    expect(describeStatus(entry({}), now)).toMatchObject({ kind: 'ok', ago: '1m' });
  });

  it('calls out stale data', () => {
    const old = entry({ snapshotAt: now - STALE_AFTER_MS - 60_000 });
    expect(describeStatus(old, now)).toMatchObject({ kind: 'stale', ago: '31m' });
  });

  it('reports errors with the age of the last good data', () => {
    expect(describeStatus(entry({ status: 'loggedOut' }), now)).toMatchObject({
      kind: 'error',
      key: 'statusLoggedOut',
      ago: '1m',
    });
    expect(describeStatus(entry({ status: 'apiChanged', snapshotAt: null }), now)).toMatchObject({
      kind: 'error',
      key: 'statusApiChanged',
      ago: undefined,
    });
  });
});
