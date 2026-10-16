// @vitest-environment happy-dom
// Fetch scheduling against a fake claude.ai: backoff without an org, and org switches.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import USAGE from './fixtures/usage-pro.json';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';

let local: Record<string, unknown> = {};
vi.stubGlobal('browser', {
  storage: {
    local: {
      get: (keys: string[]) =>
        Promise.resolve(
          Object.fromEntries(keys.filter((k) => k in local).map((k) => [k, local[k]])),
        ),
      set: (values: Record<string, unknown>) => {
        local = { ...local, ...structuredClone(values) };
        return Promise.resolve();
      },
    },
  },
});

const fetchMock = vi.fn<(path: string) => Promise<Response>>();
vi.stubGlobal('fetch', fetchMock);
Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));
const paths = () => fetchMock.mock.calls.map(([path]) => path);
const setCookie = (org: string) => (document.cookie = `lastActiveOrg=${org}`);

async function load() {
  vi.resetModules();
  return import('../src/content/fetcher');
}

beforeEach(() => {
  local = {};
  fetchMock.mockReset();
  vi.useRealTimers();
});

describe('fetcher', () => {
  it('backs off org lookups while logged out, even with no org known yet', async () => {
    const { tick, NO_ORG_KEY } = await load();
    fetchMock.mockImplementation(() => json({}, 401));
    await tick();
    await tick();
    expect(paths()).toEqual(['/api/organizations']);
    expect(local.usageLastOrg).toBe(NO_ORG_KEY);
    expect((local.usage as Record<string, { status: string }>)[NO_ORG_KEY]?.status).toBe(
      'loggedOut',
    );
  });

  it('resolves the org again when claude.ai switches it without a reload', async () => {
    const { tick } = await load();
    const orgs = [
      { uuid: ORG_A, capabilities: ['chat'] },
      { uuid: ORG_B, capabilities: ['chat'] },
    ];
    fetchMock.mockImplementation((path) =>
      path === '/api/organizations' ? json(orgs) : json(USAGE),
    );
    setCookie(ORG_A);
    await tick();
    await tick(); // fresh: no request
    setCookie(ORG_B);
    await tick();
    expect(paths()).toEqual([
      '/api/organizations',
      `/api/organizations/${ORG_A}/usage`,
      '/api/organizations',
      `/api/organizations/${ORG_B}/usage`,
    ]);
  });
});
