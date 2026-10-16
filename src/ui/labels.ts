import type { BarId } from '../shared/settings';
import { t } from './i18n';

const BAR_LABELS: Record<BarId, [key: string, fallback: string]> = {
  five_hour: ['bar5h', '5-hour window'],
  seven_day: ['barWeek', 'Week, all models'],
  seven_day_opus: ['barOpus', 'Week, Opus'],
  seven_day_sonnet: ['barSonnet', 'Week, Sonnet'],
  seven_day_oauth_apps: ['barOauth', 'Week, OAuth apps'],
  seven_day_cowork: ['barCowork', 'Week, Cowork'],
  extra_usage: ['barExtra', 'Extra usage'],
};

/** Descriptive name of a bar for the settings UI. */
export const barLabel = (id: BarId): string => t(...BAR_LABELS[id]);
