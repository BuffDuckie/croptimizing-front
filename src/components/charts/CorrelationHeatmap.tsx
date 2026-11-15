import { useTranslation } from 'react-i18next';
import type { PlanResponse, RotationId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { colors } from '../../theme/tokens';
import { ChartCard, DataTable } from './ChartCard';
import { ROT_BG } from './rotation';

/** Mix a hex color with white. t = 0 is white, 1 is the color. */
function tint(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const m = (c: number) => Math.round(255 + (c - 255) * t);
  return `rgb(${m(r)}, ${m(g)}, ${m(b)})`;
}

/** Diverging scale: warning-orange for negative, navy for positive, white at zero. Values printed in cells. */
export function CorrelationHeatmap({ correlations }: { correlations: PlanResponse['correlations'] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const r = (a: RotationId, b: RotationId) => correlations.find((c) => c.a === a && c.b === b)?.r ?? (a === b ? 1 : 0);
  const fmt = (v: number) => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const pairs = ROTATION_IDS.flatMap((a, i) => ROTATION_IDS.slice(i + 1).map((b) => ({ a, b, v: r(a, b) })));
  const lowest = pairs.reduce((m, p) => (p.v < m.v ? p : m));
  const short = (id: RotationId) => t(`method.short.${id}`);

  return (
    <ChartCard
      headingLevel={3}
      title={t('method.heatTitle', { a: t(`rotations.${lowest.a}`), b: t(`rotations.${lowest.b}`), v: fmt(lowest.v) })}
      subtitle={t('method.heatSub')}
      howTo={
        <>
          <p>{t('method.heatHow1')}</p>
          <p>{t('method.heatHow2')}</p>
        </>
      }
      table={
        <DataTable
          caption={t('method.heatCaption')}
          head={['', ...ROTATION_IDS.map((id) => t(`rotations.${id}`))]}
          rows={ROTATION_IDS.map((a) => [t(`rotations.${a}`), ...ROTATION_IDS.map((b) => fmt(r(a, b)))])}
        />
      }
    >
      <div className="overflow-x-auto" aria-hidden="true">
        <div className="grid min-w-[480px] grid-cols-[7.5rem_repeat(5,minmax(0,1fr))] gap-1">
          <div />
          {ROTATION_IDS.map((id) => (
            <div key={id} className="flex items-end justify-center gap-1 pb-1 text-center text-sm font-semibold leading-tight text-text">
              <span className={`mb-1 h-2.5 w-2.5 shrink-0 rounded-[3px] ${ROT_BG[id]} ${id === 'fallow' ? 'hatch' : ''}`} />
              {short(id)}
            </div>
          ))}
          {ROTATION_IDS.map((a) => (
            <div key={a} className="contents">
              <div className="flex items-center gap-1.5 pr-2 text-sm font-semibold text-text">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${ROT_BG[a]} ${a === 'fallow' ? 'hatch' : ''}`} />
                {short(a)}
              </div>
              {ROTATION_IDS.map((b) => {
                const v = r(a, b);
                const bg = v >= 0 ? tint(colors.primary, Math.min(1, v) * 0.9) : tint(colors.warning, Math.min(1, -v) * 0.9);
                const dark = Math.abs(v) > 0.5;
                return (
                  <div
                    key={b}
                    className={`tnum flex h-14 items-center justify-center rounded-md text-base font-semibold ${dark ? 'text-white' : 'text-text'}`}
                    style={{ background: bg }}
                  >
                    {fmt(v)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-3 text-sm text-text-muted">
          <span className="tnum">-1</span>
          <div className="h-3 flex-1 rounded-full" style={{ background: `linear-gradient(90deg, ${tint(colors.warning, 0.9)}, #fff, ${tint(colors.primary, 0.9)})` }} />
          <span className="tnum">+1</span>
        </div>
        <div className="mt-1 flex justify-between text-sm text-text-muted">
          <span>{t('method.heatNeg')}</span>
          <span>{t('method.heatPos')}</span>
        </div>
      </div>
    </ChartCard>
  );
}
