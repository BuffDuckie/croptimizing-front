import { FlaskConical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover } from '../ui/Popover';

export function SampleBadge() {
  const { t } = useTranslation();
  return (
    <Popover
      label={t('app.sampleBadge')}
      align="end"
      triggerClassName="inline-flex min-h-[36px] items-center gap-1.5 rounded-full bg-warning-tint px-3 text-sm font-semibold text-warning ring-1 ring-inset ring-warning/30 transition-transform duration-fast active:scale-[0.97]"
      trigger={
        <>
          <FlaskConical aria-hidden="true" className="h-4 w-4" />
          <span>{t('app.sampleBadge')}</span>
        </>
      }
    >
      <p>{t('app.sampleBadgeHelp')}</p>
    </Popover>
  );
}
