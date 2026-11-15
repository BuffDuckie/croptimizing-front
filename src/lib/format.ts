import type { Mix, RotationId } from '../api/types';
import { ROTATION_IDS } from '../api/types';

type Lang = 'en' | 'es';
const MINUS = String.fromCharCode(0x2212);

function locale(lang: Lang) {
  return lang === 'es' ? 'es-US' : 'en-US';
}

/** Dollars with no cents. Negative values use a true minus sign. */
export function money(n: number, lang: Lang = 'en'): string {
  const s = new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.abs(Math.round(n)));
  return Math.round(n) < 0 ? `${MINUS}${s}` : s;
}

/** Signed dollars for deltas: +$12, -$40, $0. */
export function moneyDelta(n: number, lang: Lang = 'en'): string {
  const r = Math.round(n);
  if (r === 0) return money(0, lang);
  return `${r > 0 ? '+' : MINUS}${money(Math.abs(r), lang)}`;
}

/** Acre-feet to one decimal. */
export function af(n: number, lang: Lang = 'en'): string {
  return new Intl.NumberFormat(locale(lang), { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);
}

export function afDelta(n: number, lang: Lang = 'en'): string {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return af(0, lang);
  return `${r > 0 ? '+' : MINUS}${af(Math.abs(r), lang)}`;
}

/** Whole numbers (scores, acres). */
export function whole(n: number, lang: Lang = 'en'): string {
  return new Intl.NumberFormat(locale(lang), { maximumFractionDigits: 0 }).format(Math.round(n));
}

export function wholeDelta(n: number, lang: Lang = 'en'): string {
  const r = Math.round(n);
  if (r === 0) return '0';
  return `${r > 0 ? '+' : MINUS}${whole(Math.abs(r), lang)}`;
}

export function pct(share: number, lang: Lang = 'en'): string {
  return `${whole(share * 100, lang)}%`;
}

/** Ordered list of non-zero rotations in a mix. */
export function mixEntries(mix: Mix): { id: RotationId; share: number }[] {
  return ROTATION_IDS.filter((id) => (mix[id] ?? 0) > 0.0001).map((id) => ({ id, share: mix[id] ?? 0 }));
}

/** Split acres so the parts are whole numbers and add up exactly. */
export function acresSplit(mix: Mix, acres: number): Record<RotationId, number> {
  const entries = ROTATION_IDS.map((id) => ({ id, raw: (mix[id] ?? 0) * acres }));
  const floors = entries.map((e) => ({ ...e, v: Math.floor(e.raw), rem: e.raw - Math.floor(e.raw) }));
  let left = Math.round(acres) - floors.reduce((s, e) => s + e.v, 0);
  [...floors].sort((a, b) => b.rem - a.rem).forEach((e) => {
    if (left > 0 && e.raw > 0) {
      e.v += 1;
      left -= 1;
    }
  });
  return Object.fromEntries(floors.map((e) => [e.id, e.v])) as Record<RotationId, number>;
}
