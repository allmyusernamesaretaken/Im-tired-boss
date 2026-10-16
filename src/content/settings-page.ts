// Adds an "I'm Tired, Boss" entry to the claude.ai settings dialog, right below
// "Usage". Selecting it renders the extension settings (shadow DOM) in place of
// claude.ai's own panel. Opening claude.ai with #settings/im-tired-boss jumps
// straight there (used by the gear next to the bars).
//
// claude.ai keeps rendering its own content; we only hide it while ours is active
// and never remove or rewrite React-managed nodes.

import { mountSettingsPanel } from './settings-panel';
import { SETTINGS_REQUEST_KEY, SETTINGS_ROUTE } from './settings-route';

export { SETTINGS_ROUTE };
// Our entry sits below Usage, so open the dialog there.
const FALLBACK_ROUTE = '#settings/usage';
/** How long we wait for the dialog after a request before giving up. */
const PENDING_FOR_MS = 10_000;

export const SETTINGS_SELECTORS = {
  dialog: '[role="dialog"][data-perf-overlay="settings_modal"]',
  nav: 'nav[data-perf-region="settings_nav"]',
  panel: '[data-perf-region="settings_panel"]',
  usageItem: 'li[data-testid="usage-settings"]',
} as const;

const LABEL = "I'm Tired, Boss";
const SVG_NS = 'http://www.w3.org/2000/svg';

const PAGE_CSS = `
[data-itb-hidden] { display: none !important; }
li[data-itb="nav"][data-itb-active] > button { background: var(--cds-fill-ghost-selected, rgba(127,127,127,.15)) !important; color: var(--cds-text-primary, inherit) !important; }
/* claude.ai still thinks its own entry is selected while ours is shown: hide that highlight. */
nav[data-itb-nav-active] li:not([data-itb]) > button:not(:hover) { background: transparent !important; color: var(--cds-text-secondary, inherit) !important; box-shadow: none !important; }
[data-itb="panel"] { flex: 1; min-height: 0; overflow-y: auto; }
`;

function puzzleIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', '16');
  svg.setAttribute('height', '16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute(
    'd',
    'M4 7h3a1 1 0 0 0 1-1v-1a2 2 0 0 1 4 0v1a1 1 0 0 0 1 1h3a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h1a2 2 0 0 1 0 4h-1a1 1 0 0 0-1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-1a2 2 0 0 0-4 0v1a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a2 2 0 0 0 0-4h-1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1',
  );
  svg.append(path);
  return svg;
}

/** The value that occurs most often (ties: first seen). */
function mostCommon(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [v, n] of counts) if (n > bestCount) [best, bestCount] = [v, n];
  return best;
}

/**
 * Builds our entry with the look of claude.ai's entries. Uses the most common
 * class names, so a currently selected neighbor does not pass on its highlight.
 */
export function buildNavItem(nav: Element, onSelect: () => void): HTMLLIElement {
  const buttons = Array.from(nav.querySelectorAll('li:not([data-itb]) > button'));
  const li = document.createElement('li');
  li.dataset.itb = 'nav';
  const button = document.createElement('button');
  button.type = 'button';
  button.title = `${LABEL} (extension)`;
  button.className = mostCommon(buttons.map((b) => b.className));
  const icon = document.createElement('span');
  icon.className = mostCommon(
    buttons.map((b) => b.querySelector('[data-cds="Icon"]')?.className ?? ''),
  );
  icon.style.display = 'inline-flex';
  icon.append(puzzleIcon());
  const label = document.createElement('span');
  label.className = 'min-w-0 flex-1 truncate';
  label.textContent = LABEL;
  button.append(icon, label);
  button.addEventListener('click', onSelect);
  li.append(button);
  return li;
}

/** Remembers across reloads that our entry was open (claude.ai may rewrite the hash on load). */
const OPEN_FLAG = 'itb-settings-open';

