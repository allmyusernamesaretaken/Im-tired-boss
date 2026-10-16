// The bars as they appear in the sidebar, for the popup and the settings page.

import type { UsageSnapshot } from '../shared/model';
import type { Settings } from '../shared/settings';
import { buildRows } from '../shared/view';
import { t } from './i18n';

export function Preview(props: { settings: Settings; snapshot: UsageSnapshot | null; now: Date }) {
  const rows = buildRows(props.settings, props.snapshot, props.now);
  // Without data the status line below explains what to do.
  if (!props.snapshot) return null;
  if (rows.length === 0) {
    return <p class="muted">{t('noBars', 'No bars selected.')}</p>;
  }
  return (
    <div class="bars">
      {rows.map((row) => (
        <div key={row.id} title={row.title}>
          {(row.left || row.right) && (
            <div class="bar-label">
              <span>{row.left}</span>
              <span>{row.right}</span>
            </div>
          )}
          <div
            class="bar-track"
            role="progressbar"
            aria-label={row.name}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.pct === null ? undefined : Math.round(row.pct)}
          >
            <div class="bar-fill" style={{ width: `${row.width}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}
