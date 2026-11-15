import { BookOpen, CircleHelp, Lightbulb, MapPin, Snowflake, Sun, ThumbsUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { PlanResponse, RotationCard, RotationId } from '../api/types';
import { CalendarStrip } from '../components/charts/CalendarStrip';
import { DataTable } from '../components/charts/ChartCard';
import { ROT_BG } from '../components/charts/rotation';
import { SoilBreakdown } from '../components/charts/SoilBreakdown';
import { PageIntro } from '../components/layout/PageIntro';
import { SamplePill } from '../components/layout/SampleBadge';
import { Disclosure } from '../components/ui/Disclosure';
import { InfoTip } from '../components/ui/InfoTip';
import { af, money, pct, whole } from '../lib/format';
import { FROST_DAYS_MIN, HEAT_DAYS_MIN, riskMonths } from '../lib/risk';
import { isSample } from '../lib/sources';
import { usePlanContext, useYears } from '../state/PlanContext';

function order(data: PlanResponse): RotationCard[] {
  const rec = data.recommended.mix;
  const cur = data.current.mix;
  // Crops in the suggested plan first (by share), then crops grown today, then the rest; fallow last.
  const score = (id: RotationId) =>
    (id === 'fallow' ? -10 : 0) + ((rec[id] ?? 0) > 0 ? 2 + (rec[id] ?? 0) : (cur[id] ?? 0) > 0 ? 1 + (cur[id] ?? 0) : 0);
  return [...data.rotations].sort((a, b) => score(b.id) - score(a.id));
}

export default function ComparePage() {
  const { t, i18n } = useTranslation();
  const yrs = useYears();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data } = usePlanContext();
  if (!data) return <div className="container-content min-h-[110vh]" />;

  const cards = order(data);
  const best = [...data.rotations].filter((r) => r.stats.avgWaterAf > 0).sort((a, b) => b.stats.profitPerAf - a.stats.profitPerAf)[0];

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.compare.title')} intro={t('pages.compare.intro')} />
      <h2 className="max-w-3xl text-2xl font-semibold leading-snug">
        {t('compare.finding', { name: best.name, v: money(best.stats.profitPerAf, lang) })}
      </h2>
      <p className="mt-2 max-w-3xl text-base text-text-muted">{t('compare.findingSub', yrs)}</p>
      <RiskLegend data={data} />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {cards.map((c) => (
          <RotationCardView key={c.id} card={c} recShare={data.recommended.mix[c.id] ?? 0} curShare={data.current.mix[c.id] ?? 0} monthlyRisk={data.context.monthlyRisk} />
        ))}
      </div>

      <section className="card mt-8">
        <Disclosure>
          <div className="space-y-4 text-base">
            <p>{t('compare.math')}</p>
            <div className="overflow-x-auto" tabIndex={0}>
              <DataTable
                caption={t('compare.tableCaption')}
                head={[t('plan.colRotation'), t('compare.stat.avg'), t('compare.stat.perAf'), t('compare.stat.worst'), t('compare.stat.water'), t('compare.stat.soil')]}
                rows={data.rotations.map((r) => [
                  r.name,
                  money(r.stats.avgProfit, lang),
                  r.stats.avgWaterAf > 0 ? money(r.stats.profitPerAf, lang) : t('compare.noWater'),
                  money(r.stats.worst1in5, lang),
                  af(r.stats.avgWaterAf, lang),
                  whole(r.soil.total, lang),
                ])}
              />
            </div>
          </div>
        </Disclosure>
      </section>
    </div>
  );
}

/** What the sun and snowflake marks mean, and where they come from. */
function RiskLegend({ data }: { data: PlanResponse }) {
  const { t } = useTranslation();
  const yrs = useYears();
  const fromData = !!data.context.monthlyRisk?.length;
  return (
    <div className="mt-4 flex max-w-3xl flex-wrap items-center gap-x-5 gap-y-2 rounded-ctl bg-surface px-4 py-3 text-sm text-text shadow-card">
      <span className="flex items-center gap-1.5">
        <Sun aria-hidden="true" className="h-4 w-4 text-warning" strokeWidth={2.25} />
        {fromData ? t('compare.risk.heat', { n: HEAT_DAYS_MIN }) : t('compare.risk.heatFixed')}
      </span>
      {fromData && (
        <span className="flex items-center gap-1.5">
          <Snowflake aria-hidden="true" className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />
          {t('compare.risk.frost', { n: FROST_DAYS_MIN })}
        </span>
      )}
      <span className="text-text-muted">{fromData ? t('compare.risk.source', yrs) : t('compare.risk.sourceFixed')}</span>
      {(!fromData || isSample(data, ['weather'])) && <SamplePill />}
    </div>
  );
}

