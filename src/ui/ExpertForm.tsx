// Expert mode: templates for all bars, and per-bar overrides that inherit from
// "All bars" when left empty. The inherited value shows as the placeholder.

import { useState } from 'preact/hooks';
import type { UsageSnapshot } from '../shared/model';
import {
  BAR_IDS,
  DEFAULTS,
  MAX_NAME_LENGTH,
  MAX_TEMPLATE_LENGTH,
  type BarId,
  type Settings,
} from '../shared/settings';
import { DebouncedText, ResetIcon, Row, Section } from './controls';
import { t } from '../shared/i18n';
import { barLabel } from './labels';

type Update = (change: (s: Settings) => Settings) => void;

function hasOverrides(s: Settings, id: BarId): boolean {
  const own = s.expert.perBar[id];
  return !!(own.left || own.right || own.color);
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      class={open ? 'chevron open' : 'chevron'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function TemplateField(props: {
  label: string;
  value: string;
  placeholder?: string;
  onCommit: (value: string) => void;
}) {
  return (
    <Row label={props.label}>
      <DebouncedText
        value={props.value}
        maxLength={MAX_TEMPLATE_LENGTH}
        placeholder={props.placeholder}
        ariaLabel={props.label}
        class="field mono wide"
        onCommit={props.onCommit}
      />
    </Row>
  );
}

export function ExpertForm(props: {
  settings: Settings;
  snapshot: UsageSnapshot | null;
  update: Update;
}) {
  const { settings: s, snapshot, update } = props;
  const [open, setOpen] = useState<Set<BarId>>(() => new Set());
  const toggle = (id: BarId) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <>
      <Section
        title={t('sectionAllBars', 'All bars')}
        onReset={() =>
          update((c) => {
            c.expert.allCustom = false;
            c.expert.all = structuredClone(DEFAULTS.expert.all);
            return c;
          })
        }
      >
        <p class="setting-desc help-line">
          {t('templateHelp', 'Templates for the text above each bar, left and right.')}{' '}
          <code>{'{name}'}</code> <code>{'{pct}'}</code> <code>{'{reset}'}</code>{' '}
          <code>{'{reset:EEE HH:mm}'}</code> <code>{'{left}'}</code> <code>{'{spent}'}</code>{' '}
          <code>{'{none}'}</code>{' '}
          {/* A button, not a link: an extension URL in claude.ai's DOM would reveal the add-on. */}
          <button
            type="button"
            class="text-link"
            onClick={() => void browser.runtime.sendMessage({ type: 'openHelp' })}
          >
            {t('templateHelpLink', 'All placeholders')}
          </button>
        </p>
        <TemplateField
          label={t('templateLeft', 'Left')}
          value={s.expert.all.left}
          onCommit={(v) =>
            update((c) => {
              c.expert.all.left = v;
              c.expert.allCustom = true;
              return c;
            })
          }
        />
        <TemplateField
          label={t('templateRight', 'Right')}
          value={s.expert.all.right}
          onCommit={(v) =>
            update((c) => {
              c.expert.all.right = v;
              c.expert.allCustom = true;
              return c;
            })
          }
        />
      </Section>

      <Section
        title={t('sectionPerBar', 'Per bar')}
        onReset={() =>
          update((c) => {
            c.expert.perBar = structuredClone(DEFAULTS.expert.perBar);
            return c;
          })
        }
      >
        {BAR_IDS.map((id) => {
          const own = s.expert.perBar[id];
          const isOpen = open.has(id);
          const unavailable =
            snapshot &&
            (id === 'extra_usage'
              ? snapshot.extra && !snapshot.extra.enabled
              : snapshot.limits[id] === null);
          return (
            <div class="bar-card" key={id}>
              <div class="bar-card-head">
                <button
                  type="button"
                  class="bar-card-toggle"
                  aria-expanded={isOpen}
                  onClick={() => toggle(id)}
                >
                  <Chevron open={isOpen} />
                  <span class={unavailable ? 'muted' : ''}>{barLabel(id)}</span>
                  <span class="muted">· {s.bars[id].name}</span>
                  {hasOverrides(s, id) && (
                    <span class="dot" title={t('overridesAll', 'Overrides All bars')} />
                  )}
                </button>
                {isOpen && (
                  <ResetIcon
                    onClick={() =>
                      update((c) => {
                        c.expert.perBar[id] = structuredClone(DEFAULTS.expert.perBar[id]);
                        c.bars[id].name = DEFAULTS.bars[id].name;
                        return c;
                      })
                    }
                  />
                )}
              </div>
              {isOpen && (
                <div class="bar-card-body">
                  <Row label={t('barName', 'Name')}>
                    <DebouncedText
                      value={s.bars[id].name}
                      maxLength={MAX_NAME_LENGTH}
                      placeholder={DEFAULTS.bars[id].name}
                      ariaLabel={t('barName', 'Name')}
                      class="field short"
                      onCommit={(name) =>
                        update((c) => ((c.bars[id].name = name || DEFAULTS.bars[id].name), c))
                      }
                    />
                  </Row>
                  <TemplateField
                    label={t('templateLeft', 'Left')}
                    value={own.left}
                    placeholder={s.expert.all.left}
                    onCommit={(v) => update((c) => ((c.expert.perBar[id].left = v), c))}
                  />
                  <TemplateField
                    label={t('templateRight', 'Right')}
                    value={own.right}
                    placeholder={s.expert.all.right}
                    onCommit={(v) => update((c) => ((c.expert.perBar[id].right = v), c))}
                  />
                  <Row
                    label={t('barColor', 'Bar color')}
                    description={
                      own.color ? undefined : t('inheritsColor', 'Uses the default color')
                    }
                  >
                    {own.color && (
                      <button
                        type="button"
                        class="link-btn inline"
                        onClick={() => update((c) => ((c.expert.perBar[id].color = null), c))}
                      >
                        {t('useDefault', 'Use default')}
                      </button>
                    )}
                    <input
                      type="color"
                      class="color"
                      aria-label={t('barColor', 'Bar color')}
                      value={own.color ?? s.color.base}
                      onChange={(e) => {
                        const value = e.currentTarget.value;
                        update((c) => ((c.expert.perBar[id].color = value), c));
                      }}
                    />
                  </Row>
                </div>
              )}
            </div>
          );
        })}
      </Section>
    </>
  );
}
