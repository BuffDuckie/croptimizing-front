import { RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Mix, RotationId } from '../../api/types';
import { ROTATION_IDS } from '../../api/types';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { af, money } from '../../lib/format';
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
 * React renders the structure once. A requestAnimationFrame loop then writes
 * attributes straight to the SVG through refs, so each frame costs a few
 * attribute writes instead of a full re-render.
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
const yFor = (v: number) => G.y + G.h - (Math.max(0, v) / SCALE_MAX) * G.h;

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

const ease = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3));
const easeInOut = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const span = (now: number, a: number, b: number) => (now - a) / (b - a);

type ParcelRefs = { g: SVGGElement | null; soil: SVGRectElement | null; body: SVGRectElement | null; circle: SVGCircleElement | null; overlay: SVGElement | null; flag: SVGRectElement | null };

export function FieldsReplan({
  currentMix,
  suggestedMix,
  need,
  budget,
  avg,
  worst,
}: {
  currentMix: Mix;
  suggestedMix: Mix | null;
  need: number;
  budget: number;
  avg: number | null;
  worst: number | null;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const reduced = useReducedMotion();
  const parcels = useMemo(buildParcels, []);
  const before = useMemo(() => assign(parcels, currentMix), [parcels, currentMix]);
  const after = useMemo(() => (suggestedMix ? assign(parcels, suggestedMix) : null), [parcels, suggestedMix]);
  const ready = after !== null && avg !== null && worst !== null;
  const [done, setDone] = useState(reduced);

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

  // Redraw the current frame when inputs change (language, data arriving, settings).
  useLayoutEffect(() => {
    draw(timeRef.current);
  });

  const legend = (mix: Mix) =>
    ROTATION_IDS.filter((id) => (mix[id] ?? 0) > 0).map((id) => (
      <li key={id} className="flex items-center gap-1.5">
        <span className={`h-3 w-3 rounded-[3px] ${id === 'fallow' ? 'hatch' : ''}`} style={{ backgroundColor: rotationColors[id] }} />
        {t(`rotations.${id}`)}
      </li>
    ));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={t('start.hero.label', {
          need: af(need, lang),
          budget: af(budget, lang),
          avg: avg !== null ? money(avg, lang) : '',
          worst: worst !== null ? money(worst, lang) : '',
        })}
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
        </defs>

        {/* Ground */}
        <rect x={MAP.x - 10} y={MAP.y - 10} width={MAP.w + 20} height={MAP.h + 20} rx={18} fill={colors['primary-ink']} />

        {parcels.map((p, i) => {
          const r = Math.min(p.w, p.h) / 2 - 3;
          return (
            <g key={i} ref={(el) => void (pRefs.current[i].g = el)} opacity={0}>
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

        {/* Water gauge */}
        <g>
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
      </svg>

      {/* Note about the cut (HTML so it wraps) */}
      <div
        ref={note}
        aria-hidden="true"
        className="pointer-events-none absolute left-[6%] right-[22%] top-[66%] flex items-start gap-2.5 rounded-ctl bg-primary-ink/95 px-3.5 py-2.5 text-sm font-medium leading-snug text-white shadow-lift ring-1 ring-inset ring-white/15"
        style={{ opacity: 0 }}
      >
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-danger-bright" />
        {t('start.hero.cut')}
      </div>

      {/* Legend: color is never the only cue */}
      <div className="mt-2 flex min-h-[44px] items-center justify-between gap-3">
        <div className="text-sm text-white/80" aria-hidden="true">
          <ul ref={legendBefore} className="flex flex-wrap gap-x-4 gap-y-1.5">
            {legend(currentMix)}
          </ul>
          <ul ref={legendAfter} className="hidden flex-wrap gap-x-4 gap-y-1.5">
            {suggestedMix && legend(suggestedMix)}
          </ul>
        </div>
        {!reduced && (
          <button
            type="button"
            onClick={play}
            className="-mr-2 inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-ctl px-2 text-sm font-medium text-white/70 transition-[opacity,background-color,color] duration-base hover:bg-white/10 hover:text-white"
            style={{ opacity: done ? 1 : 0, pointerEvents: done ? 'auto' : 'none' }}
            tabIndex={done ? 0 : -1}
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            {t('start.hero.replay')}
          </button>
        )}
      </div>

      {/* Results row: HTML for crisp type */}
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
    </div>
  );
}
