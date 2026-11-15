import { ChevronDown, Sigma } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Expandable panel. Used for "Show the math" and "More options". */
export function Disclosure({
  children,
  title,
  icon = 'math',
  defaultOpen = false,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  icon?: 'math' | 'none';
  defaultOpen?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const label = title ?? (open ? t('common.hideMath') : t('common.showMath'));
  return (
    <div className={`disclosure ${className}`} data-state={open ? 'open' : 'closed'}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="group flex min-h-[44px] w-full items-center gap-2 rounded-ctl px-1 text-left text-base font-semibold text-primary transition-colors duration-fast hover:text-primary-deep"
      >
        {icon === 'math' && (
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary-tint text-primary">
            <Sigma aria-hidden="true" className="h-4 w-4" />
          </span>
        )}
        <span className="flex-1">{label}</span>
        <ChevronDown
          aria-hidden="true"
          className={`h-5 w-5 text-text-muted transition-transform duration-slow ease-out ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div id={id} className="disclosure-body grid" data-open={open}>
        <div className="min-h-0 overflow-hidden">
          <div className="pb-2 pt-3" hidden={!open}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
