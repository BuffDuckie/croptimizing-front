import type { TFunction } from 'i18next';
import type { Classic } from '../../api/types';
import { money } from '../../lib/format';

/** Below this ($/acre in the worst years), we call the two methods the same. */
const NEGLIGIBLE = 5;

/** Plain-language comparison of the classic mean-variance method with ours, computed from the data. */
export function classicCaption(t: TFunction, classic: Classic, lang: 'en' | 'es'): string {
  const at = classic.atSuggested;
  const big = classic.largestGap;
  if (at && at.ourWorst1in5 - at.classicWorst1in5 >= NEGLIGIBLE) {
    return t('trade.classic.worseAtSame', { x: money(at.ourWorst1in5 - at.classicWorst1in5, lang) });
  }
  if (big && big.ourWorst1in5 - big.classicWorst1in5 >= NEGLIGIBLE) {
    return t('trade.classic.sameHereWorseElsewhere', {
      avg: money(big.avgProfit, lang),
      cw: money(big.classicWorst1in5, lang),
      ow: money(big.ourWorst1in5, lang),
    });
  }
  return t('trade.classic.negligible', { x: money(NEGLIGIBLE, lang) });
}
