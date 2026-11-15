import { AlertTriangle, ArrowRight, Droplets, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROTATION_IDS } from '../api/types';
import { DataTable } from '../components/charts/ChartCard';
import { MetricCard } from '../components/charts/MetricCard';
import { MixBar } from '../components/charts/MixBar';
import { WaterMeter } from '../components/charts/WaterMeter';
import { YearsDotStrip } from '../components/charts/YearsDotStrip';
import { PageIntro } from '../components/layout/PageIntro';
import { ControlsPanel } from '../components/plan/Controls';
import { DeltaChip } from '../components/ui/DeltaChip';
import { Disclosure } from '../components/ui/Disclosure';
import { InfoTip } from '../components/ui/InfoTip';
import { acresSplit, af, afDelta, money, moneyDelta, pct, whole, wholeDelta } from '../lib/format';
import { currentTrim, useCurrentLabel, usePlanContext, useYears } from '../state/PlanContext';

export default function PlanPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { farm } = usePlanContext();
  return (
    <div className="container-content page-enter">
      <PageIntro
        title={t('pages.plan.title')}
        intro={t('pages.plan.intro')}
        aside={
          <p className="tnum rounded-full bg-primary-tint px-4 py-2 text-base font-medium text-primary">
            {t('plan.farm', { name: farm.name, acres: whole(farm.acres, lang) })}
          </p>
        }
      />
      <div className="grid gap-8 lg:grid-cols-[340px_minmax(0,1fr)]">
        <ControlsPanel />
        <Results />
      </div>
    </div>
  );
}

function Results() {
  const { t, i18n } = useTranslation();
  const yrs = useYears();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, infeasible, softened, controls, farm, isLoading } = usePlanContext();
  const curLabel = useCurrentLabel();

  if (infeasible && !softened) return <Infeasible />;
  if (!data) return <ResultsSkeleton />;
  const soilMin = softened ? softened.soil : controls.soil;

  const rec = data.recommended.metrics;
  const cur = data.current.metrics;
  const budget = controls.water;
  const trim = currentTrim(data);
  const split = acresSplit(data.recommended.mix, farm.acres);
  const curSplit = acresSplit(data.current.mix, farm.acres);
  const wv = rec.waterValuePerAf;

  return (
    <div className={`min-w-0 space-y-6 transition-opacity duration-base ${isLoading ? 'opacity-90' : ''}`} aria-busy={isLoading}>
      {softened && (
        <>
          <Infeasible />
          <p role="status" className="flex items-start gap-2 rounded-ctl bg-primary-tint p-4 text-base text-primary">
            <Info aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            {t('plan.softened', { y: softened.soil })}
          </p>
        </>
      )}
      <section className="card" aria-labelledby="mix-title">
        <p className="eyebrow">{t('plan.mixSub', { acres: whole(farm.acres, lang) })}</p>
        <h2 id="mix-title" className="mt-2 text-2xl font-semibold leading-tight">
          {t('plan.mixTitle', { ...yrs, water: af(budget, lang) })}
        </h2>
        <div className="mt-6 space-y-6">
          <MixBar mix={data.recommended.mix} acres={farm.acres} label={t('plan.suggestedRow')} />
          <div>
            <MixBar mix={data.current.mix} acres={farm.acres} label={trim ? curLabel : t('plan.currentRow')} size="sm" />
            {trim && <p className="mt-2 text-sm text-text-muted">{t('plan.trimNote', { need: af(trim.needAfPerAcre, lang) })}</p>}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          label={t('plan.avg')}
          value={money(rec.avgProfitPerAcre, lang)}
          unit={t('common.dollarsPerAcre').replace('$', '')}
          delta={
            <>
              <DeltaChip value={rec.avgProfitPerAcre - cur.avgProfitPerAcre} text={moneyDelta(rec.avgProfitPerAcre - cur.avgProfitPerAcre, lang)} label={t('plan.vsCurrent')} />
              <span>{t('plan.vsCurrent')}</span>
            </>
          }
          sub={t('plan.avgHelp', yrs)}
        />
        <MetricCard
          label={t('plan.worst')}
          term="worst1in5"
          value={money(rec.worst1in5PerAcre, lang)}
          unit={t('common.dollarsPerAcre').replace('$', '')}
          delta={
            <>
              <DeltaChip value={rec.worst1in5PerAcre - cur.worst1in5PerAcre} text={moneyDelta(rec.worst1in5PerAcre - cur.worst1in5PerAcre, lang)} label={t('plan.vsCurrent')} />
              <span>{t('plan.vsCurrent')}</span>
            </>
          }
          sub={t('plan.worstHelp', yrs)}
        />
        <MetricCard
          label={t('plan.waterCard')}
          tone="water"
          term="acreFoot"
          value={af(rec.maxWaterAfPerAcre, lang)}
          unit={t('plan.waterUnit')}
          delta={
            <>
              <DeltaChip value={(rec.maxWaterAfPerAcre - cur.maxWaterAfPerAcre) * 10} goodWhen="down" text={afDelta(rec.maxWaterAfPerAcre - cur.maxWaterAfPerAcre, lang)} label={t('plan.vsCurrent')} />
              <span>{t('plan.vsCurrent')}</span>
            </>
          }
          sub={t('plan.currentWas', { v: `${af(cur.maxWaterAfPerAcre, lang)} AF` })}
        >
          <WaterMeter used={rec.maxWaterAfPerAcre} budget={budget} compareUsed={cur.maxWaterAfPerAcre} />
        </MetricCard>
        <MetricCard
          label={t('plan.soilCard')}
          tone="soil"
          term="soilScore"
          value={whole(rec.soilScore, lang)}
          unit="/100"
          delta={
            <>
              <DeltaChip value={rec.soilScore - cur.soilScore} text={wholeDelta(rec.soilScore - cur.soilScore, lang)} label={t('plan.vsCurrent')} />
              <span>{t('plan.vsCurrent')}</span>
            </>
          }
          sub={t('plan.currentWas', { v: `${whole(cur.soilScore, lang)}/100` })}
        >
          <div className="relative h-3 w-full rounded-full bg-secondary-tint" aria-hidden="true">
            <div className="meter-fill absolute inset-y-0 left-0 rounded-full bg-secondary" style={{ width: `${rec.soilScore}%` }} />
            <div className="absolute -top-1.5 h-6 w-[3px] -translate-x-1/2 rounded-full bg-text" style={{ left: `${soilMin}%` }} />
          </div>
        </MetricCard>
      </div>

      <section className="relative overflow-hidden rounded-card bg-primary p-6 text-white shadow-card md:p-8" aria-labelledby="wv-title">
        <div aria-hidden="true" className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-accent/15 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary-ink">
            <Droplets aria-hidden="true" className="h-7 w-7" />
          </span>
          <div className="flex-1">
            <h2 id="wv-title" className="flex flex-wrap items-center gap-1 text-2xl font-semibold leading-tight text-white">
              {wv > 0 ? t('plan.waterValueTitle', { v: money(wv, lang) }) : t('plan.waterValueZero')}
              <span className="on-dark text-white/80 [&_button]:text-white/80">
                <InfoTip term="shadowPrice" />
              </span>
            </h2>
            <p className="mt-2 max-w-2xl text-base text-white/85">
              {wv > 0 ? t('plan.waterValueBody', { tenth: money(wv / 10, lang) }) : t('plan.waterValueZeroBody')}
            </p>
          </div>
        </div>
      </section>

      <YearsDotStrip current={cur.yearlyProfit} recommended={rec.yearlyProfit} />

      <nav aria-label={t('plan.next')} className="grid gap-3 sm:grid-cols-3">
        {[
          { to: '/tradeoffs', label: t('plan.toTradeoffs') },
          { to: '/compare', label: t('plan.toCompare') },
          { to: '/why', label: t('plan.toWhy') },
        ].map((l) => (
          <Link key={l.to} to={l.to} className="learn-more group card flex min-h-[64px] items-center justify-between gap-3 p-5 text-lg font-semibold text-primary no-underline transition-shadow duration-base hover:shadow-lift">
            {l.label}
            <ArrowRight aria-hidden="true" className="h-5 w-5 transition-transform duration-base group-hover:translate-x-1" />
          </Link>
        ))}
      </nav>

      <section className="card">
        <Disclosure>
          <div className="space-y-6 text-base">
            <div>
              <h3 className="text-lg font-semibold">{t('plan.mathTitle')}</h3>
              <p className="mt-2 text-text">
                {t('plan.mathSteps', { water: af(budget, lang), soil: soilMin, risk: controls.risk })}
              </p>
            </div>
            <div className="overflow-x-auto" tabIndex={0}>
              <DataTable
                caption={t('plan.mathTable')}
                head={[t('plan.colRotation'), t('plan.colShare'), t('plan.colAcres'), t('plan.colCurrent')]}
                rows={ROTATION_IDS.map((id) => [
                  t(`rotations.${id}`),
                  pct(data.recommended.mix[id] ?? 0, lang),
                  whole(split[id], lang),
                  whole(curSplit[id], lang),
                ])}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('plan.assumptions')}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-text">
                {data.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <Link to="/method" className="mt-3 inline-flex min-h-[44px] items-center gap-1 font-semibold">
                {t('nav.method')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Disclosure>
      </section>
    </div>
  );
}

