// Keeps one bar block per enabled slot in the page. React may drop or move our
// nodes when it re-renders the sidebar; a throttled MutationObserver puts them back.

import type { PositionId } from '../shared/settings';
import type { BarRow } from '../shared/view';
import { createBarsView, type BarsView } from './render';
import { SLOTS } from './slots';

const MIN_CHECK_GAP_MS = 200;

export interface MountState {
  rows: BarRow[];
  positions: Record<PositionId, boolean>;
}

export class Mounts {
  private views = new Map<PositionId, BarsView>();
  private state: MountState | null = null;
  private scheduled = false;
  private lastCheck = 0;
  private observer: MutationObserver | null = null;

  constructor(
    private readonly root: Document,
    /** Extra work to run on the same throttled DOM checks (e.g. the settings entry). */
    private readonly onCheck: () => void = () => {},
  ) {}

  start(): void {
    this.observer = new MutationObserver(() => this.schedule());
    this.observer.observe(this.root.body, { childList: true, subtree: true });
  }

  /** Which slots are currently in the page (for diagnostics). */
  found(): Record<string, boolean> {
    return Object.fromEntries(SLOTS.map((s) => [s.id, s.find(this.root) !== null]));
  }

  render(state: MountState): void {
    this.state = state;
    for (const view of this.views.values()) view.update(state.rows);
    this.ensure();
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    const wait = Math.max(0, this.lastCheck + MIN_CHECK_GAP_MS - Date.now());
    setTimeout(() => {
      requestAnimationFrame(() => {
        this.scheduled = false;
        this.lastCheck = Date.now();
        this.ensure();
        this.onCheck();
      });
    }, wait);
  }

  /** Inserts, moves or removes blocks so the page matches the state. No-op when in place. */
  ensure(): void {
    const state = this.state;
    if (!state) return;
    for (const slot of SLOTS) {
      const wanted = state.positions[slot.id];
      let view = this.views.get(slot.id);
      if (!wanted) {
        view?.host.remove();
        continue;
      }
      const point = slot.find(this.root);
      if (!point) continue;
      if (!view) {
        view = createBarsView();
        view.update(state.rows);
        this.views.set(slot.id, view);
      }
      const inPlace =
        view.host.parentElement === point.parent && view.host.nextElementSibling === point.before;
      if (!inPlace) point.parent.insertBefore(view.host, point.before);
    }
  }
}
