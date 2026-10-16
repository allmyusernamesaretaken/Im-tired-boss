// @vitest-environment happy-dom
// Settings entry in claude.ai's settings dialog, against a simplified, anonymized
// copy of its structure (Firefox Nightly 160, 2026-10-15).

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SETTINGS_ROUTE, SettingsPage } from '../src/content/settings-page';

// The real panel renders the Preact settings UI; here we only check where it goes.
vi.mock('../src/content/settings-panel', () => ({ mountSettingsPanel: vi.fn(() => () => {}) }));

vi.stubGlobal('browser', {
  runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
});

const DIALOG = `
<div role="dialog" data-perf-overlay="settings_modal">
  <nav aria-label="Settings" data-perf-region="settings_nav">
    <ul>
      <li data-testid="general-settings"><button class="row"><span data-cds="Icon" class="icon"></span><span>General</span></button></li>
      <li data-testid="usage-settings"><button class="row"><span data-cds="Icon" class="icon"></span><span>Usage</span></button></li>
      <li><button class="row"><span data-cds="Icon" class="icon"></span><span>Capabilities</span></button></li>
    </ul>
  </nav>
  <div data-perf-region="settings_panel">
    <div id="header"><button aria-label="Close"></button></div>
    <div id="spacer"></div>
    <div id="content">Your usage</div>
  </div>
</div>`;

function setup(hash = '') {
  document.head.innerHTML = '';
  document.body.innerHTML = DIALOG;
  location.hash = hash;
  const page = new SettingsPage(document);
  page.start();
  return page;
}

const navItem = () => document.querySelector('li[data-itb="nav"]');
const content = () => document.getElementById('content')!;
const panel = () => document.querySelector<HTMLElement>('[data-itb="panel"]');

describe('SettingsPage', () => {
  beforeEach(() => {
    location.hash = '';
    sessionStorage.clear();
  });

  it('adds our entry right below Usage, styled like the others', () => {
    setup();
    const item = navItem();
    expect(item?.previousElementSibling?.getAttribute('data-testid')).toBe('usage-settings');
    expect(item?.querySelector('button')?.className).toBe('row');
    expect(item?.textContent).toContain("I'm Tired, Boss");
  });

  it('does not copy the highlight of a selected neighbor', () => {
    document.head.innerHTML = '';
    document.body.innerHTML = DIALOG.replace(
      '<li data-testid="usage-settings"><button class="row">',
      '<li data-testid="usage-settings"><button class="row selected">',
    );
    new SettingsPage(document).start();
    expect(navItem()?.querySelector('button')?.className).toBe('row');
  });

  it('does not add the entry twice', () => {
    const page = setup();
    page.ensure();
    page.ensure();
    expect(document.querySelectorAll('li[data-itb="nav"]')).toHaveLength(1);
  });

  it('shows our panel and hides claude.ai content when selected', () => {
    setup();
    navItem()!.querySelector('button')!.click();
    expect(content().hasAttribute('data-itb-hidden')).toBe(true);
    expect(panel()?.parentElement?.getAttribute('data-perf-region')).toBe('settings_panel');
    expect(document.getElementById('header')?.hasAttribute('data-itb-hidden')).toBe(false);
  });

  it('shows our address while active and forgets it when leaving', () => {
    setup('#settings/usage');
    navItem()!.querySelector('button')!.click();
    expect(location.hash).toBe(SETTINGS_ROUTE);
    expect(sessionStorage.getItem('itb-settings-open')).toBe('1');
    document.querySelector<HTMLButtonElement>('li[data-testid="general-settings"] button')!.click();
    expect(sessionStorage.getItem('itb-settings-open')).toBeNull();
  });

  it('reopens after a reload even if claude.ai rewrote the hash', () => {
    sessionStorage.setItem('itb-settings-open', '1');
    setup('#settings/general');
    expect(navItem()?.hasAttribute('data-itb-active')).toBe(true);
  });

  it('leaves on pointer down, even if claude.ai re-renders the nav before click', () => {
    setup();
    navItem()!.querySelector('button')!.click();
    const general = document.querySelector('li[data-testid="general-settings"] button')!;
    general.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    general.closest('li')!.remove(); // React replaces the node before click
    expect(navItem()?.hasAttribute('data-itb-active')).toBe(false);
    expect(content().hasAttribute('data-itb-hidden')).toBe(false);
  });

  it('leaves when another entry is chosen with the keyboard', () => {
    setup();
    navItem()!.querySelector('button')!.click();
    const general = document.querySelector('li[data-testid="general-settings"] button')!;
    general.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(navItem()?.hasAttribute('data-itb-active')).toBe(false);
  });

  it('gives the panel back when another entry is clicked', () => {
    setup();
    navItem()!.querySelector('button')!.click();
    document.querySelector<HTMLButtonElement>('li[data-testid="general-settings"] button')!.click();
    expect(content().hasAttribute('data-itb-hidden')).toBe(false);
    expect(panel()).toBeNull();
  });

  it('opens directly when the page is loaded with our route', () => {
    setup(SETTINGS_ROUTE);
    expect(navItem()?.hasAttribute('data-itb-active')).toBe(true);
    expect(panel()).not.toBeNull();
  });

  it('open() selects our entry once the dialog shows up', () => {
    document.body.innerHTML = '<main></main>';
    const page = new SettingsPage(document);
    page.start();
    page.open();
    expect(location.hash).toBe('#settings/usage');
    document.body.innerHTML = DIALOG;
    page.ensure();
    expect(navItem()?.hasAttribute('data-itb-active')).toBe(true);
  });

  it('honors a request from the early script even if claude.ai dropped the hash', () => {
    sessionStorage.setItem('itb-settings-request', '1');
    document.body.innerHTML = '<main></main>';
    location.hash = '';
    new SettingsPage(document).start();
    expect(location.hash).toBe('#settings/usage');
    expect(sessionStorage.getItem('itb-settings-request')).toBeNull();
  });

  it('sends claude.ai to the dialog route only once per request', () => {
    document.body.innerHTML = '<main></main>';
    location.hash = SETTINGS_ROUTE;
    const page = new SettingsPage(document);
    page.start();
    expect(location.hash).toBe('#settings/usage');
    // claude.ai dropped the hash again (e.g. a login redirect): do not fight its router.
    location.hash = '';
    page.ensure();
    expect(location.hash).toBe('');
  });

  it('opens the dialog via a known route when claude.ai did not', () => {
    document.body.innerHTML = '<main></main>';
    location.hash = SETTINGS_ROUTE;
    new SettingsPage(document).start();
    expect(location.hash).toBe('#settings/usage');
  });
});
