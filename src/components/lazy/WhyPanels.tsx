import { PanelsSkeleton } from './Skeletons';
import { Satellite } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartCard, DataTable } from '../charts/ChartCard';
import { axisLine, axisTick, gridStroke, tooltipStyle } from '../charts/rechartsTheme';
import { InfoTip } from '../ui/InfoTip';
import { isSample } from '../../lib/sources';
import { usePlanContext } from '../../state/PlanContext';
import { colors } from '../../theme/tokens';

function Source({ mission, detail }: { mission: string; detail: string }) {
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-muted">
      <Satellite aria-hidden="true" className="h-4 w-4 text-accent-strong" />
      <span className="font-semibold text-text">{mission}</span>
      <span>{detail}</span>
    </p>
  );
}

export default function WhyPanels() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data } = usePlanContext();
  if (!data) return <PanelsSkeleton />;
  const ctx = data.context;
  const nf = (n: number, d = 0) => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

  // GRACE: yearly means for the finding; monthly points for the chart.
  const byYear = new Map<number, number[]>();
  for (const p of ctx.graceTwsCm) {
    const y = Number(p.date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), p.value]);
  }
  const years = [...byYear.keys()].sort();
  const yMean = (y: number) => (byYear.get(y) ?? [0]).reduce((s, v) => s + v, 0) / (byYear.get(y)?.length ?? 1);
  const drop = yMean(years[0]) - yMean(years[years.length - 1]);
  const grace = ctx.graceTwsCm.map((p) => ({ ...p, t: Number(p.date.slice(0, 4)) + (Number(p.date.slice(5, 7)) - 1) / 12 }));

  const heat = ctx.heatDaysPerYear;
  const firstFive = heat.slice(0, 5).reduce((s, h) => s + h.days, 0) / Math.min(5, heat.length);
  const lastFive = heat.slice(-5).reduce((s, h) => s + h.days, 0) / Math.min(5, heat.length);

  const months = t('months', { returnObjects: true }) as string[];
  const et0 = ctx.et0MonthlyMm.map((m) => ({ ...m, name: months[m.month - 1] }));
  const peak = et0.reduce((a, b) => (b.mm > a.mm ? b : a));
  const etCheck = ctx.etCheck.map((c) => ({ ...c, name: t(`why.crops.${c.crop}`, { defaultValue: c.crop }) }));
  const maxGap = Math.max(...ctx.etCheck.map((c) => Math.abs(c.modeledMm - c.satelliteMm) / c.satelliteMm)) * 100;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t('why.graceTitle', { v: nf(drop, 0), from: years[0], to: years[years.length - 1] })}
          subtitle={<Source mission="NASA GRACE / GRACE-FO" detail={t('why.graceRes')} />}
          howTo={
            <>
              <p>{t('why.graceHow1', { from: years[0], to: years[years.length - 1] })}</p>
              <p className="flex items-center gap-1">
                {t('why.graceHow2')} <InfoTip term="grace" />
              </p>
            </>
          }
          table={<DataTable caption={t('why.graceCaption')} head={[t('why.year'), t('why.cm')]} rows={years.map((y) => [y, nf(yMean(y), 1)])} />}
          sample={isSample(data, ['grace'])}
          id="grace"
          className="scroll-mt-36"
        >
          <div className="h-64" role="img" aria-label={t('why.graceAria', { v: nf(drop, 0), from: years[0], to: years[years.length - 1] })}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={grace} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <defs>
                  <linearGradient id="graceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={colors.accent} stopOpacity={0.35} />
                    <stop offset="1" stopColor={colors.accent} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} ticks={[2005, 2010, 2015, 2020, 2024]} tickFormatter={(v: number) => String(Math.floor(v))} tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} label={{ value: t('why.cm'), angle: -90, position: 'insideLeft', fill: colors['text-muted'], fontSize: 14, dy: 30 }} />
                <ReferenceLine y={0} stroke={colors.border} />
                <Tooltip {...tooltipStyle} labelFormatter={(v: number) => grace.find((g) => g.t === v)?.date ?? ''} formatter={(v: number) => [`${nf(v, 1)} cm`, t('why.storage')]} />
                <Area type="monotone" dataKey="value" stroke={colors['accent-strong']} strokeWidth={2} fill="url(#graceFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t('why.heatTitle', { a: nf(firstFive), b: nf(lastFive) })}
          subtitle={<Source mission="NASA POWER" detail={t('why.powerRes')} />}
          howTo={
            <>
              <p>{t('why.heatHow1')}</p>
              <p className="flex items-center gap-1">
                {t('why.heatHow2')} <InfoTip term="power" />
              </p>
            </>
          }
          table={<DataTable caption={t('why.heatCaption')} head={[t('why.year'), t('why.days')]} rows={heat.map((h) => [h.year, h.days])} />}
          sample={isSample(data, ['weather'])}
          id="heat"
          className="scroll-mt-36"
        >
          <div className="h-64" role="img" aria-label={t('why.heatAria', { a: nf(firstFive), b: nf(lastFive), from: heat[0]?.year, to: heat[heat.length - 1]?.year })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={heat} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="year" tick={axisTick} axisLine={axisLine} tickLine={false} interval={4} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} label={{ value: t('why.days'), angle: -90, position: 'insideLeft', fill: colors['text-muted'], fontSize: 14, dy: 30 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [v, t('why.days')]} />
                <Bar dataKey="days" fill={colors.warning} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t('why.et0Title', { m: peak.name, v: nf(peak.mm) })}
          subtitle={<Source mission="NASA POWER" detail={t('why.et0Res')} />}
          howTo={
            <>
              <p className="flex items-center gap-1">
                {t('why.et0How1')} <InfoTip term="et0" />
              </p>
              <p>{t('why.et0How2')}</p>
            </>
          }
          table={<DataTable caption={t('why.et0Caption')} head={[t('why.month'), 'mm']} rows={et0.map((m) => [m.name, m.mm])} />}
          sample={isSample(data, ['weather'])}
          id="et0"
          className="scroll-mt-36"
        >
          <div className="h-64" role="img" aria-label={t('why.et0Aria', { m: peak.name, v: nf(peak.mm) })}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={et0} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false} interval={1} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={44} label={{ value: t('why.mmMonth'), angle: -90, position: 'insideLeft', fill: colors['text-muted'], fontSize: 14, dy: 30 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v} mm`, t('why.et0Short')]} />
                <Line type="monotone" dataKey="mm" stroke={colors['accent-strong']} strokeWidth={3} dot={{ r: 3.5, fill: colors['accent-strong'] }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={t('why.etTitle', { v: nf(maxGap) })}
          subtitle={<Source mission="OpenET / NASA ECOSTRESS" detail={t('why.etRes')} />}
          howTo={
            <>
              <p>{t('why.etHow1')}</p>
              <p className="flex items-center gap-1">
                {t('why.etHow2')} <InfoTip term="et" />
              </p>
            </>
          }
          table={<DataTable caption={t('why.etCaption')} head={[t('why.crop'), t('why.modeled'), t('why.satellite')]} rows={etCheck.map((c) => [c.name, c.modeledMm, c.satelliteMm])} />}
          sample={isSample(data, ['etCheck'])}
          id="et-check"
          className="scroll-mt-36"
        >
          <div className="h-64" role="img" aria-label={t('why.etAria', { v: nf(maxGap) })}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={etCheck} margin={{ top: 8, right: 12, left: 0, bottom: 8 }} barGap={2}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis dataKey="name" tick={axisTick} axisLine={axisLine} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} width={52} label={{ value: t('why.mmYear'), angle: -90, position: 'insideLeft', fill: colors['text-muted'], fontSize: 14, dy: 30 }} />
                <Tooltip {...tooltipStyle} formatter={(v: number, name: string) => [`${v} mm`, name]} />
                <Legend wrapperStyle={{ fontSize: 14, color: colors.text }} iconType="square" />
                <Bar name={t('why.modeled')} dataKey="modeledMm" fill={colors.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar name={t('why.satellite')} dataKey="satelliteMm" fill={colors.accent} stroke={colors['accent-strong']} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

    </>
  );
}

