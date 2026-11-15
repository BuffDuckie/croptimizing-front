import { CalendarClock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ZERO_CANAL_YEAR } from '../../config/waterPresets';
import { af, moneyDelta, money } from '../../lib/format';
import { soilSummary } from '../../lib/soil';
import { isSample, PLAN_DATASETS } from '../../lib/sources';
import { usePlanContext } from '../../state/PlanContext';
import { SamplePill } from '../layout/SampleBadge';

/**
 * Worst-year headline: in a zero-canal-water year like 2023 (that budget, that
 * year's weather and prices), the plan for that water vs. the current plan cut
 * back to fit. Neutral wording when either number goes the wrong way.
 */
export function ZeroCanalLine() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { zeroCanal, farm } = usePlanContext();
  const z = zeroCanal.data;
  if (!z) return null;
  const rec = z.recommended.metrics.yearlyProfit.find((y) => y.year === ZERO_CANAL_YEAR);
  const cur = z.current.metrics.yearlyProfit.find((y) => y.year === ZERO_CANAL_YEAR);
  if (!rec || !cur) return null;
  const x = rec.profit - cur.profit;
  const n = soilSummary(z.current.mix, z.rotations, farm.acres).bareMonths - soilSummary(z.recommended.mix, z.rotations, farm.acres).bareMonths;
  const vals = { year: ZERO_CANAL_YEAR, w: af(zeroCanal.cap, lang), x: money(x, lang), n: af(n, lang), xd: moneyDelta(x, lang), nd: af(Math.abs(n), lang) };
  const good = x >= 0.5 && n >= 0.05;
  const text = good ? t(zeroCanal.same ? 'plan.zero.goodThis' : 'plan.zero.good', vals) : t(n >= 0 ? 'plan.zero.neutralMore' : 'plan.zero.neutralLess', vals);
  const sample = !zeroCanal.fromData || isSample(z, PLAN_DATASETS);
  return (
    <section aria-labelledby="zero-canal" className="flex items-start gap-4 rounded-card bg-primary-tint p-5 md:p-6">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white">
        <CalendarClock aria-hidden="true" className="h-6 w-6" />
      </span>
      <div className="min-w-0">
        {sample && (
          <div className="mb-2">
            <SamplePill />
          </div>
        )}
        <h2 id="zero-canal" className="text-xl font-semibold leading-snug text-primary">
          {text}
        </h2>
        <p className="mt-1 text-sm text-text-muted">{t('plan.zero.note', vals)}</p>
      </div>
    </section>
  );
}
