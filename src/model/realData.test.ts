import { readFileSync } from 'node:fs';
import { checkRealData } from '../api/realDataSchema';
import type { PlanRequest } from '../api/types';
import { getDataset, sampleDataset, setDataset } from './dataset';
import { runPlan } from './engine';
import { buildDataset } from './realData';

const example = () => JSON.parse(readFileSync('public/data/real_data.example.json', 'utf8'));

/** The example with every flag set to real, as a backend would send it. */
function realFile() {
  const f = example();
  for (const r of Object.values(f.rotations) as { source: string }[]) r.source = 'real';
  for (const k of Object.keys(f.sources)) f.sources[k] = 'real';
  return f;
}

const req: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
};

afterEach(() => setDataset(null));

describe('real data checker', () => {
  it('passes the example file', () => {
    expect(checkRealData(example())).toEqual([]);
  });

  it('names the field and the reason for each problem', () => {
    const f = example();
    f.rotations.alfalfa.profit = f.rotations.alfalfa.profit.slice(0, 19);
    delete f.rotations.durum_sorghum;
    f.rotations.cotton_barley.profit[3] += 5;
    f.rotations.barley_fallow.waterAf[0] = -1;
    f.soil.alfalfa.legume = 25;
    f.sources.grace = 'maybe';
    const issues = checkRealData(f);
    const has = (path: string, reason: RegExp) => expect(issues.some((i) => i.path === path && reason.test(i.reason))).toBe(true);
    has('rotations.alfalfa.profit', /array length not 20/);
    has('rotations.durum_sorghum', /missing/);
    has('rotations.cotton_barley.profit.3', /revenue minus nonWaterCost/);
    has('rotations.barley_fallow.waterAf.0', /negative water/);
    has('soil.alfalfa.legume', /outside 0-20/);
    has('sources.grace', /unknown source flag/);
  });
});

describe('real data loader', () => {
  it('uses a full valid file everywhere and labels it', () => {
    const f = realFile();
    f.rotations.durum_sorghum.profit = f.rotations.durum_sorghum.profit.map((p: number) => p + 1000);
    f.rotations.durum_sorghum.revenue = f.rotations.durum_sorghum.revenue.map((r: number) => r + 1000);
    f.context.otherRegions[0].label = 'Region from the file';
    const log = vi.fn();
    const ds = buildDataset(f, log)!;
    expect(log).not.toHaveBeenCalled();
    setDataset(ds);
    const res = runPlan(req);
    expect(res.dataSource).toBe('static');
    expect(Object.values(res.sources ?? {}).every((s) => s === 'real')).toBe(true);
    // The much more profitable durum from the file drives the plan.
    expect(res.recommended.mix.durum_sorghum ?? 0).toBeGreaterThan(0.3);
    expect(res.context.otherRegions?.[0].label).toBe('Region from the file');
    expect(res.waterPresets?.zero2023?.afPerAcre).toBe(2);
    expect(res.validation?.checks?.length).toBe(3);
    expect(res.assumptions[0]).not.toMatch(/SAMPLE DATA/);
  });

  it('takes the soil score as the sum of the five parts from the file', () => {
    const f = realFile();
    f.soil.fallow = { legume: 0, livingRoots: 0, residue: 0, lowTillage: 20, diversity: 0 };
    setDataset(buildDataset(f, () => {}));
    expect(getDataset().scenario.soil.fallow).toBe(20);
    expect(runPlan(req).rotations.find((r) => r.id === 'fallow')?.soil.total).toBe(20);
  });

  it('falls back to sample for one invalid section and keeps the rest', () => {
    const f = realFile();
    f.context.graceTwsCm[5].date = 'May 2005';
    f.context.heatDaysPerYear = f.context.heatDaysPerYear.map((h: { year: number }) => ({ ...h, days: 99 }));
    const log = vi.fn();
    const ds = buildDataset(f, log)!;
    expect(log).toHaveBeenCalledTimes(1);
    expect(log.mock.calls[0][0]).toMatch(/^\[real-data\] fell back to sample for context\.graceTwsCm: /);
    expect(ds.context.graceTwsCm).toEqual(sampleDataset().context.graceTwsCm);
    expect(ds.context.heatDaysPerYear[0].days).toBe(99);
    expect(ds.sources.grace).toBe('sample');
    expect(ds.sources.weather).toBe('real');
    expect(ds.sources.cropBudgets).toBe('real');
  });

  it('keeps the whole scenario table on sample when the rotations fail, and says so in the flags', () => {
    const f = realFile();
    f.rotations.alfalfa.waterAf[2] = -3;
    const log = vi.fn();
    const ds = buildDataset(f, log)!;
    expect(log.mock.calls[0][0]).toMatch(/fell back to sample for rotations: rotations\.alfalfa\.waterAf\.2: negative water/);
    expect(ds.scenario.profit).toBe(sampleDataset().scenario.profit);
    expect(ds.sources.cropBudgets).toBe('sample');
    expect(ds.sources.weather).toBe('sample');
    expect(ds.sources.soil).toBe('real');
  });

  it('never marks a dataset real that the file did not mark real', () => {
    const ds = buildDataset(example(), () => {})!;
    expect(Object.values(ds.sources).every((s) => s === 'sample')).toBe(true);
    setDataset(ds);
    expect(runPlan(req).assumptions[0]).toMatch(/SAMPLE DATA/);
  });

  it('ignores a file with the wrong schema version', () => {
    const log = vi.fn();
    expect(buildDataset({ ...realFile(), schemaVersion: '0.1' }, log)).toBeNull();
    expect(log).toHaveBeenCalled();
  });
});
