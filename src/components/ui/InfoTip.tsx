import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover } from './Popover';

export type GlossaryKey =
  | 'acreFoot'
  | 'et'
  | 'et0'
  | 'worst1in5'
  | 'frontier'
  | 'soilScore'
  | 'shadowPrice'
  | 'grace'
  | 'power'
  | 'fallow'
  | 'rotation';

/** A glossary tip: opens on tap, click, keyboard, or hover. */
export function InfoTip({ term, align = 'center' }: { term: GlossaryKey; align?: 'start' | 'center' | 'end' }) {
  const { t } = useTranslation();
  const name = t(`glossary.${term}.term`);
  return (
    <Popover
      label={`${t('common.more')}: ${name}`}
      align={align}
      triggerClassName="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors duration-fast hover:text-primary"
      trigger={<Info aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />}
    >
      <p className="font-semibold text-primary">{name}</p>
      <p className="mt-1 text-text">{t(`glossary.${term}.def`)}</p>
    </Popover>
  );
}

/** "How to read this" chart helper, same interaction model. */
export function HowToRead({ children, align = 'end' }: { children: React.ReactNode; align?: 'start' | 'center' | 'end' }) {
  const { t } = useTranslation();
  return (
    <Popover
      label={t('common.howToRead')}
      align={align}
      triggerClassName="inline-flex min-h-[44px] items-center gap-1.5 rounded-ctl px-2 text-sm font-medium text-accent-strong transition-colors duration-fast hover:bg-accent-tint"
      trigger={
        <>
          <Info aria-hidden="true" className="h-4 w-4" />
          <span>{t('common.howToRead')}</span>
        </>
      }
    >
      <div className="space-y-2">{children}</div>
    </Popover>
  );
}
