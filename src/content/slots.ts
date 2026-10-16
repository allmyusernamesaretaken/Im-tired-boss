// Where the bars go in claude.ai. All claude.ai selectors live here.
// Prefer data-testid over aria-label (localized) and over generated class names.
// We only insert as a sibling in front of an existing child, never in the middle
// of a node React is about to replace.

import type { PositionId } from '../shared/settings';

export const SELECTORS = {
  sidebarBody: '[data-testid="sidebar"]',
  newChatRow: 'a[href="/new"][data-row]',
  userMenu: '[data-testid="user-menu-button"]',
} as const;

export interface InsertPoint {
  parent: Element;
  before: Element;
}

export interface Slot {
  id: PositionId;
  find(root: ParentNode): InsertPoint | null;
}

/** The direct child of `container` that contains `node`. */
export function childOf(container: Element, node: Element | null): Element | null {
  let current = node;
  while (current && current.parentElement !== container) current = current.parentElement;
  return current;
}

function beforeChildContaining(root: ParentNode, selector: string): InsertPoint | null {
  const body = root.querySelector(SELECTORS.sidebarBody);
  if (!body) return null;
  const before = childOf(body, body.querySelector(selector));
  return before ? { parent: body, before } : null;
}

export const SLOTS: readonly Slot[] = [
  // Right above the "New" row: below the title bar when expanded,
  // below logo and mode switch in the collapsed peek panel.
  { id: 'top', find: (root) => beforeChildContaining(root, SELECTORS.newChatRow) },
  // Right above the profile button.
  { id: 'bottom', find: (root) => beforeChildContaining(root, SELECTORS.userMenu) },
  // No separate slot for a collapsed sidebar: claude.ai then only shows a
  // "Show sidebar" button, and the peek panel already contains the top slot.
];
