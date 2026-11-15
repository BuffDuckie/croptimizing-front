import type { PlanResponse } from '../api/types';
import { runPlan } from '../model/engine';
import { isSample } from './sources';

const base = runPlan({ region: 'pinal', acres: 640, waterCapAfPerAcre: 2.4, riskLevel: 0.4, minSoilScore: 30, currentMix: { alfalfa: 1 }, lang: 'en' });

describe('per-dataset source flags', () => {
  it('marks a chart sample only when one of its datasets is sample', () => {
    const data: PlanResponse = { ...base, dataSource: 'live', sources: { grace: 'real', weather: 'sample' } };
    expect(isSample(data, ['grace'])).toBe(false);
    expect(isSample(data, ['weather'])).toBe(true);
    expect(isSample(data, ['grace', 'weather'])).toBe(true);
  });

  it('treats a dataset with no flag as sample', () => {
    expect(isSample({ ...base, sources: { grace: 'real' } }, ['etCheck'])).toBe(true);
  });

  it('falls back to the response-wide source when flags are absent', () => {
    expect(isSample({ ...base, sources: undefined, dataSource: 'live' }, ['grace'])).toBe(false);
    expect(isSample({ ...base, sources: undefined, dataSource: 'sample' }, ['grace'])).toBe(true);
  });
});
