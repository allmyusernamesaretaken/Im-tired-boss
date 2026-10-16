// Collapsed diagnostics section: fetch status and which sidebar slots were found.
// Shows no usage data and no IDs, so it can be pasted into bug reports.

import { useEffect, useState } from 'preact/hooks';
import type { OrgUsage } from '../shared/model';
import { DIAGNOSTICS_KEY, readDiagnostics, type Diagnostics as Diag } from '../storage/diagnostics';
import { readUsage, USAGE_KEY } from '../storage/usage';

const time = (ms: number | null) => (ms ? new Date(ms).toLocaleTimeString() : '–');

export function Diagnostics() {
  const [diag, setDiag] = useState<Diag | null>(null);
  const [entry, setEntry] = useState<OrgUsage | null>(null);

  useEffect(() => {
    const refresh = () => {
      void readDiagnostics().then(setDiag);
      void readUsage().then(({ store, lastOrg }) =>
        setEntry(lastOrg ? (store[lastOrg] ?? null) : null),
      );
    };
    const onChanged = (changes: Record<string, browser.storage.StorageChange>, area: string) => {
      if (area === 'local' && (DIAGNOSTICS_KEY in changes || USAGE_KEY in changes)) refresh();
    };
    refresh();
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const lines = [
    `version: ${browser.runtime.getManifest().version}`,
    `status: ${entry?.status ?? '–'} (failures: ${entry?.failures ?? 0})`,
    `last attempt: ${time(entry?.fetchedAt ?? null)}`,
    `last success: ${time(entry?.snapshotAt ?? null)}`,
    `slots: ${
      diag
        ? Object.entries(diag.slots)
            .map(([k, v]) => `${k}=${v ? 'found' : 'missing'}`)
            .join(', ')
        : '–'
    }`,
  ];

  return (
    <details style={{ marginTop: '10px' }}>
      <summary class="muted" style={{ cursor: 'pointer' }}>
        Diagnostics
      </summary>
      <pre class="muted" style={{ fontSize: '11px', whiteSpace: 'pre-wrap', margin: '6px 0 0' }}>
        {lines.join('\n')}
      </pre>
    </details>
  );
}
