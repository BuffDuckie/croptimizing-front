import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/tokens';

type Tone = 'nasa' | 'money' | 'step' | 'core' | 'plan';
type Box = { id: string; x: number; y: number; w: number; tone: Tone };
type Edge = { from: string; to: string; dashed?: boolean };

const H = 62;

const FILL: Record<Tone, string> = {
  nasa: colors['accent-tint'],
  money: colors['primary-tint'],
  step: colors.surface,
  core: colors['primary-tint'],
  plan: colors.primary,
};
const STROKE: Record<Tone, string> = {
  nasa: colors['accent-strong'],
  money: colors.primary,
  step: colors.border,
  core: colors.primary,
  plan: colors.primary,
};

// Wide layout: sources on the left, flowing right to the plan.
const WIDE: { w: number; h: number; boxes: Box[] } = {
  w: 1000,
  h: 372,
  boxes: [
    { id: 'power', x: 10, y: 20, w: 220, tone: 'nasa' },
    { id: 'budgets', x: 10, y: 130, w: 220, tone: 'money' },
    { id: 'grace', x: 10, y: 290, w: 220, tone: 'nasa' },
    { id: 'need', x: 270, y: 20, w: 200, tone: 'step' },
    { id: 'profit', x: 270, y: 130, w: 200, tone: 'step' },
    { id: 'context', x: 270, y: 290, w: 200, tone: 'step' },
    { id: 'openet', x: 510, y: 290, w: 220, tone: 'nasa' },
    { id: 'check', x: 770, y: 290, w: 220, tone: 'step' },
    { id: 'scenarios', x: 510, y: 75, w: 170, tone: 'core' },
    { id: 'optimizer', x: 715, y: 75, w: 130, tone: 'core' },
    { id: 'plan', x: 875, y: 75, w: 115, tone: 'plan' },
  ],
};

// Narrow layout: two columns stacked top to bottom (phones).
const TALL: { w: number; h: number; boxes: Box[] } = {
  w: 360,
  h: 660,
  boxes: [
    { id: 'power', x: 6, y: 8, w: 168, tone: 'nasa' },
    { id: 'budgets', x: 186, y: 8, w: 168, tone: 'money' },
    { id: 'need', x: 6, y: 104, w: 168, tone: 'step' },
    { id: 'profit', x: 186, y: 104, w: 168, tone: 'step' },
    { id: 'scenarios', x: 70, y: 200, w: 220, tone: 'core' },
    { id: 'optimizer', x: 70, y: 296, w: 220, tone: 'core' },
    { id: 'plan', x: 70, y: 392, w: 220, tone: 'plan' },
    { id: 'grace', x: 6, y: 500, w: 168, tone: 'nasa' },
    { id: 'openet', x: 186, y: 500, w: 168, tone: 'nasa' },
    { id: 'context', x: 6, y: 590, w: 168, tone: 'step' },
    { id: 'check', x: 186, y: 590, w: 168, tone: 'step' },
  ],
};

const EDGES_WIDE: Edge[] = [
  { from: 'power', to: 'need' },
  { from: 'budgets', to: 'profit' },
  { from: 'need', to: 'scenarios' },
  { from: 'profit', to: 'scenarios' },
  { from: 'scenarios', to: 'optimizer' },
  { from: 'optimizer', to: 'plan' },
  { from: 'grace', to: 'context' },
  { from: 'openet', to: 'check', dashed: true },
];
const EDGES_TALL: Edge[] = [
  { from: 'power', to: 'need' },
  { from: 'budgets', to: 'profit' },
  { from: 'need', to: 'scenarios' },
  { from: 'profit', to: 'scenarios' },
  { from: 'scenarios', to: 'optimizer' },
  { from: 'optimizer', to: 'plan' },
  { from: 'grace', to: 'context' },
  { from: 'openet', to: 'check', dashed: true },
];

function anchor(a: Box, b: Box): [number, number, number, number] {
  const ac = { x: a.x + a.w / 2, y: a.y + H / 2 };
  const bc = { x: b.x + b.w / 2, y: b.y + H / 2 };
  // Mostly horizontal: leave from a side; otherwise from top or bottom.
  if (Math.abs(bc.x - ac.x) > Math.abs(bc.y - ac.y) * 1.2) {
    const dir = bc.x > ac.x ? 1 : -1;
    return [dir > 0 ? a.x + a.w : a.x, ac.y, dir > 0 ? b.x - 4 : b.x + b.w + 4, bc.y];
  }
  const dir = bc.y > ac.y ? 1 : -1;
  return [ac.x, dir > 0 ? a.y + H : a.y, bc.x, dir > 0 ? b.y - 4 : b.y + H + 4];
}

function Diagram({ layout, edges, font, className }: { layout: typeof WIDE; edges: Edge[]; font: number; className: string }) {
  const { t } = useTranslation();
  const uid = useId().replace(/:/g, '');
  const byId = Object.fromEntries(layout.boxes.map((b) => [b.id, b]));
  return (
    <svg viewBox={`0 0 ${layout.w} ${layout.h}`} className={className} role="img" aria-labelledby={`${uid}-t ${uid}-d`}>
      <title id={`${uid}-t`}>{t('method.flow.title')}</title>
      <desc id={`${uid}-d`}>{t('method.flow.desc')}</desc>
      <defs>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={colors['text-muted']} />
        </marker>
      </defs>
      {edges.map((e) => {
        const [x1, y1, x2, y2] = anchor(byId[e.from], byId[e.to]);
        const midX = (x1 + x2) / 2;
        const horizontal = Math.abs(x2 - x1) > Math.abs(y2 - y1);
        const d = horizontal ? `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}` : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;
        return (
          <path
            key={`${e.from}-${e.to}`}
            d={d}
            fill="none"
            stroke={colors['text-muted']}
            strokeWidth={2}
            strokeDasharray={e.dashed ? '6 5' : undefined}
            markerEnd={`url(#${uid}-arrow)`}
          />
        );
      })}
      {layout.boxes.map((b) => {
        const lines = t(`method.flow.box.${b.id}`).split('|');
        const dark = b.tone === 'plan';
        const lh = font * 1.25;
        const top = b.y + H / 2 - ((lines.length - 1) * lh) / 2 + font * 0.35;
        return (
          <g key={b.id}>
            <rect x={b.x} y={b.y} width={b.w} height={H} rx={10} fill={FILL[b.tone]} stroke={STROKE[b.tone]} strokeWidth={b.tone === 'step' ? 1.5 : 2} />
            <text textAnchor="middle" fontSize={font} fontWeight={b.tone === 'step' ? 500 : 600} fill={dark ? colors.surface : colors.text}>
              {lines.map((l, i) => (
                <tspan key={i} x={b.x + b.w / 2} y={top + i * lh}>
                  {l}
                </tspan>
              ))}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** How NASA and farm-economics data flow into the plan. Wide on desktop, stacked on phones. */
export function DataFlowDiagram() {
  return (
    <figure className="card m-0">
      <Diagram layout={WIDE} edges={EDGES_WIDE} font={18} className="hidden h-auto w-full xl:block" />
      <Diagram layout={TALL} edges={EDGES_TALL} font={15} className="mx-auto block h-auto w-full max-w-[440px] xl:hidden" />
    </figure>
  );
}
