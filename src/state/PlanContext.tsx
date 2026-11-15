import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { isInfeasible, type InfeasibleDetail } from '../api/errors';
import type { Mix, PlanRequest, PlanResponse, RotationId } from '../api/types';
import { DEMO_DEFAULTS, YEARS_BEFORE_DATA } from '../config/demo';
import { usePlan } from '../hooks/usePlan';
import { isSample, PLAN_DATASETS } from '../lib/sources';

export type Region = PlanRequest['region'];

export type Farm = {
  name: string;
  acres: number;
  region: Region;
  /** Current crop shares, 0 to 1. */
  currentMix: Mix;
};

export type Controls = {
  water: number; // AF/acre, 0.5 to 6.0
  risk: number; // slider 0 to 100
  soil: number; // 0 to 100
  maxSharePct: Partial<Record<RotationId, number>>; // 0 to 100, missing = 100
  waterCost: number; // extra $/AF
  efficiency: number; // 0.5 to 0.95
  lease: number | null; // what one more acre-foot would cost to lease or pump, $/AF (blank = not set)
};

export const DEMO_FARM: Farm = {
  name: DEMO_DEFAULTS.name,
  acres: DEMO_DEFAULTS.acres,
  region: DEMO_DEFAULTS.region,
  currentMix: DEMO_DEFAULTS.currentMix,
};

export const DEFAULT_CONTROLS: Controls = {
  water: DEMO_DEFAULTS.water,
  risk: DEMO_DEFAULTS.risk,
  soil: DEMO_DEFAULTS.soil,
  maxSharePct: {},
  waterCost: 0,
  efficiency: 0.75,
  lease: null,
};

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function readUrl(): Partial<Controls> {
  if (typeof window === 'undefined') return {};
  const q = new URLSearchParams(window.location.search);
  const out: Partial<Controls> = {};
  const w = Number(q.get('w'));
  const r = Number(q.get('r'));
  const s = Number(q.get('s'));
  if (q.has('w') && Number.isFinite(w)) out.water = clamp(Math.round(w * 10) / 10, 0.5, 6);
  if (q.has('r') && Number.isFinite(r)) out.risk = clamp(Math.round(r), 0, 100);
  if (q.has('s') && Number.isFinite(s)) out.soil = clamp(Math.round(s), 0, 100);
  const lease = Number(q.get('lease'));
  if (q.get('lease') && Number.isFinite(lease)) out.lease = clamp(Math.round(lease), 0, 5000);
  return out;
}

type Ctx = {
  farm: Farm;
  setFarm: (f: Farm) => void;
  controls: Controls;
  setControl: <K extends keyof Controls>(k: K, v: Controls[K]) => void;
  resetControls: () => void;
  request: PlanRequest;
  /** Latest successful response (kept while new results load or when the latest is infeasible). */
  data: PlanResponse | null;
  isLoading: boolean;
  infeasible: InfeasibleDetail | null;
  /** Set when the settings have no plan and we show the nearest one that fits (soil minimum lowered). */
  softened: { soil: number } | null;
  error: unknown;
  fellBack: boolean;
  dismissFallback: () => void;
};

