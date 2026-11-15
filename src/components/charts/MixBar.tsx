import { useTranslation } from 'react-i18next';
import type { Mix, RotationId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { acresSplit, pct, whole } from '../../lib/format';
import { ROT_BG } from './rotation';

type Lang = 'en' | 'es';

/** Horizontal 100% stacked bar of acres by rotation. Labels inside wide segments, full legend below. */
export function MixBar({
  mix,
  acres,
  label,
  size = 'lg',
  showLegend = true,
}: {
  mix: Mix;
  acres: number;
  label: string;
  size?: 'lg' | 'sm';
  showLegend?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const lang = (i18n.language === 'es' ? 'es' : 'en') as Lang;
  const split = acresSplit(mix, acres);
  const entries = ROTATION_IDS.map((id) => ({ id, share: mix[id] ?? 0, acres: split[id] })).filter((e) => e.share > 0.0001);
  const list = entries.map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}, ${whole(e.acres, lang)} ${t('common.acres')}`).join('; ');

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between gap-2 text-sm font-semibold text-text-muted">
        <span>{label}</span>
      </figcaption>
      <div
        role="img"
        aria-label={t('plan.mixAria', { list })}
        className={`flex w-full overflow-hidden rounded-ctl bg-border-soft ${size === 'lg' ? 'h-14' : 'h-7'}`}
      >
        {ROTATION_IDS.map((id) => {
          const share = mix[id] ?? 0;
          return (
            <div
              key={id}
              className={`mix-seg relative flex items-center justify-center overflow-hidden ${ROT_BG[id]} ${id === 'fallow' ? 'hatch' : ''}`}
              style={{ width: `${share * 100}%`, boxShadow: share > 0 ? 'inset -2px 0 0 rgba(255,255,255,0.9)' : undefined }}
            >
              {size === 'lg' && share >= 0.12 && (
                <span className={`tnum ${share < 0.2 ? 'hidden sm:inline' : ''} text-[1.1875rem] font-bold text-white [text-shadow:0_1px_1px_rgba(0,0,0,0.25)]`}>
                  {pct(share, lang)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {showLegend && (
        <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2" aria-hidden="true">
          {entries.map((e) => (
            <LegendRow key={e.id} id={e.id} name={t(`rotations.${e.id}`)} value={`${whole(e.acres, lang)} ${t('common.acres')}`} share={pct(e.share, lang)} />
          ))}
        </ul>
      )}
    </figure>
  );
}

function LegendRow({ id, name, value, share }: { id: RotationId; name: string; value: string; share: string }) {
  return (
    <li className="flex items-center gap-2.5 text-base">
      <span className={`h-3.5 w-3.5 shrink-0 rounded-[4px] ${ROT_BG[id]} ${id === 'fallow' ? 'hatch' : ''}`} />
      <span className="flex-1 text-text">{name}</span>
      <span className="tnum font-semibold text-text">{value}</span>
      <span className="tnum w-11 text-right text-text-muted">{share}</span>
    </li>
  );
}
