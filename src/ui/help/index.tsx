import { useState } from 'preact/hooks';
import { mount } from '../mount';
import { renderTemplate } from '../../shared/template';

// Example values so every row can show a live result.
const now = new Date();
const example = {
  name: '5h',
  pct: 37.4,
  resetsAt: new Date(now.getTime() + (2 * 60 + 14) * 60_000),
  spent: '$12.00 / $100.00',
  now,
};
const weekExample = {
  ...example,
  name: 'Week',
  resetsAt: new Date(now.getTime() + 54 * 3_600_000),
};

const placeholders: [string, string][] = [
  ['{name}', 'Name of the bar'],
  ['{pct}', 'Percent used, rounded'],
  ['{reset}', 'Reset time, automatic format following your system'],
  ['{reset:12h}', 'Automatic format with 12-hour clock'],
  ['{reset:24h}', 'Automatic format with 24-hour clock'],
  ['{reset:EEE HH:mm}', 'Your own pattern, see below'],
  ['{left}', 'Time until reset, automatic'],
  ["{left:H'h' mm'm'}", 'Time until reset, your own pattern'],
  ['{spent}', 'Extra usage only: amount spent and limit'],
  ['{none}', 'Nothing. Overrides All bars with an empty text'],
];

const dateSymbols: [string, string][] = [
  ['yyyy', 'Year'],
  ['M / MM', 'Month, without / with leading zero'],
  ['d / dd', 'Day of month'],
  ['EEE / EEEE', 'Weekday, short / long'],
  ['H / HH', 'Hour, 24-hour clock'],
  ['h / hh', 'Hour, 12-hour clock'],
  ['mm', 'Minute'],
  ['a', 'AM / PM'],
  ["'text'", "Literal text, '' for an apostrophe"],
];

const leftSymbols: [string, string][] = [
  ['d', 'Days'],
  ['H / HH', 'Hours (total hours if the pattern has no d)'],
  ['m / mm', 'Minutes (total minutes if the pattern has no H or d)'],
  ["'text'", 'Literal text'],
];

const examples: [string, typeof example][] = [
  ['{name} · {pct}%', example],
  ['{reset:EEE HH:mm}', weekExample],
  ["{reset:'resets' h:mm a}", example],
  ['{left} left', weekExample],
  ["{left:d'd' H'h'}", weekExample],
  ['{pct}% of {name}', example],
];

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      class="link-btn inline"
      onClick={() =>
        void navigator.clipboard.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        })
      }
    >
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function Table(props: { rows: [string, string][]; result?: boolean }) {
  return (
    <table class="help-table">
      <tbody>
        {props.rows.map(([code, text]) => (
          <tr key={code}>
            <td>
              <code>{code}</code>
            </td>
            <td>{text}</td>
            {props.result && <td class="muted">{renderTemplate(code, example)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Help() {
  return (
    <main class="page">
      <header class="page-head">
        <h1>Template help</h1>
        <p>Placeholders for the text above the bars in expert mode.</p>
      </header>

      <section class="section">
        <div class="section-head">
          <h2>Placeholders</h2>
        </div>
        <Table rows={placeholders} result />
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Date and time patterns</h2>
        </div>
        <p class="setting-desc">
          Used in <code>{'{reset:…}'}</code>. A subset of Unicode LDML.
        </p>
        <Table rows={dateSymbols} />
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Time left patterns</h2>
        </div>
        <p class="setting-desc">
          Used in <code>{'{left:…}'}</code>.
        </p>
        <Table rows={leftSymbols} />
      </section>

      <section class="section">
        <div class="section-head">
          <h2>Examples</h2>
        </div>
        <table class="help-table">
          <tbody>
            {examples.map(([template, ctx]) => (
              <tr key={template}>
                <td>
                  <code>{template}</code>
                </td>
                <td class="muted">{renderTemplate(template, ctx)}</td>
                <td>
                  <Copy text={template} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p class="setting-desc footer-note">
        Date patterns are based on{' '}
        <a
          href="https://unicode.org/reports/tr35/tr35-dates.html#Date_Field_Symbol_Table"
          target="_blank"
          rel="noreferrer"
        >
          Unicode LDML
        </a>
        . Only the symbols listed above are supported.
      </p>
    </main>
  );
}

mount(<Help />);