function flag(doc: Document, value?: boolean): boolean {
  try {
    const store = doc.defaultView?.sessionStorage;
    if (!store) return false;
    if (value === true) store.setItem(OPEN_FLAG, '1');
    if (value === false) store.removeItem(OPEN_FLAG);
    return store.getItem(OPEN_FLAG) === '1';
  } catch {
    return false;
  }
}

/** Reads and clears the note left by the early content script. */
function consumeRequest(doc: Document): boolean {
  try {
    const store = doc.defaultView?.sessionStorage;
    if (store?.getItem(SETTINGS_REQUEST_KEY) !== '1') return false;
    store.removeItem(SETTINGS_REQUEST_KEY);
    return true;
  } catch {
    return false;
  }
}

export class SettingsPage {
  private navItem: HTMLLIElement | null = null;
  private panelHost: HTMLDivElement | null = null;
  private unmountPanel: (() => void) | null = null;
  private hiddenContent: Element | null = null;
  private active = false;
  /** Set when our entry was requested and the dialog is not there yet. Expires. */
  private pending = false;
  private pendingTimer: ReturnType<typeof setTimeout> | undefined;
  /** We already sent claude.ai to FALLBACK_ROUTE for the current request. */
  private redirected = false;

  constructor(private readonly root: Document) {
    const hash = root.location.hash;
    if (
      hash === SETTINGS_ROUTE ||
      consumeRequest(root) ||
      (flag(root) && hash.startsWith('#settings/'))
    ) {
      this.request();
    }
  }

