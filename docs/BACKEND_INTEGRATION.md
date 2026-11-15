# Backend integration

The front end gets every number through one function, `getPlan(req)` in
`src/api/client.ts`. Components never call `fetch` or import the model; they read
results from the `usePlan` hook (`src/hooks/usePlan.ts`), which debounces slider
changes by 150 ms and exposes `{ data, isLoading, error }`.

## The three data modes

Set `VITE_DATA_MODE` at build time (see `.env.example`).

| Mode | What happens | Use it for |
| --- | --- | --- |
| `sample` (default) | Runs the in-browser model in `src/model/` (seeded placeholder data). | Building and demoing the UI with no backend. |
| `static` | Loads `/results/{region}/w{cap}_r{risk}_s{soil}.json` from `public/`. Inputs are rounded to the nearest grid point. | Shipping precomputed backend results as plain files on Vercel or Netlify. |
| `live` | `POST {VITE_API_BASE_URL}/api/plan` with the `PlanRequest` as JSON. | The running FastAPI backend. |

Every response is validated with zod (`src/api/schemas.ts`). If a static or live
request fails for any reason (network, HTTP error, schema mismatch), the client
falls back to the sample model and the app shows a friendly banner. The
"Sample data" badge stays on screen whenever `dataSource` is `"sample"`.

## The contract

Types live in `src/api/types.ts` and must match the backend exactly. Field names
are final; tell the front-end team before changing any.

- Request: `PlanRequest` (region, acres, `waterCapAfPerAcre` 0.5 to 6.0, `riskLevel` 0 to 1,
  `minSoilScore` 0 to 100, optional `maxShare`, `waterCostPerAf`, `irrigationEfficiency`,
  `currentMix`, `lang`).
- Response: `PlanResponse` with `schemaVersion: "1.0"` and `dataSource` set to
  `"live"` (API) or `"static"` (precomputed files). Use `"sample"` only for placeholder numbers.
- Text fields (rotation names, explanations, stress-test labels, backtest strategy
  names, assumptions) come back in the requested `lang`.

### Changed meaning: `current`

`current` is now the farmer's current plan **cut back to fit the water budget**
(`fitToBudget` in `src/model/engine.ts`): take the plan's highest-need year across
the scenario years; if it needs more than the cap, scale every irrigated rotation by
`cap / need` and move the rest to fallow. A plan that already fits is unchanged. Use
the same rule for `stressTests[].current*` and the backtest's current-plan row (fit
on the training years). Send the untrimmed plan as `currentAsFarmed`.

### Optional fields (judging upgrades)

All optional; the UI hides a feature when its field is missing. The sample engine
fills every one, so `public/results/` has exact examples.

| Field | What it is |
| --- | --- |
| `currentAsFarmed` | `{ mix, metrics }` for the current plan before the cut. Shown only on Show the math. |
| `sources` | Per-dataset flag, `"sample"` or `"real"`, for `weather`, `grace`, `etCheck`, `cropBudgets`, `prices`, `soil`, `otherRegions`. A missing dataset counts as sample. Drives every Sample tag and the Status column. |
| `validation.lpCrossCheck` | `{ method, maxShareDifference (0 to 1), note }` from an exact solver run on the same data. Shown under the backtest. |
| `sensitivity[]` | `{ case, value, avgProfit, worst1in5, mix, mixChanged }` for `profitDown`/`profitUp` (profit of every rotation but fallow x0.8/x1.2), `waterCostDown`/`waterCostUp` (only when a water cost is set), `efficiencyLow`/`efficiencyHigh` (0.65/0.85). Null numbers and mix when nothing fits. |
| `classic` | `{ points[], atSuggested, largestGap }`: the mean-variance efficient set among feasible mixes (no mix has both higher average and lower standard deviation) and the worst-years gap vs. our best plan at the same or higher average. |
| `riskMetrics` | `{ recommended, current, fallowAvg }`, each `{ sd, sharpe, sortino, diversification }`. Benchmark is the fallow average; Sortino uses downside deviation below it. Nulls when undefined. |
| `context.otherRegions[]` | `{ id, label, series: { date, value }[], source }`: GRACE storage (cm) for other farm regions. |

### When no mix fits

Return **HTTP 422** with this body. The UI tells the farmer which limit to relax and
offers one-tap fixes.

```json
{ "code": "infeasible", "relax": "soil", "maxSoilAtThisWater": 42, "minWaterForThisSoil": 2.9 }
```

`relax` is one of `"soil"`, `"water"`, `"maxShare"`. Both numbers are optional.

## Static files

Grid (`src/api/grid.ts`):

- water: 0.6 to 6.0 in steps of 0.3 (file name uses one decimal: `w2.4`)
- risk: 0, 20, 40, 60, 80, 100 (slider units; `riskLevel = risk / 100`)
- soil: 0, 15, 30, 45, 60, 75, 90

File layout:

```
public/results/pinal/w2.4_r40_s30.json             English response
public/results/pinal/es/w2.4_r40_s30.json          Spanish response (optional; falls back to English)
public/results/pinal/w0.6_r0_s90.infeasible.json   422 body for points with no plan
public/results/pinal/index.json                    grid and file list
```

To drop in real results, write files with the same names and shapes (with
`"dataSource": "static"`), then build with `VITE_DATA_MODE=static`.

`npm run export-sample` regenerates the example files from the sample engine
(about 21 MB for English and Spanish; `npm run export-sample -- --en` for English
only). They keep `"dataSource": "sample"` because they are placeholder numbers.

## Checking a backend locally

```bash
VITE_DATA_MODE=live VITE_API_BASE_URL=http://localhost:8000 npm run dev
```

The backend must allow CORS from the front end's origin. Open the browser console:
schema problems are logged by zod and trigger the fallback banner.
