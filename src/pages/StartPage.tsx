import { ArrowRight, Check } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import type { Mix, RotationId } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { ROT_BG } from '../components/charts/rotation';
import { FieldsReplan } from '../components/hero/FieldsReplan';
import { QuickStart } from '../components/plan/QuickStart';
import { InfoTip } from '../components/ui/InfoTip';
import { af, whole } from '../lib/format';
import { isSample } from '../lib/sources';
import { DEMO_FARM, usePlanContext, type Region, useYears } from '../state/PlanContext';

export default function StartPage() {
  return (
    <div>
      <Hero />
      <QuickStart />
      <Stats />
      <Steps />
      <SetupForm />
    </div>
  );
}

function Hero() {
  const { t } = useTranslation();
  const yrs = useYears();
  const navigate = useNavigate();
  const { data, controls, setFarm, farm, resetControls } = usePlanContext();
  // "NASA weather and real prices" only once those datasets really are real.
  const heroReal = !isSample(data, ['weather', 'prices']);
  const startDemo = () => {
    setFarm(DEMO_FARM);
    resetControls();
    navigate('/plan');
  };
  return (
    <section className="on-dark relative overflow-hidden bg-primary text-white" aria-labelledby="hero-title">
      {/* Soft horizon glow; static. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(0,194,255,0.14),transparent_60%)]" />
      <div className="container-content relative grid items-center gap-10 pb-16 pt-12 md:pb-24 md:pt-16 lg:grid-cols-[1.02fr_1fr] lg:gap-14">
        <div className="hero-copy">
          <p className="text-sm font-semibold uppercase tracking-[0.12em] text-accent">{t('start.eyebrow')}</p>
          <h1 id="hero-title" className="mt-4 text-[2.375rem] font-semibold leading-[1.06] tracking-[-0.03em] text-white sm:text-5xl lg:text-[3.5rem]">
            {t('start.headlineA')}
            <span className="text-accent">{t('start.headlineWater')}</span>
            {t('start.headlineB')}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80">{t(heroReal ? 'start.sub' : 'start.subSample', yrs)}</p>
          <p className="mt-8 text-base font-medium text-white">{t('pages.start.intro')}</p>
          <div className="mt-4 flex flex-col flex-wrap gap-3 sm:flex-row">
            <button type="button" onClick={startDemo} className="btn btn-on-dark min-h-[52px] whitespace-nowrap px-6 text-lg">
              {t('start.cta')}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </button>
            <a href="#setup" className="btn btn-outline-dark min-h-[52px] whitespace-nowrap px-6 text-lg">
              {t('start.ctaOwn')}
            </a>
          </div>
          <p className="mt-6 text-sm text-white/60">{t('start.credit')}</p>
        </div>
        <div className="hero-visual mx-auto w-full max-w-[560px]">
          <FieldsReplan
            currentMix={farm.currentMix}
            suggestedMix={data?.recommended.mix ?? null}
            need={(data?.currentAsFarmed ?? data?.current)?.metrics.maxWaterAfPerAcre ?? 5.5}
            budget={controls.water}
            avg={data?.recommended.metrics.avgProfitPerAcre ?? null}
            worst={data?.recommended.metrics.worst1in5PerAcre ?? null}
          />
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const { t } = useTranslation();
  const yrs = useYears();
  const items = [
    { big: '65%', text: t('start.stats.cut65'), tone: 'text-primary' },
    { big: '0 AF', text: t('start.stats.zero'), tone: 'text-accent-strong' },
    { big: String(yrs.n), text: t('start.stats.years'), tone: 'text-primary' },
  ];
  return (
    <section className="border-b border-border-soft bg-surface" aria-labelledby="stats-title">
      <div className="container-content py-14 md:py-20">
        <h2 id="stats-title" className="max-w-2xl text-3xl font-semibold md:text-4xl">
          {t('start.stats.title')}
        </h2>
        <dl className="mt-10 grid gap-8 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border-soft">
          {items.map((it, i) => (
            <div key={it.big} className={`${i > 0 ? 'md:pl-10' : ''} md:pr-10`}>
              <dt className="sr-only">{it.text}</dt>
              <dd>
                <span className={`tnum block text-6xl font-semibold tracking-[-0.03em] ${it.tone}`}>{it.big}</span>
                <span className="mt-3 block max-w-xs text-lg text-text-muted">{it.text}</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-sm text-text-muted">{t('start.stats.source')}</p>
      </div>
    </section>
  );
}

function Steps() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  return (
    <section className="container-content py-16 md:py-24" aria-labelledby="steps-title">
      <h2 id="steps-title" className="max-w-2xl text-3xl font-semibold md:text-4xl">
        {t('start.steps.title')}
      </h2>
      <ol className="mt-10 grid gap-5 md:grid-cols-3">
        <StepCard n={1} title={t('start.steps.s1t')} body={t('start.steps.s1d')}>
          <PreviewSlider label={t('start.steps.previewWater')} value={`${af(2.4, lang)} AF/acre`} fill={34} tone="bg-accent-strong" />
        </StepCard>
        <StepCard n={2} title={t('start.steps.s2t')} body={t('start.steps.s2d')}>
          <PreviewSlider label={t('start.steps.previewRisk')} value="40/100" fill={40} tone="bg-primary" left={t('start.steps.safe')} right={t('start.steps.bold')} />
        </StepCard>
        <StepCard n={3} title={t('start.steps.s3t')} body={t('start.steps.s3d')}>
          <div>
            <p className="text-sm font-semibold text-text-muted">{t('start.steps.previewPlan')}</p>
            <div className="mt-2 flex h-7 overflow-hidden rounded-md" aria-hidden="true">
              <div className="w-[15%] bg-rot-alfalfa" />
              <div className="w-[25%] border-l-2 border-white bg-rot-durum_sorghum" />
              <div className="w-[25%] border-l-2 border-white bg-rot-barley_fallow" />
              <div className="hatch w-[35%] border-l-2 border-white bg-rot-fallow" />
            </div>
          </div>
        </StepCard>
      </ol>
    </section>
  );
}

function StepCard({ n, title, body, children }: { n: number; title: string; body: string; children: React.ReactNode }) {
  return (
    <li className="card flex flex-col">
      <span className="tnum inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-semibold text-white">{n}</span>
      <h3 className="mt-4 text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-base text-text-muted">{body}</p>
      <div className="mt-auto rounded-ctl bg-bg p-4 ring-1 ring-inset ring-border-soft" aria-hidden="true">
        {children}
      </div>
    </li>
  );
}

function PreviewSlider({ label, value, fill, tone, left, right }: { label: string; value: string; fill: number; tone: string; left?: string; right?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-text-muted">{label}</span>
        <span className="tnum text-base font-semibold text-text">{value}</span>
      </div>
      <div className="relative mt-3 h-1.5 rounded-full bg-border">
        <div className={`absolute inset-y-0 left-0 rounded-full ${tone}`} style={{ width: `${fill}%` }} />
        <div className="absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-surface shadow" style={{ left: `${fill}%` }} />
      </div>
      {left && (
        <div className="mt-2 flex justify-between text-sm text-text-muted">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  );
}

function SetupForm() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const navigate = useNavigate();
  const { setFarm, setControl, controls, resetControls } = usePlanContext();
  const [name, setName] = useState('');
  const [acres, setAcres] = useState('640');
  const [water, setWater] = useState(String(controls.water));
  const [region, setRegion] = useState<Region>('pinal');
  const [shares, setShares] = useState<Record<RotationId, string>>({
    alfalfa: '70',
    cotton_barley: '30',
    durum_sorghum: '0',
    barley_fallow: '0',
    fallow: '0',
  });
  const [submitted, setSubmitted] = useState(false);

  const total = ROTATION_IDS.reduce((s, id) => s + (Number(shares[id]) || 0), 0);
  const acresN = Number(acres);
  const waterN = Number(water);
  const acresErr = !(acresN >= 1 && acresN <= 100000);
  const waterErr = !(waterN >= 0.5 && waterN <= 6);
  const totalErr = Math.abs(total - 100) > 0.01;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (acresErr || waterErr || totalErr) return;
    const mix: Mix = {};
    for (const id of ROTATION_IDS) {
      const v = Number(shares[id]) || 0;
      if (v > 0) mix[id] = v / 100;
    }
    setFarm({ name: name.trim() || t('start.form.defaultName'), acres: Math.round(acresN), region, currentMix: mix });
    setControl('water', Math.round(waterN * 10) / 10);
    navigate('/plan');
  };

  return (
    <section id="setup" className="container-content scroll-mt-24 pb-8" aria-labelledby="setup-title">
      <div className="card grid gap-10 p-6 md:p-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <h2 id="setup-title" className="text-3xl font-semibold">
            {t('start.form.title')}
          </h2>
          <p className="mt-3 text-lg text-text-muted">{t('start.form.intro')}</p>
          <Link to="/plan" className="mt-6 inline-flex min-h-[44px] items-center gap-1 font-semibold" onClick={() => {
            setFarm(DEMO_FARM);
            resetControls();
          }}>
            {t('start.cta')} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
        <form onSubmit={submit} noValidate className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="farm-name" className="label">
              {t('start.form.name')}
            </label>
            <input id="farm-name" className="input" value={name} placeholder={t('start.form.namePh')} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </div>
          <div>
            <label htmlFor="farm-acres" className="label">
              {t('start.form.acres')}
            </label>
            <input
              id="farm-acres"
              className="input tnum"
              inputMode="numeric"
              value={acres}
              onChange={(e) => setAcres(e.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={submitted && acresErr}
              aria-describedby={submitted && acresErr ? 'acres-err' : undefined}
            />
            {submitted && acresErr && (
              <p id="acres-err" className="mt-1.5 text-sm font-medium text-danger">
                {t('start.form.errAcres')}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="farm-water" className="label flex items-center gap-1">
              {t('start.form.water')}
            </label>
            <input
              id="farm-water"
              className="input tnum"
              inputMode="decimal"
              value={water}
              onChange={(e) => setWater(e.target.value.replace(/[^\d.]/g, ''))}
              aria-invalid={submitted && waterErr}
              aria-describedby={submitted && waterErr ? 'water-err' : undefined}
            />
            {submitted && waterErr && (
              <p id="water-err" className="mt-1.5 text-sm font-medium text-danger">
                {t('start.form.errWater')}
              </p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="farm-region" className="label">
              {t('start.form.region')}
            </label>
            <select id="farm-region" className="input" value={region} onChange={(e) => setRegion(e.target.value as Region)}>
              <option value="pinal">{t('start.form.pinal')}</option>
              <option value="high_plains" disabled>
                {t('start.form.plains')} ({t('common.comingSoon')})
              </option>
            </select>
          </div>
          <fieldset className="sm:col-span-2">
            <legend className="label flex items-center gap-1">
              {t('start.form.shares')}
              <InfoTip term="rotation" />
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {ROTATION_IDS.map((id) => (
                <div key={id} className="flex items-center gap-3 rounded-ctl bg-bg px-3 py-1.5 ring-1 ring-inset ring-border-soft">
                  <span aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 rounded-[4px] ${ROT_BG[id]} ${id === 'fallow' ? 'hatch' : ''}`} />
                  <label htmlFor={`share-${id}`} className="flex-1 text-base text-text">
                    {t(`rotations.${id}`)}
                  </label>
                  <div className="relative w-24">
                    <input
                      id={`share-${id}`}
                      className="input tnum h-11 min-h-0 pr-7 text-right"
                      inputMode="numeric"
                      value={shares[id]}
                      onChange={(e) => setShares((s) => ({ ...s, [id]: e.target.value.replace(/[^\d.]/g, '') }))}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-text-muted">%</span>
                  </div>
                </div>
              ))}
            </div>
            <p
              className={`tnum mt-3 flex items-center gap-1.5 text-sm font-semibold ${totalErr ? (submitted ? 'text-danger' : 'text-warning') : 'text-secondary'}`}
              aria-live="polite"
            >
              {!totalErr && <Check aria-hidden="true" className="h-4 w-4" />}
              {t('start.form.total', { n: whole(total, lang) })} · {totalErr ? t('start.form.totalBad') : t('start.form.totalOk')}
            </p>
          </fieldset>
          <div className="sm:col-span-2">
            <button type="submit" className="btn btn-primary min-h-[52px] w-full px-6 text-lg sm:w-auto">
              {t('start.form.submit')}
              <ArrowRight aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
