// In-browser mirror of the backend's math. Same output shape as the API.

import { InfeasibleError } from '../api/errors';
import type { Classic, Metrics, Mix, PlanRequest, PlanResponse, RiskStats, RotationCard, RotationId, SensitivityRow, SoilPartId } from '../api/types';
import { ROTATION_IDS, SOIL_PART_IDS } from '../api/types';
import { ASSUMPTIONS, BACKTEST_LABELS, ROTATION_FAMILIES, ROTATION_TEXT, STRESS_LABELS, whyText } from './content';
import {
  correlation,
  enumerateMixes,
  getMixStats,
  mean,
  mixAt,
  mixCount,
  mixSoilVector,
  seriesForMix,
  soilForMix,
  UNITS,
  worstShareMean,
  type Adjust,
  type MixStats,
} from './metrics';
import { getDataset } from './dataset';
import { BASE_EFFICIENCY, CALENDARS, HEAT_RISK_MONTHS } from './sampleData';

const EPS = 1e-9;
const R = ROTATION_IDS.length;
export const WATER_STEP = 0.1;

export type Constraints = {
  cap: number;
  minSoil: number;
  maxShare?: Mix;
};

function maxShareUnits(maxShare?: Mix): number[] {
  return ROTATION_IDS.map((id) => {
    const m = maxShare?.[id];
    return m === undefined ? UNITS : Math.floor(m * UNITS + EPS);
  });
}

/** Indices of every mix that fits water (every year), soil, and share limits. */
export function feasibleIndices(stats: MixStats, c: Constraints, opts: { ignoreSoil?: boolean; ignoreShare?: boolean } = {}): number[] {
  const u = enumerateMixes();
  const limits = maxShareUnits(c.maxShare);
  const out: number[] = [];
  const n = mixCount();
  for (let k = 0; k < n; k++) {
    if (stats.maxWater[k] > c.cap + EPS) continue;
    if (!opts.ignoreSoil && stats.soil[k] < c.minSoil - EPS) continue;
    if (!opts.ignoreShare) {
      let ok = true;
      for (let i = 0; i < R; i++) if (u[k * R + i] > limits[i]) ok = false;
      if (!ok) continue;
    }
    out.push(k);
  }
  return out;
}

export function objective(stats: MixStats, k: number, risk: number): number {
  return (1 - risk) * stats.worst[k] + risk * stats.avg[k];
}

/** Best feasible mix for the risk level, or -1 when nothing fits. Ties go to higher soil, then lower index. */
export function bestIndex(stats: MixStats, feasible: number[], risk: number): number {
  let best = -1;
  let bestObj = -Infinity;
  for (const k of feasible) {
    const o = objective(stats, k, risk);
    if (o > bestObj + EPS || (Math.abs(o - bestObj) <= EPS && best >= 0 && stats.soil[k] > stats.soil[best] + EPS)) {
      best = k;
      bestObj = o;
    }
  }
  return best;
}

/** Pareto-optimal mixes on (worst1in5, avgProfit), sorted by worst1in5 ascending. */
export function paretoFrontier(stats: MixStats, feasible: number[]): number[] {
  const sorted = [...feasible].sort((a, b) => stats.worst[b] - stats.worst[a] || stats.avg[b] - stats.avg[a]);
  const out: number[] = [];
  let bestAvg = -Infinity;
  for (const k of sorted) {
    if (stats.avg[k] > bestAvg + EPS) {
      out.push(k);
      bestAvg = stats.avg[k];
    }
  }
  return out.reverse();
}

/** Feasible mixes no other feasible mix beats on both soil score and average profit, sorted by soil. */
export function soilFrontier(stats: MixStats, feasible: number[]): number[] {
  const sorted = [...feasible].sort((a, b) => stats.soil[b] - stats.soil[a] || stats.avg[b] - stats.avg[a]);
  const out: number[] = [];
  let bestAvg = -Infinity;
  for (const k of sorted) {
    if (stats.avg[k] > bestAvg + EPS) {
      out.push(k);
      bestAvg = stats.avg[k];
    }
  }
  return out.reverse();
}

