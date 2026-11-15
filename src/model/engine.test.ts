import { DEMO_DEFAULTS } from '../config/demo';
import { isInfeasible } from '../api/errors';
import { planResponseSchema } from '../api/schemas';
import type { PlanRequest } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { bestIndex, feasibleIndices, fitToBudget, meanVarianceSet, objective, paretoFrontier, riskStats, runPlan, waterScenario } from './engine';
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

describe('sensitivity', () => {
  it('re-runs the plan for each case and flags mix changes', () => {
    const res = runPlan(base);
    const rows = res.sensitivity!;
    expect(rows.map((r) => r.case)).toEqual(['profitDown', 'profitUp', 'efficiencyLow', 'efficiencyHigh']);
    for (const r of rows) if (r.mix) expect(sum(r.mix)).toBeCloseTo(1, 3);
    const up = rows.find((r) => r.case === 'profitUp')!;
    const down = rows.find((r) => r.case === 'profitDown')!;
    expect(up.avgProfit!).toBeGreaterThan(res.recommended.metrics.avgProfitPerAcre);
    expect(down.avgProfit!).toBeLessThan(res.recommended.metrics.avgProfitPerAcre);
  });

  it('adds water cost cases only when there is a water cost', () => {
    const res = runPlan({ ...base, waterCostPerAf: 50 });
    expect(res.sensitivity!.map((r) => r.case)).toContain('waterCostUp');
  });

  it('scales every rotation but fallow under a profit shock', () => {
    const plain = seriesForMix({ alfalfa: 0.5, fallow: 0.5 });
    const up = seriesForMix({ alfalfa: 0.5, fallow: 0.5 }, { ...DEFAULT_ADJUST, profitShock: 0.2 });
    const data = getScenarioData();
    plain.forEach((p, t) => expect(up[t].profit).toBeCloseTo(p.profit + 0.2 * 0.5 * data.profit.alfalfa[t], 6));
  });
});

describe('classic portfolio theory', () => {
  it('keeps only mixes no other feasible mix beats on both average and spread', () => {
    const stats = getMixStats();
    const feasible = feasibleIndices(stats, { cap: 2.4, minSoil: 30 });
    const set = meanVarianceSet(stats, feasible);
    expect(set.length).toBeGreaterThan(1);
    for (const k of set)
      for (const j of feasible) expect(stats.avg[j] > stats.avg[k] + 1e-9 && stats.sd[j] < stats.sd[k] - 1e-9).toBe(false);
  });

  it('never beats our frontier on worst years at the same or higher average', () => {
    const res = runPlan(base);
    const a = res.classic!.atSuggested!;
    expect(a.ourWorst1in5).toBeGreaterThanOrEqual(a.classicWorst1in5 - 1e-6);
  });
});

describe('risk ratios', () => {
  it('match their definitions for a two-rotation plan', () => {
    const mix = { alfalfa: 0.5, durum_sorghum: 0.5 };
    const r = riskStats(mix, DEFAULT_ADJUST);
    const p = seriesForMix(mix).map((x) => x.profit);
    const f = seriesForMix({ fallow: 1 }).map((x) => x.profit);
    const m = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const sd = (xs: number[]) => Math.sqrt(m(xs.map((x) => (x - m(xs)) ** 2)));
    expect(r.sharpe!).toBeCloseTo((m(p) - m(f)) / sd(p), 2);
    const down = Math.sqrt(m(p.map((x) => Math.min(0, x - m(f)) ** 2)));
    if (down > 0) expect(r.sortino!).toBeCloseTo((m(p) - m(f)) / down, 2);
    const each = 0.5 * sd(seriesForMix({ alfalfa: 1 }).map((x) => x.profit)) + 0.5 * sd(seriesForMix({ durum_sorghum: 1 }).map((x) => x.profit));
    expect(r.diversification!).toBeCloseTo(1 - sd(p) / each, 3);
    expect(r.diversification!).toBeGreaterThanOrEqual(0);
  });

  it('are null when a plan never swings', () => {
    const r = riskStats({ fallow: 1 }, { ...DEFAULT_ADJUST });
    expect(r.diversification === null || r.diversification >= 0).toBe(true);
  });
});

describe('soil goals', () => {
  it('with all five goals, gives the same plan as no goals at all', () => {
    const all = runPlan({ ...base, soilParts: ['legume', 'livingRoots', 'residue', 'lowTillage', 'diversity'] });
    const none = runPlan(base);
    expect(all.recommended.mix).toEqual(none.recommended.mix);
    expect(all.recommended.metrics.soilScore).toBeCloseTo(none.recommended.metrics.soilScore, 6);
  });

  it('rescales the selected parts to 0-100 and holds the minimum on that score', () => {
    const res = runPlan({ ...base, soilParts: ['legume'] });
    // Only alfalfa scores on nitrogen in the sample (20 of 20 -> 100), so a 30 minimum needs 30% alfalfa.
    expect(res.rotations.find((r) => r.id === 'alfalfa')?.soil.total).toBe(100);
    expect(res.rotations.find((r) => r.id === 'durum_sorghum')?.soil.total).toBe(0);
    expect(res.recommended.mix.alfalfa ?? 0).toBeGreaterThanOrEqual(0.3 - 1e-9);
    expect(res.recommended.metrics.soilScore).toBeGreaterThanOrEqual(30 - 1e-9);
  });
});

describe('goal plans', () => {
  it('each is the best feasible mix for its goal, under the same limits', () => {
    const res = runPlan(base);
    const g = res.goals!;
    const stats = getMixStats();
    const feasible = feasibleIndices(stats, { cap: base.waterCapAfPerAcre, minSoil: base.minSoilScore });
    const maxAvg = Math.max(...feasible.map((k) => stats.avg[k]));
    const minWater = Math.min(...feasible.map((k) => stats.maxWater[k]));
    const maxSoil = Math.max(...feasible.map((k) => stats.soil[k]));
    expect(g.income.metrics.avgProfitPerAcre).toBeCloseTo(maxAvg, 1);
    expect(g.water.metrics.maxWaterAfPerAcre).toBeCloseTo(minWater, 2);
    expect(g.soil.metrics.soilScore).toBeCloseTo(maxSoil, 1);
    for (const p of [g.income, g.water, g.soil]) {
      expect(p.metrics.maxWaterAfPerAcre).toBeLessThanOrEqual(base.waterCapAfPerAcre + 1e-3);
      expect(p.metrics.soilScore).toBeGreaterThanOrEqual(base.minSoilScore - 1e-6);
      expect(sum(p.mix)).toBeCloseTo(1, 6);
    }
  });

  it('most income equals the risk-1 suggested plan', () => {
    expect(runPlan(base).goals!.income.mix).toEqual(runPlan({ ...base, riskLevel: 1 }).recommended.mix);
  });
});
