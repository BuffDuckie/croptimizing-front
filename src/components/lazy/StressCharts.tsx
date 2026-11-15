import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PlanResponse } from '../../api/types';
import { af, money } from '../../lib/format';
import { colors } from '../../theme/tokens';
import { ChartCard, DataTable } from '../charts/ChartCard';
import { axisLine, axisTick, gridStroke, tooltipStyle } from '../charts/rechartsTheme';
import { currentTrim, useCurrentLabel, usePlanContext } from '../../state/PlanContext';

type Stress = PlanResponse['stressTests'][number];

export default function StressCharts({ s, budget }: { s: Stress; budget: number }) {
  const { t, i18n } = useTranslation();
  const curLabel = useCurrentLabel(true);
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const year = s.year;
  const controls = { water: budget };
  const curOver = s.currentWater > budget + 0.005;
  const trimmed = currentTrim(usePlanContext().data) !== null;
  const better = s.recommendedProfit >= s.currentProfit;
  const profitData = [
    { name: curLabel, v: s.currentProfit, fill: colors['text-muted'] },
    { name: t('common.recommended'), v: s.recommendedProfit, fill: colors.primary },
  ];
  const waterData = [
    { name: curLabel, v: s.currentWater, fill: curOver ? colors.danger : colors['text-muted'] },
    { name: t('common.recommended'), v: s.recommendedWater, fill: colors['accent-strong'] },
  ];
  return (
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
          ) : trimmed ? (
            <p className="text-sm text-text-muted">{t('stress.fallowNote')}</p>
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

  );
}
