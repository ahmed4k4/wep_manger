import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const loc of ['ar', 'en']) {
  const raw = readFileSync(resolve(root, `src/messages/${loc}.json`), 'utf8');
  const matches = raw.match(/"notifications"\s*:/g);
  console.log(loc, 'occurrences of "notifications":', matches ? matches.length : 0);
  // detect duplicate top-level keys
  const keys = raw.match(/^  "[^"]+"\s*:/gm) || [];
  const seen = new Map();
  for (const k of keys) {
    const name = k.match(/"([^"]+)"/)[1];
    seen.set(name, (seen.get(name) || 0) + 1);
  }
  const dups = [...seen.entries()].filter(([, c]) => c > 1);
  console.log(loc, 'duplicate top-level keys:', JSON.stringify(dups));
}
// Validate each file parses
for (const loc of ['ar', 'en']) {
  try {
    JSON.parse(readFileSync(resolve(root, `src/messages/${loc}.json`), 'utf8'));
    console.log(loc, 'JSON parse OK');
  } catch (e) {
    console.log(loc, 'JSON parse ERROR:', e.message);
  }
}