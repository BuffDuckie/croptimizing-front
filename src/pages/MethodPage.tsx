import 'katex/dist/katex.min.css';
import { Download } from 'lucide-react';
import { BlockMath } from 'react-katex';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/charts/ChartCard';
import { CorrelationHeatmap } from '../components/charts/CorrelationHeatmap';
import { PageIntro } from '../components/layout/PageIntro';
import { af, money } from '../lib/format';
import { usePlanContext } from '../state/PlanContext';
import { F } from './formulas';

const SECTIONS = ['idea', 'formulas', 'steps', 'sources', 'correlations', 'backtest', 'scenarios', 'assumptions'] as const;

function Formula({ tex, label }: { tex: string; label: string }) {
  return (
    <figure className="m-0 min-w-0 rounded-ctl bg-bg px-4 py-3 ring-1 ring-inset ring-border-soft">
      <div className="overflow-x-auto text-text">
        <BlockMath math={tex} />
      </div>
      <figcaption className="text-sm text-text-muted">{label}</figcaption>
    </figure>
  );
}

export default function MethodPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls } = usePlanContext();
  if (!data) return <div className="container-content min-h-[60vh]" />;

  const steps = t('method.stepsList', { returnObjects: true }) as string[];
  const limits = t('method.limits', { returnObjects: true }) as string[];
  const sources = t('method.sourceRows', { returnObjects: true }) as string[][];

  const downloadCsv = () => {
    const head = ['year', 'suggested_profit_usd_per_acre', 'current_profit_usd_per_acre', 'current_profit_if_short_acres_fallowed', 'suggested_water_af_per_acre', 'current_water_af_per_acre', 'water_budget_af_per_acre', 'data_source'];
    const rows = data.stressTests.map((s) => {
      const rec = data.recommended.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? '';
      const cur = data.current.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? '';
      return [s.year, rec, cur, s.currentProfit, s.recommendedWater, s.currentWater, controls.water, data.dataSource];
    });
    const csv = [head, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `croptimizing-scenarios-w${controls.water.toFixed(1)}-r${controls.risk}-s${controls.soil}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.method.title')} intro={t('pages.method.intro')} />
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('method.toc')} className="hidden lg:block">
          <ol className="sticky top-[136px] space-y-1 border-l border-border-soft">
            {SECTIONS.map((s) => (
              <li key={s}>
                <a href={`#${s}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-base font-medium text-text-muted no-underline transition-colors duration-fast hover:border-primary hover:text-primary">
                  {t(`method.sec.${s}`)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-12">
          <section id="idea" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.idea')}</h2>
            <p className="mt-3 max-w-3xl text-lg text-text">{t('method.idea')}</p>
          </section>

          <section id="formulas" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.formulas')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text-muted">{t('method.formulasIntro')}</p>
            <div className="mt-5 grid gap-3">
              <Formula tex={F.objective} label={t('method.f.objective')} />
              <Formula tex={F.profit} label={t('method.f.profit')} />
              <Formula tex={F.water} label={t('method.f.water')} />
              <Formula tex={F.soil} label={t('method.f.soil')} />
              <Formula tex={F.cvar} label={t('method.f.cvar')} />
              <Formula tex={F.shadow} label={t('method.f.shadow')} />
              <Formula tex={F.et} label={t('method.f.et')} />
            </div>
          </section>

          <section id="steps" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.steps')}</h2>
            <ol className="mt-5 space-y-4">
              {steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="tnum inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-base font-semibold text-primary">{i + 1}</span>
                  <p className="pt-0.5 text-base text-text">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="sources" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.sources')}</h2>
            <div className="card mt-5 overflow-x-auto">
              <DataTable caption={t('method.sourcesCaption')} head={t('method.sourceHead', { returnObjects: true }) as string[]} rows={sources} className="min-w-[640px] [&_td]:text-left [&_th]:text-left" />
            </div>
          </section>

          <section id="correlations" className="scroll-mt-36">
            <h2 className="mb-5 text-3xl font-semibold">{t('method.sec.correlations')}</h2>
            <CorrelationHeatmap correlations={data.correlations} />
          </section>

          <section id="backtest" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.backtest')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text">{t('method.backtestIntro')}</p>
            <div className="card mt-5 overflow-x-auto">
              <DataTable
                caption={t('method.backtestCaption')}
                head={[t('method.strategy'), t('compare.stat.avg'), t('compare.stat.worst'), t('method.avgWater')]}
                rows={data.backtest.map((b) => [b.strategy, money(b.avgProfit, lang), money(b.worst1in5, lang), `${af(b.avgWater, lang)} AF`])}
                className="min-w-[560px]"
              />
            </div>
          </section>

          <section id="scenarios" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.scenarios')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text">{t('method.scenariosIntro')}</p>
            <button type="button" onClick={downloadCsv} className="btn btn-primary mt-4">
              <Download aria-hidden="true" className="h-5 w-5" />
              {t('method.download')}
            </button>
            <div className="card mt-5 max-h-[480px] overflow-auto">
              <DataTable
                caption={t('method.scenarioCaption')}
                head={[t('why.year'), `${t('common.recommended')} $/acre`, `${t('common.current')} $/acre`, `${t('common.recommended')} AF`, `${t('common.current')} AF`]}
                rows={data.stressTests.map((s) => [
                  s.year,
                  money(data.recommended.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? 0, lang),
                  money(data.current.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? 0, lang),
                  af(s.recommendedWater, lang),
                  af(s.currentWater, lang),
                ])}
                className="min-w-[560px]"
              />
            </div>
          </section>

          <section id="assumptions" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.assumptions')}</h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="card">
                <h3 className="text-xl font-semibold">{t('plan.assumptions')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-text">
                  {data.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="text-xl font-semibold">{t('method.limitsTitle')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-text">
                  {limits.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