  /** Starts a request to show our entry; it ends when shown or after PENDING_FOR_MS. */
  private request(): void {
    this.pending = true;
    this.redirected = false;
    clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => (this.pending = false), PENDING_FOR_MS);
  }

  /**
   * Sends claude.ai to the route that opens its dialog, once per request. Replaces
   * the history entry, so Back still leaves the page as before.
   */
  private openDialogRoute(): void {
    if (this.redirected) return;
    this.redirected = true;
    const { location } = this.root;
    location.replace(location.pathname + location.search + FALLBACK_ROUTE);
  }

  start(): void {
    const style = this.root.createElement('style');
    style.dataset.itb = 'style';
    style.textContent = PAGE_CSS;
    this.root.head.append(style);

    this.root.defaultView?.addEventListener('hashchange', () => {
      if (this.root.location.hash === SETTINGS_ROUTE) this.request();
      else if (this.active && this.root.location.hash.startsWith('#settings/')) this.deactivate();
      this.ensure();
    });
    // Leave our panel as soon as one of claude.ai's own entries is chosen. claude.ai
    // reacts on pointer down and may re-render the nav before "click" arrives, so
    // listen early (capture phase) and also for keyboard selection.
    const onChoose = (e: Event) => {
      if (!this.active) return;
      if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
      const target = e.target as Element | null;
      const item = target?.closest?.(`${SETTINGS_SELECTORS.nav} li`);
      if (item && item !== this.navItem) this.deactivate();
    };
    for (const type of ['pointerdown', 'click', 'keydown']) {
      this.root.addEventListener(type, onChoose, true);
    }
    this.ensure();
  }

  /**
   * Opens the settings dialog in this tab with our entry selected. Uses a route
   * claude.ai knows to open the dialog, then selects ours once it is rendered.
   */
  open(): void {
    this.request();
    if (this.root.querySelector(SETTINGS_SELECTORS.dialog)) this.ensure();
    else this.openDialogRoute();
  }

  /** What was found in the settings dialog (for diagnostics, no content). */
  status(): Record<string, boolean> {
    const dialog = this.root.querySelector(SETTINGS_SELECTORS.dialog);
    return {
      settingsDialog: !!dialog,
      settingsNav: !!dialog?.querySelector(SETTINGS_SELECTORS.nav),
      settingsUsageItem: !!dialog?.querySelector(SETTINGS_SELECTORS.usageItem),
      settingsPanel: !!dialog?.querySelector(SETTINGS_SELECTORS.panel),
      settingsEntry: !!this.navItem?.isConnected,
      settingsActive: this.active,
    };
  }

  /** Called on DOM changes (throttled by the caller). Idempotent. */
  ensure(): void {
    const dialog = this.root.querySelector(SETTINGS_SELECTORS.dialog);
    if (!dialog) {
      this.reset();
      // Opened with our route but claude.ai did not open the dialog: open it via a known route.
      const hash = this.root.location.hash;
      if (this.pending && (hash === SETTINGS_ROUTE || !hash.startsWith('#settings/'))) {
        this.openDialogRoute();
      }
      return;
    }

    const nav = dialog.querySelector(SETTINGS_SELECTORS.nav);
    const usage = nav?.querySelector(SETTINGS_SELECTORS.usageItem) ?? nav?.querySelector('ul > li');
    const list = usage?.parentElement;
    if (!usage || !list) return;

    if (!this.navItem && nav) this.navItem = buildNavItem(nav, () => this.activate());
    if (!this.navItem) return;
    if (this.navItem.previousElementSibling !== usage) usage.after(this.navItem);

    if (this.pending) {
      this.pending = false;
      clearTimeout(this.pendingTimer);
      this.activate();
    } else if (this.active) {
      // React may have re-rendered the nav or synced the URL; keep our markers and address.
      nav?.setAttribute('data-itb-nav-active', '');
      this.placePanel(dialog);
      this.showRoute();
    }
  }

  activate(): void {
    const dialog = this.root.querySelector(SETTINGS_SELECTORS.dialog);
    if (!dialog) return;
    this.active = true;
    this.navItem?.setAttribute('data-itb-active', '');
    dialog.querySelector(SETTINGS_SELECTORS.nav)?.setAttribute('data-itb-nav-active', '');
    this.placePanel(dialog);
    flag(this.root, true);
    this.showRoute();
  }

  /** Shows our address without a navigation, so claude.ai's router is not involved. */
  private showRoute(): void {
    const { location, defaultView } = this.root;
    if (location.hash === SETTINGS_ROUTE || !defaultView) return;
    const url = location.pathname + location.search + SETTINGS_ROUTE;
    defaultView.history.replaceState(defaultView.history.state, '', url);
  }

  deactivate(): void {
    this.active = false;
    flag(this.root, false);
    this.navItem?.removeAttribute('data-itb-active');
    // The copied button classes may style focus like a selection.
    this.navItem?.querySelector('button')?.blur();
    this.root.querySelector('[data-itb-nav-active]')?.removeAttribute('data-itb-nav-active');
    this.unmountPanel?.();
    this.unmountPanel = null;
    this.panelHost?.remove();
    this.panelHost = null;
    this.hiddenContent?.removeAttribute('data-itb-hidden');
    this.hiddenContent = null;
  }

  /** Our settings go last into the panel; claude.ai's content child is hidden, its header stays. */
  private placePanel(dialog: Element): void {
    const panel = dialog.querySelector(SETTINGS_SELECTORS.panel);
    if (!panel) return;
    const content = Array.from(panel.children)
      .filter((c) => c !== this.panelHost)
      .at(-1);
    if (content && content !== this.hiddenContent) {
      this.hiddenContent?.removeAttribute('data-itb-hidden');
      content.setAttribute('data-itb-hidden', '');
      this.hiddenContent = content;
    }
    if (!this.panelHost) {
      this.panelHost = this.root.createElement('div');
      this.panelHost.dataset.itb = 'panel';
      this.unmountPanel = mountSettingsPanel(this.panelHost);
    }
    if (this.panelHost.parentElement !== panel || this.panelHost.nextElementSibling) {
      panel.append(this.panelHost);
    }
  }

  /** Dialog closed: forget nodes, they belonged to the old dialog. */
  private reset(): void {
    if (this.active) this.deactivate();
    this.navItem = null;
    this.panelHost = null;
  }
}
