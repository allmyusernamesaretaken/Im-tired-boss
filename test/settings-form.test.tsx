// @vitest-environment happy-dom
import { render } from 'preact';
import { describe, expect, it, vi } from 'vitest';
import type { UsageSnapshot } from '../src/shared/model';
import { enableExpert } from '../src/shared/resolve';
import { DEFAULTS } from '../src/shared/settings';
import { Preview } from '../src/ui/Preview';
import { SettingsForm } from '../src/ui/SettingsForm';

vi.stubGlobal('browser', {
  i18n: { getMessage: () => '' },
  runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
});

const snapshot: UsageSnapshot = {
  limits: {
    five_hour: { utilization: 37, resetsAt: '2026-10-15T14:14:00.000Z', locked: false },
    seven_day: { utilization: 23, resetsAt: '2026-10-17T21:00:00.000Z', locked: false },
    seven_day_opus: null,
  },
  extra: null,
};

describe('settings UI', () => {
  it('renders the form', () => {
    const root = document.createElement('div');
    render(
      <SettingsForm settings={structuredClone(DEFAULTS)} snapshot={snapshot} update={() => {}} />,
      root,
    );
    expect(root.textContent).toContain('Week, all models');
    expect(root.textContent).toContain('Not in your plan');
  });

  it('renders the expert form instead of the text section', () => {
    const root = document.createElement('div');
    render(
      <SettingsForm
        settings={enableExpert(structuredClone(DEFAULTS))}
        snapshot={snapshot}
        update={() => {}}
      />,
      root,
    );
    expect(root.textContent).toContain('All bars');
    expect(root.textContent).toContain('Per bar');
    expect(root.textContent).not.toContain('Show reset as');
  });

  it('renders the preview', () => {
    const root = document.createElement('div');
    render(
      <Preview
        settings={structuredClone(DEFAULTS)}
        snapshot={snapshot}
        now={new Date('2026-10-15T12:00:00Z')}
      />,
      root,
    );
    expect(root.textContent).toContain('5h · 37%');
  });
});
