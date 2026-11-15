import { ArrowRight, Satellite } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { DatasetId, PlanResponse } from '../../api/types';
import { graceDropCm, etMaxGapPct } from '../../lib/context';
import { whole } from '../../lib/format';
import { isSample } from '../../lib/sources';
import { useYears } from '../../state/PlanContext';
import { SamplePill } from '../layout/SampleBadge';

/** Days in the scenario years (leap years counted), for "N days of weather". */
function daysIn(from: number, to: number): number {
  let d = 0;
  for (let y = from; y <= to; y++) d += (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
  return d;
}

/** "NASA data behind this plan": where each NASA dataset enters, with numbers from the data. */
export function NasaDataStrip({ data }: { data: PlanResponse }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const yrs = useYears();
  const drop = graceDropCm(data.context.graceTwsCm);
  const gap = etMaxGapPct(data.context.etCheck);
  const items: { key: string; mission: string; text: string; to: string; ds: DatasetId; role: string }[] = [
    {
      key: 'power',
      mission: 'NASA POWER',
      text: t('plan.nasa.power', { years: yrs.n, days: whole(daysIn(yrs.from, yrs.to), lang) }),
      to: '/why#heat',
      ds: 'weather',
      role: t('plan.nasa.drives'),
    },
    {
      key: 'grace',
      mission: 'NASA GRACE / GRACE-FO',
      text: drop === null ? t('plan.nasa.graceNone') : t('plan.nasa.grace', { v: whole(drop.cm, lang), from: drop.from }),
      to: '/why#grace',
      ds: 'grace',
      role: t('plan.nasa.context'),
    },
    {
      key: 'openet',
      mission: 'OpenET / NASA ECOSTRESS',
      text: gap === null ? t('plan.nasa.openetNone') : t('plan.nasa.openet', { v: whole(gap, lang) }),
      to: '/why#et-check',
      ds: 'etCheck',
      role: t('plan.nasa.check'),
    },
  ];
  return (
    <section className="card" aria-labelledby="nasa-strip-title">
      <h2 id="nasa-strip-title" className="flex items-center gap-2 text-xl font-semibold">
        <Satellite aria-hidden="true" className="h-5 w-5 text-accent-strong" />
        {t('plan.nasa.title')}
      </h2>
      <ul className="mt-4 grid gap-3 md:grid-cols-3">
        {items.map((it) => (
          <li key={it.key} className="flex flex-col rounded-ctl bg-bg p-4 ring-1 ring-inset ring-border-soft">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-text">{it.mission}</span>
              <span className="rounded-full bg-accent-tint px-2 py-0.5 font-semibold text-text">{it.role}</span>
              {isSample(data, [it.ds]) && <SamplePill />}
            </p>
            <p className="mt-2 flex-1 text-base text-text">{it.text}</p>
            <Link to={it.to} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-base font-semibold">
              {t('plan.nasa.see')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
