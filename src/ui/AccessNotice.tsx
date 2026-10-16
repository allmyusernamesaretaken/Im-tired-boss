import { useEffect, useState } from 'preact/hooks';
import { t } from '../shared/i18n';
import { canManagePermissions, hasClaudeAccess, requestClaudeAccess } from '../shared/permissions';

interface Props {
  /**
   * In the toolbar popup the permission prompt can close the popup before the
   * promise resolves, so the popup links to the onboarding page instead.
   */
  mode: 'request' | 'open-onboarding';
}

/** Shows a hint while host access to claude.ai is missing. Stays in sync if access changes elsewhere. */
export function AccessNotice({ mode }: Props) {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    // Embedded in claude.ai there is no permissions API, and access is evidently granted.
    if (!canManagePermissions()) return;
    const refresh = () => void hasClaudeAccess().then(setGranted);
    refresh();
    browser.permissions.onAdded.addListener(refresh);
    browser.permissions.onRemoved.addListener(refresh);
    return () => {
      browser.permissions.onAdded.removeListener(refresh);
      browser.permissions.onRemoved.removeListener(refresh);
    };
  }, []);

  if (granted !== false) return null;

  const onClick = () => {
    if (mode === 'request') {
      void requestClaudeAccess();
    } else {
      void browser.tabs.create({ url: browser.runtime.getURL('ui/onboarding.html') });
      window.close();
    }
  };

  return (
    <div class="notice">
      <p>{t('accessNeeded', 'To read your usage, this extension needs access to claude.ai.')}</p>
      <button onClick={onClick}>{t('accessGrant', 'Grant access')}</button>
    </div>
  );
}
