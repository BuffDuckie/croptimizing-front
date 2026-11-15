import { useTranslation } from 'react-i18next';
import { LANGS } from '../../i18n';

/** EN | ES segmented toggle. Switching also updates <html lang>. */
export function LangToggle() {
  const { t, i18n } = useTranslation();
  const active = i18n.language === 'es' ? 'es' : 'en';
  return (
    <div role="group" aria-label={t('app.language')} className="seg relative flex rounded-ctl bg-white/10 p-1 ring-1 ring-inset ring-white/15">
      <span
        aria-hidden="true"
        className="seg-thumb absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-[6px] bg-white shadow-sm"
        style={{ transform: `translateX(${active === 'es' ? 'calc(100% + 0px)' : '0'})` }}
      />
      {LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          aria-pressed={active === lng}
          onClick={() => void i18n.changeLanguage(lng)}
          className={`relative z-10 min-h-[36px] min-w-[40px] rounded-[6px] px-2 sm:min-w-[44px] sm:px-2.5 text-sm font-semibold transition-colors duration-base ${
            active === lng ? 'text-primary' : 'text-white/85 hover:text-white'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
