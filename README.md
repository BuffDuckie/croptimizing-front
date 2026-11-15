# Croptimizing

Plan your crops like an investor: the most profit for your water, your soil, and your worst years.

Croptimizing treats a farm's crop plan like an investment portfolio. Each crop rotation is an asset,
the water allocation is a hard budget that must hold in every one of 20 past years, and soil health is
a minimum standard. It finds the mix that best balances average profit against profit in the worst
1-in-5 years, shows the trade-offs on an efficient frontier, and tells farmers what one more acre-foot
is worth to them. Case study: Pinal County, Arizona.

Built for the NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data."
Data credits: NASA POWER, NASA GRACE and GRACE-FO, OpenET and NASA ECOSTRESS. Not an official NASA product.

> Every number in this build comes from **placeholder sample data** and is labeled "Sample data"
> in the app. The backend replaces it with real data.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run check` | Typecheck, lint, tests, and production build (run before every commit) |
| `npm run build` / `npm run preview` | Production build and local preview |
| `npm run export-sample` | Regenerate the static result files in `public/results/` |
| `npx tsx e2e/axe.ts http://localhost:5173` | Accessibility audit (axe, WCAG 2.2 AA) on every page, EN and ES, desktop and phone |
| `npx tsx e2e/shots.ts http://localhost:5173 shots` | Screenshots of every page at 1440 and 375 px |
| `npx tsx e2e/print.ts http://localhost:5173 .` | Prints the report to PDF in EN and ES and reports the page count |

The e2e scripts use your installed Google Chrome (`channel: 'chrome'`).

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page with the "Fields re-plan" animation, context, and your-own-farm form |
| `/plan` | The main screen: three sliders, suggested mix, four metrics, water value, 20 years at a glance |
| `/tradeoffs` | Efficient frontier that shrinks as water drops |
| `/compare` | One card per rotation: calendar, portfolio statement, soil breakdown, explanations |
| `/why` | NASA data panels: GRACE groundwater, NASA POWER heat and reference ET, OpenET/ECOSTRESS check |
| `/stress` | Replay a hard year (2020 heat, 2022 to 2024 water cuts) for both plans |
| `/report` | One printable page in the selected language |
| `/method` | Formulas, data sources, correlations, backtest, CSV download |

Settings live in the URL (`?w=2.4&r=40&s=30&lang=es`), so any view can be shared.

## How it is built

React 18, TypeScript (strict), Vite, Tailwind (tokens in `src/theme/tokens.ts`), Recharts plus custom SVG,
react-router, i18next (EN and a Spanish draft marked for human review), KaTeX, zod, Vitest.
No backend, login, database, or cookies.

- `src/api/` contract types, zod schemas, and the one data door `getPlan()`
- `src/model/` the in-browser sample engine (mirror of the backend math) and its tests
- `src/hooks/usePlan.ts` debounced data hook; components never touch the model or `fetch`
- `docs/BACKEND_INTEGRATION.md` how to plug in static files or the live API

## Deploy

The build is static. Both configs rewrite every route to `index.html`.

```bash
npx vercel --prod
```

or

```bash
npx netlify deploy --prod --dir=dist
```

Build command `npm run build`, output directory `dist`. Set `VITE_DATA_MODE` (and `VITE_API_BASE_URL`
for live mode) in the host's environment settings.
