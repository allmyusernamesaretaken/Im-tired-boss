import { describe, expect, it } from 'vitest';
import { isOrgId, parseUsage, pickOrg, statusFromHttp, usagePath } from '../src/shared/api';
import fixture from './fixtures/usage-pro.json';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';

describe('parseUsage', () => {
  it('reads a Pro plan response', () => {
    const snapshot = parseUsage(fixture);
    expect(snapshot?.limits.five_hour).toEqual({
      utilization: 37,
      resetsAt: '2026-10-15T14:09:59.898Z',
      locked: false,
    });
    expect(snapshot?.limits.seven_day?.utilization).toBe(23);
  });

  it('marks limits that are null as not in plan and ignores unknown fields', () => {
    const snapshot = parseUsage(fixture);
    expect(snapshot?.limits.seven_day_opus).toBeNull();
    expect(snapshot?.limits.seven_day_cowork).toBeNull();
    expect(snapshot?.limits).not.toHaveProperty('iguana_necktie');
  });

  it('leaves out limits the response does not mention', () => {
    const { seven_day_cowork: _omit, ...rest } = fixture;
    expect(parseUsage(rest)?.limits).not.toHaveProperty('seven_day_cowork');
  });

  it('keeps values above 100 percent', () => {
    const json = { ...fixture, five_hour: { ...fixture.five_hour, utilization: 104 } };
    expect(parseUsage(json)?.limits.five_hour?.utilization).toBe(104);
  });

  it('flags a locked limit', () => {
    const json = { ...fixture, five_hour: { ...fixture.five_hour, locked_reason: 'limit' } };
    expect(parseUsage(json)?.limits.five_hour?.locked).toBe(true);
  });

  it('rejects invalid numbers and dates', () => {
    const json = {
      ...fixture,
      five_hour: { utilization: -5, resets_at: 'soon' },
      seven_day: { utilization: Number.NaN, resets_at: null },
      limits: [],
    };
    expect(parseUsage(json)).toBeNull();
  });

  it('falls back to limits[] when the named fields are missing', () => {
    const { five_hour: _a, seven_day: _b, ...rest } = fixture;
    const snapshot = parseUsage(rest);
    expect(snapshot?.limits.five_hour?.utilization).toBe(37);
    expect(snapshot?.limits.seven_day?.utilization).toBe(23);
  });

  it('prefers the named fields over limits[]', () => {
    const json = { ...fixture, limits: [{ kind: 'session', percent: 99, resets_at: null }] };
    expect(parseUsage(json)?.limits.five_hour?.utilization).toBe(37);
  });

  it('returns null for responses that do not look like usage at all', () => {
    expect(parseUsage(null)).toBeNull();
    expect(parseUsage([])).toBeNull();
    expect(parseUsage({ error: 'nope' })).toBeNull();
  });

  it('reads extra usage', () => {
    expect(parseUsage(fixture)?.extra).toEqual({
      enabled: false,
      utilization: 0,
      usedMinor: 0,
      limitMinor: 10000,
      currency: 'USD',
      decimals: 2,
    });
  });

  it('drops malformed extra usage', () => {
    const json = { ...fixture, extra_usage: { is_enabled: 'yes' } };
    expect(parseUsage(json)?.extra).toBeNull();
  });
});

describe('pickOrg', () => {
  const orgs = [
    { uuid: ORG_A, capabilities: ['api'] },
    { uuid: ORG_B, capabilities: ['chat', 'claude_pro'] },
  ];

  it('prefers the lastActiveOrg cookie', () => {
    expect(pickOrg(orgs, ORG_A)).toBe(ORG_A);
  });

  it('otherwise takes the first org with chat', () => {
    expect(pickOrg(orgs)).toBe(ORG_B);
    expect(pickOrg(orgs, 'not-a-known-id')).toBe(ORG_B);
  });

  it('ignores entries without a valid id', () => {
    expect(pickOrg([{ uuid: '../../etc', capabilities: ['chat'] }])).toBeNull();
    expect(pickOrg({})).toBeNull();
  });
});

describe('usagePath', () => {
  it('builds the path for a valid id', () => {
    expect(usagePath(ORG_A)).toBe(`/api/organizations/${ORG_A}/usage`);
  });

  it('refuses anything that is not an org id', () => {
    expect(isOrgId('abc')).toBe(false);
    expect(() => usagePath('../x')).toThrow();
  });
});

describe('statusFromHttp', () => {
  it('maps status codes', () => {
    expect(statusFromHttp(401)).toBe('loggedOut');
    expect(statusFromHttp(403)).toBe('loggedOut');
    expect(statusFromHttp(404)).toBe('apiChanged');
    expect(statusFromHttp(429)).toBe('network');
    expect(statusFromHttp(503)).toBe('network');
  });
});
