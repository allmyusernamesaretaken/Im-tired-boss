// The bar block, rendered into a closed shadow root so claude.ai's styles and
// ours never mix. Colors come from claude.ai's CDS variables with color-mix()
// fallbacks based on the inherited text color, so light and dark mode just work.
// Only textContent is used for text.

import type { BarRow } from '../shared/view';

const CSS = `
:host { display: block; }
.block { margin: 0 0 6px; }
.list { display: flex; flex-direction: column; gap: 0; }
/* Hover highlight per bar, like claude.ai's sidebar rows. No action attached. */
.row {
  padding: 7px 10px 8px; border-radius: 8px; cursor: default;
  transition: background-color .15s;
}
.row:hover {
  background: var(--cds-fill-ghost-hover, color-mix(in srgb, currentColor 7%, transparent));
}
.label {
  display: flex; justify-content: space-between; gap: 8px; margin-bottom: 3px;
  font-size: 11px; line-height: 14px; white-space: nowrap;
  color: var(--cds-text-muted, color-mix(in srgb, currentColor 55%, transparent));
}
.label span { overflow: hidden; text-overflow: ellipsis; }
.track {
  height: 3px; border-radius: 2px; overflow: hidden;
  background: var(--cds-border, color-mix(in srgb, currentColor 15%, transparent));
}
.fill { height: 100%; border-radius: 2px; transition: width .3s; }
@media (prefers-reduced-motion: reduce) {
  .fill, .row { transition: none; }
}
`;

export interface BarsView {
  host: HTMLElement;
  update(rows: BarRow[]): void;
}

/** The host carries data-itb="bars"; the context menu entry checks for it (see background). */
export function createBarsView(): BarsView {
  const host = document.createElement('div');
  host.dataset.itb = 'bars';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = CSS;
  const block = document.createElement('div');
  block.className = 'block';
  const list = document.createElement('div');
  list.className = 'list';
  block.append(list);
  shadow.append(style, block);

  return {
    host,
    update(rows) {
      host.hidden = rows.length === 0;
      list.replaceChildren(...rows.map(renderRow));
    },
  };
}

function renderRow(row: BarRow): HTMLElement {
  const item = document.createElement('div');
  item.className = 'row';
  item.title = row.title;

  if (row.left || row.right) {
    const label = document.createElement('div');
    label.className = 'label';
    const left = document.createElement('span');
    left.textContent = row.left;
    const right = document.createElement('span');
    right.textContent = row.right;
    label.append(left, right);
    item.append(label);
  }

  const track = document.createElement('div');
  track.className = 'track';
  track.setAttribute('role', 'progressbar');
  track.setAttribute('aria-label', row.name);
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', '100');
  if (row.pct !== null) track.setAttribute('aria-valuenow', String(Math.round(row.pct)));
  const fill = document.createElement('div');
  fill.className = 'fill';
  fill.style.width = `${row.width}%`;
  fill.style.background = row.color;
  track.append(fill);
  item.append(track);
  return item;
}