/**
 * Classic mean-variance efficient set: feasible mixes that no other feasible mix
 * beats on both higher average and lower standard deviation of yearly profit.
 * Sorted by average profit.
 */
export function meanVarianceSet(stats: MixStats, feasible: number[]): number[] {
  const sorted = [...feasible].sort((a, b) => stats.sd[a] - stats.sd[b] || stats.avg[b] - stats.avg[a]);
  const out: number[] = [];
  let bestAvg = -Infinity;
  for (const k of sorted) {
    if (stats.avg[k] > bestAvg + EPS) {
      out.push(k);
      bestAvg = stats.avg[k];
    }
  }
  return out;
}

/** Classic points plus how they compare with ours near the suggested plan's average. */
export function classicComparison(stats: MixStats, feasible: number[], recommendedAvg: number): Classic {
  const set = meanVarianceSet(stats, feasible);
  const points = set.map((k) => ({ worst1in5: round(stats.worst[k]), avgProfit: round(stats.avg[k]), sd: round(stats.sd[k]), mix: cleanMix(mixAt(k)) }));
  if (set.length === 0) return { points, atSuggested: null, largestGap: null };
  // Best worst-years result among feasible mixes earning at least this average.
  const gapAt = (c: number) => {
    let ours = -Infinity;
    for (const k of feasible) if (stats.avg[k] >= stats.avg[c] - EPS && stats.worst[k] > ours) ours = stats.worst[k];
    return { avgProfit: round(stats.avg[c]), classicWorst1in5: round(stats.worst[c]), ourWorst1in5: round(ours) };
  };
  const near = set.reduce((a, b) => (Math.abs(stats.avg[b] - recommendedAvg) < Math.abs(stats.avg[a] - recommendedAvg) ? b : a));
  const gaps = set.map(gapAt);
  const largestGap = gaps.reduce((a, b) => (b.ourWorst1in5 - b.classicWorst1in5 > a.ourWorst1in5 - a.classicWorst1in5 ? b : a));
  return { points, atSuggested: gapAt(near), largestGap };
}

/**
 * Risk ratios for one plan. The benchmark is fallow (the do-nothing return), so a
 * ratio says how much extra profit the plan earns per unit of swing.
 */
export function riskStats(mix: Mix, adjust: Adjust): RiskStats & { fallowAvg: number } {
  const profits = seriesForMix(mix, adjust).map((x) => x.profit);
  const fallowAvg = mean(seriesForMix({ fallow: 1 }, adjust).map((x) => x.profit));
  const avg = mean(profits);
  const sdOf = (xs: number[]) => {
    const m = mean(xs);
    return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
  };
  const sd = sdOf(profits);
  const downside = Math.sqrt(mean(profits.map((p) => Math.min(0, p - fallowAvg) ** 2)));
  let weighted = 0;
  for (const id of ROTATION_IDS) {
    const sh = mix[id] ?? 0;
    if (sh > 0) weighted += sh * sdOf(seriesForMix({ [id]: 1 }, adjust).map((x) => x.profit));
  }
  const excess = avg - fallowAvg;
  return {
    sd: round(sd),
    sharpe: sd > EPS ? round(excess / sd, 3) : null,
    sortino: downside > EPS ? round(excess / downside, 3) : null,
    diversification: weighted > EPS ? round(1 - sd / weighted, 4) : null,
    fallowAvg: round(fallowAvg),
  };
}

function bestObjectiveAt(stats: MixStats, c: Constraints, risk: number): number | null {
  const f = feasibleIndices(stats, c);
  const k = bestIndex(stats, f, risk);
  return k < 0 ? null : objective(stats, k, risk);
}

/** What one more acre-foot is worth, in $/acre per AF. 0 when water is not the binding limit. */
export function waterValue(stats: MixStats, c: Constraints, risk: number): number {
  const now = bestObjectiveAt(stats, c, risk);
  const more = bestObjectiveAt(stats, { ...c, cap: c.cap + WATER_STEP }, risk);
  if (now === null || more === null) return 0;
  const v = (more - now) / WATER_STEP;
  return v < 0.5 ? 0 : v;
}

