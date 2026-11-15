// Checks a real data file against docs/REAL_DATA_FORMAT.md.
//
// Usage: npm run check:data                       (public/data/real_data.json)
//        npm run check:data -- path/to/file.json
//
// Prints OK, or every failing field path with the reason, and exits 1 on failure.
import { existsSync, readFileSync } from 'node:fs';
import { checkRealData } from '../src/api/realDataSchema';

const path = process.argv[2] ?? 'public/data/real_data.json';
if (!existsSync(path)) {
  console.error(`No file at ${path}`);
  process.exit(1);
}

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`${path} is not valid JSON: ${(e as Error).message}`);
  process.exit(1);
}

const issues = checkRealData(raw);
if (issues.length === 0) {
  const f = raw as { years: number[]; sources?: Record<string, string> };
  const real = Object.entries(f.sources ?? {})
    .filter(([, v]) => v === 'real')
    .map(([k]) => k);
  console.log(`OK  ${path}: ${f.years.length} years (${f.years[0]} to ${f.years[f.years.length - 1]}); marked real: ${real.length ? real.join(', ') : 'none'}`);
  process.exit(0);
}

console.log(`FAIL  ${path}: ${issues.length} problem${issues.length === 1 ? '' : 's'}`);
for (const i of issues) console.log(`  ${i.path}  ${i.reason}`);
process.exit(1);
