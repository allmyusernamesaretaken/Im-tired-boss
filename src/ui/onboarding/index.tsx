import { mount } from '../mount';
import { AccessNotice } from '../AccessNotice';
import { t } from '../i18n';

const SETTINGS_URL = 'https://claude.ai/new#settings/im-tired-boss';

function Onboarding() {
  return (
    <main class="page">
      <header class="page-head">
        <h1>{t('onboardingTitle', "Welcome to I'm Tired, Boss")}</h1>
        <p>{t('tagline', 'A usage meter for Claude. Not affiliated with Anthropic.')}</p>
      </header>

      <AccessNotice mode="request" />

      <section class="section">
        <div class="section-head">
          <h2>{t('onboardingHowTitle', 'How it works')}</h2>
        </div>
        <div class="group">
          <div class="setting">
            <div class="setting-text">
              <div class="setting-label">{t('onboardingBarsTitle', 'Bars in the sidebar')}</div>
              <div class="setting-desc">
                {t(
                  'onboardingBarsDesc',
                  'Open claude.ai. Your 5-hour and weekly limits appear as thin bars below the Claude logo. Usage from Claude Code counts towards the same limits.',
                )}
              </div>
            </div>
          </div>
          <div class="setting">
            <div class="setting-text">
              <div class="setting-label">{t('onboardingSettingsTitle', 'Settings')}</div>
              <div class="setting-desc">
                {t(
                  'onboardingSettingsDesc',
                  'Right-click the bars, use the toolbar icon, or find "I\'m Tired, Boss" in claude.ai\'s settings below Usage.',
                )}
              </div>
            </div>
          </div>
          <div class="setting">
            <div class="setting-text">
              <div class="setting-label">{t('onboardingPrivacyTitle', 'Privacy')}</div>
              <div class="setting-desc">
                {t(
                  'onboardingPrivacyDesc',
                  'The extension only talks to claude.ai, using your existing login. Nothing is collected or sent anywhere else.',
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div class="footer">
        <a class="link-btn" href={SETTINGS_URL}>
          {t('onboardingOpen', 'Open claude.ai')}
        </a>
      </div>
    </main>
  );
}

mount(<Onboarding />);
