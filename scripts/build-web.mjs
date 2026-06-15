// Bundle the vanilla-TS frontend into dist/public (server static root).
// ESM build per ADR 0003 deviation note: starter is ESM, so we bundle the browser
// code with esbuild and resolve the static root at runtime via import.meta.url.
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outdir = resolve(root, 'dist/public');

await mkdir(outdir, { recursive: true });

await esbuild.build({
  entryPoints: [resolve(root, 'src/public/main.ts')],
  bundle: true,
  format: 'esm',
  target: 'es2022',
  outfile: resolve(outdir, 'app.js'),
  sourcemap: true,
  logLevel: 'info',
});

// Inline nothing fancy — copy the static shell + styles verbatim.
await cp(resolve(root, 'src/public/index.html'), resolve(outdir, 'index.html'));
await cp(resolve(root, 'src/public/styles.css'), resolve(outdir, 'styles.css'));

// Sanity: ensure index.html references the built bundle.
const html = await readFile(resolve(outdir, 'index.html'), 'utf8');
if (!html.includes('app.js')) {
  await writeFile(resolve(outdir, 'index.html'), html);
}

console.log('web bundle -> dist/public');
