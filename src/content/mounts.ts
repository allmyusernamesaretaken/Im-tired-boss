// Keeps one bar block per enabled slot in the page. React may drop or move our
// nodes when it re-renders the sidebar; a throttled MutationObserver puts them back.

import type { PositionId } from '../shared/settings';
import type { BarRow } from '../shared/view';
import { createBarsView, type BarsActions, type BarsView, type FooterStatus } from './render';
import { SLOTS } from './slots';

const MIN_CHECK_GAP_MS = 200;

export interface MountState {
  rows: BarRow[];
  status: FooterStatus;
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
    private readonly onCheck: () => void,
    /** What the footer buttons under the bars do. */
    private readonly actions: BarsActions,
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
    for (const view of this.views.values()) view.update(state.rows, state.status);
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
        view = createBarsView(this.actions);
        view.update(state.rows, state.status);
        this.views.set(slot.id, view);
      }
      const inPlace =
        view.host.parentElement === point.parent && view.host.nextElementSibling === point.before;
      if (!inPlace) point.parent.insertBefore(view.host, point.before);
      if (slot.snugTo) snug(view.host, point.before, slot.snugTo);
    }
  }
}

/** Gap left between our block and the element below it (see Slot.snugTo). */
const SNUG_GAP_PX = 2;
/** Never pull up further than this, in case a measurement is off. */
const MAX_SNUG_PX = 16;

/**
 * claude.ai's own spacing above the element we sit on top of would leave a gap
 * under our footer. Measures it and pulls the element up with a negative margin.
 */
function snug(host: HTMLElement, before: Element, selector: string): void {
  const target = before.matches(selector) ? before : before.querySelector(selector);
  if (!target || host.hidden) return;
  const targetBox = target.getBoundingClientRect();
  const hostBox = host.getBoundingClientRect();
  if (targetBox.height === 0 || hostBox.height === 0) return; // Not laid out (e.g. collapsed).
  const current = parseFloat(host.style.marginBottom) || 0;
  const gap = targetBox.top - hostBox.bottom;
  const next = Math.max(-MAX_SNUG_PX, Math.min(0, current - (gap - SNUG_GAP_PX)));
  if (Math.abs(next - current) < 0.5) return;
  host.style.marginBottom = `${next}px`;
  // The element below now overlaps our margin: keep our buttons on top and clickable.
  host.style.position = 'relative';
  host.style.zIndex = '1';
}
