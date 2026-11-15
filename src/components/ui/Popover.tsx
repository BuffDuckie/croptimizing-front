import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type Props = {
  /** Accessible label for the trigger button. */
  label: string;
  /** What the trigger looks like. */
  trigger: ReactNode;
  children: ReactNode;
  triggerClassName?: string;
  panelClassName?: string;
  align?: 'start' | 'center' | 'end';
  /** Dark trigger context (header). */
  onDark?: boolean;
};

/**
 * A small disclosure popover. Opens on click/tap, on keyboard focus + Enter,
 * and on hover for pointer devices. Nothing here is hover-only: every way in
 * also works by tap and keyboard. Escape and outside clicks close it.
 */
export function Popover({
  label,
  trigger,
  children,
  triggerClassName = '',
  panelClassName = '',
  align = 'center',
  onDark = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const rootRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pinned = useRef(false);
  const id = useId();

  const close = useCallback(() => {
    pinned.current = false;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        rootRef.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  // Keep the panel inside the viewport (16 px gutter) on small screens.
  useLayoutEffect(() => {
    if (!open || !panelRef.current) {
      setShift(0);
      return;
    }
    const r = panelRef.current.getBoundingClientRect();
    const gutter = 12;
    let dx = 0;
    if (r.left < gutter) dx = gutter - r.left;
    else if (r.right > window.innerWidth - gutter) dx = window.innerWidth - gutter - r.right;
    setShift(dx);
  }, [open]);

  const alignClass =
    align === 'start' ? 'left-0 origin-top-left' : align === 'end' ? 'right-0 origin-top-right' : 'left-1/2 origin-top';
  const baseX = align === 'center' ? '-50%' : '0px';

  return (
    <span
      ref={rootRef}
      className="relative inline-flex"
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return;
        window.clearTimeout(hoverTimer.current);
        hoverTimer.current = window.setTimeout(() => setOpen(true), 120);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return;
        window.clearTimeout(hoverTimer.current);
        if (!pinned.current) hoverTimer.current = window.setTimeout(() => setOpen(false), 160);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={id}
        className={triggerClassName}
        onClick={() => {
          if (open && pinned.current) close();
          else {
            pinned.current = true;
            setOpen(true);
          }
        }}
      >
        {trigger}
      </button>
      <div
        ref={panelRef}
        id={id}
        role="region"
        aria-label={label}
        hidden={!open}
        data-state={open ? 'open' : 'closed'}
        style={{ transform: `translateX(calc(${baseX} + ${shift}px))` }}
        className={`popover-panel absolute top-full z-50 mt-2 w-[min(20rem,calc(100vw-24px))] rounded-card bg-surface p-4 text-left text-sm font-normal normal-case leading-relaxed tracking-normal text-text shadow-lift ring-1 ring-border-soft ${alignClass} ${onDark ? '' : ''} ${panelClassName}`}
      >
        {children}
      </div>
    </span>
  );
}
