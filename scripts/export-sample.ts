// Writes the sample engine's output for every point of the static grid to
// public/results/{region}/w{cap}_r{risk}_s{soil}.json (English) and
// public/results/{region}/es/... (Spanish), so VITE_DATA_MODE=static works out
// of the box and the backend team has exact example files.
//
// Usage: npm run export-sample            (English and Spanish)
//        npm run export-sample -- --en    (English only)
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInfeasible } from '../src/api/errors';
import { STATIC_GRID, staticPath } from '../src/api/grid';
import { planResponseSchema } from '../src/api/schemas';
import type { PlanRequest } from '../src/api/types';
import { setDataset } from '../src/model/dataset';
import { runPlan } from '../src/model/engine';
import { buildDataset } from '../src/model/realData';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const region = 'pinal';
const langs: ('en' | 'es')[] = process.argv.includes('--en') ? ['en'] : ['en', 'es'];

// Use the real data file when it is there, exactly as the site does.
const realPath = join(root, 'data', 'real_data.json');
if (existsSync(realPath)) {
  const ds = buildDataset(JSON.parse(readFileSync(realPath, 'utf8')));
  if (ds) {
    setDataset(ds);
    console.log('Using public/data/real_data.json');
  }
}

rmSync(join(root, 'results', region), { recursive: true, force: true });

let written = 0;
let infeasible = 0;
let bytes = 0;
const index: { water: number; risk: number; soil: number; file: string }[] = [];

for (const lang of langs) {
  for (const water of STATIC_GRID.water) {
    for (const risk of STATIC_GRID.risk) {
      for (const soil of STATIC_GRID.soil) {
        const req: PlanRequest = {
          region,
          acres: 640,
          waterCapAfPerAcre: water,
          riskLevel: risk / 100,
          minSoilScore: soil,
          currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
          lang,
        };
        let rel = staticPath(region, water, risk, soil).slice(1);
        if (lang === 'es') rel = rel.replace(`results/${region}/`, `results/${region}/es/`);
        const file = join(root, rel);
        mkdirSync(dirname(file), { recursive: true });
        try {
          // Sample numbers stay labeled "sample"; with real data the engine says "static".
          const res = runPlan(req);
          planResponseSchema.parse(res);
          const json = JSON.stringify(res);
          writeFileSync(file, json);
          bytes += json.length;
          written++;
          if (lang === 'en') index.push({ water, risk, soil, file: rel });
        } catch (e) {
          if (!isInfeasible(e)) throw e;
          // Same body a backend returns with HTTP 422.
          writeFileSync(file.replace(/\.json$/, '.infeasible.json'), JSON.stringify(e.detail));
          infeasible++;
        }
      }
    }
  }
}

writeFileSync(join(root, 'results', region, 'index.json'), JSON.stringify({ grid: STATIC_GRID, files: index }));
console.log(`Wrote ${written} plan files (${(bytes / 1e6).toFixed(1)} MB) and ${infeasible} infeasible notes to public/results/${region}/`);
