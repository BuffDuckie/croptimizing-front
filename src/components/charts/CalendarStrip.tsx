import { Snowflake, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RotationCard } from '../../api/types';
import type { RiskMonths } from '../../lib/risk';
import { CROP_INITIALS, ROT_BG } from './rotation';

/**
 * 12 months per rotation: growing months filled with the crop initial, bare
 * months hatched, a sun on heat-risk months and a snowflake on frost-risk months.
 */
export function CalendarStrip({ card, risk }: { card: RotationCard; risk: RiskMonths }) {
  const { t } = useTranslation();
  const months = t('months', { returnObjects: true }) as string[];
  // Letters come from the crop names in the data when it has them.
  const initials = card.calendarCrops ? card.calendarCrops.map((c) => (c ? c.charAt(0).toUpperCase() : '')) : CROP_INITIALS[card.id];
  const grow = card.calendar.filter((c) => c === 'grow').length;
  const names = (ms: number[]) => ms.map((m) => months[m - 1]).join(', ');
  const label = [
    t('compare.calAria', {
      name: card.name,
      grow,
      list: card.calendar.map((c, i) => `${months[i]} ${c === 'grow' ? t('compare.growing') : t('compare.bare')}`).join(', '),
    }),
    risk.heat.length ? t('compare.risk.heatAria', { list: names(risk.heat) }) : '',
    risk.frost.length ? t('compare.risk.frostAria', { list: names(risk.frost) }) : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div role="img" aria-label={label}>
      <div className="grid grid-cols-12 gap-[3px]" aria-hidden="true">
        {card.calendar.map((_c, i) => (
          <div key={`s${i}`} className="flex h-5 items-end justify-center gap-px">
            {risk.heat.includes(i + 1) && <Sun className="h-4 w-4 text-warning" strokeWidth={2.25} />}
            {risk.frost.includes(i + 1) && <Snowflake className="h-4 w-4 text-accent-strong" strokeWidth={2.25} />}
          </div>
        ))}
        {card.calendar.map((c, i) => (
          <div
            key={`c${i}`}
            className={`flex h-9 items-center justify-center rounded-[5px] text-sm font-bold ${
              c === 'grow' ? `${ROT_BG[card.id]} text-white` : 'hatch-dark bg-bg text-text-muted ring-1 ring-inset ring-border'
            }`}
          >
            {c === 'grow' ? initials[i] || '' : ''}
          </div>
        ))}
        {months.map((m) => (
          <div key={m} className="pt-1 text-center text-[0.875rem] leading-none text-text-muted">
            <span className="hidden sm:inline">{m}</span>
            <span className="sm:hidden">{m.charAt(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