function Infeasible() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { infeasible, controls, setControl } = usePlanContext();
  if (!infeasible) return null;
  return (
    <section role="alert" className="card border-l-4 border-warning">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-1 h-6 w-6 shrink-0 text-warning" />
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold">{t('plan.infeasibleTitle')}</h2>
          {infeasible.relax === 'maxShare' ? (
            <p>{t('plan.infeasibleShare')}</p>
          ) : (
            <>
              {infeasible.maxSoilAtThisWater !== undefined && (
                <p>{t('plan.infeasibleSoil', { water: af(controls.water, lang), max: infeasible.maxSoilAtThisWater })}</p>
              )}
              {infeasible.minWaterForThisSoil !== undefined && (
                <p>{t('plan.infeasibleWaterNeed', { soil: controls.soil, need: af(infeasible.minWaterForThisSoil, lang) })}</p>
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {infeasible.maxSoilAtThisWater !== undefined && (
              <button type="button" className="btn btn-primary" onClick={() => setControl('soil', infeasible.maxSoilAtThisWater!)}>
                {t('plan.setSoil', { n: infeasible.maxSoilAtThisWater })}
              </button>
            )}
            {infeasible.minWaterForThisSoil !== undefined && infeasible.minWaterForThisSoil <= 6 && (
              <button type="button" className="btn btn-secondary" onClick={() => setControl('water', infeasible.minWaterForThisSoil!)}>
                {t('plan.setWater', { n: af(infeasible.minWaterForThisSoil, lang) })}
              </button>
            )}
            {infeasible.relax === 'maxShare' && (
              <button type="button" className="btn btn-primary" onClick={() => setControl('maxSharePct', {})}>
                {t('plan.clearShares')}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultsSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6" aria-busy="true" aria-label={t('app.loading')}>
      <div className="skeleton h-56 rounded-card" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-40 rounded-card" />
        ))}
      </div>
    </div>
  );
}

