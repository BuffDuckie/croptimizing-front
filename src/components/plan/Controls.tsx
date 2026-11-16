import { Check, ChevronDown, ExternalLink, Info, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ROTATION_IDS, SOIL_PART_IDS } from '../../api/types';
import { af, money, whole } from '../../lib/format';
import { presetBudget, useWaterPresets } from '../../hooks/useWaterPresets';
import { usePlanContext } from '../../state/PlanContext';
import { SamplePill } from '../layout/SampleBadge';
import { Popover } from '../ui/Popover';
import { Disclosure } from '../ui/Disclosure';
import { InfoTip } from '../ui/InfoTip';
import { Slider } from '../ui/Slider';

function useLang() {
  const { i18n } = useTranslation();
  return i18n.language === 'es' ? 'es' : 'en';
}

/** Water situation presets: set the budget in one tap. Moving the slider deselects them. */
function WaterPresets() {
  const { t } = useTranslation();
  const lang = useLang();
  const { controls, setControl } = usePlanContext();
  const presets = useWaterPresets();
  const fromData = presets.every((p) => p.fromData);
  return (
    <div className="mb-4">
      <p className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-text-muted">
        {t('plan.preset.title')}
        {!fromData && <SamplePill />}
      </p>
      <ul className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const budget = presetBudget(p.afPerAcre);
          const on = Math.abs(controls.water - budget) < 0.05;
          return (
            <li key={p.id} className={`flex items-center rounded-full ring-1 ring-inset transition-colors duration-fast ${on ? 'bg-accent-tint ring-accent-strong' : 'bg-surface ring-border'}`}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setControl('water', budget)}
                className={`min-h-[44px] rounded-l-full py-1.5 pl-3.5 pr-1 text-left text-sm leading-tight ${on ? 'font-semibold text-text' : 'font-medium text-text'}`}
              >
                {p.label} <span className="tnum whitespace-nowrap text-text-muted">· {af(budget, lang)} AF</span>
              </button>
              <Popover
                label={t('plan.preset.sourceFor', { name: p.label })}
                align="end"
                triggerClassName="inline-flex h-11 w-9 items-center justify-center rounded-r-full text-text-muted hover:text-primary"
                trigger={<Info aria-hidden="true" className="h-4 w-4" />}
              >
                <p className="font-semibold text-primary">{p.label}</p>
                <p className="mt-1 text-text">{t('plan.preset.sets', { v: af(budget, lang) })}</p>
                {p.source ? (
                  <a href={p.source} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-1 font-semibold">
                    {t('plan.preset.source')} <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-2 text-warning">{t('plan.preset.noSource')}</p>
                )}
              </Popover>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function WaterSlider() {
  const { t } = useTranslation();
  const lang = useLang();
  const { controls, setControl } = usePlanContext();
  return (
    <div>
      <WaterPresets />
      <Slider
        label={t('plan.water')}
        info={<InfoTip term="acreFoot" />}
        tone="water"
        min={0.5}
        max={6}
        step={0.1}
        value={controls.water}
        onChange={(v) => setControl('water', Math.round(v * 10) / 10)}
        display={af(controls.water, lang)}
        unit={t('plan.waterUnit')}
        valueText={t('plan.waterText', { n: af(controls.water, lang) })}
        minLabel={af(0.5, lang)}
        maxLabel={af(6, lang)}
      />
    </div>
  );
}

export function RiskSlider() {
  const { t } = useTranslation();
  const { controls, setControl } = usePlanContext();
  const lean = controls.risk < 35 ? t('plan.leanSafe') : controls.risk > 65 ? t('plan.leanBold') : t('plan.leanMiddle');
  return (
    <Slider
      label={t('plan.risk')}
      info={<InfoTip term="worst1in5" />}
      min={0}
      max={100}
      step={1}
      value={controls.risk}
      onChange={(v) => setControl('risk', v)}
      display={controls.risk}
      unit="/100"
      valueText={t('plan.riskText', { n: controls.risk, lean })}
      minLabel={t('plan.riskSafe')}
      maxLabel={t('plan.riskBold')}
    />
  );
}

export function SoilSlider() {
  const { t } = useTranslation();
  const { controls, setControl } = usePlanContext();
  return (
    <Slider
      label={t('plan.soil')}
      info={<InfoTip term="soilScore" />}
      tone="soil"
      min={0}
      max={100}
      step={1}
      value={controls.soil}
      onChange={(v) => setControl('soil', v)}
      display={controls.soil}
      unit="/100"
      valueText={t('plan.soilText', { n: controls.soil })}
      minLabel="0"
      maxLabel="100"
    />
  );
}

/** Which soil goals count toward the soil score. At least one stays on. */
function SoilGoals() {
  const { t } = useTranslation();
  const { controls, setControl } = usePlanContext();
  const on = controls.soilParts;
  return (
    <fieldset>
      <legend className="mb-1 text-base font-semibold text-text">{t('plan.soilGoals.title')}</legend>
      <p id="soil-goals-help" className="mb-3 text-sm text-text-muted">
        {t('plan.soilGoals.help')}
      </p>
      <div className="flex flex-wrap gap-2" aria-describedby="soil-goals-help">
        {SOIL_PART_IDS.map((p) => {
          const pressed = on.includes(p);
          const last = pressed && on.length === 1;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={pressed}
              aria-disabled={last || undefined}
              title={last ? t('plan.soilGoals.keepOne') : undefined}
              onClick={() => {
                if (last) return;
                setControl('soilParts', pressed ? on.filter((x) => x !== p) : SOIL_PART_IDS.filter((x) => x === p || on.includes(x)));
              }}
              className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-base font-medium ring-1 ring-inset transition-colors duration-fast ${
                pressed ? 'bg-secondary-tint text-secondary ring-secondary/40' : 'bg-surface text-text-muted ring-border'
              } ${last ? 'cursor-not-allowed' : ''}`}
            >
              {pressed ? <Check aria-hidden="true" className="h-4 w-4" strokeWidth={2.5} /> : <span aria-hidden="true" className="h-4 w-4 rounded-full ring-1 ring-inset ring-border" />}
              {t(`plan.soilGoals.${p}`)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MoreOptions() {
  const { t } = useTranslation();
  const lang = useLang();
  const { controls, setControl, waterCostDefault } = usePlanContext();
  const cost = controls.waterCost ?? waterCostDefault.perAf;
  return (
    <Disclosure title={t('plan.more')} icon="none">
      <div className="space-y-6">
        <SoilGoals />
        <fieldset>
          <legend className="mb-3 text-base font-semibold text-text">{t('plan.maxShare')}</legend>
          <div className="space-y-3">
            {ROTATION_IDS.map((id) => {
              const v = controls.maxSharePct[id] ?? 100;
              return (
                <Slider
                  key={id}
                  label={t(`rotations.${id}`)}
                  min={0}
                  max={100}
                  step={5}
                  value={v}
                  onChange={(n) => setControl('maxSharePct', { ...controls.maxSharePct, [id]: n })}
                  display={`${v}%`}
                  valueText={t('plan.maxShareText', { n: v })}
                />
              );
            })}
          </div>
        </fieldset>
        <div>
          <label htmlFor="water-cost" className="label">
            {t('plan.waterCost')}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">$</span>
            <input
              id="water-cost"
              type="number"
              inputMode="numeric"
              min={0}
              max={1000}
              step={5}
              className="input tnum pl-7"
              value={cost}
              onChange={(e) => setControl('waterCost', Math.max(0, Math.min(1000, Number(e.target.value) || 0)))}
              aria-describedby="water-cost-help"
            />
          </div>
          <p id="water-cost-help" className="mt-1.5 text-sm text-text-muted">
            {t('plan.waterCostHelp', { v: money(cost, lang) })}{' '}
            {waterCostDefault.fromData
              ? t('plan.waterCostDefault', { v: money(waterCostDefault.perAf, lang), source: waterCostDefault.source })
              : t('plan.waterCostPlaceholder', { v: money(waterCostDefault.perAf, lang) })}
          </p>
          {controls.waterCost !== null && controls.waterCost !== waterCostDefault.perAf && (
            <button type="button" onClick={() => setControl('waterCost', null)} className="btn btn-ghost -ml-2 mt-1 min-h-[44px] px-2 text-sm font-semibold">
              {t('plan.waterCostReset', { v: money(waterCostDefault.perAf, lang) })}
            </button>
          )}
        </div>
        <div>
          <label htmlFor="lease-price" className="label">
            {t('plan.lease')}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">$</span>
            <input
              id="lease-price"
              type="number"
              inputMode="numeric"
              min={0}
              max={5000}
              step={10}
              className="input tnum pl-7"
              value={controls.lease ?? ''}
              placeholder={t('plan.leasePh')}
              onChange={(e) => setControl('lease', e.target.value === '' ? null : Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
              aria-describedby="lease-help"
            />
          </div>
          <p id="lease-help" className="mt-1.5 text-sm text-text-muted">
            {t('plan.leaseHelp')}
          </p>
        </div>
        <Slider
          label={t('plan.efficiency')}
          tone="water"
          min={50}
          max={95}
          step={1}
          value={Math.round(controls.efficiency * 100)}
          onChange={(n) => setControl('efficiency', n / 100)}
          display={`${Math.round(controls.efficiency * 100)}%`}
          valueText={t('plan.efficiencyText', { n: Math.round(controls.efficiency * 100) })}
          minLabel="50%"
          maxLabel="95%"
          hint={t('plan.efficiencyHelp')}
        />
      </div>
    </Disclosure>
  );
}

/** Desktop: sticky left column. Mobile: sticky collapsible panel under the header. */
export function ControlsPanel() {
  const { t } = useTranslation();
  const lang = useLang();
  const { controls, resetControls } = usePlanContext();
  const [open, setOpen] = useState(false);

  const body = (
    <div className="space-y-7">
      <WaterSlider />
      <RiskSlider />
      <SoilSlider />
      <div className="border-t border-border-soft pt-3">
        <MoreOptions />
      </div>
      <button type="button" onClick={resetControls} className="btn btn-ghost -ml-2 min-h-[44px] px-2 text-base font-medium">
        <RotateCcw aria-hidden="true" className="h-4 w-4" />
        {t('plan.reset')}
      </button>
    </div>
  );

  return (
    <>
      {/* Mobile and tablet */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-border-soft bg-surface/95 px-4 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-surface/85 sm:-mx-6 sm:px-6 md:top-[112px] lg:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="mobile-controls"
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[56px] w-full items-center gap-3 text-left"
        >
          <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-primary" />
          <span className="flex-1">
            <span className="block text-sm font-semibold text-text">{open ? t('plan.hide') : t('plan.edit')}</span>
            <span className="tnum block text-sm text-text-muted">
              {t('plan.summary', { water: af(controls.water, lang), risk: whole(controls.risk, lang), soil: whole(controls.soil, lang) })}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`h-5 w-5 text-text-muted transition-transform duration-slow ${open ? 'rotate-180' : ''}`} />
        </button>
        <div id="mobile-controls" hidden={!open} className="max-h-[calc(100vh-140px)] overflow-y-auto pb-6 pt-2">
          {body}
        </div>
      </div>
      {/* Desktop */}
      <aside aria-label={t('plan.controls')} className="hidden lg:block">
        <div className="card sticky top-[136px]">
          <h2 className="mb-6 text-lg font-semibold">{t('plan.controls')}</h2>
          {body}
        </div>
      </aside>
    </>
  );
}
