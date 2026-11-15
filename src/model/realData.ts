// Turns a parsed real_data.json into the engine's dataset, one section at a time.
// A section that is missing or invalid falls back to sample data on its own, and
// its datasets keep their "Sample data" badge.

import {
  CONTEXT_KEYS,
  contextSchemas,
  issuesOf,
  rotationsSchema,
  soilSchema,
  sourcesSchema,
  validationSchema,
  waterPresetsSchema,
  yearsSchema,
  type RealIssue,
} from '../api/realDataSchema';
import type { DatasetId, PlanResponse, RotationId, SourceFlag } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { sampleDataset, soilTotal, type Dataset, type Scenario, type SoilParts } from './dataset';

export type Logger = (message: string) => void;

const defaultLog: Logger = (m) => console.warn(m);

function fellBack(log: Logger, path: string, issues: RealIssue[] | string): void {
  const reason = typeof issues === 'string' ? issues : issues.slice(0, 3).map((i) => `${i.path}: ${i.reason}`).join('; ') + (issues.length > 3 ? ` (+${issues.length - 3} more)` : '');
  log(`[real-data] fell back to sample for ${path}: ${reason}`);
}

function obj(x: unknown): Record<string, unknown> | null {
  return x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : null;
}

/**
 * Build the dataset from the file's contents. Never throws: anything unusable is
 * logged and replaced with the sample section. Returns null when nothing in the
 * file is usable (not an object, or the wrong schema version).
 */
export function buildDataset(raw: unknown, log: Logger = defaultLog): Dataset | null {
  const file = obj(raw);
  if (!file) {
    log('[real-data] fell back to sample for (root): the file is not a JSON object');
    return null;
  }
  if (file.schemaVersion !== 'real-1.0') {
    log(`[real-data] fell back to sample for schemaVersion: expected "real-1.0", got ${JSON.stringify(file.schemaVersion)}`);
    return null;
  }
  const sample = sampleDataset();
  let any = false;

  // Years and rotations make one section: profit and water only mean something with their years.
  let scenarioReal = false;
  let rotationFlags: SourceFlag[] = [];
  let years = sample.scenario.years;
  let profit = sample.scenario.profit;
  let water = sample.scenario.water;
  const y = yearsSchema.safeParse(file.years);
  const r = rotationsSchema.safeParse(file.rotations);
  if (!y.success) fellBack(log, 'years', issuesOf(y.error, ['years']));
  else if (!r.success) fellBack(log, 'rotations', issuesOf(r.error, ['rotations']));
  else {
    years = y.data;
    profit = {} as Record<RotationId, number[]>;
    water = {} as Record<RotationId, number[]>;
    for (const id of ROTATION_IDS) {
      profit[id] = r.data[id].profit;
      water[id] = r.data[id].waterAf;
    }
    rotationFlags = ROTATION_IDS.map((id) => r.data[id].source);
    scenarioReal = true;
    any = true;
  }

  let soilParts = sample.soilParts;
  let soilReal = false;
  const s = soilSchema.safeParse(file.soil);
  if (!s.success) fellBack(log, 'soil', issuesOf(s.error, ['soil']));
  else {
    soilParts = s.data as Record<RotationId, SoilParts>;
    soilReal = true;
    any = true;
  }
  const soil = {} as Record<RotationId, number>;
  for (const id of ROTATION_IDS) soil[id] = soilTotal(soilParts[id]);

  // Context: each series stands alone.
  const ctxIn = obj(file.context) ?? {};
  const context: PlanResponse['context'] = { ...sample.context };
  const ctxReal = new Set<string>();
  for (const key of CONTEXT_KEYS) {
    if (ctxIn[key] === undefined) continue;
    const p = contextSchemas[key].safeParse(ctxIn[key]);
    if (!p.success) {
      fellBack(log, `context.${key}`, issuesOf(p.error, ['context', key]));
      continue;
    }
    (context as Record<string, unknown>)[key] = p.data;
    ctxReal.add(key);
    any = true;
  }

  let waterPresets: Dataset['waterPresets'];
  if (file.waterPresets !== undefined) {
    const p = waterPresetsSchema.safeParse(file.waterPresets);
    if (p.success) {
      waterPresets = p.data;
      any = true;
    } else fellBack(log, 'waterPresets', issuesOf(p.error, ['waterPresets']));
  }

  let validation: Dataset['validation'];
  if (file.validation !== undefined) {
    const p = validationSchema.safeParse(file.validation);
    if (p.success) {
      validation = p.data;
      any = true;
    } else fellBack(log, 'validation', issuesOf(p.error, ['validation']));
  }

  let claimed: Partial<Record<DatasetId, SourceFlag>> = {};
  if (file.sources !== undefined) {
    const p = sourcesSchema.safeParse(file.sources);
    if (p.success) claimed = p.data;
    else fellBack(log, 'sources', issuesOf(p.error, ['sources']));
  }

  if (!any) return null;

  // A flag is "real" only when the file says so AND every section behind it came from the file.
  const real = (id: DatasetId, backedByFile: boolean): SourceFlag => (claimed[id] === 'real' && backedByFile ? 'real' : 'sample');
  const allRotationsReal = scenarioReal && rotationFlags.every((f) => f === 'real');
  const sources: Dataset['sources'] = {
    weather: real('weather', scenarioReal && ctxReal.has('heatDaysPerYear') && ctxReal.has('et0MonthlyMm')),
    cropBudgets: real('cropBudgets', allRotationsReal),
    prices: real('prices', allRotationsReal),
    soil: real('soil', soilReal),
    grace: real('grace', ctxReal.has('graceTwsCm')),
    etCheck: real('etCheck', ctxReal.has('etCheck')),
    otherRegions: real('otherRegions', ctxReal.has('otherRegions')),
  };

  const scenario: Scenario = { years, profit, water, soil };
  return { scenario, soilParts, context, waterPresets, validation, sources, fromFile: true };
}
