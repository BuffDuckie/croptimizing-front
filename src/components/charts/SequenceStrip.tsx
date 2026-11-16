import { useTranslation } from 'react-i18next';
import type { RotationCard } from '../../api/types';
import { ALFALFA_STAND_YEARS } from '../../config/rotations';
import { written } from '../../lib/format';
import { ROT_BG } from './rotation';

const YEARS = [1, 2, 3, 4];

/**
 * The rotation over four years: alfalfa as a 3-year stand then replanted, the others
 * repeating their one-year sequence. Plus a TODO line on nitrogen carryover.
 */
export function SequenceStrip({ card }: { card: RotationCard }) {
  const { t } = useTranslation();
  // Alfalfa stays for one stand, then is replanted; the others repeat every year.
  const cells = YEARS.map((y) => {
    if (card.id !== 'alfalfa') return t(`compare.seq.${card.id}`);
    const n = ((y - 1) % ALFALFA_STAND_YEARS) + 1;
    return y > ALFALFA_STAND_YEARS && n === 1 ? t('compare.seq.replant') : t('compare.seq.stand', { n });
  });
  return (
    <div>
      <ol className="grid grid-cols-4 gap-[3px]" aria-label={t('compare.seq.aria', { name: card.name, list: cells.map((c, i) => `${t('compare.seq.year', { n: i + 1 })}: ${c}`).join('; ') })}>
        {cells.map((c, i) => (
          <li key={i} className="min-w-0">
            <span className="block text-center text-sm font-semibold text-text-muted">{t('compare.seq.year', { n: i + 1 })}</span>
            {/* Dark text on a light cell with the rotation's color as a bar: readable at any size. */}
            <span className={`relative mt-1 flex min-h-[44px] items-center justify-center overflow-hidden rounded-[5px] bg-bg px-1.5 pb-1 pt-2.5 text-center text-sm font-semibold leading-tight text-text ring-1 ring-inset ring-border ${card.id === 'fallow' ? 'hatch-dark' : ''}`}>
              <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1.5 ${ROT_BG[card.id]}`} />
              {c}
            </span>
          </li>
        ))}
      </ol>
      {card.id !== 'fallow' && written(t('compare.seq.carryTodo')) && (
        <p className="mt-2 text-sm text-text">
          <span className="font-semibold">{t('compare.seq.carry')}</span> {t('compare.seq.carryTodo')}
        </p>
      )}
    </div>
  );
}
