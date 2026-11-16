import { readFileSync } from 'node:fs';
import type { PlanRequest } from './types';

const req: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
  waterCostPerAf: 200,
};

function realFile() {
  const f = JSON.parse(readFileSync('public/data/real_data.example.json', 'utf8'));
  for (const r of Object.values(f.rotations) as { source: string }[]) r.source = 'real';
  for (const k of Object.keys(f.sources)) f.sources[k] = 'real';
  return f;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

/** Fresh copies of the client and model, so module state (worker, dataset) starts clean. */
async function fresh() {
  vi.resetModules();
  const client = await import('./client');
  const dataset = await import('../model/dataset');
  return { client, dataset };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('loading real_data.json in the client', () => {
  it('behaves exactly as before when the file is missing', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
    vi.stubGlobal('fetch', fetchMock);
    const { client } = await fresh();
    const res = await client.getPlan(req);
    expect(fetchMock.mock.calls[0][0]).toBe('/data/real_data.json');
    expect(fetchMock.mock.calls[0][1]).toEqual({ cache: 'no-store' });
    expect(res.dataSource).toBe('sample');
  });

  it('treats an HTML page (a host that rewrites every path) as no file', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<!doctype html>', { status: 200, headers: { 'Content-Type': 'text/html' } })));
    const { client } = await fresh();
    expect((await client.getPlan(req)).dataSource).toBe('sample');
  });

  it('uses the file in the inline engine when there is no worker', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(realFile())));
    const { client } = await fresh();
    const res = await client.getPlan(req);
    expect(res.dataSource).toBe('static');
    expect(res.sources?.prices).toBe('real');
  });

  it('sends the dataset to the worker once, before the first plan, and fetches the file once', async () => {
    const reasons = JSON.parse(readFileSync('public/data/soil_rubric_reasons.json', 'utf8'));
    const fetchMock = vi.fn((url: string) => Promise.resolve(json(url.endsWith('soil_rubric_reasons.json') ? reasons : realFile())));
    vi.stubGlobal('fetch', fetchMock);
    const posted: { type?: string }[] = [];
    // A stand-in worker that runs the real worker code paths: it keeps the dataset it gets and answers plans.
    class FakeWorker {
      onmessage: ((e: MessageEvent) => void) | null = null;
      postMessage(msg: { type?: string; dataset?: unknown; id?: number; req?: PlanRequest }) {
        posted.push(structuredClone(msg));
        if (msg.type === 'data') return;
        void (async () => {
          const { runPlan } = await import('../model/engine');
          const res = runPlan(msg.req!);
          this.onmessage?.({ data: { id: msg.id, ok: true, res } } as MessageEvent);
        })();
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    const { client } = await fresh();
    await client.getPlan(req);
    await client.getPlan({ ...req, waterCapAfPerAcre: 3 });
    // Each file is fetched once, however many plans follow.
    expect(fetchMock.mock.calls.map((c) => c[0]).sort()).toEqual(['/data/real_data.json', '/data/soil_rubric_reasons.json']);
    expect(posted.map((m) => m.type)).toEqual(['data', 'plan', 'plan']);
    const sent = posted[0] as { dataset: { fromFile: boolean; sources: Record<string, string>; soilReasons?: unknown } };
    expect(sent.dataset.fromFile).toBe(true);
    expect(sent.dataset.soilReasons).toBeDefined();
    expect(sent.dataset.sources.weather).toBe('real');
  });
});
