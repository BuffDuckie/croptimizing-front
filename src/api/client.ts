import { InfeasibleError, isInfeasible, type InfeasibleDetail } from './errors';
import { nearest, STATIC_GRID, staticPath } from './grid';
import { realDataset } from './realData';
import type { PlanRequest, PlanResponse } from './types';
import type { Dataset } from '../model/dataset';

export type DataMode = 'sample' | 'static' | 'live';

function mode(): DataMode {
  const m = import.meta.env.VITE_DATA_MODE;
  return m === 'static' || m === 'live' ? m : 'sample';
}

/** Fired on window when a static or live request fails and the client falls back to sample data. */
export const FALLBACK_EVENT = 'croptimizing:fallback';

type WorkerReply = { id: number; ok: true; res: PlanResponse } | { id: number; ok: false; infeasible: InfeasibleDetail | null; message: string };

let worker: Worker | null = null;
let nextId = 0;
const pending = new Map<number, { resolve: (r: PlanResponse) => void; reject: (e: unknown) => void }>();

function getWorker(dataset: Dataset | null): Worker | null {
  if (worker || typeof Worker === 'undefined') return worker;
  try {
    worker = new Worker(new URL('./sampleWorker.ts', import.meta.url), { type: 'module' });
    // Messages arrive in order, so the dataset is in place before the first plan request.
    if (dataset) worker.postMessage({ type: 'data', dataset });
    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.res);
      else p.reject(e.data.infeasible ? new InfeasibleError(e.data.infeasible) : new Error(e.data.message));
    };
  } catch {
    worker = null;
  }
  return worker;
}

/** Sample model: in a Web Worker when available (browsers), inline otherwise (tests, scripts). */
async function runSample(req: PlanRequest): Promise<PlanResponse> {
  const dataset = await realDataset();
  const w = getWorker(dataset);
  if (w) {
    const id = ++nextId;
    return new Promise<PlanResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      w.postMessage({ type: 'plan', id, req });
    });
  }
  const [{ runPlan }, { planRequestSchema, planResponseSchema }] = await Promise.all([import('../model/engine'), import('./schemas')]);
  return planResponseSchema.parse(runPlan(planRequestSchema.parse(req) as PlanRequest)) as PlanResponse;
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (res.status === 422) {
    const { infeasibleSchema } = await import('./schemas');
    const body = infeasibleSchema.safeParse(await res.json());
    if (body.success) throw new InfeasibleError(body.data);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchStatic(req: PlanRequest): Promise<unknown> {
  const cap = nearest(STATIC_GRID.water, req.waterCapAfPerAcre);
  const risk = nearest(STATIC_GRID.risk, req.riskLevel * 100);
  const soil = nearest(STATIC_GRID.soil, req.minSoilScore);
  const path = staticPath(req.region, cap, risk, soil);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (req.lang === 'es') {
    try {
      return await fetchJson(base + path.replace(`/results/${req.region}/`, `/results/${req.region}/es/`));
    } catch {
      // No Spanish file for this point; the English one has the same numbers.
    }
  }
  try {
    return await fetchJson(base + path);
  } catch (e) {
    // The export script writes an .infeasible.json note where no plan fits.
    const note = await fetch(base + path.replace(/\.json$/, '.infeasible.json')).catch(() => null);
    if (note?.ok) {
      const { infeasibleSchema } = await import('./schemas');
      const body = infeasibleSchema.safeParse(await note.json());
      if (body.success) throw new InfeasibleError(body.data);
    }
    throw e;
  }
}

async function fetchLive(req: PlanRequest): Promise<unknown> {
  const root = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  return fetchJson(`${root}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

/**
 * The one door to plan data. Validates every response with zod. If a static or
 * live request fails, it falls back to the in-browser sample model and fires
 * FALLBACK_EVENT so the UI can show a friendly banner.
 */
export async function getPlan(req: PlanRequest): Promise<PlanResponse> {
  const m = mode();
  // Sample mode validates request and response inside the worker, so zod stays off the main thread.
  if (m === 'sample') return runSample(req);
  // Static files cover the default soil goals only; other goals run in the browser engine.
  if (m === 'static') {
    const { FALLBACK_WATER_COST_PER_AF } = await import('../config/waterCost');
    const fileCost = (await realDataset())?.waterCost?.perAf ?? FALLBACK_WATER_COST_PER_AF;
    if (req.soilParts || (req.waterCostPerAf !== undefined && req.waterCostPerAf !== fileCost)) return runSample(req);
  }
  const { planRequestSchema, planResponseSchema } = await import('./schemas');
  const valid = planRequestSchema.parse(req) as PlanRequest;
  try {
    const raw = m === 'static' ? await fetchStatic(valid) : await fetchLive(valid);
    return planResponseSchema.parse(raw) as PlanResponse;
  } catch (e) {
    if (isInfeasible(e)) throw e;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FALLBACK_EVENT, { detail: { mode: m, message: String(e) } }));
    }
    return runSample(valid);
  }
}
