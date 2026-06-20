import { build } from 'esbuild';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const options = {
  entryPoints: [resolve(__dirname, 'src/index.js')],
  outfile: resolve(__dirname, '../public/widget/nube-app.js'),
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: true,
  sourcemap: false,
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await build({ ...options, sourcemap: true, minify: false });
  await ctx.watch?.();
  console.log('Watching for changes...');
} else {
  await build(options);
  console.log('Build complete → public/widget/nube-app.js');
}
