// Easy-mode settings, laid out like claude.ai's own settings pages. Every change
// is written to storage.local right away and shows up live in the sidebar.

import type { UsageSnapshot } from '../shared/model';
import {
  BAR_IDS,
  DEFAULTS,
  MAX_NAME_LENGTH,
  type BarId,
  type Settings,
  type TimeFormat,
} from '../shared/settings';
import { enableExpert } from '../shared/resolve';
import { DebouncedText, ResetAll, Row, Section, Segmented, Switch } from './controls';
import { ExpertForm } from './ExpertForm';
import { t } from '../shared/i18n';
import { barLabel } from './labels';

type Update = (change: (s: Settings) => Settings) => void;

const copy = <T,>(value: T): T => structuredClone(value);

/** Why a bar cannot be shown, if it cannot. */
function unavailable(snapshot: UsageSnapshot | null, id: BarId): string | null {
  if (!snapshot) return null;
  if (id === 'extra_usage') {
    return snapshot.extra && !snapshot.extra.enabled ? t('notActive', 'Not active') : null;
  }
  return snapshot.limits[id] === null ? t('notInPlan', 'Not in your plan') : null;
}

export function SettingsForm(props: {
  settings: Settings;
  snapshot: UsageSnapshot | null;
  update: Update;
}) {
  const { settings: s, snapshot, update } = props;

  return (
    <div class="form">
      <Section
        title={t('sectionPosition', 'Position')}
        onReset={() => update((c) => ({ ...c, positions: copy(DEFAULTS.positions) }))}
      >
        <Row
          label={t('positionTop', 'Top')}
          description={t('positionTopDesc', 'Below the Claude logo')}
        >
          <Switch
            label={t('positionTop', 'Top')}
            checked={s.positions.top}
            onChange={(v) => update((c) => ((c.positions.top = v), c))}
          />
        </Row>
        <Row
          label={t('positionBottom', 'Bottom')}
          description={t('positionBottomDesc', 'Above your profile')}
        >
          <Switch
            label={t('positionBottom', 'Bottom')}
            checked={s.positions.bottom}
            onChange={(v) => update((c) => ((c.positions.bottom = v), c))}
          />
        </Row>
      </Section>

      <Section
        title={t('sectionBars', 'Bars')}
        onReset={() => update((c) => ({ ...c, bars: copy(DEFAULTS.bars) }))}
      >
        {BAR_IDS.map((id) => {
          const reason = unavailable(snapshot, id);
          const label = barLabel(id);
          return (
            <Row key={id} label={label} description={reason ?? undefined} disabled={!!reason}>
              <DebouncedText
                value={s.bars[id].name}
                maxLength={MAX_NAME_LENGTH}
                placeholder={DEFAULTS.bars[id].name}
                ariaLabel={`${label}: ${t('barName', 'Name')}`}
                disabled={!!reason}
                class="field short"
                onCommit={(name) =>
                  update((c) => ((c.bars[id].name = name || DEFAULTS.bars[id].name), c))
                }
              />
              <Switch
                label={label}
                checked={s.bars[id].on && !reason}
                disabled={!!reason}
                onChange={(on) => update((c) => ((c.bars[id].on = on), c))}
              />
            </Row>
          );
        })}
      </Section>

      {s.expert.enabled ? (
        <ExpertForm settings={s} snapshot={snapshot} update={update} />
      ) : (
        <Section
          title={t('sectionText', 'Text')}
          onReset={() => update((c) => ({ ...c, easy: copy(DEFAULTS.easy) }))}
        >
          <Row label={t('textName', 'Name')} description={t('textNameDesc', 'For example "5h"')}>
            <Switch
              label={t('textName', 'Name')}
              checked={s.easy.showName}
              onChange={(v) => update((c) => ((c.easy.showName = v), c))}
            />
          </Row>
          <Row label={t('textPercent', 'Percent')}>
            <Switch
              label={t('textPercent', 'Percent')}
              checked={s.easy.showPct}
              onChange={(v) => update((c) => ((c.easy.showPct = v), c))}
            />
          </Row>
          <Row label={t('textReset', 'Reset')} description={t('textResetDesc', 'On the right')}>
            <Switch
              label={t('textReset', 'Reset')}
              checked={s.easy.showReset}
              onChange={(v) => update((c) => ((c.easy.showReset = v), c))}
            />
          </Row>
          <Row label={t('sectionResetAs', 'Show reset as')} disabled={!s.easy.showReset}>
            <Segmented
              label={t('sectionResetAs', 'Show reset as')}
              value={s.easy.resetAs}
              options={[
                { value: 'time', label: t('resetAsTime', 'Time') },
                { value: 'left', label: t('resetAsLeft', 'Time left') },
              ]}
              onChange={(v) => update((c) => ((c.easy.resetAs = v), c))}
            />
          </Row>
          <Row
            label={t('sectionTimeFormat', 'Time format')}
            disabled={!s.easy.showReset || s.easy.resetAs !== 'time'}
          >
            <Segmented<TimeFormat>
              label={t('sectionTimeFormat', 'Time format')}
              value={s.easy.timeFormat}
              options={[
                { value: 'system', label: t('timeSystem', 'System') },
                { value: '12h', label: '12h' },
                { value: '24h', label: '24h' },
              ]}
              onChange={(v) => update((c) => ((c.easy.timeFormat = v), c))}
            />
          </Row>
        </Section>
      )}

      <Section
        title={t('sectionColor', 'Color')}
        onReset={() => update((c) => ({ ...c, color: copy(DEFAULTS.color) }))}
      >
        <Row label={t('barColor', 'Bar color')}>
          <input
            type="color"
            class="color"
            aria-label={t('barColor', 'Bar color')}
            value={s.color.base}
            onChange={(e) => {
              const value = e.currentTarget.value;
              update((c) => ((c.color.base = value), c));
            }}
          />
        </Row>
        <Row
          label={t('colorByUsage', 'Change color by usage')}
          description={t('colorByUsageDesc', 'Switch to another color above a threshold')}
        >
          <Switch
            label={t('colorByUsage', 'Change color by usage')}
            checked={s.color.byUsage}
            onChange={(v) => update((c) => ((c.color.byUsage = v), c))}
          />
        </Row>
        {s.color.byUsage &&
          s.color.steps.map((step, i) => (
            <Row
              key={i}
              label={i === 0 ? t('thresholdWarn', 'Warning') : t('thresholdCritical', 'Critical')}
            >
              <span class="setting-desc">{t('from', 'from')}</span>
              <input
                type="number"
                class="field number"
                min={1}
                max={100}
                step={1}
                aria-label={t('thresholdPercent', 'Threshold in percent')}
                value={step.from}
                onChange={(e) => {
                  const value = Number(e.currentTarget.value);
                  update((c) => ((c.color.steps[i as 0 | 1].from = value), c));
                }}
              />
              <span class="setting-desc">%</span>
              <input
                type="color"
                class="color"
                aria-label={t('thresholdColor', 'Threshold color')}
                value={step.color}
                onChange={(e) => {
                  const value = e.currentTarget.value;
                  update((c) => ((c.color.steps[i as 0 | 1].color = value), c));
                }}
              />
            </Row>
          ))}
      </Section>

      <Section
        title={t('sectionMore', 'More')}
        onReset={() =>
          update((c) => {
            c.contextMenu = DEFAULTS.contextMenu;
            c.showBadge = DEFAULTS.showBadge;
            return c;
          })
        }
      >
        <Row
          label={t('contextMenu', 'Right-click menu')}
          description={t('contextMenuDesc', 'Right-click the bars to open these settings')}
        >
          <Switch
            label={t('contextMenu', 'Right-click menu')}
            checked={s.contextMenu}
            onChange={(v) => update((c) => ((c.contextMenu = v), c))}
          />
        </Row>
        <Row
          label={t('showBadge', 'Toolbar badge')}
          description={t('showBadgeDesc', '5-hour usage on the extension icon')}
        >
          <Switch
            label={t('showBadge', 'Toolbar badge')}
            checked={s.showBadge}
            onChange={(v) => update((c) => ((c.showBadge = v), c))}
          />
        </Row>
      </Section>

      <Section title={t('sectionExpert', 'Expert mode')}>
        <Row
          label={t('expertMode', 'Expert mode')}
          description={t('expertModeDesc', 'Write your own templates for the text above the bars')}
        >
          <Switch
            label={t('expertMode', 'Expert mode')}
            checked={s.expert.enabled}
            onChange={(on) =>
              update((c) => {
                if (on) return enableExpert(c);
                c.expert.enabled = false;
                return c;
              })
            }
          />
        </Row>
      </Section>

      <div class="footer">
        <ResetAll onConfirm={() => update(() => copy(DEFAULTS))} />
      </div>
    </div>
  );
}
