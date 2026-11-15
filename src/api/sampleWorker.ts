/// <reference lib="webworker" />
// Runs the engine off the main thread so sliders stay smooth. The client sends
// the real dataset (when there is one) once, before the first plan request.
import { isInfeasible } from './errors';
import { planRequestSchema, planResponseSchema } from './schemas';
import type { PlanRequest } from './types';
import { setDataset, type Dataset } from '../model/dataset';
import { runPlan } from '../model/engine';

type Msg = { type: 'data'; dataset: Dataset } | { type?: 'plan'; id: number; req: PlanRequest };

self.onmessage = (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (msg.type === 'data') {
    setDataset(msg.dataset);
    return;
  }
  const { id, req } = msg;
  try {
    const valid = planRequestSchema.parse(req) as PlanRequest;
    // Validate our own output too: every response passes the same zod schema.
    const res = planResponseSchema.parse(runPlan(valid));
    self.postMessage({ id, ok: true, res });
  } catch (err) {
    self.postMessage({ id, ok: false, infeasible: isInfeasible(err) ? err.detail : null, message: String(err) });
  }
};
