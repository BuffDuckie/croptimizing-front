import { z } from 'zod';

export const rotationIdSchema = z.enum(['alfalfa', 'cotton_barley', 'durum_sorghum', 'barley_fallow', 'fallow']);

export const soilPartIdSchema = z.enum(['legume', 'livingRoots', 'residue', 'lowTillage', 'diversity']);

const share = z.number().min(0).max(1);
export const mixSchema = z
  .object({
    alfalfa: share.optional(),
    cotton_barley: share.optional(),
    durum_sorghum: share.optional(),
    barley_fallow: share.optional(),
    fallow: share.optional(),
  })
  .strict();

export const planRequestSchema = z.object({
  region: z.enum(['pinal', 'high_plains', 'custom']),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  acres: z.number().positive(),
  waterCapAfPerAcre: z.number().min(0.5).max(6),
  riskLevel: z.number().min(0).max(1),
  minSoilScore: z.number().min(0).max(100),
  maxShare: mixSchema.optional(),
  waterCostPerAf: z.number().min(0).optional(),
  irrigationEfficiency: z.number().min(0.5).max(0.95).optional(),
  currentMix: mixSchema,
  lang: z.enum(['en', 'es']),
  soilParts: z.array(soilPartIdSchema).min(1).optional(),
});

const finite = z.number().finite();

export const metricsSchema = z.object({
  avgProfitPerAcre: finite,
  worst1in5PerAcre: finite,
  maxWaterAfPerAcre: finite.min(0),
  soilScore: finite.min(0).max(100),
  waterValuePerAf: finite,
  yearlyProfit: z.array(z.object({ year: z.number().int(), profit: finite })),
  yearlyWater: z.array(z.object({ year: z.number().int(), water: finite.min(0) })).optional(),
});

const month = z.number().int().min(1).max(12);

export const validationCheckSchema = z.object({
  id: z.string(),
  label: z.string(),
  result: z.enum(['pass', 'partial', 'fail']),
  detail: z.string(),
  source: z.string().optional(),
});

export const waterPresetSchema = z.object({ afPerAcre: finite.min(0).max(6), label: z.string(), source: z.string() });

const goalPlanSchema = z.object({ mix: mixSchema, metrics: metricsSchema });

export const rotationCardSchema = z.object({
  id: rotationIdSchema,
  name: z.string(),
  seasons: z.array(z.string()),
  calendar: z.array(z.enum(['grow', 'bare'])).length(12),
  heatRiskMonths: z.array(month),
  soil: z.object({
    legume: finite,
    livingRoots: finite,
    residue: finite,
    lowTillage: finite,
    diversity: finite,
    total: finite,
  }),
  stats: z.object({ avgProfit: finite, profitPerAf: finite, worst1in5: finite, avgWaterAf: finite }),
  why: z.string(),
  evidence: z.string(),
  benefits: z.string(),
  gaps: z.string(),
  checkLocally: z.string(),
  yearlyWaterAf: z.array(finite.min(0)).optional(),
  yearlyProfit: z.array(finite).optional(),
  families: z.array(z.string()).optional(),
  calendarCrops: z.array(z.union([z.string(), z.null()])).length(12).optional(),
  soilReasons: z.object({ legume: z.string(), livingRoots: z.string(), residue: z.string(), lowTillage: z.string(), diversity: z.string() }).optional(),
  pests: z.string().optional(),
  infiltration: z.string().optional(),
});

export const planResponseSchema = z.object({
  schemaVersion: z.literal('1.0'),
  dataSource: z.enum(['sample', 'static', 'live']),
  recommended: z.object({ mix: mixSchema, metrics: metricsSchema }),
  current: z.object({ mix: mixSchema, metrics: metricsSchema }),
  currentAsFarmed: z.object({ mix: mixSchema, metrics: metricsSchema }).optional(),
  frontier: z.array(z.object({ worst1in5: finite, avgProfit: finite, mix: mixSchema })),
  rotations: z.array(rotationCardSchema),
  stressTests: z.array(
    z.object({
      year: z.number().int(),
      label: z.string(),
      currentProfit: finite,
      recommendedProfit: finite,
      currentWater: finite,
      recommendedWater: finite,
    }),
  ),
  backtest: z.array(z.object({ strategy: z.string(), avgProfit: finite, worst1in5: finite, avgWater: finite })),
  correlations: z.array(z.object({ a: rotationIdSchema, b: rotationIdSchema, r: finite.min(-1).max(1) })),
  context: z.object({
    graceTwsCm: z.array(z.object({ date: z.string(), value: finite })),
    heatDaysPerYear: z.array(z.object({ year: z.number().int(), days: finite })),
    et0MonthlyMm: z.array(z.object({ month, mm: finite })),
    etCheck: z.array(z.object({ crop: z.string(), modeledMm: finite, satelliteMm: finite })),
    otherRegions: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          series: z.array(z.object({ date: z.string(), value: finite })),
          source: z.enum(['sample', 'real']),
        }),
      )
      .optional(),
    monthlyRisk: z.array(z.object({ month, heatDays: finite.min(0), frostDays: finite.min(0) })).optional(),
  }),
  assumptions: z.array(z.string()),
  sources: z.record(z.enum(['weather', 'grace', 'etCheck', 'cropBudgets', 'prices', 'soil', 'otherRegions']), z.enum(['sample', 'real'])).optional(),
  sensitivity: z
    .array(
      z.object({
        case: z.enum(['profitDown', 'profitUp', 'waterCostDown', 'waterCostUp', 'efficiencyLow', 'efficiencyHigh']),
        value: finite,
        avgProfit: finite.nullable(),
        worst1in5: finite.nullable(),
        mix: mixSchema.nullable(),
        mixChanged: z.boolean(),
      }),
    )
    .optional(),
  classic: z
    .object({
      points: z.array(z.object({ worst1in5: finite, avgProfit: finite, sd: finite.min(0), mix: mixSchema })),
      atSuggested: z.object({ avgProfit: finite, classicWorst1in5: finite, ourWorst1in5: finite }).nullable(),
      largestGap: z.object({ avgProfit: finite, classicWorst1in5: finite, ourWorst1in5: finite }).nullable(),
    })
    .optional(),
  riskMetrics: z
    .object({
      recommended: z.object({ sd: finite.min(0), sharpe: finite.nullable(), sortino: finite.nullable(), diversification: finite.nullable() }),
      current: z.object({ sd: finite.min(0), sharpe: finite.nullable(), sortino: finite.nullable(), diversification: finite.nullable() }),
      fallowAvg: finite,
    })
    .optional(),
  validation: z
    .object({
      lpCrossCheck: z.object({ method: z.string(), maxShareDifference: finite.min(0).max(1), note: z.string() }).optional(),
      checks: z.array(validationCheckSchema).optional(),
    })
    .optional(),
  goals: z.object({ income: goalPlanSchema, water: goalPlanSchema, soil: goalPlanSchema }).optional(),
  soilFrontier: z.array(z.object({ soilScore: finite.min(0).max(100), avgProfit: finite, mix: mixSchema })).optional(),
  waterPresets: z
    .object({ full: waterPresetSchema.optional(), cut2022: waterPresetSchema.optional(), zero2023: waterPresetSchema.optional() })
    .optional(),
});

/** Body a backend returns with HTTP 422 when no mix satisfies the constraints. */
export const infeasibleSchema = z.object({
  code: z.literal('infeasible'),
  relax: z.enum(['soil', 'water', 'maxShare']),
  maxSoilAtThisWater: z.number().optional(),
  minWaterForThisSoil: z.number().optional(),
});