function explainInfeasible(stats: MixStats, c: Constraints): InfeasibleError {
  const waterOnly = feasibleIndices(stats, c, { ignoreSoil: true });
  const maxSoil = waterOnly.reduce((m, k) => Math.max(m, stats.soil[k]), -Infinity);
  // Smallest cap that would allow this soil minimum (and share limits).
  const soilOk = feasibleIndices(stats, { ...c, cap: Infinity });
  const minWater = soilOk.reduce((m, k) => Math.min(m, stats.maxWater[k]), Infinity);
  if (waterOnly.length > 0) {
    return new InfeasibleError({
      code: 'infeasible',
      relax: 'soil',
      maxSoilAtThisWater: Math.floor(maxSoil + EPS),
      minWaterForThisSoil: Number.isFinite(minWater) ? Math.ceil(minWater * 10 - EPS) / 10 : undefined,
    });
  }
  const noShare = feasibleIndices(stats, c, { ignoreShare: true, ignoreSoil: true });
  if (noShare.length > 0) return new InfeasibleError({ code: 'infeasible', relax: 'maxShare' });
  return new InfeasibleError({
    code: 'infeasible',
    relax: 'water',
    minWaterForThisSoil: Number.isFinite(minWater) ? Math.ceil(minWater * 10 - EPS) / 10 : undefined,
  });
}

function round(x: number, d = 2): number {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}

function cleanMix(mix: Mix): Mix {
  const out: Mix = {};
  for (const id of ROTATION_IDS) {
    const v = mix[id];
    if (v && v > 0) out[id] = round(v, 4);
  }
  return out;
}

/**
 * Soil score of each rotation from the selected soil parts, rescaled to 0 to 100.
 * With all five parts it is simply their sum.
 */
export function rotationSoil(selected: readonly SoilPartId[] = SOIL_PART_IDS): Record<RotationId, number> {
  const parts = getDataset().soilParts;
  const pick = selected.length > 0 ? selected : SOIL_PART_IDS;
  const out = {} as Record<RotationId, number>;
  for (const id of ROTATION_IDS) out[id] = (pick.reduce((s, p) => s + parts[id][p], 0) * 100) / (20 * pick.length);
  return out;
}

/** Per-mix stats with the soil score for the selected soil goals. */
function statsWith(adjust: Adjust, soilVec: Float64Array, yearIdx?: number[]): MixStats {
  return { ...getMixStats(adjust, yearIdx), soil: soilVec };
}

function metricsFor(mix: Mix, adjust: Adjust, waterValuePerAf: number, rotSoil: Record<RotationId, number>, years?: number[]): Metrics {
  const s = seriesForMix(mix, adjust);
  const use = years ? s.filter((x) => years.includes(x.year)) : s;
  const profits = use.map((x) => x.profit);
  return {
    avgProfitPerAcre: round(mean(profits)),
    worst1in5PerAcre: round(worstShareMean(profits)),
    maxWaterAfPerAcre: round(Math.max(...use.map((x) => x.water)), 3),
    soilScore: round(soilForMix(mix, rotSoil), 2),
    waterValuePerAf: round(waterValuePerAf),
    yearlyProfit: use.map((x) => ({ year: x.year, profit: round(x.profit) })),
    yearlyWater: use.map((x) => ({ year: x.year, water: round(x.water, 3) })),
  };
}

/** Applied water per acre for each rotation in one scenario year. */
export type WaterYear = Record<RotationId, number>;

/** Water need of every rotation in each scenario year (optionally a subset of years). */
export function waterScenario(adjust: Adjust, yearIdx?: number[]): WaterYear[] {
  const data = getDataset().scenario;
  const scale = BASE_EFFICIENCY / adjust.efficiency;
  const idx = yearIdx ?? data.years.map((_, t) => t);
  return idx.map((t) => {
    const w = {} as WaterYear;
    for (const id of ROTATION_IDS) w[id] = data.water[id][t] * scale;
    return w;
  });
}

export type FitResult = {
  /** The cut-back mix (shares still sum to 1). */
  mix: Mix;
  /** True when acres had to be left fallow. */
  trimmed: boolean;
  /** What the original mix needs in its highest-need year, AF per acre. */
  needAfPerAcre: number;
};

