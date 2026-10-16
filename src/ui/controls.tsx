// Form controls modeled on claude.ai's settings: titled sections, rows with a
// label and description on the left and the control on the right, blue switches,
// segmented choices and field-style inputs (see page.css).

import type { ComponentChildren } from 'preact';
import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { t } from '../shared/i18n';

function CircleArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4A8 8 0 1 1 5.07 8" />
      <path d="M15 1L12 4L15 7" />
    </svg>
  );
}

/** Circular arrow with the head at the top, no border. */
export function ResetIcon({ onClick, label }: { onClick: () => void; label?: string }) {
  const text = label ?? t('restoreDefaults', 'Restore defaults');
  return (
    <button type="button" class="icon-btn" title={text} aria-label={text} onClick={onClick}>
      <CircleArrow />
    </button>
  );
}

export function Section(props: {
  title: string;
  onReset?: () => void;
  children: ComponentChildren;
}) {
  return (
    <section class="section">
      <div class="section-head">
        <h2>{props.title}</h2>
        {props.onReset && <ResetIcon onClick={props.onReset} />}
      </div>
      <div class="group">{props.children}</div>
    </section>
  );
}

/** One settings row: label and optional description left, control right. */
export function Row(props: {
  label: ComponentChildren;
  description?: ComponentChildren;
  disabled?: boolean;
  children: ComponentChildren;
}) {
  return (
    <div class={props.disabled ? 'setting disabled' : 'setting'}>
      <div class="setting-text">
        <div class="setting-label">{props.label}</div>
        {props.description && <div class="setting-desc">{props.description}</div>}
      </div>
      <div class="setting-control">{props.children}</div>
    </div>
  );
}

export function Switch(props: {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <input
      type="checkbox"
      role="switch"
      class="switch"
      aria-label={props.label}
      checked={props.checked}
      disabled={props.disabled}
      onChange={(e) => props.onChange(e.currentTarget.checked)}
    />
  );
}

/**
 * Segmented choice like claude.ai's "Small / Medium / Large": one highlight sits
 * behind the options and slides to the selected one.
 */
export function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);
  // No slide on first paint, only when the selection changes.
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const root = container.current;
    if (!root) return;
    const measure = () => {
      const selected = root.querySelector<HTMLElement>('.seg[aria-checked="true"]');
      if (selected) setPill({ x: selected.offsetLeft, width: selected.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [props.value]);

  useEffect(() => {
    if (pill && !animate) requestAnimationFrame(() => setAnimate(true));
  }, [pill, animate]);

  return (
    <div class="segmented" role="radiogroup" aria-label={props.label} ref={container}>
      {pill && (
        <div
          class={animate ? 'seg-pill animate' : 'seg-pill'}
          aria-hidden="true"
          style={{ width: `${pill.width}px`, transform: `translateX(${pill.x}px)` }}
        />
      )}
      {props.options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={props.value === o.value}
          class={props.value === o.value ? 'seg selected' : 'seg'}
          onClick={() => props.onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Text input that writes after a short pause or on blur, not on every keystroke. */
export function DebouncedText(props: {
  value: string;
  maxLength: number;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  class?: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(props.value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editing = useRef(false);

  useEffect(() => {
    if (!editing.current) setDraft(props.value);
  }, [props.value]);

  const commit = (value: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (value !== props.value) props.onCommit(value);
  };

  return (
    <input
      type="text"
      class={props.class ?? 'field'}
      value={draft}
      maxLength={props.maxLength}
      placeholder={props.placeholder}
      aria-label={props.ariaLabel}
      disabled={props.disabled}
      spellcheck={false}
      onFocus={() => (editing.current = true)}
      onInput={(e) => {
        const value = e.currentTarget.value;
        setDraft(value);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => commit(value), 400);
      }}
      onBlur={(e) => {
        editing.current = false;
        commit(e.currentTarget.value);
      }}
    />
  );
}

/** "Reset all settings" with a second click within 3 seconds as confirmation. */
export function ResetAll({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(id);
  }, [armed]);
  return (
    <button
      type="button"
      class={armed ? 'link-btn danger' : 'link-btn'}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      <CircleArrow />
      {armed
        ? t('resetAllConfirm', 'Click again to reset everything')
        : t('resetAll', 'Reset all settings')}
    </button>
  );
}
