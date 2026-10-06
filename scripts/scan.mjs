import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
const files = walk(join(root, 'src'));
const needles = [
  'router.refresh(',
  'useEffect(',
  'use client',
  'console.log',
  'console.error',
  'debugger',
  'TODO',
  'FIXME',
  'HACK',
  'SERVICE_ROLE',
  'service_role',
  'createBrowserClient',
  'window.location',
  'force-dynamic',
  'revalidatePath',
  'fetch(',
];
const counts = Object.fromEntries(needles.map((n) => [n, 0]));
const hits = Object.fromEntries(needles.map((n) => [n, []]));
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const n of needles) {
      if (line.includes(n)) {
        counts[n]++;
        if (hits[n].length < 60) hits[n].push(`${file.replace(root + '\\', '').replace(root + '/', '')}:${i + 1}: ${line.trim().slice(0, 120)}`);
      }
    }
  });
}
console.log('FILE COUNT:', files.length);
for (const n of needles) {
  console.log(`\n### ${n} (${counts[n]})`);
  hits[n].forEach((h) => console.log('  ' + h));
}