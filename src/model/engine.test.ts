import { DEMO_DEFAULTS } from '../config/demo';
import { isInfeasible } from '../api/errors';
import { planResponseSchema } from '../api/schemas';
import type { PlanRequest } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { bestIndex, feasibleIndices, fitToBudget, objective, paretoFrontier, runPlan, waterScenario } from './engine';
import { DEFAULT_ADJUST, getMixStats, mixCount, seriesForMix } from './metrics';
import { getScenarioData } from './sampleData';

const base: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
};

const sum = (m: Record<string, number | undefined>) => Object.values(m).reduce<number>((s, v) => s + (v ?? 0), 0);

describe('sample engine', () => {
  it('enumerates 10,626 mixes', () => {
    expect(mixCount()).toBe(10626);
  });

  it('returns a response that passes the API schema', () => {
    const res = runPlan(base);
    expect(() => planResponseSchema.parse(res)).not.toThrow();
    expect(res.dataSource).toBe('sample');
  });

  it('suggests shares that sum to 1', () => {
    for (const cap of [0.8, 2.4, 4, 6]) {
      const res = runPlan({ ...base, waterCapAfPerAcre: cap, minSoilScore: 20 });
      expect(sum(res.recommended.mix)).toBeCloseTo(1, 6);
      for (const p of res.frontier) expect(sum(p.mix)).toBeCloseTo(1, 6);
    }
  });

  it('keeps the water cap in every single year', () => {
    for (const cap of [1, 2.4, 3.3, 5]) {
      const res = runPlan({ ...base, waterCapAfPerAcre: cap, minSoilScore: 20 });
      const yearly = seriesForMix(res.recommended.mix);
      for (const y of yearly) expect(y.water).toBeLessThanOrEqual(cap + 1e-9);
      expect(res.recommended.metrics.maxWaterAfPerAcre).toBeLessThanOrEqual(cap + 1e-3);
    }
  });

  it('meets the soil minimum', () => {
    const res = runPlan(base);
    expect(res.recommended.metrics.soilScore).toBeGreaterThanOrEqual(30 - 1e-9);
  });

  it('at risk 0, maximizes the worst 1-in-5 years among feasible mixes', () => {
    const stats = getMixStats();
    const c = { cap: 2.4, minSoil: 30 };
    const feasible = feasibleIndices(stats, c);
    const k = bestIndex(stats, feasible, 0);
    const bestWorst = Math.max(...feasible.map((i) => stats.worst[i]));
    expect(stats.worst[k]).toBeCloseTo(bestWorst, 9);
    const res = runPlan({ ...base, riskLevel: 0 });
    expect(res.recommended.metrics.worst1in5PerAcre).toBeCloseTo(bestWorst, 1);
  });

  it('at risk 1, maximizes average profit among feasible mixes', () => {
    const stats = getMixStats();
    const feasible = feasibleIndices(stats, { cap: 2.4, minSoil: 30 });
    const k = bestIndex(stats, feasible, 1);
    expect(objective(stats, k, 1)).toBeCloseTo(Math.max(...feasible.map((i) => stats.avg[i])), 9);
  });

  it('builds a monotonic frontier', () => {
    const res = runPlan(base);
    expect(res.frontier.length).toBeGreaterThan(1);
    for (let i = 1; i < res.frontier.length; i++) {
      expect(res.frontier[i].worst1in5).toBeGreaterThan(res.frontier[i - 1].worst1in5);
      expect(res.frontier[i].avgProfit).toBeLessThan(res.frontier[i - 1].avgProfit);
    }
  });

  it('puts the suggested plan on the frontier', () => {
    const stats = getMixStats();
    const feasible = feasibleIndices(stats, { cap: 2.4, minSoil: 30 });
    const front = paretoFrontier(stats, feasible);
    const k = bestIndex(stats, feasible, 0.4);
    expect(front).toContain(k);
  });

  it('shrinks the frontier when water shrinks', () => {
    const wide = runPlan({ ...base, waterCapAfPerAcre: 4 });
    const narrow = runPlan({ ...base, waterCapAfPerAcre: 2.4 });
    const top = (f: typeof wide.frontier) => Math.max(...f.map((p) => p.avgProfit));
    expect(top(narrow.frontier)).toBeLessThan(top(wide.frontier));
  });

  it('values extra water when water is the binding limit, and not otherwise', () => {
    const tight = runPlan(base);
    expect(tight.recommended.metrics.waterValuePerAf).toBeGreaterThan(0);
    const loose = runPlan({ ...base, waterCapAfPerAcre: 6, minSoilScore: 0 });
    expect(loose.recommended.metrics.waterValuePerAf).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    expect(JSON.stringify(runPlan(base))).toBe(JSON.stringify(runPlan(base)));
    const d = getScenarioData();
    expect(d.profit.alfalfa.length).toBe(20);
  });

  it('matches the placeholder means', () => {
    const d = getScenarioData();
    const m = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(m(d.profit.alfalfa)).toBeCloseTo(450, 6);
    expect(m(d.water.durum_sorghum)).toBeCloseTo(3.6, 6);
    expect(d.water.fallow.every((w) => w === 0)).toBe(true);
  });

  it('explains which limit to relax when nothing fits', () => {
    try {
      runPlan({ ...base, minSoilScore: 80, waterCapAfPerAcre: 1 });
      throw new Error('should not reach');
    } catch (e) {
      expect(isInfeasible(e)).toBe(true);
      if (isInfeasible(e)) {
        expect(e.detail.relax).toBe('soil');
        expect(e.detail.maxSoilAtThisWater).toBeLessThan(80);
        expect(e.detail.minWaterForThisSoil).toBeGreaterThan(1);
      }
    }
  });

  it('respects max share limits', () => {
    const res = runPlan({ ...base, maxShare: { alfalfa: 0.2 }, minSoilScore: 20 });
    expect(res.recommended.mix.alfalfa ?? 0).toBeLessThanOrEqual(0.2 + 1e-9);
  });

  it('returns one rotation card per rotation, in Spanish when asked', () => {
    const res = runPlan({ ...base, lang: 'es' });
    expect(res.rotations.map((r) => r.id)).toEqual(ROTATION_IDS);
    expect(res.rotations[1].name).toBe('Algodón y luego cebada');
    for (const r of res.rotations) {
      const parts = r.soil.legume + r.soil.livingRoots + r.soil.residue + r.soil.lowTillage + r.soil.diversity;
      expect(parts).toBe(r.soil.total);
    }
  });

  it('compares against the current plan cut back to fit the budget', () => {
    const res = runPlan(base);
    for (const s of res.stressTests) {
      expect(s.currentWater).toBeLessThanOrEqual(2.4 + 1e-3);
      expect(s.recommendedWater).toBeLessThanOrEqual(2.4 + 1e-3);
    }
    expect(res.current.metrics.maxWaterAfPerAcre).toBeLessThanOrEqual(2.4 + 1e-3);
    expect(res.currentAsFarmed!.metrics.maxWaterAfPerAcre).toBeGreaterThan(2.4);
    expect(sum(res.current.mix)).toBeCloseTo(1, 3);
  });
});

