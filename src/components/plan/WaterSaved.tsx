import { Droplets } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Metrics } from '../../api/types';
import { af, whole } from '../../lib/format';
import { gallons, GALLONS_PER_AF, meanOf } from '../../lib/water';

/**
 * Water the plan saves vs. the current plan as farmed today, in an average year:
 * acre-feet per acre, per farm, and gallons.
 */
export function WaterSaved({ plan, asFarmed, acres, planLabel }: { plan: Metrics; asFarmed: Metrics; acres: number; planLabel: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  if (!plan.yearlyWater || !asFarmed.yearlyWater) return null;
  const perAcre = meanOf(asFarmed.yearlyWater.map((y) => y.water)) - meanOf(plan.yearlyWater.map((y) => y.water));
  const farm = Math.abs(perAcre) * acres;
  const vals = { v: af(Math.abs(perAcre), lang), farm: whole(farm, lang), acres: whole(acres, lang), gal: gallons(farm * GALLONS_PER_AF, lang), plan: planLabel };
  const key = Math.abs(perAcre) < 0.05 ? 'same' : perAcre > 0 ? 'saves' : 'uses';
  return (
    <section className="flex items-start gap-4 rounded-card bg-accent-tint p-5 shadow-card md:p-6" aria-labelledby="water-saved-title">
      <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary-ink">
        <Droplets aria-hidden="true" className="h-6 w-6" />
      </span>
      <div>
        <h2 id="water-saved-title" className="text-xl font-semibold leading-snug text-text">
          {t(`plan.saved.${key}`, vals)}
        </h2>
        {key !== 'same' && <p className="tnum mt-1 text-base text-text">{t(`plan.saved.${key}Farm`, vals)}</p>}
        <p className="mt-1 text-sm text-text-muted">{t('plan.saved.note', { g: whole(GALLONS_PER_AF, lang) })}</p>
      </div>
    </section>
  );
}
