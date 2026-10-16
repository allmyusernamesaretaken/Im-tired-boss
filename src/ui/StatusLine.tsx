// One line under the preview: up to date, stale or what went wrong.

import { describeStatus } from '../shared/status';
import { useNow, useUsageEntry } from './hooks';
import { t } from '../shared/i18n';

export function StatusLine() {
  const entry = useUsageEntry();
  const now = useNow();
  const status = describeStatus(entry, now.getTime());
  const text = t(status.key, status.fallback);
  const ago = status.ago
    ? ` ${t('updatedAgo', 'Updated {ago} ago.').replace('{ago}', status.ago)}`
    : '';
  return (
    <p class={`status status-${status.kind}`} role={status.kind === 'error' ? 'alert' : undefined}>
      {status.kind === 'ok' ? ago.trim() : `${text}${ago}`}
    </p>
  );
}
