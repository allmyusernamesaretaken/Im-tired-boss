// Builds the extension into dist/.
// Static files (manifest, HTML, icons, locales) are copied as-is,
// TypeScript entry points are bundled with esbuild. No minification,
// so the output stays readable for Mozilla's review.

import * as esbuild from 'esbuild';
import { watch as watchFs } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
// Only wipe dist/ when asked: a running `web-ext run` watches it and would
// reload a half-empty extension in between.
const clean = process.argv.includes('--clean');
const outdir = 'dist';

if (clean) await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });
await cp('static', outdir, { recursive: true });
// Shared UI styles: linked by extension pages, and imported as text by the
// content script for the settings inside claude.ai.
const STYLES = 'src/ui/styles.css';
await cp(STYLES, `${outdir}/ui/page.css`);

// The bundles include Preact (MIT), whose dist files carry no license comment.
const preact = JSON.parse(await readFile('node_modules/preact/package.json', 'utf8'));
const preactLicense = await readFile('node_modules/preact/LICENSE', 'utf8');
await writeFile(
  `${outdir}/THIRD_PARTY_NOTICES.txt`,
  `This add-on bundles the following third-party software.

` +
    `Preact ${preact.version} (https://preactjs.com)

${preactLicense}`,
);

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: {
    background: 'src/background/index.ts',
    content: 'src/content/index.ts',
    'content-early': 'src/content/early.ts',
    'ui/popup': 'src/ui/popup/index.tsx',
    'ui/options': 'src/ui/options/index.tsx',
    'ui/onboarding': 'src/ui/onboarding/index.tsx',
    'ui/help': 'src/ui/help/index.tsx',
  },
  outdir,
  bundle: true,
  format: 'iife',
  target: 'firefox140',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  minify: false,
  sourcemap: watch ? 'inline' : false,
  legalComments: 'inline',
  loader: { '.css': 'text' },
  logLevel: 'info',
};

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();

  // Re-copy static files on change (debounced, editors often write several events).
  let timer;
  watchFs('static', { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      cp('static', outdir, { recursive: true }).then(
        () => console.log('Copied static/'),
        (err) => console.error('Copying static/ failed:', err),
      );
    }, 100);
  });
  watchFs(STYLES, () => void cp(STYLES, `${outdir}/ui/page.css`));
  console.log('Watching src/ and static/ for changes...');
} else {
  await esbuild.build(options);
}
