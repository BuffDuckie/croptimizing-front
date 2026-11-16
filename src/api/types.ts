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
  soilParts?: SoilPartId[];         // soil goals to count (B5); omitted = all five. Score = selected parts rescaled to 0-100
};

export type SoilPartId = "legume" | "livingRoots" | "residue" | "lowTillage" | "diversity";
export const SOIL_PART_IDS: SoilPartId[] = ["legume", "livingRoots", "residue", "lowTillage", "diversity"];

export type Metrics = {
  avgProfitPerAcre: number;         // USD, 2025 dollars
  worst1in5PerAcre: number;         // mean of worst 20% of years (= -CVaR)
  maxWaterAfPerAcre: number;        // highest-year applied water
  soilScore: number;                // 0-100
  waterValuePerAf: number;          // shadow price, USD per AF per acre
  yearlyProfit: { year: number; profit: number }[];
  yearlyWater?: { year: number; water: number }[]; // applied AF per acre in each year (optional)
};

export type RotationCard = {
  id: RotationId; name: string; seasons: string[];
  calendar: ("grow" | "bare")[];      // 12 months, Jan-Dec
  heatRiskMonths: number[];         // 1-12
  soil: { legume: number; livingRoots: number; residue: number; lowTillage: number; diversity: number; total: number };
  stats: { avgProfit: number; profitPerAf: number; worst1in5: number; avgWaterAf: number };
  why: string; evidence: string; benefits: string; gaps: string; checkLocally: string;
  // Optional additions. The UI works without them.
  yearlyWaterAf?: number[];         // applied AF per acre in each scenario year, same order as the years
  yearlyProfit?: number[];          // profit per acre in each scenario year (after the water price), same order
  families?: string[];              // botanical families grown, e.g. ["Fabaceae"]
  calendarCrops?: (string | null)[]; // crop in the field each month, Jan-Dec (null = bare); gives the calendar its letters
  soilReasons?: Record<SoilPartId, string>; // one sentence per soil part: why it scores what it does
  pests?: string;                   // plain words: how this rotation affects pest cycles
  infiltration?: string;            // plain words: how it affects water soaking in
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
    otherRegions?: { id: string; label: string; series: { date: string; value: number }[]; source: SourceFlag }[]; // GRACE storage, cm
    monthlyRisk?: { month: number; heatDays: number; frostDays: number }[]; // average days per calendar month: max >= 43.3 C, min <= 0 C
  };
  assumptions: string[];
  // Optional additions (judging upgrades). The UI works without them.
  sources?: Partial<Record<DatasetId, SourceFlag>>; // per-dataset flag; a missing dataset counts as sample
  validation?: Validation;
  sensitivity?: SensitivityRow[];   // suggested plan re-run under price and cost changes
  classic?: Classic;                // classic mean-variance efficient set, for comparison
  riskMetrics?: { recommended: RiskStats; current: RiskStats; fallowAvg: number }; // current = cut back to fit
  goals?: { income: GoalPlan; water: GoalPlan; soil: GoalPlan }; // best mix for each goal, same limits as the suggested plan
  soilFrontier?: { soilScore: number; avgProfit: number; mix: Mix }[]; // feasible mixes no other beats on both soil and average profit, by soil
  waterPresets?: Partial<Record<WaterPresetId, WaterPreset>>;
};

export type GoalId = "suggested" | "income" | "water" | "soil";
export type GoalPlan = { mix: Mix; metrics: Metrics };

export type WaterPresetId = "full" | "cut2022" | "zero2023";
export type WaterPreset = { afPerAcre: number; label: string; source: string };

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
  checks?: ValidationCheck[];
};
export type ValidationCheck = { id: string; label: string; result: "pass" | "partial" | "fail"; detail: string; source?: string };

/** Display order used everywhere in the UI. */
export const ROTATION_IDS: RotationId[] = ["alfalfa", "cotton_barley", "durum_sorghum", "barley_fallow", "fallow"];
