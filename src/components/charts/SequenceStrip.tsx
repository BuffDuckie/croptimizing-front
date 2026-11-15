import { useTranslation } from 'react-i18next';
import type { RotationCard } from '../../api/types';
import { ROT_BG } from './rotation';

const YEARS = [1, 2, 3, 4];

/**
 * The rotation over four years: alfalfa as one 4-year stand, the others
 * repeating their one-year sequence. Plus a TODO line on nitrogen carryover.
 */
export function SequenceStrip({ card }: { card: RotationCard }) {
  const { t } = useTranslation();
  const cells = YEARS.map((y) => (card.id === 'alfalfa' ? t('compare.seq.stand', { n: y }) : t(`compare.seq.${card.id}`)));
  return (
    <div>
      <ol className="grid grid-cols-4 gap-[3px]" aria-label={t('compare.seq.aria', { name: card.name, list: cells.map((c, i) => `${t('compare.seq.year', { n: i + 1 })}: ${c}`).join('; ') })}>
        {cells.map((c, i) => (
          <li key={i} className="min-w-0">
            <span className="block text-center text-sm font-semibold text-text-muted">{t('compare.seq.year', { n: i + 1 })}</span>
            <span
              className={`mt-1 flex min-h-[44px] items-center justify-center rounded-[5px] px-1.5 py-1 text-center text-sm font-semibold leading-tight ${
                card.id === 'fallow' ? 'hatch-dark bg-bg text-text ring-1 ring-inset ring-border' : `${ROT_BG[card.id]} text-white`
              }`}
            >
              {c}
            </span>
          </li>
        ))}
      </ol>
      {card.id !== 'fallow' && (
        <p className="mt-2 text-sm text-text">
          <span className="font-semibold">{t('compare.seq.carry')}</span> {t('compare.seq.carryTodo')}
        </p>
      )}
    </div>
  );
}
