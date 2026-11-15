import { Thermometer } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';
import { PanelsSkeleton } from '../components/lazy/Skeletons';
import { isSample } from '../lib/sources';
import { usePlanContext } from '../state/PlanContext';

// Charts load after the page text so the page paints fast.
const WhyPanels = lazy(() => import('../components/lazy/WhyPanels'));

export default function WhyPage() {
  const { t } = useTranslation();
  const { data } = usePlanContext();
  const anySample = isSample(data, ['grace', 'weather', 'etCheck']) || data?.context.otherRegions?.some((r) => r.source !== 'real');
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.why.title')} intro={t('pages.why.intro')} />

      <section className="relative mb-8 overflow-hidden rounded-card bg-primary p-6 text-white md:p-8">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(50%_90%_at_90%_0%,rgba(0,194,255,0.18),transparent_60%)]" />
        <div className="relative grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-center">
          <h2 className="text-2xl font-semibold leading-snug text-white md:text-3xl">{t('why.lead')}</h2>
          <div className="space-y-3 text-base text-white/85">
            <p>
              <strong className="text-white">{t('why.satVsGroundTitle')}</strong> {t('why.satVsGround1')}
            </p>
            <p>{t('why.satVsGround2')}</p>
          </div>
        </div>
      </section>

      <Suspense fallback={<PanelsSkeleton />}>
        <WhyPanels />
      </Suspense>

      {anySample && (
        <section className="card mt-6 flex items-start gap-3">
          <Thermometer aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <p className="text-base text-text">{t('why.footnote')}</p>
        </section>
      )}
    </div>
  );
}
