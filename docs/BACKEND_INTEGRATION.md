# Backend integration

**One file, `public/data/real_data.json`, carries the real numbers.** The live site runs the
optimizer in the browser on that file; no server is needed. Every chart, number, and
"Sample data" badge follows the file. Anything missing from it falls back to placeholder
data and keeps its Sample badge.

- Soil reasons: `public/data/soil_rubric_reasons.json`, one sentence per rotation and soil part
- Format, field by field: [REAL_DATA_FORMAT.md](REAL_DATA_FORMAT.md)
- A complete example with every field: [`public/data/real_data.example.json`](../public/data/real_data.example.json)
- Checker: `npm run check:data` (prints `OK`, or each bad field and why)

---

## 1. What is still needed (to-do list)

Status of `real_data.json` and `soil_rubric_reasons.json` as committed on Nov 15, 2026
(evening). Work top to bottom.

### Data: done

Every dataset is marked real. Costs are the UA AZ2168 Pinal 2025 budgets without the
water-purchase line and without land rent (team decision, Nov 15). The satellite
crop-water check (OpenET/ECOSTRESS) was not done and is no longer shown; the water model
is checked against measured Pinal applied water instead (in `validation.checks`).

### Words the team writes (front-end files, not the data file)

| What | Where | Count |
| --- | --- | --- |
| "Pest cycles" and "Water soaking in" lines | `pests`, `infiltration` in `src/model/content.ts` (English and Spanish) | 10 per language |
| Nitrogen carryover line | `compare.seq.carryTodo` in both locale files | 1 per language |

Lines that still start with `TODO` are hidden on the site; each appears as soon as it is written.
| Spanish soil reasons | `method.soilRubric.reasonEs` in `es.json`: a draft translation of `soil_rubric_reasons.json`. **Update it whenever that file changes.** | 25 |
| Spanish review | every Spanish string; new ones are marked by `_reviewJudging`, `_reviewFieldShift`, and `_reviewSoilReasons` in `es.json` | all |

When these are done, `grep -rn TODO src` should return only code comments.

---

## 2. How to update the data (every time)

```bash
npm run check:data -- path/to/real_data.json
```

1. Copy the file to `public/data/real_data.json` (and `soil_rubric_reasons.json` next to it, if the soil scores changed).
2. Run the checker. It checks both files and must print `OK` for each.
3. Optional: run `npm run export-sample` to rewrite the static-mode files in `public/results/` from it.
4. Run `npm run check` (typecheck, lint, tests, build). Then commit and push to `main`; Vercel deploys it.

If one section is wrong, the site still uses the rest of the file and falls back to
sample data for that section only. The browser console says which one and why, for example:
`[real-data] fell back to sample for context.graceTwsCm: ...date must be "YYYY-MM"`.

---

## 3. `real_data.json` at a glance

Full rules are in [REAL_DATA_FORMAT.md](REAL_DATA_FORMAT.md).

| Field | Required? | What it drives |
| --- | --- | --- |
| `schemaVersion` (`"real-1.0"`), `region` | **Required** | |
| `years` (20 years in a row) | **Required** | Every per-year array follows this order |
| `rotations.<id>`: `revenue`, `nonWaterCost`, `profit`, `waterAf`, `source` | **Required**, all five rotations | The optimizer: every plan, metric, and chart |
| `soil.<id>`: five parts, 0 to 20 | **Required** | Soil scores everywhere |
| `waterCost` | Optional, **strongly needed** | Default water price (else a $200 placeholder) |
| `calendars` | Optional | Calendars, bare months, heat and frost marks |
| `context.graceTwsCm` | Optional | /why groundwater panel, "NASA data behind this plan" |
| `context.heatDaysPerYear`, `context.et0MonthlyMm` | Optional (both needed for the `weather` badge) | /why heat and ET0 panels |
| `context.monthlyRisk` | Optional | Heat and frost marks, /why monthly chart |
| `context.etCheck` | Optional | /why "satellite vs. model" panel |
| `context.otherRegions` | Optional | /why "Same pressure elsewhere" |
| `waterPresets` | Optional | Water situation chips, home quick start, zero-canal-water headline |
| `validation` | Optional | "How we checked our work" |
| `sources` | Optional (missing = sample) | Every Sample badge and the data-sources Status column |
| `generatedAt`, `notes` | Optional | For people only |
| `soil_rubric_reasons.json` (separate file) | Optional | One-line reason under each soil score (Show the math rubric, Compare soil info). Used only when the `soil` section loads. |

---

## 4. Other ways to deliver results (optional, not needed for the deadline)

The site can also read finished plans instead of computing them. Set `VITE_DATA_MODE`
at build time (see `.env.example`):

