import type { PlanRequest } from '../api/types';
import { runPlan } from '../model/engine';
import { mixMetrics } from './mixMetrics';

const req: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
  waterCostPerAf: 70,
};

describe('mixMetrics (the landing animation numbers)', () => {
  it('matches the optimizer for the suggested and current plans', () => {
    const res = runPlan(req);
    for (const plan of [res.recommended, res.current]) {
      const m = mixMetrics(plan.mix, res.rotations)!;
      expect(m.avg).toBeCloseTo(plan.metrics.avgProfitPerAcre, 0);
      expect(m.worst).toBeCloseTo(plan.metrics.worst1in5PerAcre, 0);
      expect(m.maxWater).toBeCloseTo(plan.metrics.maxWaterAfPerAcre, 1);
    }
  });

  it('returns null when the cards have no yearly series', () => {
    const res = runPlan(req);
    const bare = res.rotations.map((r) => ({ ...r, yearlyProfit: undefined }));
    expect(mixMetrics({ alfalfa: 1 }, bare)).toBeNull();
  });
});
