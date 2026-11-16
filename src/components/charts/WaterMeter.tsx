import { AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { af } from '../../lib/format';
import { useCurrentLabel } from '../../state/PlanContext';

/** Highest-year water use vs. the budget, with a marker line at the budget. Turns danger if over. */
export function WaterMeter({ used, budget, compareUsed, scaleMax = 6 }: { used: number; budget: number; compareUsed?: number; scaleMax?: number }) {
  const { t, i18n } = useTranslation();
  const curLabel = useCurrentLabel();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const max = Math.max(scaleMax, used, compareUsed ?? 0, budget) * 1.02;
  const over = used > budget + 0.005;
  const x = (v: number) => `${Math.min(100, (v / max) * 100)}%`;
  return (
    <div>
      <div className="relative h-3 w-full rounded-full bg-accent-tint" aria-hidden="true">
        <div
          className={`meter-fill absolute inset-y-0 left-0 rounded-full ${over ? 'bg-danger' : 'bg-accent'}`}
          style={{ width: x(used) }}
        />
        {compareUsed !== undefined && (
          <div
            className="absolute -top-1 h-5 w-[3px] -translate-x-1/2 rounded-full bg-text-muted/60"
            style={{ left: x(compareUsed) }}
            title={curLabel}
          />
        )}
        <div className="absolute -top-1.5 h-6 w-[3px] -translate-x-1/2 rounded-full bg-text" style={{ left: x(budget) }} />
      </div>
      <p className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${over ? 'text-danger' : 'text-accent-strong'}`}>
        {over ? <AlertTriangle aria-hidden="true" className="h-4 w-4" /> : <Check aria-hidden="true" className="h-4 w-4" />}
        {over ? t('plan.overShort') : t('plan.withinShort')}
        <span className="font-normal text-text-muted">({t('plan.waterOf', { budget: af(budget, lang) })})</span>
      </p>
    </div>
  );
}
