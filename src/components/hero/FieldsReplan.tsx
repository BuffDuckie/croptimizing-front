import { AlertTriangle, Check, RotateCcw, Undo2 } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mix, RotationCard, RotationId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { af, money, whole } from '../../lib/format';
import { mixMetrics } from '../../lib/mixMetrics';
import { colors, rotationColors } from '../../theme/tokens';

/*
 * "Fields re-plan": top-down satellite-style farm on navy.
 *   0.0-0.9 s  parcels appear (current plan: alfalfa and cotton)
 *   0.9-1.5 s  gauge fills to what the current plan needs
 *   1.6 s      "water cut" note
 *   1.9-3.1 s  gauge drains to the budget
 *   3.1-3.8 s  parcels flag over budget
 *   3.8-5.0 s  parcels re-plan into the suggested mix
 *   4.9-5.8 s  results count up
 *
 * During the intro, React renders the structure once and a requestAnimationFrame
 * loop writes attributes straight to the SVG through refs. When it ends, an
 * interactive layer takes over: each field is a button that cycles its crop, the
 * gauge is a slider for the water budget, and the numbers follow the mix on screen.
 */
const T = { appear: 0, fill: 900, note: 1600, drain: 1900, flag: 3100, replan: 3800, numbers: 4900, end: 5900 };

const W = 560;
const H = 420;
const MAP = { x: 24, y: 24, w: 400, h: 330 };
const GAP = 7;
const ROWS: { h: number; cols: number[]; pivot?: number[] }[] = [
  { h: 74, cols: [112, 70, 96, 101], pivot: [0] },
  { h: 92, cols: [84, 128, 74, 93], pivot: [1] },
  { h: 66, cols: [134, 62, 108, 75] },
  { h: 77, cols: [92, 100, 70, 117], pivot: [3] },
];
const G = { x: 470, y: MAP.y + 10, w: 44, h: MAP.h - 20 };
const SCALE_MAX = 6;
const BUDGET_MIN = 0.5;
const yFor = (v: number) => G.y + G.h - (Math.max(0, v) / SCALE_MAX) * G.h;
/** The field the "tap a field" hint points at (bottom row, second from the left). */
const HINT_PARCEL = 13;

type Parcel = { x: number; y: number; w: number; h: number; area: number; pivot: boolean; order: number };

function buildParcels(): Parcel[] {
  const out: Parcel[] = [];
  let y = MAP.y;
  ROWS.forEach((row, ri) => {
    let x = MAP.x;
    row.cols.forEach((w, ci) => {
      out.push({ x, y, w, h: row.h, area: w * row.h, pivot: row.pivot?.includes(ci) ?? false, order: (ri * 5 + ci * 3) % 16 });
      x += w + GAP;
    });
    y += row.h + GAP;
  });
  return out;
}

/** Assign parcels to rotations so areas roughly match the shares. */
function assign(parcels: Parcel[], mix: Mix): RotationId[] {
  const total = parcels.reduce((s, p) => s + p.area, 0);
  const targets = ROTATION_IDS.map((id) => ({ id, left: (mix[id] ?? 0) * total }));
  const order = [...parcels.keys()].sort((a, b) => parcels[b].area - parcels[a].area);
  const result: RotationId[] = Array(parcels.length).fill('fallow');
  for (const i of order) {
    const best = targets.reduce((m, t) => (t.left > m.left ? t : m), targets[0]);
    result[i] = best.id;
    best.left -= parcels[i].area;
  }
  return result;
}

/** The mix the fields show: each rotation's share of the total field area. */
function mixOf(parcels: Parcel[], ids: RotationId[]): Mix {
  const total = parcels.reduce((s, p) => s + p.area, 0);
  const mix: Mix = {};
  parcels.forEach((p, i) => (mix[ids[i]] = (mix[ids[i]] ?? 0) + p.area / total));
  return mix;
}

const nextCrop = (id: RotationId) => ROTATION_IDS[(ROTATION_IDS.indexOf(id) + 1) % ROTATION_IDS.length];
const round1 = (v: number) => Math.round(v * 10) / 10;
const clampBudget = (v: number) => Math.min(SCALE_MAX, Math.max(BUDGET_MIN, round1(v)));