/**
 * Cut a plan back to fit the water budget. The plan's highest-need year sets the
 * cut: the irrigated acres the budget cannot cover in that year sit fallow, so the
 * cut-back plan fits the budget in every scenario year, the same standard the
 * suggested plan must meet. A plan that already fits is returned unchanged.
 */
export function fitToBudget(mix: Mix, scenario: WaterYear[], waterCap: number): FitResult {
  let need = 0;
  for (const year of scenario) {
    let n = 0;
    for (const id of ROTATION_IDS) n += (mix[id] ?? 0) * year[id];
    need = Math.max(need, n);
  }
  if (need <= waterCap + EPS || need === 0) return { mix: { ...mix }, trimmed: false, needAfPerAcre: need };
  const f = Math.max(0, waterCap) / need; // share of irrigated acres that still gets water
  const out: Mix = {};
  let fallow = mix.fallow ?? 0;
  for (const id of ROTATION_IDS) {
    if (id === 'fallow') continue;
    const sh = mix[id] ?? 0;
    if (sh <= 0) continue;
    out[id] = sh * f;
    fallow += sh * (1 - f);
  }
  if (fallow > 0) out.fallow = fallow;
  return { mix: out, trimmed: true, needAfPerAcre: need };
}

function rotationCards(lang: 'en' | 'es', recommended: Mix, current: Mix, adjust: Adjust, rotSoil: Record<RotationId, number>): RotationCard[] {
  const ds = getDataset();
  const data = ds.scenario;
  const scale = BASE_EFFICIENCY / adjust.efficiency;
  return ROTATION_IDS.map((id) => {
    const txt = ROTATION_TEXT[lang][id];
    const water = data.water[id].map((w) => w * scale);
    const profits = data.profit[id].map((p, t) => p - adjust.waterCostPerAf * water[t]);
    const avgWater = mean(water);
    const avgProfit = mean(profits);
    const parts = ds.soilParts[id];
    return {
      id,
      name: txt.name,
      seasons: txt.seasons,
      calendar: CALENDARS[id],
      heatRiskMonths: id === 'fallow' ? [] : HEAT_RISK_MONTHS,
      // total follows the selected soil goals; the five parts are always shown as they are.
      soil: { ...parts, total: round(rotSoil[id], 1) },
      stats: {
        avgProfit: round(avgProfit),
        profitPerAf: avgWater > 0 ? round(avgProfit / avgWater) : 0,
        worst1in5: round(worstShareMean(profits)),
        avgWaterAf: round(avgWater, 3),
      },
      why: whyText(lang, id, recommended[id] ?? 0, (current[id] ?? 0) > 0),
      evidence: txt.evidence,
      benefits: txt.benefits,
      gaps: txt.gaps,
      checkLocally: txt.checkLocally,
      yearlyWaterAf: water.map((w) => round(w, 3)),
      families: ROTATION_FAMILIES[id],
      pests: txt.pests,
      infiltration: txt.infiltration,
    };
  });
}

export function normalizeMix(mix: Mix): Mix {
  const total = ROTATION_IDS.reduce((s, id) => s + (mix[id] ?? 0), 0);
  if (total <= 0) return { fallow: 1 };
  const out: Mix = {};
  for (const id of ROTATION_IDS) if ((mix[id] ?? 0) > 0) out[id] = (mix[id] ?? 0) / total;
  return out;
}