const PlanCtx = createContext<Ctx | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const location = useLocation();
  const [farm, setFarm] = useState<Farm>(DEMO_FARM);
  const [controls, setControls] = useState<Controls>(() => ({ ...DEFAULT_CONTROLS, ...readUrl() }));
  const lang = i18n.language === 'es' ? 'es' : 'en';

  const setControl = useCallback(<K extends keyof Controls>(k: K, v: Controls[K]) => {
    setControls((c) => ({ ...c, [k]: v }));
  }, []);
  const resetControls = useCallback(() => setControls(DEFAULT_CONTROLS), []);

  const request = useMemo<PlanRequest>(() => {
    const maxShare: Mix = {};
    for (const [id, p] of Object.entries(controls.maxSharePct)) if (p !== undefined && p < 100) maxShare[id as RotationId] = p / 100;
    return {
      region: farm.region,
      acres: farm.acres,
      waterCapAfPerAcre: controls.water,
      riskLevel: controls.risk / 100,
      minSoilScore: controls.soil,
      ...(Object.keys(maxShare).length ? { maxShare } : {}),
      ...(controls.waterCost > 0 ? { waterCostPerAf: controls.waterCost } : {}),
      ...(controls.efficiency !== DEFAULT_CONTROLS.efficiency ? { irrigationEfficiency: controls.efficiency } : {}),
      currentMix: farm.currentMix,
      lang,
    };
  }, [farm, controls, lang]);

  const plan = usePlan(request);
  const infeasible = isInfeasible(plan.error) ? plan.error.detail : null;

  // No dead ends: when the soil minimum is out of reach, also fetch the nearest plan
  // that fits (soil minimum lowered to the highest score this water can reach).
  const softSoil =
    infeasible?.relax === 'soil' && infeasible.maxSoilAtThisWater !== undefined && infeasible.maxSoilAtThisWater < controls.soil
      ? infeasible.maxSoilAtThisWater
      : null;
  const softRequest = useMemo(() => (softSoil === null ? null : { ...request, minSoilScore: softSoil }), [request, softSoil]);
  const soft = usePlan(softRequest);
  const softened = softSoil !== null && soft.data && !soft.error ? { soil: softSoil } : null;

  // Keep the last good response so other pages still work when a setting has no plan.
  const lastGood = useRef<PlanResponse | null>(null);
  if (plan.data && !plan.error) lastGood.current = plan.data;

  // Mirror the three main settings and language into the URL so links and reports are shareable.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    q.set('w', controls.water.toFixed(1));
    q.set('r', String(controls.risk));
    q.set('s', String(controls.soil));
    q.set('lang', lang);
    if (controls.lease === null) q.delete('lease');
    else q.set('lease', String(controls.lease));
    const url = `${window.location.pathname}?${q.toString()}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, '', url);
    }
  }, [controls.water, controls.risk, controls.soil, controls.lease, lang, location.pathname]);

  const value: Ctx = {
    farm,
    setFarm,
    controls,
    setControl,
    resetControls,
    request,
    data: softened ? soft.data : plan.data ?? lastGood.current,
    isLoading: plan.isLoading || (softSoil !== null && soft.isLoading),
    infeasible,
    softened,
    error: isInfeasible(plan.error) ? null : plan.error,
    fellBack: plan.fellBack,
    dismissFallback: plan.dismissFallback,
  };
  return <PlanCtx.Provider value={value}>{children}</PlanCtx.Provider>;
}

export function usePlanContext(): Ctx {
  const ctx = useContext(PlanCtx);
  if (!ctx) throw new Error('usePlanContext must be used inside PlanProvider');
  return ctx;
}

/**
 * When the current plan needs more water than the budget, every comparison uses
 * it cut back to fit. Returns what the plan needs as farmed today, or null.
 */
export function currentTrim(data: PlanResponse | null): { needAfPerAcre: number } | null {
  const asFarmed = data?.currentAsFarmed;
  if (!data || !asFarmed) return null;
  const need = asFarmed.metrics.maxWaterAfPerAcre;
  return need > data.current.metrics.maxWaterAfPerAcre + 0.005 ? { needAfPerAcre: need } : null;
}

/** Label for the current plan: says so when it was cut back to fit the water budget. */
export function useCurrentLabel(short = false): string {
  const { t } = useTranslation();
  const { data } = usePlanContext();
  if (!currentTrim(data)) return t('common.current');
  return short ? t('common.currentFittedShort') : t('common.currentFitted');
}

export type YearSpan = { n: number; from: number; to: number; k: number };

/** The scenario years in the data: how many, first, last, and how many make the worst 1-in-5. */
export function yearSpan(data: PlanResponse | null): YearSpan {
  const years = data?.recommended.metrics.yearlyProfit.map((y) => y.year) ?? [];
  if (years.length === 0) {
    const n = YEARS_BEFORE_DATA.to - YEARS_BEFORE_DATA.from + 1;
    return { n, ...YEARS_BEFORE_DATA, k: Math.max(1, Math.round(n * 0.2)) };
  }
  return { n: years.length, from: Math.min(...years), to: Math.max(...years), k: Math.max(1, Math.round(years.length * 0.2)) };
}

export function useYears(): YearSpan {
  return yearSpan(usePlanContext().data);
}

/** True when the optimizer's inputs (weather, budgets, prices, soil) include sample data. */
export function usePlanSample(): boolean {
  return isSample(usePlanContext().data, PLAN_DATASETS);
}
