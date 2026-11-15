# Croptimizing — front-end build brief

You are building the FRONT END of Croptimizing, our team's project for the NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data." Submission closes Sunday, Nov 15, 2026, 11:59 p.m. Phoenix time. A polished, deployed, working core beats a wide unfinished one.

First action: save this entire brief as CLAUDE.md in the repo root so it stays in context. Then scaffold and start Milestone 1 without waiting for confirmation. Make routine choices yourself; ask me only when truly blocked. Commit after each milestone, and run typecheck, lint, tests, and build before each commit.

## 1. The product in one paragraph

Croptimizing treats a farm's crop plan like an investment portfolio. Each crop rotation is an asset; the farm's water allocation (acre-feet per acre) is a hard budget that must hold in every year; soil health is a minimum standard, like an ESG screen. Using 20 historical years (2005–2024) as scenarios, the model finds the mix of rotations that best balances average profit against profit in the worst 1-in-5 years, shows the trade-offs on an efficient frontier, and tells farmers what one more acre-foot of water is worth to them. Case study: Pinal County, Arizona, where the Colorado River water set aside for central Arizona farms was cut 65% in 2022 and to zero in 2023 and 2024 (source: ASU Arizona Water Innovation Initiative). The tool supports, never replaces, farmer judgment.

## 2. Users

- Farmer (primary): limited time, may be on a phone outdoors, thinks in acres, acre-feet, and dollars. Needs: what to plant, how much they'll make in a normal and a bad year, whether it fits their water.
- Extension agent: wants assumptions, data sources, and caveats.
- Hackathon judge (NASA scientists and executives): no context, five minutes. Must grasp the idea in one sentence, then be able to audit the math.

## 3. Tech stack (fixed)

