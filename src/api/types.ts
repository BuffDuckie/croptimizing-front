// Data contract shared with the FastAPI backend. Field names are final.
// Do not change a field without telling the backend team.

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
  current: { mix: Mix; metrics: Metrics };   // current plan cut back to fit the water budget (fair comparison)
  currentAsFarmed?: { mix: Mix; metrics: Metrics }; // current plan as farmed today, before the cut (Show the math only)
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
  // Optional additions (judging upgrades). The UI works without them.
  sources?: Partial<Record<DatasetId, SourceFlag>>; // per-dataset flag; a missing dataset counts as sample
  validation?: Validation;
  sensitivity?: SensitivityRow[];   // suggested plan re-run under price and cost changes
  classic?: Classic;                // classic mean-variance efficient set, for comparison
  riskMetrics?: { recommended: RiskStats; current: RiskStats; fallowAvg: number }; // current = cut back to fit
};

export type RiskStats = {
  sd: number;                       // standard deviation of yearly profit, $/acre
  sharpe: number | null;            // (avg - fallow avg) / sd; null when sd is 0
  sortino: number | null;           // (avg - fallow avg) / downside deviation below the fallow average
  diversification: number | null;   // 1 - sd / share-weighted sd of each rotation (0-1)
};

export type Classic = {
  // Feasible mixes no other feasible mix beats on both higher average and lower standard deviation.
  points: { worst1in5: number; avgProfit: number; sd: number; mix: Mix }[];
  // The classic plan nearest the suggested plan's average, vs the best worst-years result at that average or higher.
  atSuggested: ClassicGap | null;
  // The classic plan that does worst against ours on worst years, at the same or higher average.
  largestGap: ClassicGap | null;
};
export type ClassicGap = { avgProfit: number; classicWorst1in5: number; ourWorst1in5: number };

export type SensitivityCase = "profitDown" | "profitUp" | "waterCostDown" | "waterCostUp" | "efficiencyLow" | "efficiencyHigh";
export type SensitivityRow = {
  case: SensitivityCase;
  value: number;                     // the changed input: profit change (-0.2, 0.2), water cost $/AF, or efficiency (0.65, 0.85)
  avgProfit: number | null;          // null when no mix fits under this case
  worst1in5: number | null;
  mix: Mix | null;
  mixChanged: boolean;               // suggested mix differs from the base case
};

export type SourceFlag = "sample" | "real";
export type DatasetId = "weather" | "grace" | "etCheck" | "cropBudgets" | "prices" | "soil" | "otherRegions";

export type Validation = {
  lpCrossCheck?: { method: string; maxShareDifference: number; note: string }; // maxShareDifference: 0-1 share of acres
};

/** Display order used everywhere in the UI. */
export const ROTATION_IDS: RotationId[] = ["alfalfa", "cotton_barley", "durum_sorghum", "barley_fallow", "fallow"];
