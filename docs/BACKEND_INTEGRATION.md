# Backend integration

**One file, `public/data/real_data.json`, carries the real numbers.** The live site runs the
optimizer in the browser on that file; no server is needed. Every chart, number, and
"Sample data" badge follows the file. Anything missing from it falls back to placeholder
data and keeps its Sample badge.

- Format, field by field: [REAL_DATA_FORMAT.md](REAL_DATA_FORMAT.md)
- A complete example with every field: [`public/data/real_data.example.json`](../public/data/real_data.example.json)
- Checker: `npm run check:data` (prints `OK`, or each bad field and why)

---

## 1. What is still needed (to-do list)

Status of the `real_data.json` committed on Nov 15, 2026. Work top to bottom; the first
item changes every number on the site.

### Data the backend team adds to `real_data.json`

| # | Field | Status now | What to do |
| --- | --- | --- | --- |
| 1 | `waterCost` **(add first)** | Missing. The site uses a **$200/AF placeholder** marked TODO. At $200, every rotation loses money in this data and the suggested plan is about 75% fallow at any water budget. | Add `"waterCost": { "perAf": <price>, "source": "<budget name and link>" }`, using the water price in the UA AZ2168 Pinal budget's water-purchase line (the line `nonWaterCost` leaves out). Farmers can still type their own price. |
| 2 | `prices` flag | `"sample"`: cotton and durum/sorghum years are imputed (the `cotton_barley` and `durum_sorghum` rotations are flagged `"sample"`). | Fill the missing years from another source, or keep the imputation and explain it in `notes`. Once you trust it, set `sources.prices` and both rotations' `source` to `"real"`. |
| 3 | `soil` | Copied from the placeholders, flagged `"sample"`. | The science teammate scores each rotation on the five parts (0 to 20 each, NRCS principles) and sets `sources.soil` to `"real"`. |
| 4 | `context.etCheck` | Missing (the /why panel shows sample bars). | Modeled vs. OpenET/ECOSTRESS crop water use, mm per year, for each crop. Then set `sources.etCheck` to `"real"`. |
| 5 | `waterPresets` | Missing. The chips show TODO values (4.5 / 3.2 / 2.0 AF/acre). | `full`, `cut2022`, `zero2023`: AF/acre with a source link each. **The water slider stops at 6.0 AF/acre**, so a larger value shows as 6.0. |
| 6 | `calendars` | Missing. The site uses illustrative growing calendars. | Crop in the field each month, Jan to Dec, `null` for bare (see the format). These drive the calendar strips, heat and frost marks, bare-ground months, and the soil panel. |
| 7 | `validation.checks`, `validation.lpCrossCheck` | Missing. "How we checked our work" shows "Not run yet". | List every check you ran, **including the ones you fail**, and the exact-solver comparison. |

Already real in the file: `weather` (FAO-56 water from NASA POWER, heat days, ET0,
monthly heat and frost), `grace`, `cropBudgets`, and `otherRegions` (Central Valley,
High Plains, NW India).

**Worth a sanity check:** in the file, alfalfa needs 7.8 AF/acre of applied water on
average (8.5 in the highest year), above the slider's 6.0 maximum. If that is right, the
farmer's current plan as farmed can never fit, and the tool always compares against it
cut back.

### Words the team writes (front-end files, not the data file)

| What | Where | Count |
| --- | --- | --- |
| One-line reason for each soil score | `method.soilRubric.reason.<rotation>.<part>` in `src/i18n/locales/en.json` and `es.json` | 25 per language |
| "Pest cycles" and "Water soaking in" lines | `pests`, `infiltration` in `src/model/content.ts` (English and Spanish) | 10 per language |
| Nitrogen carryover line | `compare.seq.carryTodo` in both locale files | 1 per language |
| Spanish review | every Spanish string; new ones are marked by `_reviewJudging` and `_reviewFieldShift` in `es.json` | all |

When these are done, `grep -rn TODO src` should return only code comments.

---

## 2. How to update the data (every time)

```bash
npm run check:data -- path/to/real_data.json
```

1. Copy the file to `public/data/real_data.json`.
2. Run the checker. It must print `OK`.
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
| `waterCost` | Optional, **strongly needed** | Default water price (else the $200 placeholder) |
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