/** Hints stay gone on this device once used (browser storage only; failures just show them again). */
const HINT_KEYS = { field: 'croptimizing.hint.field', water: 'croptimizing.hint.water' } as const;
function hintSeen(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}
function markHintSeen(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: the hint simply hides for this visit.
  }
}

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeInOut = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (now: number, a: number, b: number) => (now - a) / (b - a);

type ParcelRefs = { g: SVGGElement | null; soil: SVGRectElement | null; body: SVGRectElement | null; circle: SVGCircleElement | null; overlay: SVGElement | null; flag: SVGRectElement | null };

/** One field's fill: a pivot circle on soil, or a rectangle with crop rows (fallow: hatched). */
function ParcelShape({ p, id }: { p: Parcel; id: RotationId }) {
  const isFallow = id === 'fallow';
  if (p.pivot && !isFallow) {
    return (
      <>
        <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill={colors['field-soil']} />
        <circle cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={Math.min(p.w, p.h) / 2 - 3} fill={rotationColors[id]} />
      </>
    );
  }
  return (
    <>
      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill={rotationColors[id]} opacity={isFallow ? 0.75 : 1} />
      <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill={isFallow ? 'url(#hero-hatch)' : 'url(#hero-rows)'} />
    </>
  );
}

export function FieldsReplan({
  currentMix,
  suggestedMix,
  need,
  budget,
  avg,
  worst,
  planMaxWater,
  rotations,
  acres,
  onBudget,
}: {
  currentMix: Mix;
  suggestedMix: Mix | null;
  need: number;
  budget: number;
  avg: number | null;
  worst: number | null;
  /** The suggested plan's highest-year water, AF/acre. */
  planMaxWater: number | null;
  /** Rotation cards with yearly series, for the numbers of any mix the visitor sets. */
  rotations: RotationCard[] | null;
  acres: number;
  /** Called as the visitor drags the water gauge. */
  onBudget: (v: number) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const reduced = useReducedMotion();
  const parcels = useMemo(buildParcels, []);
  const before = useMemo(() => assign(parcels, currentMix), [parcels, currentMix]);
  const after = useMemo(() => (suggestedMix ? assign(parcels, suggestedMix) : null), [parcels, suggestedMix]);
  const ready = after !== null && avg !== null && worst !== null;
  const [done, setDone] = useState(reduced);
  const interactive = done && after !== null;

  // Interactive state: the visitor's own fields (null = the suggested plan), the live budget, hints.
  const [custom, setCustom] = useState<RotationId[] | null>(null);
  const [liveBudget, setLiveBudgetState] = useState(budget);
  // The latest budget, readable by fast repeated key presses before React re-renders.
  const budgetRef = useRef(budget);
  const setLiveBudget = (v: number) => {
    budgetRef.current = v;
    setLiveBudgetState(v);
  };
  const [showFieldHint, setShowFieldHint] = useState(() => !hintSeen(HINT_KEYS.field));
  const [showWaterHint, setShowWaterHint] = useState(() => !hintSeen(HINT_KEYS.water));
  const dragging = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const prevDisplay = useRef<RotationId[] | null>(null);

  // A new suggested plan (the water moved) re-plans the fields; the visitor's own picks reset.
  const afterKey = after?.join(',') ?? '';
  useEffect(() => setCustom(null), [afterKey]);
  useEffect(() => {
    if (!dragging.current) setLiveBudget(budget);
  }, [budget]);

  const raf = useRef(0);
  const start = useRef(0);
  const timeRef = useRef(reduced ? T.end : 0);
  const pRefs = useRef<ParcelRefs[]>(parcels.map(() => ({ g: null, soil: null, body: null, circle: null, overlay: null, flag: null })));
  const water = useRef<SVGRectElement>(null);
  const overSlice = useRef<SVGRectElement>(null);
  const budgetMark = useRef<SVGGElement>(null);
  const levelText = useRef<SVGTextElement>(null);
  const gaugeCaption = useRef<SVGTextElement>(null);
  const note = useRef<HTMLDivElement>(null);
  const legendBefore = useRef<HTMLUListElement>(null);
  const legendAfter = useRef<HTMLUListElement>(null);
  const statAvg = useRef<HTMLDivElement>(null);
  const statWorst = useRef<HTMLDivElement>(null);
  const statFits = useRef<HTMLDivElement>(null);
  const avgText = useRef<HTMLSpanElement>(null);
  const worstText = useRef<HTMLSpanElement>(null);

  // Everything the loop needs, kept current without restarting the loop.
  const live = useRef({ before, after, need, budget, avg, worst, ready, lang, needs: '', budgetLabel: '' });
  live.current = { before, after, need, budget, avg, worst, ready, lang, needs: t('start.hero.needsShort'), budgetLabel: t('start.hero.budgetShort') };

  const draw = useCallback((now: number) => {
    const L = live.current;
    const time = !L.ready && now > T.flag + 600 ? T.flag + 600 : now;
    const fillP = easeInOut(span(time, T.fill, T.fill + 600));
    const drainP = easeInOut(span(time, T.drain, T.drain + 1200));
    const level = L.need * fillP - (L.need - L.budget) * drainP;
    const flagP = span(time, T.flag, T.flag + 700);
    const flagged = flagP > 0 && time < T.replan + 200;
    const flagPulse = flagged ? Math.sin(Math.min(1, flagP) * Math.PI) : 0;
    const over = time > T.drain + 400 && time < T.replan + 600;
    const noteO = ease(span(time, T.note, T.note + 400)) * (1 - ease(span(time, T.replan + 400, T.replan + 800)));
    const numP = ease(span(time, T.numbers, T.numbers + 900));
    const fitsO = ease(span(time, T.replan + 900, T.replan + 1300));

    parcels.forEach((p, i) => {
      const r = pRefs.current[i];
      if (!r.g) return;
      const appear = ease(span(time, T.appear + p.order * 45, T.appear + p.order * 45 + 450));
      const replanP = ease(span(time, T.replan + p.order * 60, T.replan + p.order * 60 + 420));
      const fromId = L.before[i];
      const toId = L.after?.[i] ?? fromId;
      const id = replanP > 0.5 ? toId : fromId;
      const flip = replanP > 0.5 ? (replanP - 0.5) * 2 : 1 - replanP * 2;
      const s = (0.92 + 0.08 * appear) * (0.35 + 0.65 * Math.max(0, Math.min(1, flip)));
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      const isFallow = id === 'fallow';
      const usePivot = p.pivot && !isFallow;
      r.g.setAttribute('transform', `translate(${cx} ${cy}) scale(1 ${s.toFixed(3)}) translate(${-cx} ${-cy})`);
      r.g.setAttribute('opacity', appear.toFixed(3));
      r.soil?.setAttribute('display', usePivot ? 'inline' : 'none');
      r.circle?.setAttribute('display', usePivot ? 'inline' : 'none');
      r.circle?.setAttribute('fill', rotationColors[id]);
      r.body?.setAttribute('display', usePivot ? 'none' : 'inline');
      r.body?.setAttribute('fill', rotationColors[id]);
      r.body?.setAttribute('opacity', isFallow ? '0.75' : '1');
      r.overlay?.setAttribute('fill', isFallow ? 'url(#hero-hatch)' : 'url(#hero-rows)');
      r.overlay?.setAttribute('display', usePivot ? 'none' : 'inline');
      if (r.flag) {
        const show = flagged && fromId !== 'fallow';
        r.flag.setAttribute('display', show ? 'inline' : 'none');
        r.flag.setAttribute('opacity', (0.35 + 0.65 * flagPulse).toFixed(3));
      }
    });

    water.current?.setAttribute('y', yFor(level).toFixed(1));
    if (overSlice.current) {
      const show = over && level > L.budget;
      overSlice.current.setAttribute('display', show ? 'inline' : 'none');
      overSlice.current.setAttribute('y', yFor(level).toFixed(1));
      overSlice.current.setAttribute('height', Math.max(0, yFor(L.budget) - yFor(level)).toFixed(1));
    }
    budgetMark.current?.setAttribute('opacity', ease(span(time, T.drain, T.drain + 300)).toFixed(3));
    if (levelText.current) levelText.current.textContent = af(Math.max(0, level), L.lang as 'en' | 'es');
    if (gaugeCaption.current) gaugeCaption.current.textContent = time < T.drain + 200 ? L.needs : L.budgetLabel;
    if (note.current) {
      note.current.style.opacity = noteO.toFixed(3);
      note.current.style.transform = `translateY(${((1 - noteO) * 8).toFixed(1)}px)`;
    }
    const showAfter = time > T.replan + 500 && L.after !== null;
    if (legendBefore.current) legendBefore.current.style.display = showAfter ? 'none' : 'flex';
    if (legendAfter.current) legendAfter.current.style.display = showAfter ? 'flex' : 'none';
    for (const [el, o] of [
      [statAvg.current, Math.max(0.25, numP)],
      [statWorst.current, Math.max(0.25, numP)],
      [statFits.current, fitsO],
    ] as const) {
      if (!el) continue;
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translateY(${((1 - o) * 6).toFixed(1)}px)`;
    }
    if (avgText.current) avgText.current.textContent = L.avg !== null ? money(L.avg * numP, L.lang as 'en' | 'es') : '';
    if (worstText.current) worstText.current.textContent = L.worst !== null ? money(L.worst * numP, L.lang as 'en' | 'es') : '';
  }, [parcels]);

  const play = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setDone(false);
    setCustom(null);
    prevDisplay.current = null;
    start.current = performance.now();
    const tick = (ts: number) => {
      const el = ts - start.current;
      timeRef.current = el;
      draw(el);
      if (el < T.end || !live.current.ready) raf.current = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf.current = requestAnimationFrame(tick);
  }, [draw]);

  useEffect(() => {
    if (reduced) {
      timeRef.current = T.end;
      draw(T.end);
      setDone(true);
      return;
    }
    play();
    return () => cancelAnimationFrame(raf.current);
  }, [reduced, play, draw]);

  // Redraw the intro's current frame when inputs change (language, data arriving, settings).
  useLayoutEffect(() => {
    if (!interactive) draw(timeRef.current);
  });

  // ---- Interactive layer -------------------------------------------------
  const display = custom ?? after ?? before;
  const shownMix = useMemo(() => mixOf(parcels, display), [parcels, display]);
  const metrics = useMemo(() => {
    if (!custom && avg !== null && worst !== null) return { avg, worst, maxWater: planMaxWater ?? budget };
    return rotations ? mixMetrics(shownMix, rotations) : null;
  }, [custom, avg, worst, planMaxWater, budget, rotations, shownMix]);
  const level = metrics?.maxWater ?? liveBudget;
  const overBudget = level > liveBudget + 0.005;
  const totalArea = parcels.reduce((s, p) => s + p.area, 0);

  // Which fields changed since the last frame: those flip in (re-plans ripple across the farm).
  const last = prevDisplay.current;
  useEffect(() => {
    prevDisplay.current = interactive ? display : null;
  });

  const cycle = (i: number) => {
    setCustom((c) => {
      const next = [...(c ?? after ?? before)];
      next[i] = nextCrop(next[i]);
      return next;
    });
    if (showFieldHint) {
      setShowFieldHint(false);
      markHintSeen(HINT_KEYS.field);
    }
  };

  const setBudget = (v: number) => {
    const b = clampBudget(v);
    setLiveBudget(b);
    onBudget(b);
    if (showWaterHint) {
      setShowWaterHint(false);
      markHintSeen(HINT_KEYS.water);
    }
  };

  const budgetFromPointer = (e: PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return budgetRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    return ((G.y + G.h - p.y) / G.h) * SCALE_MAX;
  };

  const onGaugeKey = (e: KeyboardEvent<SVGGElement>) => {
    const step: Record<string, number> = { ArrowUp: 0.1, ArrowRight: 0.1, ArrowDown: -0.1, ArrowLeft: -0.1, PageUp: 0.5, PageDown: -0.5 };
    if (e.key in step) {
      e.preventDefault();
      setBudget(budgetRef.current + step[e.key]);
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setBudget(e.key === 'Home' ? BUDGET_MIN : SCALE_MAX);
    }
  };

  const legend = (mix: Mix) =>
    ROTATION_IDS.filter((id) => (mix[id] ?? 0) > 0.0001).map((id) => (
      <li key={id} className="flex items-center gap-1.5">
        <span className={`h-3 w-3 rounded-[3px] ${id === 'fallow' ? 'hatch' : ''}`} style={{ backgroundColor: rotationColors[id] }} />
        {t(`rotations.${id}`)}
      </li>
    ));

  const hp = parcels[HINT_PARCEL];
  const knobY = yFor(liveBudget);

  return (
    <div className="relative">
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="group"
          aria-label={
            interactive
              ? t('start.hero.groupLabel', { acres: whole(acres, lang) })
              : t('start.hero.label', {
                  need: af(need, lang),
                  budget: af(budget, lang),
                  avg: avg !== null ? money(avg, lang) : '',
                  worst: worst !== null ? money(worst, lang) : '',
                })
          }
        >
          <defs>
            <pattern id="hero-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
              <rect width="2.4" height="8" fill="rgba(255,255,255,0.35)" />
            </pattern>
            <pattern id="hero-rows" patternUnits="userSpaceOnUse" width="6" height="6">
              <rect width="6" height="1.4" fill="rgba(255,255,255,0.10)" />
            </pattern>
            <linearGradient id="hero-water" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={colors.accent} />
              <stop offset="1" stopColor={colors['accent-strong']} />
            </linearGradient>
            <clipPath id="hero-gauge">
              <rect x={G.x} y={G.y} width={G.w} height={G.h} rx={12} />
            </clipPath>
            <marker id="hero-arrowhead" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M1,1 L8,5 L1,9" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          {/* Ground */}
          <rect x={MAP.x - 10} y={MAP.y - 10} width={MAP.w + 20} height={MAP.h + 20} rx={18} fill={colors['primary-ink']} />

          {!interactive &&
            parcels.map((p, i) => {
              const r = Math.min(p.w, p.h) / 2 - 3;
              return (
                <g key={`intro-${i}`} ref={(el) => void (pRefs.current[i].g = el)} opacity={0}>
                  {p.pivot && (
                    <>
                      <rect ref={(el) => void (pRefs.current[i].soil = el)} x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill={colors['field-soil']} />
                      <circle ref={(el) => void (pRefs.current[i].circle = el)} cx={p.x + p.w / 2} cy={p.y + p.h / 2} r={r} fill={rotationColors.alfalfa} />
                    </>
                  )}
                  <rect ref={(el) => void (pRefs.current[i].body = el)} x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill={rotationColors.alfalfa} />
                  <rect ref={(el) => void (pRefs.current[i].overlay = el)} x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill="url(#hero-rows)" />
                  <rect
                    ref={(el) => void (pRefs.current[i].flag = el)}
                    x={p.x + 1.5}
                    y={p.y + 1.5}
                    width={p.w - 3}
                    height={p.h - 3}
                    rx={4}
                    fill="none"
                    stroke={colors['danger-bright']}
                    strokeWidth={2.5}
                    display="none"
                  />
                </g>
              );
            })}

          {interactive &&
            parcels.map((p, i) => {
              const id = display[i];
              const changed = last !== null && last[i] !== id;
              const fieldAcres = whole((p.area / totalArea) * acres, lang);
              return (
                <g
                  key={`field-${i}`}
                  role="button"
                  tabIndex={0}
                  className="hero-parcel cursor-pointer"
                  aria-label={t('start.hero.fieldLabel', { n: i + 1, acres: fieldAcres, crop: t(`rotations.${id}`), next: t(`rotations.${nextCrop(id)}`) })}
                  onClick={() => cycle(i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      cycle(i);
                    }
                  }}
                >
                  {/* Keyed by crop, so a change remounts the shape and plays the flip. */}
                  <g
                    key={id}
                    className={changed ? 'hero-pop' : undefined}
                    style={changed && custom === null ? { animationDelay: `${p.order * 40}ms` } : undefined}
                  >
                    <ParcelShape p={p} id={id} />
                  </g>
                  <rect className="hero-hover" x={p.x} y={p.y} width={p.w} height={p.h} rx={5} fill="#fff" />
                  <rect className="hero-focus" x={p.x - 2} y={p.y - 2} width={p.w + 4} height={p.h + 4} rx={7} fill="none" stroke={colors.accent} strokeWidth={3} />
                </g>
              );
            })}

          {/* Water gauge: intro version (driven by the loop) */}
          {!interactive && (
            <g key="gauge-intro">
              <text ref={gaugeCaption} x={G.x + G.w / 2} y={G.y - 10} textAnchor="middle" className="fill-white/75 text-[12px] font-semibold" />
              <rect x={G.x} y={G.y} width={G.w} height={G.h} rx={12} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
              <g clipPath="url(#hero-gauge)">
                <rect ref={water} x={G.x} y={yFor(0)} width={G.w} height={G.h} fill="url(#hero-water)" />
                <rect ref={overSlice} x={G.x} y={yFor(0)} width={G.w} height={0} fill={colors['danger-bright']} opacity={0.85} display="none" />
              </g>
              {[0, 2, 4, 6].map((v) => (
                <g key={v}>
                  <line x1={G.x - 6} x2={G.x} y1={yFor(v)} y2={yFor(v)} stroke="rgba(255,255,255,0.35)" />
                  <text x={G.x - 10} y={yFor(v) + 4} textAnchor="end" className="tnum fill-white/60 text-[11px]">
                    {v}
                  </text>
                </g>
              ))}
              <g ref={budgetMark} opacity={0}>
                <line x1={G.x - 4} x2={G.x + G.w + 4} y1={yFor(budget)} y2={yFor(budget)} stroke="#fff" strokeWidth={2.5} />
              </g>
              <text ref={levelText} x={G.x + G.w / 2} y={G.y + G.h + 22} textAnchor="middle" className="tnum fill-white text-[17px] font-semibold" />
              <text x={G.x + G.w / 2} y={G.y + G.h + 40} textAnchor="middle" className="fill-white/65 text-[11px]">
                AF/acre
              </text>
            </g>
          )}

          {/* Water gauge: interactive slider for the budget */}
          {interactive && (
            <g
              key="gauge-live"
              role="slider"
              tabIndex={0}
              className="hero-slider touch-none"
              aria-label={t('start.hero.sliderLabel')}
              aria-orientation="vertical"
              aria-valuemin={BUDGET_MIN}
              aria-valuemax={SCALE_MAX}
              aria-valuenow={liveBudget}
              aria-valuetext={t('plan.waterText', { n: af(liveBudget, lang) })}
              onKeyDown={onGaugeKey}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                dragging.current = true;
                setBudget(budgetFromPointer(e));
              }}
              onPointerMove={(e) => {
                if (dragging.current) setBudget(budgetFromPointer(e));
              }}
              onPointerUp={(e) => {
                dragging.current = false;
                e.currentTarget.releasePointerCapture(e.pointerId);
              }}
              onPointerCancel={() => (dragging.current = false)}
              style={{ cursor: 'ns-resize' }}
            >
              {/* A wide invisible hit area so the gauge is easy to grab on a phone. */}
              <rect x={G.x - 22} y={G.y - 16} width={G.w + 44} height={G.h + 32} fill="transparent" />
              <text x={G.x + G.w / 2} y={G.y - 10} textAnchor="middle" className="fill-white/75 text-[12px] font-semibold">
                {t('start.hero.budgetShort')}
              </text>
              <rect x={G.x} y={G.y} width={G.w} height={G.h} rx={12} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.18)" />
              <g clipPath="url(#hero-gauge)">
                <rect className="hero-water" x={G.x} y={G.y} width={G.w} height={G.h} fill="url(#hero-water)" style={{ transform: `translateY(${(yFor(Math.min(level, SCALE_MAX)) - G.y).toFixed(1)}px)` }} />
                {overBudget && <rect x={G.x} y={yFor(Math.min(level, SCALE_MAX))} width={G.w} height={Math.max(0, knobY - yFor(Math.min(level, SCALE_MAX)))} fill={colors['danger-bright']} opacity={0.85} />}
              </g>
              {[0, 2, 4, 6].map((v) => (
                <g key={v}>
                  <line x1={G.x - 6} x2={G.x} y1={yFor(v)} y2={yFor(v)} stroke="rgba(255,255,255,0.35)" />
                  <text x={G.x - 10} y={yFor(v) + 4} textAnchor="end" className="tnum fill-white/60 text-[11px]">
                    {v}
                  </text>
                </g>
              ))}
              {/* The handle: the budget line with a grip, so it reads as something to drag. */}
              <g className="hero-knob" style={{ transform: `translateY(${(knobY - G.y).toFixed(1)}px)` }}>
                <rect x={G.x - 9} y={G.y - 8} width={G.w + 18} height={16} rx={8} fill="#fff" />
                {[-5, 0, 5].map((dx) => (
                  <line key={dx} x1={G.x + G.w / 2 + dx} x2={G.x + G.w / 2 + dx} y1={G.y - 4} y2={G.y + 4} stroke={colors.primary} strokeWidth={1.6} strokeLinecap="round" />
                ))}
              </g>
              <rect className="hero-focus" x={G.x - 12} y={G.y - 14} width={G.w + 24} height={G.h + 28} rx={14} fill="none" stroke={colors.accent} strokeWidth={3} />
              <text x={G.x + G.w / 2} y={G.y + G.h + 22} textAnchor="middle" className="tnum fill-white text-[17px] font-semibold">
                {af(liveBudget, lang)}
              </text>
              <text x={G.x + G.w / 2} y={G.y + G.h + 40} textAnchor="middle" className="fill-white/65 text-[11px]">
                AF/acre
              </text>
            </g>
          )}

          {/* Hint arrows: thin, hand-drawn, gone once each control is used. */}
          {interactive && showFieldHint && (
            <path
              className="hero-hint-arrow"
              d={`M ${MAP.x + 62} ${MAP.y + MAP.h + 20} C ${MAP.x + 70} ${MAP.y + MAP.h + 2}, ${hp.x + hp.w / 2 - 30} ${hp.y + hp.h + 4}, ${hp.x + hp.w / 2 - 6} ${hp.y + hp.h / 2 + 10}`}
              fill="none"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              markerEnd="url(#hero-arrowhead)"
              aria-hidden="true"
            />
          )}
          {interactive && showWaterHint && (
            <path
              className="hero-hint-arrow hero-hint-late"
              d={`M ${G.x - 30} ${MAP.y + 52} C ${G.x - 6} ${MAP.y + 70}, ${G.x - 36} ${knobY - 34}, ${G.x - 14} ${knobY - 4}`}
              fill="none"
              stroke="#fff"
              strokeWidth={1.8}
              strokeLinecap="round"
              markerEnd="url(#hero-arrowhead)"
              aria-hidden="true"
            />
          )}
        </svg>

        {interactive && showFieldHint && (
          <p aria-hidden="true" className="hero-hint pointer-events-none absolute rounded-full bg-white px-3 py-1 text-sm font-semibold text-primary shadow-lift" style={{ left: `${((MAP.x + 2) / W) * 100}%`, top: `${((MAP.y + MAP.h + 18) / H) * 100}%` }}>
            {t('start.hero.tapHint')}
          </p>
        )}
        {interactive && showWaterHint && (
          <p aria-hidden="true" className="hero-hint hero-hint-late pointer-events-none absolute rounded-full bg-white px-3 py-1 text-sm font-semibold text-primary shadow-lift" style={{ right: `${((W - G.x + 24) / W) * 100}%`, top: `${((MAP.y + 30) / H) * 100}%` }}>
            {t('start.hero.dragHint')}
          </p>
        )}
      </div>

      {/* Note about the cut (HTML so it wraps) */}
      {!interactive && (
        <div
          ref={note}
          aria-hidden="true"
          className="pointer-events-none absolute left-[6%] right-[22%] top-[66%] flex items-start gap-2.5 rounded-ctl bg-primary-ink/95 px-3.5 py-2.5 text-sm font-medium leading-snug text-white shadow-lift ring-1 ring-inset ring-white/15"
          style={{ opacity: 0 }}
        >
          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger-bright" />
          {t('start.hero.cut')}
        </div>
      )}

      {/* Legend: color is never the only cue */}
      <div className="mt-2 flex min-h-[44px] items-center justify-between gap-3">
        <div className="text-sm text-white/80" aria-hidden="true">
          {interactive ? (
            <ul key="interactive" className="flex flex-wrap gap-x-4 gap-y-1.5">
              {legend(shownMix)}
            </ul>
          ) : (
            <>
              <ul ref={legendBefore} className="flex flex-wrap gap-x-4 gap-y-1.5">
                {legend(currentMix)}
              </ul>
              <ul ref={legendAfter} className="hidden flex-wrap gap-x-4 gap-y-1.5">
                {suggestedMix && legend(suggestedMix)}
              </ul>
            </>
          )}
        </div>
        <div className="-mr-2 flex shrink-0 items-center">
          {interactive && custom && (
            <button
              type="button"
              onClick={() => setCustom(null)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-ctl px-2 text-sm font-medium text-white/80 transition-colors duration-base hover:bg-white/10 hover:text-white"
            >
              <Undo2 aria-hidden="true" className="h-4 w-4" />
              {t('start.hero.reset')}
            </button>
          )}
          {!reduced && (
            <button
              type="button"
              onClick={play}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-ctl px-2 text-sm font-medium text-white/70 transition-[opacity,background-color,color] duration-base hover:bg-white/10 hover:text-white"
              style={{ opacity: done ? 1 : 0, pointerEvents: done ? 'auto' : 'none' }}
              tabIndex={done ? 0 : -1}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {t('start.hero.replay')}
            </button>
          )}
        </div>
      </div>

      {/* Results row: HTML for crisp type */}
      {interactive && metrics ? (
        <>
          <p className="mt-1 text-sm font-semibold text-white/80" aria-hidden="true">
            {custom ? t('start.hero.yourMix') : t('start.hero.suggested')}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-white sm:grid-cols-[1fr_1fr_1.1fr] sm:gap-3" aria-hidden="true">
            <div className="rounded-ctl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/10">
              <p className="text-sm text-white/70">{t('start.hero.avg')}</p>
              <p className="tnum mt-0.5 text-xl font-semibold text-white">
                {money(metrics.avg, lang)}
                <span className="text-sm font-medium text-white/60">{t('start.hero.perAcre')}</span>
              </p>
            </div>
            <div className="rounded-ctl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/10">
              <p className="text-sm text-white/70">{t('start.hero.worst')}</p>
              <p className="tnum mt-0.5 text-xl font-semibold text-white">
                {money(metrics.worst, lang)}
                <span className="text-sm font-medium text-white/60">{t('start.hero.perAcre')}</span>
              </p>
            </div>
            <div className={`col-span-2 rounded-ctl px-3 py-2.5 ring-1 ring-inset sm:col-span-1 ${overBudget ? 'bg-danger-bright/15 ring-danger-bright/50' : 'bg-white/[0.06] ring-white/10'}`}>
              <p className="text-sm text-white/70">{t('start.hero.budget')}</p>
              <p className="tnum mt-0.5 text-xl font-semibold text-accent">{af(liveBudget, lang)} AF</p>
              <p className="flex items-center gap-1 text-sm font-medium text-white/85">
                {overBudget ? <AlertTriangle aria-hidden="true" className="h-4 w-4 text-danger-bright" /> : <Check aria-hidden="true" className="h-4 w-4 text-accent" />}
                {overBudget ? t('start.hero.over', { v: af(level, lang) }) : t('start.hero.fits')}
              </p>
            </div>
          </div>
          {/* One sentence for screen readers whenever the mix or the water changes. */}
          <p className="sr-only" aria-live="polite">
            {t('start.hero.liveSummary', {
              who: custom ? t('start.hero.yourMix') : t('start.hero.suggested'),
              avg: money(metrics.avg, lang),
              worst: money(metrics.worst, lang),
              fits: overBudget ? t('start.hero.over', { v: af(level, lang) }) : t('start.hero.fits'),
            })}
          </p>
        </>
      ) : (
        <div className="mt-2 grid grid-cols-2 gap-2 text-white sm:grid-cols-[1fr_1fr_1.1fr] sm:gap-3" aria-hidden="true">
          <div ref={statAvg} className="rounded-ctl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/10" style={{ opacity: 0.25 }}>
            <p className="text-sm text-white/70">{t('start.hero.avg')}</p>
            <p className="tnum mt-0.5 text-xl font-semibold text-white">
              <span ref={avgText} />
              <span className="text-sm font-medium text-white/60">{t('start.hero.perAcre')}</span>
            </p>
          </div>
          <div ref={statWorst} className="rounded-ctl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/10" style={{ opacity: 0.25 }}>
            <p className="text-sm text-white/70">{t('start.hero.worst')}</p>
            <p className="tnum mt-0.5 text-xl font-semibold text-white">
              <span ref={worstText} />
              <span className="text-sm font-medium text-white/60">{t('start.hero.perAcre')}</span>
            </p>
          </div>
          <div ref={statFits} className="col-span-2 rounded-ctl bg-white/[0.06] px-3 py-2.5 ring-1 ring-inset ring-white/10 sm:col-span-1" style={{ opacity: 0 }}>
            <p className="text-sm text-white/70">{t('start.hero.budget')}</p>
            <p className="tnum mt-0.5 text-xl font-semibold text-accent">{af(budget, lang)} AF</p>
            <p className="text-sm font-medium text-white/80">{t('start.hero.fits')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
