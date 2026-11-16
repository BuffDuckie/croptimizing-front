import type { DatasetId, PlanResponse } from '../api/types';

/** Datasets behind every number the optimizer produces (profit and water per year, soil scores). */
export const PLAN_DATASETS: DatasetId[] = ['weather', 'cropBudgets', 'prices', 'soil'];
export const ALL_DATASETS: DatasetId[] = ['weather', 'grace', 'cropBudgets', 'prices', 'soil'];

/**
 * True when any of these datasets is sample data. Responses without per-dataset
 * flags fall back to the response-wide dataSource; a dataset missing from the
 * flags counts as sample, so a badge is never dropped by accident.
 */
export function isSample(data: PlanResponse | null, ids: DatasetId[]): boolean {
  if (!data) return true;
  if (!data.sources) return data.dataSource === 'sample';
  return ids.some((id) => data.sources?.[id] !== 'real');
}
