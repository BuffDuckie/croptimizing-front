import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/charts/ChartCard';
import { PanelsSkeleton } from '../components/lazy/Skeletons';
import { PageIntro } from '../components/layout/PageIntro';
import { Disclosure } from '../components/ui/Disclosure';
import { af, money } from '../lib/format';
import { usePlanContext } from '../state/PlanContext';

const FEATURED = [2020, 2022, 2023, 2024];

// Charts load after the page text so the page paints fast.
const StressCharts = lazy(() => import('../components/lazy/StressCharts'));

export default function StressPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls } = usePlanContext();
  const [year, setYear] = useState(2020);
  if (!data) return <div className="container-content min-h-[110vh]" />;

  const s = data.stressTests.find((x) => x.year === year) ?? data.stressTests[0];
  const label = data.stressTests.find((x) => x.year === year)?.label ?? String(year);

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.stress.title')} intro={t('pages.stress.intro')} />

      <div className="card mb-6">
        <fieldset>
          <legend className="text-base font-semibold text-text">{t('stress.pick')}</legend>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {FEATURED.map((y) => (
              <button
                key={y}
                type="button"
                aria-pressed={year === y}
                onClick={() => setYear(y)}
                className={`tnum min-h-[44px] rounded-full px-4 text-base font-semibold ring-1 ring-inset transition-colors duration-base ${
                  year === y ? 'bg-primary text-white ring-primary' : 'bg-surface text-primary ring-border hover:bg-primary-tint'
                }`}
              >
                {y}
              </button>
            ))}
            <label htmlFor="year-select" className="ml-2 text-base text-text-muted">
              {t('stress.orAny')}
            </label>
            <select id="year-select" className="input tnum w-32" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {data.stressTests.map((x) => (
                <option key={x.year} value={x.year}>
                  {x.year}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <p className="mt-4 text-lg font-medium text-text" aria-live="polite">
          {label}
        </p>
      </div>

      <Suspense fallback={<PanelsSkeleton count={2} height="h-[420px]" />}>
        <StressCharts s={s} budget={controls.water} />
      </Suspense>

      <section className="card mt-6">
        <Disclosure>
          <div className="space-y-4 text-base">
            <p>{t('stress.math1')}</p>
            <p>{t('stress.math2')}</p>
            <div className="overflow-x-auto" tabIndex={0}>
              <DataTable
                caption={t('stress.allCaption')}
                head={[t('why.year'), `${t('common.current')} $`, `${t('common.recommended')} $`, `${t('common.current')} AF`, `${t('common.recommended')} AF`]}
                rows={data.stressTests.map((x) => [x.year, money(x.currentProfit, lang), money(x.recommendedProfit, lang), af(x.currentWater, lang), af(x.recommendedWater, lang)])}
              />
            </div>
          </div>
        </Disclosure>
      </section>
    </div>
  );
}
