/**
 * i18n consistency audit (temporary)
 * Compares ar.json vs en.json and reports missing keys both ways.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const ar = JSON.parse(readFileSync(resolve(root, 'src/messages/ar.json'), 'utf8'));
const en = JSON.parse(readFileSync(resolve(root, 'src/messages/en.json'), 'utf8'));

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

const arFlat = flatten(ar);
const enFlat = flatten(en);

const arKeys = new Set(Object.keys(arFlat));
const enKeys = new Set(Object.keys(enFlat));

const missingInEn = [...arKeys].filter((k) => !enKeys.has(k)).sort();
const missingInAr = [...enKeys].filter((k) => !arKeys.has(k)).sort();

console.log('=== TOP-LEVEL NAMESPACES ===');
console.log('AR:', Object.keys(ar).sort().join(', '));
console.log('EN:', Object.keys(en).sort().join(', '));
console.log('');
console.log('=== MISSING IN EN (present in ar) ===', missingInEn.length);
missingInEn.forEach((k) => console.log('  ', k));
console.log('');
console.log('=== MISSING IN AR (present in en) ===', missingInAr.length);
missingInAr.forEach((k) => console.log('  ', k));
console.log('');
console.log('AR total keys:', arKeys.size, '| EN total keys:', enKeys.size);
console.log('AR has notifications ns:', Object.prototype.hasOwnProperty.call(ar, 'notifications'));
console.log('EN has notifications ns:', Object.prototype.hasOwnProperty.call(en, 'notifications'));