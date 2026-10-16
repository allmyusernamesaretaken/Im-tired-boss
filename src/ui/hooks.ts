// Shared state hooks for extension pages. storage.local is the source of truth;
// pages update optimistically and re-read on storage changes.

import { useCallback, useEffect, useState } from 'preact/hooks';
import type { OrgUsage, UsageSnapshot } from '../shared/model';
import { normalizeSettings, type Settings } from '../shared/settings';
import { readSettings, SETTINGS_KEY, updateSettings } from '../storage/settings';
import { readUsage, USAGE_KEY } from '../storage/usage';

type Change = (current: Settings) => Settings;

/** Async load errors are rethrown during render, so the error boundary shows them. */
function useAsyncError(): [Error | null, (err: unknown) => void] {
  const [error, setError] = useState<Error | null>(null);
  const report = useCallback(
    (err: unknown) => setError(err instanceof Error ? err : new Error(String(err))),
    [],
  );
  return [error, report];
}

function useStorageKey(key: string, load: () => void): void {
  useEffect(() => {
    load();
    const onChanged = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
      if (area === 'local' && key in changes) load();
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, [key, load]);
}

export function useSettings(): [Settings | null, (change: Change) => void] {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, report] = useAsyncError();
  const load = useCallback(() => void readSettings().then(setSettings, report), [report]);
  useStorageKey(SETTINGS_KEY, load);
  if (error) throw error;

  const update = useCallback((change: Change) => {
    setSettings((current) =>
      current ? normalizeSettings(change(structuredClone(current))) : current,
    );
    void updateSettings(change);
  }, []);
  return [settings, update];
}

/** Fetch state of the most recently updated organization. */
export function useUsageEntry(): OrgUsage | null {
  const [entry, setEntry] = useState<OrgUsage | null>(null);
  const [error, report] = useAsyncError();
  const load = useCallback(
    () =>
      void readUsage().then(
        ({ store, lastOrg }) => setEntry(lastOrg ? (store[lastOrg] ?? null) : null),
        report,
      ),
    [report],
  );
  useStorageKey(USAGE_KEY, load);
  if (error) throw error;
  return entry;
}

/** Snapshot of the most recently updated organization. */
export function useSnapshot(): UsageSnapshot | null {
  return useUsageEntry()?.snapshot ?? null;
}

/** Re-renders every `ms`, for relative times. */
export function useNow(ms = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
