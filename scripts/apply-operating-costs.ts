// Turns the costs in public/data/real_data.json into OPERATING costs only, by
// also leaving out each crop's fixed costs (machinery ownership and insurance),
// the same way land rent is already left out. Profit then means "return above
// operating costs", the standard extension measure.
//
// Usage: npm run apply-operating-costs -- path/to/fixed-costs.json
//
// fixed-costs.json: dollars per acre per year for each crop, from the UA AZ2168
// Pinal 2025 budget line items (machinery ownership + insurance), with a source:
//   { "source": "UA AZ2168 ...", "alfalfa": 0, "cotton": 0, "barley": 0, "durum": 0, "sorghum": 0 }
//
// Each rotation's cost drops by the sum of its crops' fixed costs, and its profit
// rises by the same amount, every year. Revenue and water do not change.
import { readFileSync, writeFileSync } from 'node:fs';
import { checkRealData } from '../src/api/realDataSchema';

const CROPS: Record<string, string[]> = {
  alfalfa: ['alfalfa'],
  cotton_barley: ['cotton', 'barley'],
  durum_sorghum: ['durum', 'sorghum'],
  barley_fallow: ['barley'],
  fallow: [],
};

const fixedPath = process.argv[2];
if (!fixedPath) {
  console.error('Usage: npm run apply-operating-costs -- path/to/fixed-costs.json');
  process.exit(1);
}
const fixed = JSON.parse(readFileSync(fixedPath, 'utf8')) as Record<string, number | string>;
for (const c of ['alfalfa', 'cotton', 'barley', 'durum', 'sorghum']) {
  if (typeof fixed[c] !== 'number' || (fixed[c] as number) < 0) {
    console.error(`fixed-costs.json needs a number for "${c}" (dollars per acre per year)`);
    process.exit(1);
  }
}

const path = 'public/data/real_data.json';
const f = JSON.parse(readFileSync(path, 'utf8'));
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const water = f.waterCost?.perAf ?? 0;
for (const [id, crops] of Object.entries(CROPS)) {
  const r = f.rotations[id];
  const cut = crops.reduce((s, c) => s + (fixed[c] as number), 0);
  const before = mean(r.profit.map((p: number, t: number) => p - water * r.waterAf[t]));
  r.nonWaterCost = r.nonWaterCost.map((c: number) => Math.round((c - cut) * 100) / 100);
  r.profit = r.revenue.map((v: number, t: number) => Math.round((v - r.nonWaterCost[t]) * 100) / 100);
  const after = mean(r.profit.map((p: number, t: number) => p - water * r.waterAf[t]));
  console.log(`${id.padEnd(14)} fixed costs left out $${cut.toFixed(0)}/acre: average after water $${before.toFixed(0)} -> $${after.toFixed(0)}`);
}
f.notes = `${f.notes} Costs are operating costs only: machinery ownership and insurance are also left out (source: ${fixed.source ?? 'not given'}).`;

const issues = checkRealData(f);
if (issues.length) {
  console.error('The result does not pass the checker:', issues.slice(0, 5));
  process.exit(1);
}
writeFileSync(path, JSON.stringify(f, null, 1) + '\n');
console.log(`Wrote ${path}`);
