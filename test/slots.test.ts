// @vitest-environment happy-dom
// Slot lookup against simplified, anonymized copies of the claude.ai sidebar
// (structure from the phase 0 spike, Firefox Nightly 160, 2026-10-15).

import { describe, expect, it } from 'vitest';
import { SLOTS } from '../src/content/slots';

const EXPANDED = `
<aside aria-label="Sidebar">
  <div class="df-titlebar"><a href="/new">Claude</a></div>
  <div data-testid="sidebar">
    <div id="list">
      <div><a href="/new" data-row>New</a></div>
      <div data-testid="nav-pin-rows"></div>
    </div>
    <div class="df-banner-slot"></div>
    <div id="tray"><div><button data-testid="user-menu-button">M</button></div></div>
  </div>
</aside>`;

const COLLAPSED_PEEK = `
<div data-collapsed="true">
  <button data-testid="sidebar-compact-trigger">Show sidebar</button>
  <aside aria-label="Sidebar">
    <div data-testid="sidebar">
      <div class="df-peek-wordmark"><a href="/new">Claude</a></div>
      <div class="df-peek-mode-switch"></div>
      <div id="list"><div><button>Search</button></div><div><a href="/new" data-row>New</a></div></div>
      <div class="df-banner-slot"></div>
      <div id="tray"><button data-testid="user-menu-button">M</button></div>
    </div>
  </aside>
</div>`;

const slot = (id: string) => SLOTS.find((s) => s.id === id)!;

function load(html: string): Document {
  document.body.innerHTML = html;
  return document;
}

describe('slots', () => {
  it('top: in front of the list with the New row, below the title bar', () => {
    const point = slot('top').find(load(EXPANDED));
    expect(point?.parent.getAttribute('data-testid')).toBe('sidebar');
    expect(point?.before.id).toBe('list');
  });

  it('top: below logo and mode switch in the collapsed peek panel', () => {
    const point = slot('top').find(load(COLLAPSED_PEEK));
    expect(point?.before.id).toBe('list');
    expect(point?.before.previousElementSibling?.className).toBe('df-peek-mode-switch');
  });

  it('top: ignores the logo link, which is not a row', () => {
    const doc = load(EXPANDED.replace('<a href="/new" data-row>New</a>', ''));
    expect(slot('top').find(doc)).toBeNull();
  });

  it('bottom: in front of the profile tray in both states', () => {
    expect(slot('bottom').find(load(EXPANDED))?.before.id).toBe('tray');
    expect(slot('bottom').find(load(COLLAPSED_PEEK))?.before.id).toBe('tray');
  });

  it('finds nothing when the sidebar is missing', () => {
    const doc = load('<main></main>');
    for (const s of SLOTS) expect(s.find(doc)).toBeNull();
  });
});
