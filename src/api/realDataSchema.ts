// Schema for public/data/real_data.json, the backend's scenario table and
// context series. See docs/REAL_DATA_FORMAT.md. Each section is its own schema so
// the loader can fall back to sample data for one bad section and keep the rest.

import { z } from 'zod';

export const YEAR_COUNT = 20;
const finite = z.number().finite();
const month = z.number().int().min(1).max(12);
const sourceFlag = z.enum(['real', 'sample'], { errorMap: () => ({ message: 'unknown source flag (use "real" or "sample")' }) });

const perYear = (what: string) =>
  z.array(finite, { invalid_type_error: `${what} must be an array of numbers` }).superRefine((a, ctx) => {
    if (a.length !== YEAR_COUNT) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `array length not ${YEAR_COUNT} (got ${a.length})` });
  });

export const yearsSchema = perYear('years').superRefine((a, ctx) => {
  for (let i = 0; i < a.length; i++) {
    if (!Number.isInteger(a[i])) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: 'year must be a whole number' });
    if (i > 0 && a[i] !== a[i - 1] + 1) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [i], message: 'years must run one after another, oldest first' });
  }
});

export const rotationSeriesSchema = z
  .object({
    revenue: perYear('revenue'),
    nonWaterCost: perYear('nonWaterCost'),
    profit: perYear('profit'),
    waterAf: perYear('waterAf'),
    source: sourceFlag,
  })
  .superRefine((r, ctx) => {
    const n = Math.min(r.revenue.length, r.nonWaterCost.length, r.profit.length);
    for (let i = 0; i < n; i++) {
      const expected = r.revenue[i] - r.nonWaterCost[i];
      if (Math.abs(r.profit[i] - expected) > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['profit', i],
          message: `profit ${r.profit[i]} is not revenue minus nonWaterCost (${Math.round(expected * 100) / 100}) within $1`,
        });
      }
    }
    r.waterAf.forEach((w, i) => {
      if (w < 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['waterAf', i], message: `negative water (${w})` });
    });
  });

export const rotationsSchema = z
  .object({
    alfalfa: rotationSeriesSchema,
    cotton_barley: rotationSeriesSchema,
    durum_sorghum: rotationSeriesSchema,
    barley_fallow: rotationSeriesSchema,
    fallow: rotationSeriesSchema,
  })
  .strict()
  .superRefine((r, ctx) => {
    r.fallow.waterAf.forEach((w, i) => {
      if (w !== 0) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['fallow', 'waterAf', i], message: 'fallow must use 0 water' });
    });
  });

const soilPart = z.number().finite().min(0, 'soil part outside 0-20').max(20, 'soil part outside 0-20');
export const soilPartsSchema = z
  .object({ legume: soilPart, livingRoots: soilPart, residue: soilPart, lowTillage: soilPart, diversity: soilPart })
  .strict();
export const soilSchema = z
  .object({
    alfalfa: soilPartsSchema,
    cotton_barley: soilPartsSchema,
    durum_sorghum: soilPartsSchema,
    barley_fallow: soilPartsSchema,
    fallow: soilPartsSchema,
  })
  .strict();

const yearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'date must be "YYYY-MM"');

export const contextSchemas = {
  graceTwsCm: z.array(z.object({ date: yearMonth, value: finite })).min(2),
  heatDaysPerYear: z.array(z.object({ year: z.number().int(), days: finite.min(0) })).min(1),
  et0MonthlyMm: z.array(z.object({ month, mm: finite.min(0) })).length(12),
  monthlyRisk: z.array(z.object({ month, heatDays: finite.min(0), frostDays: finite.min(0) })).length(12),
  etCheck: z.array(z.object({ crop: z.string(), modeledMm: finite.min(0), satelliteMm: finite.min(0) })).min(1),
  otherRegions: z
    .array(z.object({ id: z.string(), label: z.string().min(1), series: z.array(z.object({ date: yearMonth, value: finite })).min(2), source: sourceFlag }))
    .min(1),
} as const;
export type ContextKey = keyof typeof contextSchemas;
export const CONTEXT_KEYS = Object.keys(contextSchemas) as ContextKey[];

const preset = z.object({ afPerAcre: finite.min(0).max(6), label: z.string().min(1), source: z.string() });
export const waterPresetsSchema = z.object({ full: preset.optional(), cut2022: preset.optional(), zero2023: preset.optional() }).strict();

export const validationSchema = z.object({
  lpCrossCheck: z.object({ method: z.string(), maxShareDifference: finite.min(0).max(1), note: z.string() }).optional(),
  checks: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        result: z.enum(['pass', 'partial', 'fail'], { errorMap: () => ({ message: 'result must be "pass", "partial", or "fail"' }) }),
        detail: z.string(),
        source: z.string().optional(),
      }),
    )
    .optional(),
});

export const sourcesSchema = z
  .object({
    weather: sourceFlag,
    grace: sourceFlag,
    etCheck: sourceFlag,
    cropBudgets: sourceFlag,
    prices: sourceFlag,
    soil: sourceFlag,
    otherRegions: sourceFlag,
  })
  .partial()
  .strict();

/** The whole file, for the checker. The loader parses section by section instead. */
export const realDataSchema = z
  .object({
    schemaVersion: z.literal('real-1.0'),
    region: z.enum(['pinal', 'high_plains', 'custom']),
    generatedAt: z.string().optional(),
    notes: z.string().optional(),
    years: yearsSchema,
    rotations: rotationsSchema,
    soil: soilSchema,
    context: z.object(contextSchemas).partial().strict().optional(),
    waterPresets: waterPresetsSchema.optional(),
    validation: validationSchema.optional(),
    sources: sourcesSchema.optional(),
  })
  .strict();

export type RealData = z.infer<typeof realDataSchema>;

export type RealIssue = { path: string; reason: string };

export function issuesOf(err: z.ZodError, prefix: (string | number)[] = []): RealIssue[] {
  return err.issues.map((i) => {
    let reason = i.message;
    if (i.code === z.ZodIssueCode.invalid_type && i.received === 'undefined') reason = `missing ${String(i.path[i.path.length - 1] ?? 'value')}`;
    if (i.code === z.ZodIssueCode.unrecognized_keys) reason = `unknown field(s): ${i.keys.join(', ')}`;
    return { path: [...prefix, ...i.path].join('.') || '(root)', reason };
  });
}

/** Every problem in the file, with its field path. Empty when the file is valid. */
export function checkRealData(raw: unknown): RealIssue[] {
  const r = realDataSchema.safeParse(raw);
  return r.success ? [] : issuesOf(r.error);
}
