import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover } from '../ui/Popover';

/** Small inline tag for one chart whose data is sample data. */
export function SamplePill() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-warning-tint px-2 py-0.5 text-sm font-semibold text-warning">
      <FlaskConical aria-hidden="true" className="h-3.5 w-3.5" />
      {t('app.sampleBadge')}
    </span>
  );
}

export function SampleBadge() {
  const { t } = useTranslation();
  return (
    <Popover
      label={t('app.sampleBadge')}
      align="end"
      triggerClassName="inline-flex min-h-[36px] min-w-[36px] items-center justify-center gap-1.5 whitespace-nowrap rounded-full bg-warning-tint px-2 text-sm sm:px-3 font-semibold text-warning ring-1 ring-inset ring-warning/30 transition-transform duration-fast active:scale-[0.97]"
      trigger={
        <>
          <FlaskConical aria-hidden="true" className="h-4 w-4" />
          <span className="hidden sm:inline">{t('app.sampleBadge')}</span>
        </>
      }
    >
      <p>{t('app.sampleBadgeHelp')}</p>
    </Popover>
  );
}
