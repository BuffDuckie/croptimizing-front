// Writes public/data/real_data.example.json: a complete, valid file in the real
// data format, filled with the sample model's PLACEHOLDER numbers (every source
// flag says "sample"). The backend team copies its shape; nothing in it is real.
//
// Usage: npm run make-example-data
import { writeFileSync, mkdirSync } from 'node:fs';
import { checkRealData } from '../src/api/realDataSchema';
import { ROTATION_IDS, type RotationId } from '../src/api/types';
import { sampleDataset } from '../src/model/dataset';

const ds = sampleDataset();
const s = ds.scenario;

// Placeholder non-water costs per acre, so revenue = profit + cost. NOT estimates.
const COST: Record<RotationId, number> = { alfalfa: 950, cotton_barley: 1150, durum_sorghum: 700, barley_fallow: 420, fallow: 40 };

const rotations = Object.fromEntries(
  ROTATION_IDS.map((id) => {
    const profit = s.profit[id].map((p) => Math.round(p));
    const nonWaterCost = profit.map(() => COST[id]);
    const revenue = profit.map((p, i) => p + nonWaterCost[i]);
    const waterAf = s.water[id].map((w) => Math.round(w * 100) / 100);
    return [id, { revenue, nonWaterCost, profit, waterAf, source: 'sample' }];
  }),
);

const monthlyRisk = ds.context.monthlyRisk;

const file = {
  schemaVersion: 'real-1.0',
  region: 'pinal',
  generatedAt: '2026-11-15T16:00:00-07:00',
  notes: 'PLACEHOLDER numbers from the sample model, for the format only. Not estimates for any farm. Every source flag is "sample".',
  years: s.years,
  rotations,
  soil: ds.soilParts,
  context: {
    graceTwsCm: ds.context.graceTwsCm,
    heatDaysPerYear: ds.context.heatDaysPerYear,
    et0MonthlyMm: ds.context.et0MonthlyMm,
    monthlyRisk,
    etCheck: ds.context.etCheck,
    otherRegions: (ds.context.otherRegions ?? []).map((r) => ({ ...r, source: 'sample' })),
  },
  waterPresets: {
    full: { afPerAcre: 4.5, label: 'Full canal allotment', source: 'TODO: link to the source for this number' },
    cut2022: { afPerAcre: 3.2, label: '2022-style cut', source: 'TODO: link to the source for this number' },
    zero2023: { afPerAcre: 2.0, label: 'Zero canal water (like 2023)', source: 'TODO: link to the source for this number' },
  },
  validation: {
    lpCrossCheck: {
      method: 'Exact linear program, scipy HiGHS',
      maxShareDifference: 0.05,
      note: 'PLACEHOLDER: the backend fills this in from its own run.',
    },
    checks: [
      { id: 'openet', label: 'Modeled water vs. OpenET satellite water use', result: 'partial', detail: 'PLACEHOLDER: what was compared and how close it came.', source: 'https://openetdata.org/' },
      { id: 'budgets', label: 'Profit vs. published crop budgets', result: 'pass', detail: 'PLACEHOLDER: which budgets, and the largest gap.' },
      { id: 'backtest', label: 'Plans picked on 2005 to 2014, scored on 2015 to 2024', result: 'fail', detail: 'PLACEHOLDER: list the checks you fail too.' },
    ],
  },
  sources: { weather: 'sample', grace: 'sample', etCheck: 'sample', cropBudgets: 'sample', prices: 'sample', soil: 'sample', otherRegions: 'sample' },
};

const issues = checkRealData(file);
if (issues.length) {
  console.error('The example does not pass its own checker:', issues);
  process.exit(1);
}
mkdirSync('public/data', { recursive: true });
// Two-space indent, with arrays of plain numbers kept on one line so the file stays readable.
const text = JSON.stringify(file, null, 2).replace(/\[\s+([-\d.,\s]+?)\s+\]/g, (_, inner: string) => `[${inner.trim().split(/,\s*/).join(', ')}]`);
writeFileSync('public/data/real_data.example.json', text + '\n');
console.log('Wrote public/data/real_data.example.json');
