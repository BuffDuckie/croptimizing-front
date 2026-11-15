import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { GoalId, Mix, RotationId, WaterPresetId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { af, mixEntries, pct } from '../../lib/format';
import { presetBudget, useWaterPresets } from '../../hooks/useWaterPresets';
import { DEMO_FARM, usePlanContext } from '../../state/PlanContext';
import { SamplePill } from '../layout/SampleBadge';
import { Segmented } from '../ui/Segmented';

const GOALS: GoalId[] = ['suggested', 'income', 'water', 'soil'];

/** Three questions that open My plan with the answers: water situation, what you grow, what matters most. */
export function QuickStart() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const navigate = useNavigate();
  const { setFarm, setControl, resetControls } = usePlanContext();
  const presets = useWaterPresets();
  const [preset, setPreset] = useState<WaterPresetId>('zero2023');
  const [grown, setGrown] = useState<RotationId[]>([]);
  const [goal, setGoal] = useState<GoalId>('suggested');

  // Nothing picked: the demo farm's mix. Otherwise an even split of what you grow.
  const demoMix = mixEntries(DEMO_FARM.currentMix)
    .map((e) => `${pct(e.share, lang)} ${t(`rotations.${e.id}`)}`)
    .join(', ');
  const go = () => {
    const mix: Mix = grown.length ? Object.fromEntries(grown.map((id) => [id, 1 / grown.length])) : DEMO_FARM.currentMix;
    const p = presets.find((x) => x.id === preset);
    setFarm({ ...DEMO_FARM, currentMix: mix });
    resetControls();
    if (p) setControl('water', presetBudget(p.afPerAcre));
    navigate(goal === 'suggested' ? '/plan' : `/plan?goal=${goal}`);
  };

  return (
    <section className="container-content -mt-10 relative z-10 md:-mt-14" aria-labelledby="quick-title">
      <div className="card shadow-lift">
        <h2 id="quick-title" className="text-2xl font-semibold">
          {t('start.quick.title')}
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <fieldset className="min-w-0">
            <legend className="mb-2 flex flex-wrap items-center gap-2 text-base font-semibold text-text">
              <span className="tnum inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-white">1</span>
              {t('start.quick.q1')}
              {presets.some((p) => !p.fromData) && <SamplePill />}
            </legend>
            <Segmented
              label={t('start.quick.q1')}
              value={preset}
              onChange={setPreset}
              className="!grid-cols-1"
              options={presets.map((p) => ({ value: p.id, label: `${p.label} · ${af(presetBudget(p.afPerAcre), lang)} AF` }))}
            />
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
              <span className="tnum inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-white">2</span>
              {t('start.quick.q2')}
            </legend>
            <div className="flex flex-wrap gap-2">
              {ROTATION_IDS.filter((id) => id !== 'fallow').map((id) => {
                const on = grown.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setGrown((g) => (on ? g.filter((x) => x !== id) : ROTATION_IDS.filter((x) => x === id || g.includes(x))))}
                    className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-base font-medium ring-1 ring-inset transition-colors duration-fast ${
                      on ? 'bg-primary-tint text-primary ring-primary/40' : 'bg-surface text-text ring-border'
                    }`}
                  >
                    {on ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-inset ring-border" />}
                    {t(`rotations.${id}`)}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-text-muted">{grown.length ? t('start.quick.q2Even') : t('start.quick.q2Demo', { mix: demoMix })}</p>
          </fieldset>
          <fieldset className="min-w-0">
            <legend className="mb-2 flex items-center gap-2 text-base font-semibold text-text">
              <span className="tnum inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm text-white">3</span>
              {t('start.quick.q3')}
            </legend>
            <Segmented label={t('start.quick.q3')} value={goal} onChange={setGoal} className="!grid-cols-2" options={GOALS.map((g) => ({ value: g, label: t(`plan.goal.${g}`) }))} />
          </fieldset>
        </div>
        <button type="button" onClick={go} className="btn btn-primary mt-6 min-h-[52px] px-6 text-lg">
          {t('start.quick.go')}
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
