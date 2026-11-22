// Build: bundle src/ with esbuild, copy public/ to dist/, inject the full source list into index.html.
import * as esbuild from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const watching = process.argv.includes('--watch');
const stand = process.env.DATA_STAND || null;

async function html() {
  // fresh import so --watch picks up edited sources
  const mod = await import(pathToFileURL(path.join(root, 'src/sources.js')).href + '?t=' + Date.now());
  const tpl = await readFile(path.join(root, 'public/index.html'), 'utf8');
  if (!tpl.includes('<!--SOURCES-->')) throw new Error('index.html: placeholder <!--SOURCES--> missing');
  await writeFile(path.join(dist, 'index.html'), tpl.replace('<!--SOURCES-->', mod.sourcesHTML('de', stand || mod.STAND)));
}
async function assets() {
  await cp(path.join(root, 'public'), dist, { recursive: true, filter: (src) => !src.endsWith(path.join('public', 'index.html')) });
}

const opts = {
  entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', target: 'es2020',
  minify: !watching, sourcemap: watching, outfile: path.join(dist, 'app.js'), legalComments: 'eof', logLevel: 'info',
};

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await assets();
await html();
if (watching) {
  const ctx = await esbuild.context(opts);
  await ctx.watch();
  watch(path.join(root, 'public'), { recursive: true }, async () => { try { await assets(); await html(); console.log('public/ updated'); } catch (e) { console.error(e.message); } });
  watch(path.join(root, 'src/sources.js'), async () => { try { await html(); } catch (e) { console.error(e.message); } });
  console.log('watching … run `npm run preview` in a second terminal');
} else {
  await esbuild.build(opts);
  console.log('dist/ ready');
}
