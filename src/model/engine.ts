// In-browser mirror of the backend's math. Same output shape as the API.

import { InfeasibleError } from '../api/errors';
import type { Metrics, Mix, PlanRequest, PlanResponse, RotationCard, RotationId } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { ASSUMPTIONS, BACKTEST_LABELS, ROTATION_TEXT, STRESS_LABELS, whyText } from './content';
import {
  correlation,
  enumerateMixes,
  getMixStats,
  mean,
  mixAt,
  mixCount,
  seriesForMix,
  soilForMix,
  UNITS,
  worstShareMean,
  type Adjust,
  type MixStats,
} from './metrics';
import {
  BASE_EFFICIENCY,
  CALENDARS,
  getSampleContext,
  getScenarioData,
  HEAT_RISK_MONTHS,
  SOIL_PARTS,
} from './sampleData';

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

function metricsFor(mix: Mix, adjust: Adjust, waterValuePerAf: number, years?: number[]): Metrics {
  const s = seriesForMix(mix, adjust);
  const use = years ? s.filter((x) => years.includes(x.year)) : s;
  const profits = use.map((x) => x.profit);
  return {
    avgProfitPerAcre: round(mean(profits)),
    worst1in5PerAcre: round(worstShareMean(profits)),
    maxWaterAfPerAcre: round(Math.max(...use.map((x) => x.water)), 3),
    soilScore: round(soilForMix(mix), 2),
    waterValuePerAf: round(waterValuePerAf),
    yearlyProfit: use.map((x) => ({ year: x.year, profit: round(x.profit) })),
  };
}

/**
 * If a plan needs more water than the budget in a year, the shortfall share of
 * each irrigated rotation goes fallow that year.
 */
export function curtailedYear(mix: Mix, yearIndex: number, cap: number, adjust: Adjust) {
  const data = getScenarioData();
  const scale = BASE_EFFICIENCY / adjust.efficiency;
  let need = 0;
  let profit = 0;
  for (const id of ROTATION_IDS) {
    const sh = mix[id] ?? 0;
    const w = data.water[id][yearIndex] * scale;
    need += sh * w;
    profit += sh * (data.profit[id][yearIndex] - adjust.waterCostPerAf * w);
  }
  if (need <= cap + EPS || need === 0) return { need, profit };
  const f = cap / need; // fraction of irrigated land that still gets water
  const fallowProfit = data.profit.fallow[yearIndex];
  let curtailed = (mix.fallow ?? 0) * fallowProfit;
  for (const id of ROTATION_IDS) {
    if (id === 'fallow') continue;
    const sh = mix[id] ?? 0;
    const w = data.water[id][yearIndex] * scale;
    curtailed += sh * f * (data.profit[id][yearIndex] - adjust.waterCostPerAf * w) + sh * (1 - f) * fallowProfit;
  }
  return { need, profit: curtailed };
}

function rotationCards(lang: 'en' | 'es', recommended: Mix, current: Mix, adjust: Adjust): RotationCard[] {
  const data = getScenarioData();
  const scale = BASE_EFFICIENCY / adjust.efficiency;
  return ROTATION_IDS.map((id) => {
    const txt = ROTATION_TEXT[lang][id];
    const water = data.water[id].map((w) => w * scale);
    const profits = data.profit[id].map((p, t) => p - adjust.waterCostPerAf * water[t]);
    const avgWater = mean(water);
    const avgProfit = mean(profits);
    const parts = SOIL_PARTS[id];
    return {
      id,
      name: txt.name,
      seasons: txt.seasons,
      calendar: CALENDARS[id],
      heatRiskMonths: id === 'fallow' ? [] : HEAT_RISK_MONTHS,
      soil: { ...parts, total: data.soil[id] },
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
  const data = getScenarioData();
  const adjust: Adjust = {
    waterCostPerAf: req.waterCostPerAf ?? 0,
    efficiency: req.irrigationEfficiency ?? BASE_EFFICIENCY,
  };
  const c: Constraints = { cap: req.waterCapAfPerAcre, minSoil: req.minSoilScore, maxShare: req.maxShare };
  const risk = Math.min(1, Math.max(0, req.riskLevel));
  const stats = getMixStats(adjust);

  const feasible = feasibleIndices(stats, c);
  const best = bestIndex(stats, feasible, risk);
  if (best < 0) throw explainInfeasible(stats, c);

  const recMix = mixAt(best);
  const currentMix = normalizeMix(req.currentMix);
  const wv = waterValue(stats, c, risk);
  const recommended = { mix: cleanMix(recMix), metrics: metricsFor(recMix, adjust, wv) };
  const current = { mix: cleanMix(currentMix), metrics: metricsFor(currentMix, adjust, 0) };

  const frontier = paretoFrontier(stats, feasible).map((k) => ({
    worst1in5: round(stats.worst[k]),
    avgProfit: round(stats.avg[k]),
    mix: cleanMix(mixAt(k)),
  }));

  const lang = req.lang;
  const labels = STRESS_LABELS[lang];
  const recSeries = seriesForMix(recMix, adjust);
  const stressTests = data.years.map((year, t) => {
    const cur = curtailedYear(currentMix, t, c.cap, adjust);
    return {
      year,
      label: labels[year] ?? String(year),
      currentProfit: round(cur.profit),
      recommendedProfit: round(recSeries[t].profit),
      currentWater: round(cur.need, 3),
      recommendedWater: round(recSeries[t].water, 3),
    };
  });

  const backtest = runBacktest(req, adjust, c, risk, currentMix);

  const correlations: PlanResponse['correlations'] = [];
  for (const a of ROTATION_IDS)
    for (const b of ROTATION_IDS) correlations.push({ a, b, r: round(correlation(data.profit[a], data.profit[b]), 3) });

  return {
    schemaVersion: '1.0',
    dataSource: 'sample',
    recommended,
    current,
    frontier,
    rotations: rotationCards(lang, recMix, currentMix, adjust),
    stressTests,
    backtest,
    correlations,
    context: getSampleContext(),
    assumptions: ASSUMPTIONS[lang],
  };
}

export const TRAIN_YEARS = Array.from({ length: 10 }, (_, i) => 2005 + i);
export const TEST_YEARS = Array.from({ length: 10 }, (_, i) => 2015 + i);

/** Pick a plan using 2005 to 2014 only, then score it on 2015 to 2024. */
function runBacktest(req: PlanRequest, adjust: Adjust, c: Constraints, risk: number, currentMix: Mix): PlanResponse['backtest'] {
  const data = getScenarioData();
  const trainIdx = TRAIN_YEARS.map((y) => data.years.indexOf(y));
  const train = getMixStats(adjust, trainIdx);
  const feasible = feasibleIndices(train, c);
  const L = BACKTEST_LABELS[req.lang];

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
  const cur = score(currentMix);
  const curFits = seriesForMix(currentMix, adjust).every((x) => x.water <= c.cap + EPS);
  rows.push({ strategy: curFits ? L.currentFits : L.current, ...cur });
  return rows;
}

export type { RotationId };
