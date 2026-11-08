// The bar block, rendered into a closed shadow root so claude.ai's styles and
// ours never mix. Colors come from claude.ai's CDS variables with color-mix()
// fallbacks based on the inherited text color, so light and dark mode just work.
// Only textContent is used for text.

import { t } from '../shared/i18n';
import type { BarRow } from '../shared/view';

const CSS = `
:host { display: block; }
.block { margin: 0; }
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
/* Footer with status, "Update now" and settings. Its space is always reserved,
   so the sidebar never shifts; it only becomes visible while hovered or focused
   (opacity, not visibility, so keyboard focus can still reach the buttons). */
.foot { margin-top: 1px; opacity: 0; transition: opacity .15s; }
.block:hover .foot, .block:focus-within .foot, .foot.busy { opacity: 1; }
.foot-inner {
  display: flex; align-items: center; gap: 2px;
  padding: 0 4px 0 10px;
  font-size: 11px; line-height: 14px;
  color: var(--cds-text-muted, color-mix(in srgb, currentColor 55%, transparent));
}
.status { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.status.error { color: var(--cds-text-danger, #c0392b); }
.btn {
  display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0;
  margin: 0; padding: 3px 7px; border: 0; border-radius: 6px;
  background: transparent; color: inherit; font: inherit; cursor: pointer; white-space: nowrap;
}
.btn:hover, .btn:focus-visible {
  color: var(--cds-text-primary, currentColor);
  background: var(--cds-fill-ghost-hover, color-mix(in srgb, currentColor 7%, transparent));
}
.btn:disabled { cursor: default; opacity: .7; }
.btn svg { width: 12px; height: 12px; flex-shrink: 0; }
.spin { animation: itb-spin .8s linear infinite; }
@keyframes itb-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .fill, .row, .foot { transition: none; }
  .spin { animation: none; }
}
`;

const SVG_NS = 'http://www.w3.org/2000/svg';
const REFRESH_PATHS = ['M20 11a8 8 0 1 0-2.34 5.66', 'M20 4v7h-7'];
const GEAR_PATHS = [
  'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z',
  'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
];

function icon(paths: string[]): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

/** The status line under the bars, e.g. "Updated 3 min ago." */
export interface FooterStatus {
  text: string;
  error: boolean;
}

/** What the footer buttons do; provided by the content script. */
export interface BarsActions {
  refresh(): Promise<void>;
  openSettings(): void;
}

export interface BarsView {
  host: HTMLElement;
  update(rows: BarRow[], status: FooterStatus): void;
}

/** The host carries data-itb="bars"; the context menu entry checks for it (see background). */
export function createBarsView(actions: BarsActions): BarsView {
  const host = document.createElement('div');
  host.dataset.itb = 'bars';
  const shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = CSS;
  const block = document.createElement('div');
  block.className = 'block';
  const list = document.createElement('div');
  list.className = 'list';

  const foot = document.createElement('div');
  foot.className = 'foot';
  const inner = document.createElement('div');
  inner.className = 'foot-inner';
  const status = document.createElement('span');
  status.className = 'status';

  const refreshIcon = icon(REFRESH_PATHS);
  const refreshLabel = document.createElement('span');
  const refresh = document.createElement('button');
  refresh.type = 'button';
  refresh.className = 'btn';
  refresh.append(refreshIcon, refreshLabel);
  const setBusy = (busy: boolean) => {
    refresh.disabled = busy;
    foot.classList.toggle('busy', busy);
    refreshIcon.classList.toggle('spin', busy);
    refreshLabel.textContent = busy ? t('updating', 'Updating…') : t('updateNow', 'Update now');
  };
  setBusy(false);
  refresh.addEventListener('click', () => {
    setBusy(true);
    actions
      .refresh()
      .catch(() => {})
      .finally(() => setBusy(false));
  });

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'btn';
  settings.title = t('openSettings', 'Settings');
  settings.setAttribute('aria-label', settings.title);
  settings.append(icon(GEAR_PATHS));
  settings.addEventListener('click', () => actions.openSettings());

  inner.append(status, refresh, settings);
  foot.append(inner);
  block.append(list, foot);
  shadow.append(style, block);

  return {
    host,
    update(rows, footer) {
      host.hidden = rows.length === 0;
      list.replaceChildren(...rows.map(renderRow));
      status.textContent = footer.text;
      status.title = footer.text;
      status.classList.toggle('error', footer.error);
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
