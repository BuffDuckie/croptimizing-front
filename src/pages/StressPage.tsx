import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, DataTable } from '../components/charts/ChartCard';
import { axisLine, axisTick, gridStroke, tooltipStyle } from '../components/charts/rechartsTheme';
import { PageIntro } from '../components/layout/PageIntro';
import { Disclosure } from '../components/ui/Disclosure';
import { af, money } from '../lib/format';
import { usePlanContext } from '../state/PlanContext';
import { colors } from '../theme/tokens';

const FEATURED = [2020, 2022, 2023, 2024];

export default function StressPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls } = usePlanContext();
  const [year, setYear] = useState(2020);
  if (!data) return <div className="container-content min-h-[60vh]" />;

  const s = data.stressTests.find((x) => x.year === year) ?? data.stressTests[0];
  const curOver = s.currentWater > controls.water + 0.005;
  const better = s.recommendedProfit >= s.currentProfit;
  const profitData = [
    { name: t('common.current'), v: s.currentProfit, fill: colors['text-muted'] },
    { name: t('common.recommended'), v: s.recommendedProfit, fill: colors.primary },
  ];
  const waterData = [
    { name: t('common.current'), v: s.currentWater, fill: curOver ? colors.danger : colors['text-muted'] },
    { name: t('common.recommended'), v: s.recommendedWater, fill: colors['accent-strong'] },
  ];
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

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={better ? t('stress.profitBetter', { year, rec: money(s.recommendedProfit, lang), cur: money(s.currentProfit, lang) }) : t('stress.profitWorse', { year, rec: money(s.recommendedProfit, lang), cur: money(s.currentProfit, lang) })}
          subtitle={t('stress.profitSub')}
          howTo={<p>{t('stress.how1')}</p>}
          table={<DataTable caption={t('stress.profitCaption', { year })} head={[t('trade.colPlan'), t('stress.profit')]} rows={profitData.map((d) => [d.name, money(d.v, lang)])} />}
        >
          <div className="h-60" role="img" aria-label={t('stress.profitAria', { year, rec: money(s.recommendedProfit, lang), cur: money(s.currentProfit, lang) })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData} layout="vertical" margin={{ top: 28, right: 72, left: 8, bottom: 20 }}>
                <CartesianGrid stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={axisTick} axisLine={axisLine} tickLine={false} tickFormatter={(v: number) => money(v, lang)} label={{ value: t('stress.profit'), position: 'insideBottom', offset: -14, fill: colors['text-muted'], fontSize: 14 }} />
                <YAxis type="category" dataKey="name" tick={{ ...axisTick, fill: colors.text }} axisLine={false} tickLine={false} width={150} />
                <ReferenceLine x={0} stroke={colors.border} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [money(v, lang), t('stress.profit')]} />
                <Bar dataKey="v" radius={[0, 6, 6, 0]} barSize={36} isAnimationActive={false}>
                  <LabelList dataKey="v" position="right" formatter={(v: number) => money(v, lang)} style={{ fill: colors.text, fontSize: 15, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={curOver ? t('stress.waterOver', { year, need: af(s.currentWater, lang), budget: af(controls.water, lang) }) : t('stress.waterFits', { year })}
          subtitle={t('stress.waterSub')}
          howTo={<p>{t('stress.how2')}</p>}
          table={<DataTable caption={t('stress.waterCaption', { year })} head={[t('trade.colPlan'), t('stress.water')]} rows={waterData.map((d) => [d.name, af(d.v, lang)])} />}
          footer={
            curOver ? (
              <p className="flex items-start gap-2 text-sm text-danger">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                {t('stress.fallowNote')}
              </p>
            ) : undefined
          }
        >
          <div className="h-60" role="img" aria-label={t('stress.waterAria', { year, cur: af(s.currentWater, lang), rec: af(s.recommendedWater, lang), budget: af(controls.water, lang) })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterData} layout="vertical" margin={{ top: 28, right: 72, left: 8, bottom: 20 }}>
                <CartesianGrid stroke={gridStroke} horizontal={false} />
                <XAxis type="number" domain={[0, (max: number) => Math.max(max, controls.water) * 1.1]} tick={axisTick} axisLine={axisLine} tickLine={false} tickFormatter={(v: number) => af(v, lang)} label={{ value: t('stress.water'), position: 'insideBottom', offset: -14, fill: colors['text-muted'], fontSize: 14 }} />
                <YAxis type="category" dataKey="name" tick={{ ...axisTick, fill: colors.text }} axisLine={false} tickLine={false} width={150} />
                <ReferenceLine x={controls.water} stroke={colors.text} strokeWidth={2} label={{ value: t('stress.budget', { v: af(controls.water, lang) }), position: 'top', fill: colors.text, fontSize: 14, fontWeight: 600 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${af(v, lang)} AF`, t('stress.water')]} />
                <Bar dataKey="v" radius={[0, 6, 6, 0]} barSize={36} isAnimationActive={false}>
                  <LabelList dataKey="v" position="right" formatter={(v: number) => `${af(v, lang)} AF`} style={{ fill: colors.text, fontSize: 15, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <section className="card mt-6">
        <Disclosure>
          <div className="space-y-4 text-base">
            <p>{t('stress.math1')}</p>
            <p>{t('stress.math2')}</p>
            <div className="overflow-x-auto">
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
