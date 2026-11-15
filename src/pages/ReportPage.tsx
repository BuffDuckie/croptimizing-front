import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ROTATION_IDS } from '../api/types';
import { MixBar } from '../components/charts/MixBar';
import { PageIntro } from '../components/layout/PageIntro';
import { LogoMark } from '../components/layout/Logo';
import { acresSplit, af, money, pct, whole } from '../lib/format';
import { usePlanContext } from '../state/PlanContext';

export default function ReportPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, farm, controls, infeasible } = usePlanContext();
  if (!data) return <div className="container-content min-h-[60vh]" />;

  const rec = data.recommended.metrics;
  const cur = data.current.metrics;
  const split = acresSplit(data.recommended.mix, farm.acres);
  const curSplit = acresSplit(data.current.mix, farm.acres);
  const date = new Intl.DateTimeFormat(lang === 'es' ? 'es-US' : 'en-US', { dateStyle: 'long' }).format(new Date());
  const general = t('report.questions', { returnObjects: true }) as string[];
  const local = data.rotations.filter((r) => (data.recommended.mix[r.id] ?? 0) > 0 && r.id !== 'fallow').map((r) => `${r.name}: ${r.checkLocally}`);
  const rows: [string, string, string][] = [
    [t('plan.avg'), money(rec.avgProfitPerAcre, lang), money(cur.avgProfitPerAcre, lang)],
    [t('plan.worst'), money(rec.worst1in5PerAcre, lang), money(cur.worst1in5PerAcre, lang)],
    [t('plan.waterCard'), `${af(rec.maxWaterAfPerAcre, lang)} AF`, `${af(cur.maxWaterAfPerAcre, lang)} AF`],
    [t('plan.soilCard'), `${whole(rec.soilScore, lang)}/100`, `${whole(cur.soilScore, lang)}/100`],
  ];

  return (
    <div className="container-content page-enter">
      <div className="print:hidden">
        <PageIntro
          title={t('pages.report.title')}
          intro={t('pages.report.intro')}
          aside={
            <button type="button" className="btn btn-primary min-h-[52px] px-6 text-lg" onClick={() => window.print()}>
              <Printer aria-hidden="true" className="h-5 w-5" />
              {t('report.print')}
            </button>
          }
        />
        {infeasible && <p className="mb-4 rounded-ctl bg-warning-tint p-3 text-base text-warning">{t('report.stale')}</p>}
      </div>

      <article className="report-sheet mx-auto max-w-[880px] rounded-card bg-surface p-8 shadow-lift ring-1 ring-border-soft md:p-12 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-4">
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-primary">
              <LogoMark className="h-5 w-5" /> Croptimizing
            </p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight print:text-2xl">{t('report.heading', { name: farm.name })}</h1>
            <p className="tnum mt-1 text-base text-text-muted">
              {t('report.meta', { acres: whole(farm.acres, lang), water: af(controls.water, lang), risk: controls.risk, soil: controls.soil, date })}
            </p>
          </div>
          {data.dataSource === 'sample' && (
            <p className="shrink-0 rounded-ctl border border-warning px-3 py-1.5 text-sm font-semibold text-warning">{t('app.sampleBadge')}</p>
          )}
        </header>

        <section className="mt-5">
          <h2 className="text-lg font-semibold">{t('report.mix')}</h2>
          <p className="mt-1 text-base text-text">{t('plan.mixTitle', { water: af(controls.water, lang) })}.</p>
          <div className="mt-3">
            <MixBar mix={data.recommended.mix} acres={farm.acres} label={t('plan.suggestedRow')} showLegend={false} />
          </div>
          <table className="tnum mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="py-1.5 font-semibold text-text-muted">{t('plan.colRotation')}</th>
                <th scope="col" className="py-1.5 text-right font-semibold text-text-muted">{t('plan.colShare')}</th>
                <th scope="col" className="py-1.5 text-right font-semibold text-text-muted">{t('plan.colAcres')}</th>
                <th scope="col" className="py-1.5 text-right font-semibold text-text-muted">{t('plan.colCurrent')}</th>
              </tr>
            </thead>
            <tbody>
              {ROTATION_IDS.filter((id) => (data.recommended.mix[id] ?? 0) > 0 || (data.current.mix[id] ?? 0) > 0).map((id) => (
                <tr key={id} className="border-b border-border-soft">
                  <th scope="row" className="py-1.5 font-medium text-text">{t(`rotations.${id}`)}</th>
                  <td className="py-1.5 text-right">{pct(data.recommended.mix[id] ?? 0, lang)}</td>
                  <td className="py-1.5 text-right font-semibold">{whole(split[id], lang)}</td>
                  <td className="py-1.5 text-right text-text-muted">{whole(curSplit[id], lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-5 grid gap-6 md:grid-cols-2 print:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">{t('report.numbers')}</h2>
            <table className="tnum mt-2 w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="py-1.5 font-semibold text-text-muted" />
                  <th scope="col" className="py-1.5 text-right font-semibold text-text-muted">{t('plan.suggestedRow')}</th>
                  <th scope="col" className="py-1.5 text-right font-semibold text-text-muted">{t('report.today')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, a, b]) => (
                  <tr key={k} className="border-b border-border-soft">
                    <th scope="row" className="py-1.5 font-medium text-text">{k}</th>
                    <td className="py-1.5 text-right font-semibold text-primary">{a}</td>
                    <td className="py-1.5 text-right text-text-muted">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-text">
              {rec.waterValuePerAf > 0 ? t('plan.waterValueTitle', { v: money(rec.waterValuePerAf, lang) }) : t('plan.waterValueZero')}.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{t('report.questionsTitle')}</h2>
            <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-text">
              {[...general, ...local].slice(0, 6).map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mt-5">
          <h2 className="text-lg font-semibold">{t('plan.assumptions')}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text">
            {data.assumptions.slice(0, 5).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-6 border-t border-border pt-3 text-sm text-text-muted">
          <p className="font-medium text-text">{t('footer.disclaimer')}</p>
          <p className="mt-1">{t('footer.credits')}</p>
        </footer>
      </article>
    </div>
  );
}
