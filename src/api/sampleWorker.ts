/// <reference lib="webworker" />
// Runs the sample engine off the main thread so sliders stay smooth.
import { isInfeasible } from './errors';
import { planRequestSchema, planResponseSchema } from './schemas';
import type { PlanRequest } from './types';
import { runPlan } from '../model/engine';

self.onmessage = (e: MessageEvent<{ id: number; req: PlanRequest }>) => {
  const { id, req } = e.data;
  try {
    const valid = planRequestSchema.parse(req) as PlanRequest;
    // Validate our own output too: every response passes the same zod schema.
    const res = planResponseSchema.parse(runPlan(valid));
    self.postMessage({ id, ok: true, res });
  } catch (err) {
    self.postMessage({ id, ok: false, infeasible: isInfeasible(err) ? err.detail : null, message: String(err) });
  }
};
