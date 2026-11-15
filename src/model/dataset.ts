// The one dataset the engine reads: the 20-year scenario table, soil parts, and
// context series. Starts as the seeded sample. When public/data/real_data.json
// loads, buildDataset (realData.ts) swaps in real sections and keeps sample
// data only where a section is missing or invalid.

import type { DatasetId, PlanResponse, RotationId, SoilPartId, SourceFlag, Validation, WaterPreset, WaterPresetId } from '../api/types';
import { ROTATION_IDS, SOIL_PART_IDS } from '../api/types';
import { getSampleContext, getScenarioData, SOIL_PARTS } from './sampleData';

export type SoilParts = Record<SoilPartId, number>;

/** What the optimizer needs: years, and per rotation a yearly profit and applied water series. */
export type Scenario = {
  years: number[];
  /** profit[rotation][yearIndex], USD per acre, before any extra water cost */
  profit: Record<RotationId, number[]>;
  /** water[rotation][yearIndex], applied AF per acre at 75% efficiency */
  water: Record<RotationId, number[]>;
  /** Soil score per rotation (sum of its five parts), 0 to 100. */
  soil: Record<RotationId, number>;
};

export type Dataset = {
  scenario: Scenario;
  soilParts: Record<RotationId, SoilParts>;
  context: PlanResponse['context'];
  waterPresets?: Partial<Record<WaterPresetId, WaterPreset>>;
  validation?: Validation;
  sources: Partial<Record<DatasetId, SourceFlag>>;
  /** True when any section came from the real data file. */
  fromFile: boolean;
};

export function soilTotal(parts: SoilParts): number {
  return SOIL_PART_IDS.reduce((s, p) => s + parts[p], 0);
}

let sample: Dataset | null = null;

export function sampleDataset(): Dataset {
  if (sample) return sample;
  const d = getScenarioData();
  const soilParts = {} as Record<RotationId, SoilParts>;
  const soil = {} as Record<RotationId, number>;
  for (const id of ROTATION_IDS) {
    soilParts[id] = { ...SOIL_PARTS[id] };
    soil[id] = soilTotal(soilParts[id]);
  }
  sample = {
    scenario: { years: d.years, profit: d.profit, water: d.water, soil },
    soilParts,
    context: getSampleContext(),
    sources: { weather: 'sample', grace: 'sample', etCheck: 'sample', cropBudgets: 'sample', prices: 'sample', soil: 'sample', otherRegions: 'sample' },
    fromFile: false,
  };
  return sample;
}

let active: Dataset | null = null;
let version = 0;

export function getDataset(): Dataset {
  return active ?? sampleDataset();
}

/** Bumped on every change so per-dataset caches know to rebuild. */
export function datasetVersion(): number {
  return version;
}

/** Use this dataset from now on (null goes back to the sample). */
export function setDataset(d: Dataset | null): void {
  active = d;
  version++;
}
