import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mix } from '../../api/types';
import { useElementWidth } from '../../hooks/useElementWidth';
import { mixEntries, money, pct } from '../../lib/format';
import { colors } from '../../theme/tokens';
import { ROT_BG } from './rotation';

type Point = { worst1in5: number; avgProfit: number; mix: Mix };
type Marker = { worst1in5: number; avgProfit: number; mix: Mix };

function ticks(lo: number, hi: number, n = 5): number[] {
  const span = hi - lo || 1;
  const raw = span / n;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => span / s <= n + 1) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v));
  return out;
}

function starPath(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return d + 'Z';
}

const GHOST_MS = 2000;

/**
 * Efficient frontier. x = worst 1-in-5 years profit, y = average profit.
 * When the frontier changes (water budget moved), the previous one stays as a
 * faded dashed line for 2 seconds so the shrink is visible.
 */
export function FrontierChart({
  frontier,
  current,
  recommended,
  waterKey,
}: {
  frontier: Point[];
  current: Marker;
  recommended: Marker;
  /** Changes when the water budget changes. */
  waterKey: number;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const [wrapRef, width] = useElementWidth<HTMLDivElement>(720);
  const [active, setActive] = useState<number | 'cur' | 'rec' | null>(null);
  const [ghost, setGhost] = useState<{ pts: Point[]; id: number } | null>(null);
  const prev = useRef<{ pts: Point[]; water: number } | null>(null);
  const ghostTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const before = prev.current;
    prev.current = { pts: frontier, water: waterKey };
    if (!before || before.water === waterKey) return;
    const id = Date.now();
    setGhost({ pts: before.pts, id });
    // The timer lives in a ref: the new frontier arrives after the water change and re-runs
    // this effect, which must not cancel the pending removal.
    window.clearTimeout(ghostTimer.current);
    ghostTimer.current = window.setTimeout(() => setGhost((g) => (g?.id === id ? null : g)), GHOST_MS);
  }, [frontier, waterKey]);

  useEffect(() => () => window.clearTimeout(ghostTimer.current), []);

  const H = Math.max(320, Math.min(460, width * 0.62));
  const m = { l: 64, r: 24, t: 24, b: 56 };
  const all = [...frontier, current, recommended, ...(ghost?.pts ?? [])];
  const xs = all.map((p) => p.worst1in5);
  const ys = all.map((p) => p.avgProfit);
  const padX = (Math.max(...xs) - Math.min(...xs)) * 0.08 || 20;
  const padY = (Math.max(...ys) - Math.min(...ys)) * 0.08 || 20;
  const xT = ticks(Math.min(...xs) - padX, Math.max(...xs) + padX);
  const yT = ticks(Math.min(...ys) - padY, Math.max(...ys) + padY);
  const x0 = Math.min(xT[0], Math.min(...xs) - padX);
  const x1 = Math.max(xT[xT.length - 1], Math.max(...xs) + padX);
  const y0 = Math.min(yT[0], Math.min(...ys) - padY);
  const y1 = Math.max(yT[yT.length - 1], Math.max(...ys) + padY);
  const X = (v: number) => m.l + ((v - x0) / (x1 - x0)) * (width - m.l - m.r);
  const Y = (v: number) => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const line = (pts: Point[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.worst1in5).toFixed(1)},${Y(p.avgProfit).toFixed(1)}`).join('');

  const sorted = useMemo(() => [...frontier].sort((a, b) => a.worst1in5 - b.worst1in5), [frontier]);

  const nearest = (px: number, py: number) => {
    const cands: { k: number | 'cur' | 'rec'; d: number }[] = sorted.map((p, i) => ({ k: i, d: Math.hypot(X(p.worst1in5) - px, Y(p.avgProfit) - py) }));
    cands.push({ k: 'cur', d: Math.hypot(X(current.worst1in5) - px, Y(current.avgProfit) - py) });
    cands.push({ k: 'rec', d: Math.hypot(X(recommended.worst1in5) - px, Y(recommended.avgProfit) - py) - 6 });
    const best = cands.reduce((a, b) => (b.d < a.d ? b : a));
    return best.d < 48 ? best.k : null;
  };

  const onPointer = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setActive(nearest(e.clientX - r.left, e.clientY - r.top));
  };

  const onKey = (e: KeyboardEvent) => {
    const order: (number | 'cur' | 'rec')[] = [...sorted.map((_, i) => i), 'rec', 'cur'];
    const idx = active === null ? -1 : order.indexOf(active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(order[Math.min(order.length - 1, idx + 1)]);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(order[Math.max(0, idx - 1)]);
    } else if (e.key === 'Escape') setActive(null);
  };

  const sel: { p: Marker; label: string } | null =
    active === null
      ? null
      : active === 'cur'
        ? { p: current, label: t('common.current') }
        : active === 'rec'
          ? { p: recommended, label: t('common.recommended') }
          : sorted[active]
            ? { p: sorted[active], label: t('trade.frontierPoint') }
            : null;

  const tipLeft = sel ? Math.min(Math.max(X(sel.p.worst1in5), 130), width - 130) : 0;
  const tipAbove = sel ? Y(sel.p.avgProfit) > 190 : true;

  return (
    <div ref={wrapRef} className="relative w-full">
      <div
        tabIndex={0}
        role="group"
        aria-label={t('trade.keyboard')}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="rounded-ctl"
      >
        <svg
          width={width}
          height={H}
          viewBox={`0 0 ${width} ${H}`}
          className="block touch-none select-none"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
          role="img"
          aria-label={t('trade.aria', {
            n: frontier.length,
            recAvg: money(recommended.avgProfit, lang),
            recWorst: money(recommended.worst1in5, lang),
            curAvg: money(current.avgProfit, lang),
            curWorst: money(current.worst1in5, lang),
          })}
        >
          {/* grid */}
          {yT.map((v) => (
            <g key={`y${v}`}>
              <line x1={m.l} x2={width - m.r} y1={Y(v)} y2={Y(v)} stroke={colors['border-soft']} />
              <text x={m.l - 10} y={Y(v) + 5} textAnchor="end" className="fill-text-muted text-[14px]">
                {money(v, lang)}
              </text>
            </g>
          ))}
          {xT.map((v) => (
            <g key={`x${v}`}>
              <line x1={X(v)} x2={X(v)} y1={m.t} y2={H - m.b} stroke={colors['border-soft']} />
              <text x={X(v)} y={H - m.b + 22} textAnchor="middle" className="fill-text-muted text-[14px]">
                {money(v, lang)}
              </text>
            </g>
          ))}
          <text x={width - m.r} y={H - 8} textAnchor="end" className="fill-text text-[14px] font-semibold">
            {t('trade.xAxis')}
          </text>
          <text x={m.l - 52} y={m.t - 8} className="fill-text text-[14px] font-semibold">
            {t('trade.yAxis')}
          </text>

          {/* previous frontier ghost */}
          {ghost && ghost.pts.length > 0 && (
            <path key={ghost.id} d={line([...ghost.pts].sort((a, b) => a.worst1in5 - b.worst1in5))} fill="none" stroke={colors.primary} strokeWidth={2} strokeDasharray="6 6" className="frontier-ghost" />
          )}

          {/* frontier */}
          {sorted.length > 1 && <path d={line(sorted)} fill="none" stroke={colors.primary} strokeWidth={3} strokeLinejoin="round" className="frontier-line" />}
          {sorted.map((p, i) => (
            <circle key={i} cx={X(p.worst1in5)} cy={Y(p.avgProfit)} r={active === i ? 7 : 4.5} fill={colors.primary} stroke={colors.surface} strokeWidth={1.5} />
          ))}

          {/* current plan: hollow charcoal circle */}
          <circle cx={X(current.worst1in5)} cy={Y(current.avgProfit)} r={active === 'cur' ? 11 : 9} fill={colors.surface} stroke={colors.text} strokeWidth={2.5} />
          <text x={X(current.worst1in5) - 14} y={Y(current.avgProfit) + 5} textAnchor="end" className="fill-text text-[14px] font-semibold">
            {t('common.current')}
          </text>

          {/* recommended: cyan star, navy outline */}
          <path
            d={starPath(X(recommended.worst1in5), Y(recommended.avgProfit), active === 'rec' ? 15 : 13, active === 'rec' ? 6.5 : 5.6)}
            fill={colors.accent}
            stroke={colors.primary}
            strokeWidth={2}
            strokeLinejoin="round"
          />
          <text x={X(recommended.worst1in5) + 18} y={Y(recommended.avgProfit) - 10} className="fill-primary text-[14px] font-semibold">
            {t('common.recommended')}
          </text>
        </svg>
      </div>

      {sel && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 w-[248px] -translate-x-1/2 rounded-card bg-surface p-3.5 text-sm shadow-lift ring-1 ring-border-soft"
          style={{ left: tipLeft, top: tipAbove ? Y(sel.p.avgProfit) - 16 : Y(sel.p.avgProfit) + 20, transform: `translate(-50%, ${tipAbove ? '-100%' : '0'})` }}
        >
          <p className="font-semibold text-primary">{sel.label}</p>
          <p className="tnum mt-1 text-text">
            {t('trade.tipAvg')}: <strong>{money(sel.p.avgProfit, lang)}</strong>
          </p>
          <p className="tnum text-text">
            {t('trade.tipWorst')}: <strong>{money(sel.p.worst1in5, lang)}</strong>
          </p>
          <ul className="mt-2 space-y-1 border-t border-border-soft pt-2">
            {mixEntries(sel.p.mix).map((e) => (
              <li key={e.id} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${ROT_BG[e.id]} ${e.id === 'fallow' ? 'hatch' : ''}`} />
                <span className="flex-1 text-text">{t(`rotations.${e.id}`)}</span>
                <span className="tnum font-semibold text-text">{pct(e.share, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
