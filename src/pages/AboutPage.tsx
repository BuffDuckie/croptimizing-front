import { ArrowRight, CheckCircle2, FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { DataTable } from '../components/charts/ChartCard';
import { PageIntro } from '../components/layout/PageIntro';
import { useSourceRows } from '../hooks/useSourceRows';
import { usePlanContext, useYears } from '../state/PlanContext';

/** TODO(team): replace with first names only, no photos. */
const TEAM = ['Nick', 'Isaac', 'Aarav', 'Lohit'];

const TOUR = [
  { to: '/plan', key: 'plan' },
  { to: '/tradeoffs', key: 'tradeoffs' },
  { to: '/stress', key: 'stress' },
  { to: '/method', key: 'method' },
] as const;

export default function AboutPage() {
  const { t } = useTranslation();
  const { data } = usePlanContext();
  const yrs = useYears();
  const sources = useSourceRows();
  const approach = t('about.approach', { returnObjects: true, ...yrs }) as string[];
  const limits = t('method.limits', { returnObjects: true }) as string[];

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.about.title')} intro={t('pages.about.intro')} />
      <div className="space-y-12">
        <section aria-labelledby="about-tour" className="card">
          <h2 id="about-tour" className="text-2xl font-semibold">
            {t('about.tourTitle')}
          </h2>
          <ol className="mt-5 grid gap-3 md:grid-cols-2">
            {TOUR.map((s, i) => (
              <li key={s.to}>
                <Link
                  to={s.to}
                  className="learn-more group flex min-h-[64px] items-start gap-3 rounded-ctl bg-bg p-4 no-underline ring-1 ring-inset ring-border-soft transition-shadow duration-base hover:shadow-lift"
                >
                  <span className="tnum inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-white">{i + 1}</span>
                  <span className="flex-1">
                    <span className="flex items-center gap-1 text-lg font-semibold text-primary">
                      {t(`nav.${s.key}`)}
                      <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform duration-base group-hover:translate-x-1" />
                    </span>
                    <span className="mt-1 block text-base text-text">{t(`about.tour.${s.key}`)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="about-problem">
          <h2 id="about-problem" className="text-3xl font-semibold">
            {t('about.problemTitle')}
          </h2>
          <p className="mt-3 max-w-3xl text-lg text-text">{t('about.problem')}</p>
          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <dt className="sr-only">{t('start.stats.cut65')}</dt>
              <dd>
                <span className="tnum block text-5xl font-semibold text-primary">65%</span>
                <span className="mt-2 block text-base text-text-muted">{t('start.stats.cut65')}</span>
              </dd>
            </div>
            <div className="card">
              <dt className="sr-only">{t('start.stats.zero')}</dt>
              <dd>
                <span className="tnum block text-5xl font-semibold text-accent-strong">0 AF</span>
                <span className="mt-2 block text-base text-text-muted">{t('start.stats.zero')}</span>
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-text-muted">{t('start.stats.source')}</p>
        </section>

        <section aria-labelledby="about-approach">
          <h2 id="about-approach" className="text-3xl font-semibold">
            {t('about.approachTitle')}
          </h2>
          <ul className="mt-4 max-w-3xl space-y-2 text-lg text-text">
            {approach.map((a) => (
              <li key={a} className="flex gap-3">
                <CheckCircle2 aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-secondary" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-real">
          <h2 id="about-real" className="text-3xl font-semibold">
            {t('about.realTitle')}
          </h2>
          <p className="mt-3 max-w-3xl text-base text-text">{t('about.realIntro')}</p>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            {sources
              .filter((s) => s.status !== 'text')
              .map((s) => (
                <li key={s.cells[0]} className="flex items-start gap-3 rounded-ctl bg-surface p-4 shadow-card">
                  {s.status === 'real' ? (
                    <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-secondary" />
                  ) : (
                    <FlaskConical aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  )}
                  <span>
                    <span className="block font-semibold text-text">{s.cells[0]}</span>
                    <span className="block text-sm text-text-muted">
                      {s.cells[1]}: {s.cells[3]}
                    </span>
                  </span>
                </li>
              ))}
          </ul>
          {data && (
            <div className="card mt-5">
              <h3 className="text-xl font-semibold">{t('plan.assumptions')}</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-text">
                {data.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section aria-labelledby="about-sources">
          <h2 id="about-sources" className="text-3xl font-semibold">
            {t('method.sec.sources')}
          </h2>
          <div className="card mt-5 overflow-x-auto" tabIndex={0}>
            <DataTable
              caption={t('method.sourcesCaption')}
              head={t('method.sourceHead', { returnObjects: true }) as string[]}
              rows={sources.map((s) => s.cells)}
              className="min-w-[640px] [&_td]:text-left [&_th]:text-left"
            />
          </div>
        </section>

        <section aria-labelledby="about-limits">
          <h2 id="about-limits" className="text-3xl font-semibold">
            {t('method.limitsTitle')}
          </h2>
          <ul className="mt-4 max-w-3xl list-disc space-y-2 pl-5 text-base text-text">
            {limits.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-team" className="grid gap-6 md:grid-cols-2">
          <div className="card">
            <h2 id="about-team" className="text-2xl font-semibold">
              {t('about.teamTitle')}
            </h2>
            <ul className="mt-4 space-y-2 text-base text-text">
              {TEAM.map((name, i) => (
                <li key={i}>{name}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="text-2xl font-semibold">{t('about.siTitle')}</h2>
            {/* TODO(team): SI-use statement. */}
            <p className="mt-4 text-base text-text">Our team used SI to help design, debug, and modify the application. SI helped us rapidly prototype and iterate on our ideas.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