- React 18 + TypeScript (strict) + Vite
- Tailwind CSS with the design tokens below (extend the theme; no hard-coded hex values in components)
- Recharts for charts (custom SVG where Recharts can't do it cleanly)
- react-router for pages; lucide-react for icons
- i18next + react-i18next with en.json and es.json from the first commit
- KaTeX (react-katex) for formulas on the methodology page
- zod for validating API responses
- Vitest + Testing Library for model and component tests
- No backend, no login, no database, no cookies. Static build deployable to Vercel or Netlify.

## 4. Design system

Principles: plain words on the main screen; three main inputs with defaults; always compare to the farmer's current plan; show trade-offs openly; explain every recommendation; honest about uncertainty; mobile-first and readable in sunlight; color is never the only signal; bilingual; instant feedback; chart titles state findings; every number traceable in a "Show the math" layer.

Two layers on every screen: a simple layer (plain words, big numbers, one chart) and a "Show the math" disclosure (formulas, data sources, assumptions, tables).

Color tokens (add to tailwind.config):

- primary #0B3D91 (NASA Dark Blue): header, primary buttons, headings, MONEY metrics
- secondary #2E7D32 (Earth Green): SOIL metrics, success states
- accent #00C2FF (Cyan): WATER fills and highlights only. Never text or thin lines on light backgrounds (1.98:1 contrast). OK on the navy header and as a fill behind charcoal text.
- accent-strong #0077A8: water text, links, water chart lines on light backgrounds (4.77:1)
- bg #F8FAFC (page), surface #FFFFFF (cards)
- text #1E293B, text-muted #475569, border #CBD5E1
- warning #B45309 (data gaps, "check locally"), danger #B91C1C (over budget, losses)
- tints: primary-tint #E8EEF8, secondary-tint #E8F5E9, accent-tint #E0F7FF
- Meaning is consistent everywhere: navy = money, cyan = water, green = soil.

Rotation colors (color-blind-safe, each paired with a label; fallow also gets a diagonal hatch pattern):

- alfalfa #00805C, cotton_barley #0072B2, durum_sorghum #D55E00, barley_fallow #A8578A, fallow #64748B + hatch

Typography: Inter (self-hosted or @fontsource), tabular numerals for all numbers. Body 16 px minimum; no text under 14 px; headline metrics 32–40 px semibold.
Shape and spacing: 8 px grid; cards 12 px radius, 24 px padding, one soft shadow; buttons and inputs 8 px radius; max content width ~1200 px.
Focus: visible 3 px ring in accent-strong on every interactive element.
Motion: transitions under 200 ms; respect prefers-reduced-motion.
Branding: NO NASA logo or meatball anywhere. Credit data in text ("Weather: NASA POWER").

Accessibility (acceptance criteria): WCAG 2.2 AA; tap targets 44 px or larger; full keyboard use; sliders are native range inputs with visible numeric values and aria-valuetext in words; every chart has a text summary (aria-label plus a visually hidden data table); nothing is hover-only (tooltips also open on tap and focus); lang attribute switches with the language toggle.

## 5. Pages and what each one does

Every page starts with a one-line instruction in plain words. A persistent header holds the logo text "Croptimizing," the page nav, an EN | ES toggle, and a "Sample data" badge whenever sample data is shown. A persistent footer says: "This tool supports your judgment; it does not replace it. Check plans with your local extension agent."

1. / (Start). Headline: "Plan your crops like an investor: the most profit for your water, your soil, and your worst years." Three numbered steps (1 Set your water, 2 Choose your comfort with risk, 3 See your plan). Primary button: "Try the Pinal County demo farm." Secondary form: farm name, acres, water allocation, current crop shares. Location: a region dropdown now (Pinal County, AZ; Kansas High Plains, marked "coming soon"); a map picker is a stretch goal.
2. /plan (My Plan, the main screen). Desktop: controls on the left, results on the right. Mobile: controls stack on top in a sticky collapsible panel.
   - Controls: Water budget (slider 0.5–6.0 AF/acre, step 0.1, default 2.4); Risk comfort (slider 0–100, labeled "Play it safe" to "Go for more profit," default 40); Soil-health minimum (slider 0–100, default 50). "More options" disclosure: max share per rotation, water cost $/AF, irrigation efficiency.
   - Results: Recommended mix (horizontal stacked bar in acres, labels inside or beside segments); four metric cards (Average year profit $/acre, Worst 1-in-5 years $/acre, Water used in the highest year vs budget, Soil score /100), each with a delta chip vs. current plan; a callout card: "One more acre-foot is worth $X per acre to you"; a "20 years at a glance" chart (see viz 3); buttons to Trade-offs, Compare, Why this region.
3. /tradeoffs. The efficient frontier (viz 4) with a plain-language caption and the water slider repeated so the frontier visibly shrinks.
4. /compare. One card per rotation, at least 3 including the current one: name, crops by season, calendar strip (viz 5), a "portfolio statement" row (avg $/acre, $/acre-foot, worst 1-in-5, water, soil), soil-health breakdown (viz 6), and five labeled text blocks: Why suggested / Evidence / Benefits / What we don't know / Check locally.
5. /why (Why this region; NASA data). Four panels with a one-line caption naming the NASA mission and resolution: groundwater storage trend (GRACE/GRACE-FO), hot days per year (NASA POWER), monthly reference evapotranspiration (NASA POWER), and modeled vs satellite-observed crop water use (OpenET/ECOSTRESS). Explain "satellite vs ground" in two sentences.
6. /stress (Stress test). Pick a historical year (default 2020 heat; also 2022 CAP cut); paired bars: current plan vs recommended for profit and water.
7. /report. Print-ready one page (CSS @media print) in the selected language: mix, metrics, assumptions, "questions for your extension agent." Print button.
8. /method (Show the math). Formulas in KaTeX, the optimization explained step by step, data sources table, assumptions, limitations, correlation heatmap of rotations (viz 7), a downloadable scenario table (CSV export), and backtest results (train 2005–2014, test 2015–2024).

## 6. Visualizations

Every chart title states the finding, not the topic ("Your plan loses less in bad years"). Every chart has units in axis titles, a text summary for screen readers, and a "How to read this" ⓘ.

1. Mix bar: horizontal 100% stacked bar of acres by rotation, rotation colors, values labeled.
2. Metric cards: big number, unit, delta chip (arrow icon + sign + color; color is never the only cue).
3. 20 years at a glance: dot strip with one dot per year for current plan (hollow) and recommended plan (filled), x = profit $/acre. Shade and label the worst 4 years as "worst 1-in-5 years" with their average marked. This chart explains CVaR without the word.
4. Efficient frontier: x = worst 1-in-5 years profit ($/acre), y = average profit ($/acre). Frontier as a navy line with points; current plan as a hollow charcoal circle; recommended plan as a filled cyan star with a navy outline; tooltip on hover AND tap shows the full mix. When the water budget changes, keep the previous frontier as a faded dashed line for 2 seconds so the shrink is visible. Axis labels "Safer →" and "More profit ↑."
5. Calendar strip: 12 columns (Jan–Dec) per rotation; growing months filled with the rotation color and crop initial, bare months hatched, a small sun icon on heat-risk months.
6. Soil-health breakdown: five small horizontal bars per rotation (legume / nitrogen, living-root months, residue returned, low tillage, crop diversity), summing to the 0–100 score; secondary green.
7. Correlation heatmap (method page only): rotation-by-rotation profit correlations, diverging scale, values printed in cells.
8. Water budget meter: on the water card, a horizontal bar showing the highest-year use vs budget with a marker line; turns danger color with an icon if over.

## 7. Data contract (backend-ready)

Put these types in src/api/types.ts, and the matching zod schemas in src/api/schemas.ts. The backend (Python/FastAPI, built separately) will return exactly this shape. Field names are final; tell me before changing any.

    export type RotationId = "alfalfa" | "cotton_barley" | "durum_sorghum" | "barley_fallow" | "fallow";
    export type Mix = Partial<Record<RotationId, number>>;   // shares summing to 1

    export type PlanRequest = {
      region: "pinal" | "high_plains" | "custom";
      lat?: number; lon?: number;
      acres: number;
      waterCapAfPerAcre: number;        // 0.5-6.0
      riskLevel: number;                // 0 = play it safe ... 1 = go for profit
      minSoilScore: number;             // 0-100
      maxShare?: Mix;                   // equipment / market limits
      waterCostPerAf?: number;
      irrigationEfficiency?: number;    // 0.5-0.95
      currentMix: Mix;
      lang: "en" | "es";
    };

    export type Metrics = {
      avgProfitPerAcre: number;         // USD, 2025 dollars
      worst1in5PerAcre: number;         // mean of worst 20% of years (= -CVaR)
      maxWaterAfPerAcre: number;        // highest-year applied water
      soilScore: number;                // 0-100
      waterValuePerAf: number;          // shadow price, USD per AF per acre
      yearlyProfit: { year: number; profit: number }[];
    };

    export type RotationCard = {
      id: RotationId; name: string; seasons: string[];
      calendar: ("grow" | "bare")[];      // 12 months, Jan-Dec
      heatRiskMonths: number[];         // 1-12
      soil: { legume: number; livingRoots: number; residue: number; lowTillage: number; diversity: number; total: number };
      stats: { avgProfit: number; profitPerAf: number; worst1in5: number; avgWaterAf: number };
      why: string; evidence: string; benefits: string; gaps: string; checkLocally: string;
    };

    export type PlanResponse = {
      schemaVersion: "1.0";
      dataSource: "sample" | "static" | "live";
      recommended: { mix: Mix; metrics: Metrics };
      current: { mix: Mix; metrics: Metrics };
      frontier: { worst1in5: number; avgProfit: number; mix: Mix }[];
      rotations: RotationCard[];
      stressTests: { year: number; label: string; currentProfit: number; recommendedProfit: number; currentWater: number; recommendedWater: number }[];
      backtest: { strategy: string; avgProfit: number; worst1in5: number; avgWater: number }[];
      correlations: { a: RotationId; b: RotationId; r: number }[];
      context: {
        graceTwsCm: { date: string; value: number }[];
        heatDaysPerYear: { year: number; days: number }[];
        et0MonthlyMm: { month: number; mm: number }[];
        etCheck: { crop: string; modeledMm: number; satelliteMm: number }[];
      };
      assumptions: string[];
    };

## 8. Sample model (runs in the browser until the backend exists)

Create src/model/ with sampleData.ts, engine.ts, metrics.ts, and tests. Everything it produces has dataSource "sample" and the UI shows a "Sample data" badge.

Sample scenario data: 5 rotations x 20 years (2005-2024), generated deterministically with a seeded RNG (mulberry32, seed 2026). Each year has a shared "heat" factor and a shared "price" factor so rotations are realistically correlated: hot years raise water need and cut profit; price years move all crop revenues together (fallow excepted). PLACEHOLDER parameters for building the UI only (NOT real estimates; real data replaces them):

- alfalfa: profit mean $450/acre, sd $220; applied water mean 5.2 AF/acre, sd 0.4; soil 85
- cotton_barley: profit $380, sd $260; water 4.4, sd 0.35; soil 55
- durum_sorghum: profit $300, sd $180; water 3.6, sd 0.3; soil 60
- barley_fallow: profit $140, sd $90; water 1.9, sd 0.2; soil 35
- fallow: profit -$40, sd $10; water 0.0; soil 15

Sample calendars (illustrative; the science teammate will confirm): alfalfa grows all 12 months; cotton_barley = cotton Apr-Oct, bare Nov, barley Dec-Mar shown as a two-year sequence; durum_sorghum = durum Dec-May, bare Jun, sorghum Jul-Oct, bare Nov; barley_fallow = barley Dec-May, bare Jun-Nov; fallow bare all year. Heat-risk months: Jun-Aug. Also generate sample context series (a declining GRACE line with seasonal wiggle, rising hot days, a summer-peaking ET0 curve, ET check within +/-15%), all labeled sample. Default current mix: 70% alfalfa, 30% cotton_barley.

Engine (mirror of the backend's math, same output shape):

- Enumerate every mix in 5% steps across the 5 rotations (10,626 mixes), precomputed once and memoized.
- For each mix: yearly profit = sum of share x rotation profit; avgProfit = mean over 20 years; worst1in5 = mean of the 4 lowest years; maxWater = max over years of the share-weighted applied water; soilScore = share-weighted soil score.
- Feasible = maxWater <= water cap (every year) AND soilScore >= minimum AND shares <= maxShare.
- Recommended = feasible mix maximizing (1 - riskLevel) * worst1in5 + riskLevel * avgProfit.
- Frontier = Pareto-optimal feasible mixes on (worst1in5, avgProfit), sorted by worst1in5.
- waterValuePerAf = (best objective with cap + 0.1 minus best objective with cap) / 0.1, in dollars per acre per extra acre-foot. Show 0 when the water cap isn't binding.
- Fallow alone always satisfies water, so the problem is always feasible when its soil score passes; if nothing is feasible, return a clear message telling the user which constraint to relax.
- Tests: shares sum to 1; water cap holds in every year; riskLevel 0 maximizes worst1in5 among feasible mixes; frontier is monotonic; deterministic output for the same seed.

## 9. API client and backend integration

- src/api/client.ts exports one function: getPlan(req: PlanRequest): Promise<PlanResponse>.
- Mode from VITE_DATA_MODE: "sample" (default: runs src/model), "static" (loads /results/{region}/w{cap}_r{risk}_s{soil}.json from public/, values rounded to the grid), "live" (POST to VITE_API_BASE_URL + "/api/plan").
- Validate every response with zod. On any error, show a friendly banner and fall back to sample mode.
- Components NEVER import from src/model or call fetch. They receive data via a usePlan(request) hook in src/hooks/usePlan.ts, which debounces slider changes (150 ms) and exposes { data, isLoading, error }.
- Write docs/BACKEND_INTEGRATION.md explaining the three modes, the contract, and how to drop static result files into public/results/.
- Add scripts/export-sample.ts that writes the sample engine's output for a grid of inputs to public/results/ so static mode works out of the box and the backend team has exact example files.

## 10. Words on screen (EN; draft ES and mark it for human review)

Use short sentences and second person ("your water"). Tooltip glossary, one sentence each: acre-foot, evapotranspiration, reference ET, worst 1-in-5 years, efficient frontier, soil-health score, shadow price ("what one more acre-foot is worth to you"), GRACE, NASA POWER, fallow, rotation. Numbers: dollars with no cents, acre-feet to one decimal, scores as whole numbers. Never say "guaranteed," "optimal for you," or "AI decided." Say "Based on 20 past years, this mix would have…"

## 11. Milestones (build in this order; commit after each)

1. Scaffold, Tailwind tokens, fonts, layout shell (header, footer, nav, sample badge), i18n, routing, empty pages.
2. Types, zod schemas, sample data, engine, tests, client in sample mode, usePlan hook.
3. My Plan page complete, mobile and desktop.
4. Trade-offs page (frontier with faded previous line) and the 20-years dot strip.
5. Compare page (cards, calendar strip, soil breakdown, explanation text).
6. Why this region and Stress test pages.
7. Report (print CSS) and Method page (KaTeX, heatmap, CSV export, backtest table).
8. Polish: accessibility audit (axe), Lighthouse 90+ on accessibility and performance, ES strings, static export script, README, deploy config. Tell me the deploy command.

## 12. Do not

- Do not use NASA logos, mission patches, or photos of people.
- Do not present sample numbers as real; the badge stays until real data loads.
- Do not hide information behind hover only.

---

## Decisions made with the team after the brief (these override the brief where they differ)

- Product name stays **Croptimizing**.
- **Default soil-health minimum is 30, not 50.** With the placeholder numbers, water 2.4 plus soil 50 has no feasible mix, and soil 40 pins the plan to one corner. Water default stays 2.4.
- **Placeholder profits retuned** (water and soil unchanged) so the frontier and risk slider show a real trade-off: alfalfa $450 sd $150; cotton_barley $500 sd $320 (high return, high risk); durum_sorghum $300 sd $110; barley_fallow $140 sd $60; fallow as briefed. Winter crops carry little heat exposure; cotton is less tied to the shared price factor.
- **Motion has two tiers.** Feedback (press, hover, slider, toggles) stays under 200 ms. Entrances, number changes, panels, and the landing hero may run 250 to 500 ms. Everything collapses to short fades under prefers-reduced-motion.
- Landing page: deep navy hero with the "Fields re-plan" animation (field parcels re-plan as the water gauge drains from 5.2 to 2.4 AF/acre), handing off to light app pages.
- Inter only. No em dashes anywhere in UI copy or locale files (a test enforces this). Avoid generic "AI-made site" tells: emoji, gradient text, purple, sparkle icons, buzzword copy.
- transitions.dev recipes are applied as a final polish pass, retuned to the two motion tiers.
- Real NASA imagery (public domain, credited in text, no logos) may be used; ask before each download.
