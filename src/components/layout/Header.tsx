import { Menu, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { NAV } from '../../routes';
import { LangToggle } from './LangToggle';
import { Wordmark } from './Logo';
import { SampleBadge } from './SampleBadge';

export function Header({ showSample }: { showSample: boolean }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    sheetRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <header className="on-dark sticky top-0 z-40 bg-primary text-white print:hidden">
      <div className="container-content flex h-16 items-center justify-between gap-3">
        <Link to="/" className="-mx-1 rounded-ctl px-1 py-2 no-underline" aria-label="Croptimizing, start">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          {showSample && <SampleBadge />}
          <LangToggle />
          <button
            ref={menuBtn}
            type="button"
            className="-mr-1.5 inline-flex h-11 w-11 items-center justify-center rounded-ctl text-white transition-colors duration-fast hover:bg-white/10 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? t('app.closeMenu') : t('app.menu')}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
          </button>
        </div>
      </div>
      <TabNav />
      <div
        id="mobile-nav"
        ref={sheetRef}
        hidden={!menuOpen}
        data-state={menuOpen ? 'open' : 'closed'}
        className="mobile-sheet absolute inset-x-0 top-full border-t border-white/10 bg-primary pb-4 shadow-lift md:hidden"
      >
        <nav aria-label={t('app.mainNav')} className="container-content">
          <ul className="grid gap-1 pt-2">
            {NAV.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex min-h-[48px] items-center rounded-ctl px-3 text-lg font-medium no-underline transition-colors duration-fast ${
                      isActive ? 'bg-white/12 text-white' : 'text-white/85 hover:bg-white/8 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        aria-hidden="true"
                        className={`mr-3 h-5 w-1 rounded-full ${isActive ? 'bg-accent' : 'bg-transparent'}`}
                      />
                      {t(`nav.${item.key}`)}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Desktop and tablet tabs, with an underline that slides to the active page. */
function TabNav() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const listRef = useRef<HTMLUListElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = listRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
      if (!el || !listRef.current) return setBar(null);
      setBar({ x: el.offsetLeft + 12, w: el.offsetWidth - 24 });
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    measure();
    window.addEventListener('resize', measure);
    void document.fonts?.ready.then(measure);
    return () => window.removeEventListener('resize', measure);
  }, [location.pathname, i18n.language]);

  return (
    <nav aria-label={t('app.mainNav')} className="hidden border-t border-white/10 md:block">
      <div className="container-content">
        <ul ref={listRef} className="no-scrollbar relative -mx-3 flex overflow-x-auto">
          {NAV.map((item) => (
            <li key={item.path} className="shrink-0">
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex h-12 items-center whitespace-nowrap px-3 text-[0.9375rem] font-medium no-underline transition-colors duration-base ${
                    isActive ? 'text-white' : 'text-white/75 hover:text-white'
                  }`
                }
              >
                {t(`nav.${item.key}`)}
              </NavLink>
            </li>
          ))}
          {bar && (
            <span
              aria-hidden="true"
              className="tab-indicator pointer-events-none absolute bottom-0 left-0 h-[3px] rounded-t-full bg-accent"
              style={{ width: bar.w, transform: `translateX(${bar.x}px)` }}
            />
          )}
        </ul>
      </div>
    </nav>
  );
}
