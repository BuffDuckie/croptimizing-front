import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/layout/Footer';
import { Header } from './components/layout/Header';
import { FallbackBanner } from './components/layout/FallbackBanner';
import StartPage from './pages/StartPage';
import { PlanProvider, usePlanContext } from './state/PlanContext';

const PlanPage = lazy(() => import('./pages/PlanPage'));
const TradeoffsPage = lazy(() => import('./pages/TradeoffsPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const WhyPage = lazy(() => import('./pages/WhyPage'));
const StressPage = lazy(() => import('./pages/StressPage'));
const ReportPage = lazy(() => import('./pages/ReportPage'));
const MethodPage = lazy(() => import('./pages/MethodPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

/** Move focus and scroll to the top on route change, and set the tab title. */
function RouteEffects() {
  const { pathname } = useLocation();
  const { t, i18n } = useTranslation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const key = pathname === '/' ? 'start' : pathname.slice(1);
    const title = t(`pages.${key}.title`, { defaultValue: '' });
    document.title = title && key !== 'start' ? `${title} · Croptimizing` : 'Croptimizing';
  }, [pathname, t, i18n.language]);
  return null;
}

export function AppShell() {
  return (
    <PlanProvider>
      <Shell />
    </PlanProvider>
  );
}

function Shell() {
  const { t } = useTranslation();
  const { data, fellBack } = usePlanContext();
  const showSample = !data || data.dataSource === 'sample' || fellBack;
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-3 z-[60] rounded-ctl bg-surface px-4 py-3 font-semibold text-primary shadow-lift"
      >
        {t('app.skip')}
      </a>
      <RouteEffects />
      <Header showSample={showSample} />
      <FallbackBanner />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <Suspense fallback={<div className="container-content min-h-[110vh] py-16" aria-busy="true" />}>
          <Routes>
            <Route path="/" element={<StartPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="/tradeoffs" element={<TradeoffsPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/why" element={<WhyPage />} />
            <Route path="/stress" element={<StressPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/method" element={<MethodPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
