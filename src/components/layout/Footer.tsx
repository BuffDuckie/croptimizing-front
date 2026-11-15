import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { LogoMark } from './Logo';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="mt-24 border-t border-border-soft bg-surface print:hidden">
      <div className="container-content py-10">
        <p className="flex max-w-3xl items-start gap-3 text-lg font-medium text-text">
          <ShieldCheck aria-hidden="true" className="mt-1 h-5 w-5 shrink-0 text-secondary" />
          {t('footer.disclaimer')}
        </p>
        <div className="mt-8 flex flex-col gap-4 border-t border-border-soft pt-6 text-sm text-text-muted md:flex-row md:items-center md:justify-between print:hidden">
          <div className="flex items-center gap-2">
            <LogoMark className="h-5 w-5" />
            <span className="font-semibold text-text">Croptimizing</span>
            <span aria-hidden="true">·</span>
            <span>{t('footer.built')}</span>
            <span aria-hidden="true">·</span>
            <Link to="/about" className="inline-flex min-h-[44px] items-center font-semibold">
              {t('nav.about')}
            </Link>
          </div>
          <p className="max-w-xl md:text-right">
            {t('footer.credits')} {t('footer.notAffiliated')}
          </p>
        </div>
      </div>
    </footer>
  );
}
