// Which settings sections are expanded. Kept apart from the settings, so
// folding a section never triggers a re-render of the bars in claude.ai.

export const SECTIONS_KEY = 'uiSections';

/** Section id → expanded. Missing ids use the section's default. */
export type SectionState = Record<string, boolean>;

export async function readSections(): Promise<SectionState> {
  const raw: Record<string, unknown> = await browser.storage.local.get(SECTIONS_KEY);
  const value = raw[SECTIONS_KEY];
  if (typeof value !== 'object' || value === null) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
    ),
  );
}

export async function writeSection(id: string, open: boolean): Promise<void> {
  const current = await readSections();
  await browser.storage.local.set({ [SECTIONS_KEY]: { ...current, [id]: open } });
}