function RotationCardView({ card, recShare, curShare, monthlyRisk }: { card: RotationCard; recShare: number; curShare: number; monthlyRisk?: PlanResponse['context']['monthlyRisk'] }) {
  const { t, i18n } = useTranslation();
  const yrs = useYears();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { controls } = usePlanContext();
  const blocks = [
    { key: 'why', icon: Lightbulb, text: card.why },
    { key: 'evidence', icon: BookOpen, text: card.evidence },
    { key: 'benefits', icon: ThumbsUp, text: card.benefits },
    { key: 'gaps', icon: CircleHelp, text: card.gaps },
    { key: 'checkLocally', icon: MapPin, text: card.checkLocally },
  ] as const;
  const stats = [
    { label: t('compare.stat.avg'), value: money(card.stats.avgProfit, lang), tone: 'text-primary' },
    { label: t('compare.stat.perAf'), value: card.stats.avgWaterAf > 0 ? money(card.stats.profitPerAf, lang) : t('compare.noWater'), tone: 'text-primary' },
    { label: t('compare.stat.worst'), value: money(card.stats.worst1in5, lang), tone: card.stats.worst1in5 < 0 ? 'text-danger' : 'text-primary' },
    { label: t('compare.stat.water'), value: `${af(card.stats.avgWaterAf, lang)} AF`, tone: 'text-accent-strong' },
    { label: t('compare.stat.soil'), value: `${whole(card.soil.total, lang)}`, tone: 'text-secondary' },
  ];
  return (
    <article className="card flex flex-col gap-6" aria-labelledby={`rot-${card.id}`}>
      <header>
        <div className="flex flex-wrap items-center gap-2">
          {recShare > 0 && (
            <span className="tnum rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white">
              {t('compare.inSuggested', { v: pct(recShare, lang) })}
            </span>
          )}
          {curShare > 0 && (
            <span className="tnum rounded-full bg-bg px-2.5 py-0.5 text-sm font-semibold text-text ring-1 ring-inset ring-border">
              {t('compare.inCurrent', { v: pct(curShare, lang) })}
            </span>
          )}
          {recShare === 0 && curShare === 0 && (
            <span className="rounded-full bg-bg px-2.5 py-0.5 text-sm font-medium text-text-muted ring-1 ring-inset ring-border-soft">{t('compare.notUsed')}</span>
          )}
        </div>
        <h2 id={`rot-${card.id}`} className="mt-3 flex items-center gap-2.5 text-2xl font-semibold">
          <span aria-hidden="true" className={`h-4 w-4 rounded-[4px] ${ROT_BG[card.id]} ${card.id === 'fallow' ? 'hatch' : ''}`} />
          {card.name}
          {card.id === 'fallow' && <InfoTip term="fallow" />}
        </h2>
        <ul className="mt-1 flex flex-wrap gap-x-4 text-base text-text-muted">
          {card.seasons.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </header>

      <section aria-label={t('compare.calendar')}>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">{t('compare.calendar')}</h3>
        <CalendarStrip card={card} risk={riskMonths(card, monthlyRisk)} />
      </section>

      <section aria-label={t('compare.statement', yrs)}>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">{t('compare.statement', yrs)}</h3>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-ctl bg-border-soft ring-1 ring-border-soft sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-surface p-3">
              <dt className="text-sm leading-tight text-text-muted">{s.label}</dt>
              <dd className={`tnum mt-1 text-lg font-semibold ${s.tone}`}>{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label={t('compare.soilTitle')}>
        <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-text-muted">
          {t('compare.soilTitle')}
          <InfoTip term="soilScore" />
        </h3>
        <SoilBreakdown soil={card.soil} selected={controls.soilParts} />
      </section>

      <dl className="space-y-2 rounded-ctl bg-secondary-tint/60 p-4 text-base">
        <div>
          <dt className="inline font-semibold text-text">{t('compare.pests')} </dt>
          <dd className="inline text-text">{card.pests ?? t('compare.todoLine')}</dd>
        </div>
        <div>
          <dt className="inline font-semibold text-text">{t('compare.infiltration')} </dt>
          <dd className="inline text-text">{card.infiltration ?? t('compare.todoLine')}</dd>
        </div>
      </dl>

      <div className="space-y-4 border-t border-border-soft pt-5">
        {blocks.map((b) => (
          <div key={b.key} className="grid grid-cols-[1.75rem_1fr] gap-x-2">
            <b.icon aria-hidden="true" className={`mt-0.5 h-5 w-5 ${b.key === 'checkLocally' ? 'text-warning' : 'text-primary'}`} />
            <div>
              <h3 className={`text-base font-semibold ${b.key === 'checkLocally' ? 'text-warning' : 'text-text'}`}>{t(`compare.blocks.${b.key}`)}</h3>
              <p className="mt-0.5 text-base text-text">{b.text}</p>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
