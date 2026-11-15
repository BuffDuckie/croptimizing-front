import { CloudOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePlanContext } from '../../state/PlanContext';

/** Friendly notice when static or live data failed and sample data is shown instead. */
export function FallbackBanner() {
  const { t } = useTranslation();
  const { fellBack, dismissFallback } = usePlanContext();
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 print:hidden">
      {fellBack && (
        <div className="toast pointer-events-auto flex max-w-xl items-start gap-3 rounded-card bg-text px-4 py-3 text-white shadow-lift">
          <CloudOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p className="flex-1 text-base">{t('app.fallbackBanner')}</p>
          <button
            type="button"
            onClick={dismissFallback}
            className="-my-1 -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-ctl text-white/80 hover:bg-white/10 hover:text-white"
            aria-label={t('app.dismiss')}
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}
