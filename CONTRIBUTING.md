# Contributing

Thanks for helping out! Issues and pull requests are welcome.

## Setup

```bash
npm install
npm run watch
npm start
```

## Project layout

| Path              | Contents                                                                  |
| ----------------- | ------------------------------------------------------------------------- |
| `src/shared/`     | Pure logic without browser APIs: API parsing, settings, templates, views  |
| `src/storage/`    | `storage.local` access                                                    |
| `src/content/`    | Content scripts on claude.ai: fetching, sidebar bars, settings entry      |
| `src/background/` | Event page: onboarding, badge, context menu                               |
| `src/ui/`         | Preact UI: settings, popup, onboarding, help                              |
| `static/`         | Manifest, HTML shells, icons, locales                                     |
| `test/`           | Vitest unit tests; DOM tests use happy-dom with anonymized claude.ai HTML |

## Rules of thumb

- **claude.ai selectors** live in `src/content/slots.ts` and `src/content/settings-page.ts`. Prefer `data-testid` over `aria-label` (localized) and never rely on generated class names.
- **Text only via `textContent`**, never `innerHTML`. No `eval`, no remote code.
- **No usage data or IDs in logs**, not even in debug output.
- **UI strings** go through `t('key', 'English fallback')`; add the key to `static/_locales/en/messages.json`.
- Run `npm run typecheck`, `npm test`, `npm run build` and `npm run lint` before opening a pull request. CI runs the same.

## When claude.ai changes

If the bars disappear, open the toolbar popup, expand **Diagnostics** and include that text in your issue. It contains no personal data.
