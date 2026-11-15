import { useTranslation } from 'react-i18next';
import { useElementWidth } from '../../hooks/useElementWidth';
import { money } from '../../lib/format';
import { colors } from '../../theme/tokens';
import { ChartCard, DataTable } from './ChartCard';
import { useCurrentLabel, useYears, usePlanSample } from '../../state/PlanContext';

type Year = { year: number; profit: number };

function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= count + 1) ?? raw;
  const start = Math.ceil(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

function worst4(ys: Year[]) {
  const sorted = [...ys].sort((a, b) => a.profit - b.profit);
  const k = Math.max(1, Math.round(ys.length * 0.2));
  const w = sorted.slice(0, k);
  return { set: new Set(w.map((y) => y.year)), avg: w.reduce((s, y) => s + y.profit, 0) / k, edge: w[k - 1].profit, min: w[0].profit };
}

/**
 * One dot per past year for each plan. The worst 4 years are shaded and their
 * average marked, which explains the "worst 1-in-5 years" number without jargon.
 */
export function YearsDotStrip({ current, recommended, label }: { current: Year[]; recommended: Year[]; /** Name of the filled plan (default: Suggested plan). */ label?: string }) {
  const { t, i18n } = useTranslation();
  const recLabel = label ?? t('common.recommended');
  const planSample = usePlanSample();
  const yrs = useYears();
  const curLabel = useCurrentLabel();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const all = [...current, ...recommended].map((y) => y.profit);
  const lo = Math.min(0, ...all);
  const hi = Math.max(...all);
  const pad = (hi - lo) * 0.06;
  const ticks = niceTicks(lo - pad, hi + pad);
  const x0 = Math.min(lo - pad, ticks[0]);
  const x1 = Math.max(hi + pad, ticks[ticks.length - 1]);
  const ml = 16;
  const mr = 16;
  const W = width;
  const x = (v: number) => ml + ((v - x0) / (x1 - x0)) * (W - ml - mr);
  const rowH = 74;
  const top = 34;
  const H = top + rowH * 2 + 44;
  const rows = [
    { key: 'rec', label: recLabel, data: recommended, filled: true },
    { key: 'cur', label: curLabel, data: current, filled: false },
  ];
  const rw = worst4(recommended);
  const cw = worst4(current);
  const better = rw.avg >= cw.avg;
  const title = better
    ? t('strip.titleBetter')
    : t('strip.titleCost', { v: money(cw.avg - rw.avg, lang) });

  return (
    <ChartCard
      sample={planSample}
      title={title}
      subtitle={t('strip.subtitle', yrs)}
      howTo={
        <>
          <p>{t('strip.how1', yrs)}</p>
          <p>{t('strip.how2', yrs)}</p>
        </>
      }
      table={
        <DataTable
          caption={t('strip.tableCaption')}
          head={[t('strip.year'), recLabel, curLabel]}
          rows={recommended.map((r, i) => [r.year, money(r.profit, lang), money(current[i]?.profit ?? 0, lang)])}
        />
      }
    >
      <div ref={ref} className="w-full">
        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={t('strip.aria', { ...yrs, recWorst: money(rw.avg, lang), curWorst: money(cw.avg, lang) })}
          className="block overflow-visible"
        >
          {rows.map((row, ri) => {
            const w = ri === 0 ? rw : cw;
            const cy = top + ri * rowH + rowH / 2;
            const bandL = x(w.min) - 10;
            const bandR = x(w.edge) + 10;
            return (
              <g key={row.key}>
                <text x={ml} y={cy - 24} className="fill-text text-[14px] font-semibold">
                  {row.label}
                </text>
                <line x1={ml} x2={W - mr} y1={cy} y2={cy} stroke={colors['border-soft']} strokeWidth={1} />
                <rect x={bandL} y={cy - 16} width={Math.max(20, bandR - bandL)} height={32} rx={8} fill={colors['danger-tint']} />
                {row.data.map((d) => {
                  const inWorst = w.set.has(d.year);
                  return (
                    <circle
                      key={d.year}
                      cx={x(d.profit)}
                      cy={cy}
                      r={6}
                      fill={row.filled ? (inWorst ? colors.danger : colors.primary) : colors.surface}
                      fillOpacity={row.filled ? 0.9 : 1}
                      stroke={row.filled ? colors.surface : inWorst ? colors.danger : colors.text}
                      strokeWidth={row.filled ? 1.25 : 1.75}
                    >
                      <title>{`${d.year}: ${money(d.profit, lang)}`}</title>
                    </circle>
                  );
                })}
                {/* Average of the worst 4 years */}
                <g transform={`translate(${x(w.avg)}, ${cy + 20})`}>
                  <path d="M0 -4 L5 4 L-5 4 Z" fill={colors.danger} />
                  <text y={20} textAnchor="middle" className="fill-danger text-[14px] font-semibold">
                    {money(w.avg, lang)}
                  </text>
                </g>
              </g>
            );
          })}
          {/* Band label, once, above the first band */}
          <text x={Math.max(ml, x(rw.min) - 10)} y={top - 8} className="fill-danger text-[14px] font-semibold">
            {t('strip.band')}
          </text>
          {/* X axis */}
          {ticks.map((v) => (
            <g key={v} transform={`translate(${x(v)}, ${H - 26})`}>
              <line y1={-6} y2={0} stroke={colors.border} />
              <text y={16} textAnchor="middle" className="fill-text-muted text-[14px]">
                {money(v, lang)}
              </text>
            </g>
          ))}
          {lo < 0 && <line x1={x(0)} x2={x(0)} y1={top} y2={H - 32} stroke={colors.border} strokeDasharray="3 4" />}
        </svg>
        <p className="mt-1 text-center text-sm text-text-muted">{t('strip.axis', yrs)}</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted" aria-hidden="true">
          <li className="flex items-center gap-2">
            <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={colors.primary} /></svg>
            {recLabel}
          </li>
          <li className="flex items-center gap-2">
            <svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill={colors.surface} stroke={colors.text} strokeWidth="1.75" /></svg>
            {curLabel}
          </li>
          <li className="flex items-center gap-2">
            <span className="inline-block h-3.5 w-5 rounded bg-danger-tint" />
            {t('strip.band')}
          </li>
          <li className="flex items-center gap-2">
            <svg width="12" height="10"><path d="M6 1 L11 9 L1 9 Z" fill={colors.danger} /></svg>
            {t('strip.avgMark')}
          </li>
        </ul>
      </div>
    </ChartCard>
  );
}
