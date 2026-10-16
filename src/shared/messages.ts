// The only messages between extension parts. Anything else is ignored.

export type Message =
  /** Background → content: is this right-click target on our bars? Answers a boolean. */
  | { type: 'barsTarget'; targetElementId: number }
  /** Background → content: open our entry in claude.ai's settings dialog. */
  | { type: 'openSettings' }
  /** Popup or options page → content: fetch usage now, ignoring the interval. */
  | { type: 'refreshNow' }
  /** Settings (also inside claude.ai) → background: open the help page in a new tab. */
  | { type: 'openHelp' };

export function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const type = (value as { type?: unknown }).type;
  return (
    (type === 'barsTarget' &&
      typeof (value as { targetElementId?: unknown }).targetElementId === 'number') ||
    type === 'openSettings' ||
    type === 'refreshNow' ||
    type === 'openHelp'
  );
}
