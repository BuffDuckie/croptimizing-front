import { useTranslation } from 'react-i18next';
import type { PlanResponse, RotationId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { colors } from '../../theme/tokens';
import { ChartCard, DataTable } from './ChartCard';
import { ROT_BG } from './rotation';
import { useYears, usePlanSample } from '../../state/PlanContext';

/** Mix a hex color with white. t = 0 is white, 1 is the color. */
function tintRgb(hex: string, t: number): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const m = (c: number) => Math.round(255 + (c - 255) * t);
  return [m((n >> 16) & 255), m((n >> 8) & 255), m(n & 255)];
}

/** WCAG relative luminance of an sRGB color. */
function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function tint(hex: string, t: number): string {
  const [r, g, b] = tintRgb(hex, t);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Text color from the theme's dark text token. */
const TEXT_LUM = luminance(tintRgb(colors.text, 1));

/**
 * Cell fill and text: dark text while it reads at 4.5:1; past that, white text on
 * a fill deepened just enough for white to read (no mid-tone where neither does).
 */
function cellStyle(hex: string, t: number): { bg: string; white: boolean } {
  let k = t;
  let rgb = tintRgb(hex, k);
  if ((luminance(rgb) + 0.05) / (TEXT_LUM + 0.05) >= 4.5) return { bg: `rgb(${rgb.join(', ')})`, white: false };
  while (1.05 / (luminance(rgb) + 0.05) < 4.5 && k < 1) {
    k = Math.min(1, k + 0.02);
    rgb = tintRgb(hex, k);
  }
  return { bg: `rgb(${rgb.join(', ')})`, white: true };
}

/** Diverging scale: warning-orange for negative, navy for positive, white at zero. Values printed in cells. */
export function CorrelationHeatmap({ correlations }: { correlations: PlanResponse['correlations'] }) {
  const { t, i18n } = useTranslation();
  const planSample = usePlanSample();
  const yrs = useYears();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const r = (a: RotationId, b: RotationId) => correlations.find((c) => c.a === a && c.b === b)?.r ?? (a === b ? 1 : 0);
  const fmt = (v: number) => new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  // Fallow's profit is the same every year, so its correlation means nothing; leave it out of the finding.
  const crops = ROTATION_IDS.filter((id) => id !== 'fallow');
  const pairs = crops.flatMap((a, i) => crops.slice(i + 1).map((b) => ({ a, b, v: r(a, b) })));
  const lowest = pairs.reduce((m, p) => (p.v < m.v ? p : m));
  const short = (id: RotationId) => t(`method.short.${id}`);

  return (
    <ChartCard
      sample={planSample}
      headingLevel={3}
      title={t('method.heatTitle', { a: t(`rotations.${lowest.a}`), b: t(`rotations.${lowest.b}`), v: fmt(lowest.v) })}
      subtitle={t('method.heatSub', yrs)}
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
                const { bg, white: dark } = v >= 0 ? cellStyle(colors.primary, Math.min(1, v) * 0.9) : cellStyle(colors.warning, Math.min(1, -v) * 0.9);
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