| Mode | What happens |
| --- | --- |
| `sample` (default, **what the live site uses**) | Runs the optimizer in the browser on `real_data.json` (or placeholders). |
| `static` | Loads precomputed plans from `public/results/{region}/w{cap}_r{risk}_s{soil}.json`, rounded to a grid. Settings off the grid (other water prices, soil goals) run in the browser instead. |
| `live` | `POST {VITE_API_BASE_URL}/api/plan` to a running FastAPI backend. |

Every response is checked with zod (`src/api/schemas.ts`). If a static or live request
fails, the site falls back to the browser optimizer and shows a banner.

### The API contract (static and live modes only)

Types are in `src/api/types.ts`; field names are final. Text fields come back in the
requested `lang`.

**Request, `PlanRequest`.** Required: `region`, `acres`, `waterCapAfPerAcre` (0.5 to 6.0),
`riskLevel` (0 to 1), `minSoilScore` (0 to 100), `currentMix`, `lang`.
Optional: `maxShare`, `waterCostPerAf` (the site always sends it), `irrigationEfficiency`,
`soilParts` (soil goals to count; omitted = all five; the score becomes the selected
parts rescaled to 0 to 100).

**Response, `PlanResponse`.** Required: `schemaVersion: "1.0"`, `dataSource` (`"live"`
or `"static"`), `recommended`, `current`, `frontier`, `rotations`, `stressTests`,
`backtest`, `correlations`, `context` (`graceTwsCm`, `heatDaysPerYear`, `et0MonthlyMm`,
`etCheck`), `assumptions`.

`current` is the farmer's plan **cut back to fit the water budget**: find the plan's
highest-need year; if it needs more than the cap, scale every irrigated rotation by
`cap / need` and move the rest to fallow (`fitToBudget` in `src/model/engine.ts`). Use the
same rule for `stressTests` and the backtest's current-plan row.

**Optional response fields.** The site hides a feature when its field is missing. The
browser optimizer fills every one, so `public/results/` has exact examples.

| Field | What it is |
| --- | --- |
| `currentAsFarmed` | `{ mix, metrics }`: the current plan before the cut |
| `sources` | `"sample"` or `"real"` per dataset; missing counts as sample |
| `goals` | `{ income, water, soil }`, each `{ mix, metrics }`: best feasible mix for highest average profit, lowest highest-year water, highest soil score |
| `soilFrontier[]` | `{ soilScore, avgProfit, mix }`: feasible mixes no other beats on both, by soil |
| `sensitivity[]` | Suggested plan re-run with profit ±20%, water price ±20%, efficiency 0.65 / 0.85 |
| `classic` | Classic mean-variance efficient set and its gap vs. ours |
| `riskMetrics` | Sharpe, Sortino, diversification for the suggested and current plans |
| `waterPresets` | Same as in `real_data.json` |
| `validation` | `lpCrossCheck` and `checks[]`, same as in `real_data.json` |
| `context.otherRegions[]`, `context.monthlyRisk[]` | Same as in `real_data.json` |
| `Metrics.yearlyWater[]` | `{ year, water }`: applied AF/acre each year |
| `RotationCard.yearlyWaterAf[]` | Applied AF/acre each year, rotation on every acre |
| `RotationCard.calendarCrops[]` | Crop each month, `null` = bare (calendar letters) |
| `RotationCard.families[]` | Botanical families grown (e.g. `Fabaceae`) |
| `RotationCard.soilReasons` | `{ legume, livingRoots, residue, lowTillage, diversity }`: one sentence each |
| `RotationCard.pests`, `.infiltration` | One plain sentence each |

**When no mix fits**, return HTTP 422:

```json
{ "code": "infeasible", "relax": "soil", "maxSoilAtThisWater": 42, "minWaterForThisSoil": 2.9 }
```

`relax` is `"soil"`, `"water"`, or `"maxShare"`; both numbers are optional.

### Static files

Grid (`src/api/grid.ts`): water 0.6 to 6.0 in steps of 0.3 (file name `w2.4`), risk
0/20/40/60/80/100, soil 0/15/30/45/60/75/90. Layout:

```
public/results/pinal/w2.4_r40_s30.json             English
public/results/pinal/es/w2.4_r40_s30.json          Spanish (optional; falls back to English)
public/results/pinal/w0.6_r0_s90.infeasible.json   422 body where no plan fits
public/results/pinal/index.json                    grid and file list
```

`npm run export-sample` writes all of them from the browser optimizer and the current
`real_data.json`, at the default water price.

### Checking a live backend locally

```bash
VITE_DATA_MODE=live VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

The backend must allow CORS from the site's origin. Schema problems show in the browser
console and trigger the fallback banner.
