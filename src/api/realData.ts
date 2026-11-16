// Loads public/data/real_data.json once at app start. Without the file the site
// runs on sample data exactly as before; with it, the engine (main thread and
// worker) uses the real sections and keeps sample data only where a section fails.

import type { Dataset } from '../model/dataset';

export const REAL_DATA_PATH = '/data/real_data.json';
export const SOIL_REASONS_PATH = '/data/soil_rubric_reasons.json';

/** Parsed JSON from a path, or undefined when it is missing (or a host's index.html). */
async function getJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
}

let loading: Promise<Dataset | null> | null = null;

async function load(): Promise<Dataset | null> {
  if (typeof fetch === 'undefined') return null;
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  // A host that answers every path with index.html counts as no file.
  const [raw, reasons] = await Promise.all([getJson(base + REAL_DATA_PATH), getJson(base + SOIL_REASONS_PATH)]);
  if (raw === undefined) return null;
  const [{ buildDataset }, { setDataset }] = await Promise.all([import('../model/realData'), import('../model/dataset')]);
  const ds = buildDataset(raw, undefined, reasons);
  // The main thread uses it too, for the inline engine (no Worker) and scripts.
  if (ds) setDataset(ds);
  return ds;
}

/** The real dataset, or null when there is no usable file. Fetched once. */
export function realDataset(): Promise<Dataset | null> {
  loading ??= load();
  return loading;
}

/** For tests: forget the loaded file so the next call fetches again. */
export function resetRealData(): void {
  loading = null;
}
