import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const sourcePath = path.join(root, 'public', 'partner', 'widget.standalone.js');
const publicPath = path.join(root, 'public', 'widget.js');
const partnerPath = path.join(root, 'public', 'partner', 'widget.js');

function minify(code) {
  const strings = [];
  const protectedCode = code.replace(
    /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g,
    (match) => {
      const token = `__STR_${strings.length}__`;
      strings.push(match);
      return token;
    }
  );

  let output = protectedCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}();,:=<>+\-*/[\]])\s*/g, '$1')
    .trim();

  strings.forEach((str, index) => {
    output = output.split(`__STR_${index}__`).join(str);
  });

  return output;
}

async function build() {
  const source = await fs.readFile(sourcePath, 'utf8');
  const minified = minify(source);
  const banner =
    '/* Desbloquear Premios | Tiendanube | https://desbloquear-premios-production.up.railway.app */\n';

  const output = banner + minified;
  await fs.mkdir(path.dirname(partnerPath), { recursive: true });
  await fs.writeFile(publicPath, output, 'utf8');
  await fs.writeFile(partnerPath, output, 'utf8');

  const stats = await fs.stat(publicPath);
  console.log('[build-widget] OK → public/widget.js (%d KB)', Math.round(stats.size / 1024));
}

build().catch((err) => {
  console.error('[build-widget] Error:', err);
  process.exit(1);
});
