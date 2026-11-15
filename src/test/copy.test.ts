import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import en from '../i18n/locales/en.json';
import es from '../i18n/locales/es.json';

const EM_DASH = String.fromCharCode(0x2014);
const BANNED = [/guaranteed/i, /optimal for you/i, /AI decided/i, /garantizad/i];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function keys(obj: unknown, prefix = ''): string[] {
  if (Array.isArray(obj)) return [prefix];
  if (obj && typeof obj === 'object')
    return Object.entries(obj).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe('words on screen', () => {
  it('never uses an em dash in source or locale files', () => {
    const offenders = walk(join(__dirname, '..'))
      .filter((f) => /\.(tsx?|json|css)$/.test(f))
      .filter((f) => readFileSync(f, 'utf8').includes(EM_DASH));
    expect(offenders).toEqual([]);
  });

  it('never makes promises the model cannot keep', () => {
    const text = JSON.stringify(en) + JSON.stringify(es);
    for (const re of BANNED) expect(text).not.toMatch(re);
  });

  it('has a Spanish string for every English string', () => {
    const esKeys = new Set(keys(es));
    const missing = keys(en).filter((k) => !esKeys.has(k));
    expect(missing).toEqual([]);
  });
});