/** Run the full plan. Throws InfeasibleError when no mix fits. */
export function runPlan(req: PlanRequest): PlanResponse {
  const ds = getDataset();
  const data = ds.scenario;
  const adjust: Adjust = {
    waterCostPerAf: req.waterCostPerAf ?? 0,
    efficiency: req.irrigationEfficiency ?? BASE_EFFICIENCY,
  };
  const c: Constraints = { cap: req.waterCapAfPerAcre, minSoil: req.minSoilScore, maxShare: req.maxShare };
  const risk = Math.min(1, Math.max(0, req.riskLevel));
  const rotSoil = rotationSoil(req.soilParts);
  const soilVec = mixSoilVector(rotSoil);
  const stats = statsWith(adjust, soilVec);

  const feasible = feasibleIndices(stats, c);
  const best = bestIndex(stats, feasible, risk);
  if (best < 0) throw explainInfeasible(stats, c);

  const recMix = mixAt(best);
  const asFarmedMix = normalizeMix(req.currentMix);
  // Compare against the current plan cut back to fit the same water budget (fair comparison).
  const fit = fitToBudget(asFarmedMix, waterScenario(adjust), c.cap);
  const currentMix = fit.mix;
  const wv = waterValue(stats, c, risk);
  const recommended = { mix: cleanMix(recMix), metrics: metricsFor(recMix, adjust, wv, rotSoil) };
  const current = { mix: cleanMix(currentMix), metrics: metricsFor(currentMix, adjust, 0, rotSoil) };
  const currentAsFarmed = { mix: cleanMix(asFarmedMix), metrics: metricsFor(asFarmedMix, adjust, 0, rotSoil) };

  const frontier = paretoFrontier(stats, feasible).map((k) => ({
    worst1in5: round(stats.worst[k]),
    avgProfit: round(stats.avg[k]),
    mix: cleanMix(mixAt(k)),
  }));

  const soilPareto = soilFrontier(stats, feasible).map((k) => ({
    soilScore: round(stats.soil[k], 2),
    avgProfit: round(stats.avg[k]),
    mix: cleanMix(mixAt(k)),
  }));

  const lang = req.lang;
  const labels = STRESS_LABELS[lang];
  const recSeries = seriesForMix(recMix, adjust);
  const curSeries = seriesForMix(currentMix, adjust);
  const stressTests = data.years.map((year, t) => ({
    year,
    label: labels[year] ?? String(year),
    currentProfit: round(curSeries[t].profit),
    recommendedProfit: round(recSeries[t].profit),
    currentWater: round(curSeries[t].water, 3),
    recommendedWater: round(recSeries[t].water, 3),
  }));

  const backtest = runBacktest(req, adjust, c, risk, asFarmedMix, soilVec);
  const sensitivity = runSensitivity(adjust, c, risk, best, soilVec);
  const classic = classicComparison(stats, feasible, stats.avg[best]);
  const recRisk = riskStats(recMix, adjust);
  const curRisk = riskStats(currentMix, adjust);
  const ratios = (r: typeof recRisk): RiskStats => ({ sd: r.sd, sharpe: r.sharpe, sortino: r.sortino, diversification: r.diversification });
  const riskMetrics = { recommended: ratios(recRisk), current: ratios(curRisk), fallowAvg: recRisk.fallowAvg };

  const correlations: PlanResponse['correlations'] = [];
  for (const a of ROTATION_IDS)
    for (const b of ROTATION_IDS) correlations.push({ a, b, r: round(correlation(data.profit[a], data.profit[b]), 3) });

  return {
    schemaVersion: '1.0',
    // Real data in the engine reads as "static" (precomputed inputs, not a live backend).
    dataSource: ds.fromFile ? 'static' : 'sample',
    recommended,
    current,
    currentAsFarmed,
    frontier,
    rotations: rotationCards(lang, recMix, asFarmedMix, adjust, rotSoil),
    stressTests,
    backtest,
    correlations,
    context: ds.context,
    assumptions: assumptionsFor(lang, ds),
    sensitivity,
    classic,
    soilFrontier: soilPareto,
    riskMetrics,
    sources: { ...ds.sources },
    ...(ds.validation ? { validation: ds.validation } : {}),
    ...(ds.waterPresets ? { waterPresets: ds.waterPresets } : {}),
  };
}

/** The sample warning shows only while the optimizer's inputs include sample data. */
function assumptionsFor(lang: 'en' | 'es', ds: ReturnType<typeof getDataset>): string[] {
  const planReal = (['weather', 'cropBudgets', 'prices', 'soil'] as const).every((id) => ds.sources[id] === 'real');
  const list = ASSUMPTIONS[lang](yearRange(ds.scenario.years));
  return planReal ? list.slice(1) : list;
}

