import { getPlan, FALLBACK_EVENT } from './client';
import { isInfeasible } from './errors';
import type { PlanRequest } from './types';

const req: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
};

describe('getPlan', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('runs the sample model by default', async () => {
    const res = await getPlan(req);
    expect(res.dataSource).toBe('sample');
    expect(res.recommended.metrics.maxWaterAfPerAcre).toBeLessThanOrEqual(2.4 + 1e-3);
  });

  it('rejects an invalid request', async () => {
    await expect(getPlan({ ...req, waterCapAfPerAcre: 9 })).rejects.toThrow();
  });

  it('falls back to sample data and announces it when a static file is malformed', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'static');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ schemaVersion: '0.9' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const heard = vi.fn();
    window.addEventListener(FALLBACK_EVENT, heard);
    const res = await getPlan(req);
    window.removeEventListener(FALLBACK_EVENT, heard);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/results/pinal/w2.4_r40_s30.json');
    expect(res.dataSource).toBe('sample');
    expect(heard).toHaveBeenCalledTimes(1);
  });

  it('accepts a valid live response and keeps its data source', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'live');
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.test');
    const sample = await getPlan(req);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ...sample, dataSource: 'live' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await getPlan(req);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/api/plan');
    expect(res.dataSource).toBe('live');
  });

  it('passes through an infeasible answer from the backend', async () => {
    vi.stubEnv('VITE_DATA_MODE', 'live');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'infeasible', relax: 'soil', maxSoilAtThisWater: 42 }), { status: 422 })));
    const err = await getPlan(req).catch((e: unknown) => e);
    expect(isInfeasible(err)).toBe(true);
  });
});