describe('fitToBudget', () => {
  const scenario = waterScenario(DEFAULT_ADJUST);

  it('never exceeds the cap in any year', () => {
    for (const cap of [0.5, 1.2, 2.4, 3.7]) {
      for (const mix of [{ alfalfa: 1 }, { alfalfa: 0.7, cotton_barley: 0.3 }, { cotton_barley: 0.5, durum_sorghum: 0.3, fallow: 0.2 }]) {
        const fit = fitToBudget(mix, scenario, cap);
        expect(sum(fit.mix)).toBeCloseTo(1, 9);
        for (const y of seriesForMix(fit.mix)) expect(y.water).toBeLessThanOrEqual(cap + 1e-9);
      }
    }
  });

  it('leaves a plan that already fits unchanged', () => {
    const mix = { durum_sorghum: 0.3, barley_fallow: 0.3, fallow: 0.4 };
    const fit = fitToBudget(mix, scenario, 4);
    expect(fit.trimmed).toBe(false);
    expect(fit.mix).toEqual(mix);
  });

  it('only adds fallow acres', () => {
    const fit = fitToBudget({ alfalfa: 0.7, cotton_barley: 0.3 }, scenario, 2.4);
    expect(fit.trimmed).toBe(true);
    expect(fit.mix.fallow!).toBeGreaterThan(0);
    expect(fit.mix.alfalfa! / fit.mix.cotton_barley!).toBeCloseTo(0.7 / 0.3, 9);
  });
});

describe('demo defaults', () => {
  it('give a feasible plan with at least 2 rotations', () => {
    const res = runPlan({
      region: DEMO_DEFAULTS.region,
      acres: DEMO_DEFAULTS.acres,
      waterCapAfPerAcre: DEMO_DEFAULTS.water,
      riskLevel: DEMO_DEFAULTS.risk / 100,
      minSoilScore: DEMO_DEFAULTS.soil,
      currentMix: DEMO_DEFAULTS.currentMix,
      lang: 'en',
    });
    const rotations = Object.entries(res.recommended.mix).filter(([, v]) => (v ?? 0) > 0);
    expect(rotations.length).toBeGreaterThanOrEqual(2);
  });
});