/** First and last scenario year, and the split used by the backtest. */
export function yearRange(years: number[]) {
  const half = Math.floor(years.length / 2);
  return { n: years.length, from: years[0], to: years[years.length - 1], trainTo: years[half - 1], testFrom: years[half] };
}

/** The suggested plan re-run with profits, water cost, and irrigation efficiency changed. */
export function runSensitivity(adjust: Adjust, c: Constraints, risk: number, baseIndex: number, soilVec: Float64Array = mixSoilVector(rotationSoil())): SensitivityRow[] {
  const cases: { case: SensitivityRow['case']; value: number; adjust: Adjust }[] = [
    { case: 'profitDown', value: -0.2, adjust: { ...adjust, profitShock: -0.2 } },
    { case: 'profitUp', value: 0.2, adjust: { ...adjust, profitShock: 0.2 } },
  ];
  if (adjust.waterCostPerAf > 0) {
    cases.push({ case: 'waterCostDown', value: round(adjust.waterCostPerAf * 0.8), adjust: { ...adjust, waterCostPerAf: adjust.waterCostPerAf * 0.8 } });
    cases.push({ case: 'waterCostUp', value: round(adjust.waterCostPerAf * 1.2), adjust: { ...adjust, waterCostPerAf: adjust.waterCostPerAf * 1.2 } });
  }
  cases.push({ case: 'efficiencyLow', value: 0.65, adjust: { ...adjust, efficiency: 0.65 } });
  cases.push({ case: 'efficiencyHigh', value: 0.85, adjust: { ...adjust, efficiency: 0.85 } });
  return cases.map((x) => {
    const stats = statsWith(x.adjust, soilVec);
    const k = bestIndex(stats, feasibleIndices(stats, c), risk);
    if (k < 0) return { case: x.case, value: x.value, avgProfit: null, worst1in5: null, mix: null, mixChanged: true };
    return {
      case: x.case,
      value: x.value,
      avgProfit: round(stats.avg[k]),
      worst1in5: round(stats.worst[k]),
      mix: cleanMix(mixAt(k)),
      mixChanged: k !== baseIndex,
    };
  });
}

/** Pick a plan using the first half of the years only (2005 to 2014), then score it on the second half. */
function runBacktest(req: PlanRequest, adjust: Adjust, c: Constraints, risk: number, currentMix: Mix, soilVec: Float64Array): PlanResponse['backtest'] {
  const data = getDataset().scenario;
  const half = Math.floor(data.years.length / 2);
  const trainIdx = data.years.slice(0, half).map((_, i) => i);
  const TEST_YEARS = data.years.slice(half);
  const train = statsWith(adjust, soilVec, trainIdx);
  const feasible = feasibleIndices(train, c);
  const L = BACKTEST_LABELS[req.lang](yearRange(data.years));

  const score = (mix: Mix) => {
    const s = seriesForMix(mix, adjust).filter((x) => TEST_YEARS.includes(x.year));
    const profits = s.map((x) => x.profit);
    return {
      avgProfit: round(mean(profits)),
      worst1in5: round(worstShareMean(profits)),
      avgWater: round(mean(s.map((x) => x.water)), 3),
    };
  };

  const rows: PlanResponse['backtest'] = [];
  const pick = (r: number) => bestIndex(train, feasible, r);
  const kSuggested = pick(risk);
  if (kSuggested >= 0) rows.push({ strategy: L.suggested, ...score(mixAt(kSuggested)) });
  const kSafe = pick(0);
  if (kSafe >= 0) rows.push({ strategy: L.safest, ...score(mixAt(kSafe)) });
  const kMax = pick(1);
  if (kMax >= 0) rows.push({ strategy: L.maxProfit, ...score(mixAt(kMax)) });
  // The current plan is cut back with the same rule, using only the years the suggested plan saw.
  const fit = fitToBudget(currentMix, waterScenario(adjust, trainIdx), c.cap);
  rows.push({ strategy: fit.trimmed ? L.current : L.currentFits, ...score(fit.mix) });
  return rows;
}

export type { RotationId };
