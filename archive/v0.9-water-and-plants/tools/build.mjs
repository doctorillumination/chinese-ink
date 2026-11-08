import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const esbuild = require(process.env.KOI_ESBUILD_PATH || 'esbuild');
const result = await esbuild.build({
  entryPoints: [path.join(root, 'src/app.mjs')],
  bundle: true, write: false, minify: true, format: 'iife', target: 'es2020',
  legalComments: 'inline',
});
const [shell, css, license] = await Promise.all([
  readFile(path.join(root, 'src/shell.html'), 'utf8'),
  readFile(path.join(root, 'src/style.css'), 'utf8'),
  readFile(path.join(root, 'vendor/THREE-LICENSE.txt'), 'utf8'),
]);
const script = result.outputFiles[0].text.replaceAll('</script', '<\\/script');
const html = shell.replace('/* INLINE_STYLES */', css).replace('/* INLINE_APP */', () => script)
  .replace('<script>', () => `<!-- Bundled Three.js r180 license:\n${license}\n-->\n  <script>`);
await writeFile(path.join(root, 'index.html'), html);
console.log(`Built index.html: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, no external assets.`);
