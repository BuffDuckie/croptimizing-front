# Real data format (`public/data/real_data.json`)

This file is how the backend hands real numbers to the front end. When it is
there, the in-browser engine uses it instead of the seeded sample data: the
optimizer, every chart, and the "Sample data" badges all follow it. When it is
missing, the site runs on sample data exactly as before.

- Example with every field: [`public/data/real_data.example.json`](../public/data/real_data.example.json)
  (placeholder numbers from the sample model; every source flag says `"sample"`).
- Check a file before you ship it:

  ```bash
  npm run check:data -- path/to/real_data.json
  ```

  It prints `OK` or every failing field path with the reason, and exits 1 on failure.
- Zod schema: [`src/api/realDataSchema.ts`](../src/api/realDataSchema.ts).
- To use it: copy the file to `public/data/real_data.json`, run `npm run check:data`,
  commit, and push. Vercel redeploys main. (Optional: `npm run export-sample`
  rewrites the static-mode files in `public/results/` from the real data too.)

## Shape

```jsonc
{
  "schemaVersion": "real-1.0",              // required, exactly this
  "region": "pinal",                         // "pinal" | "high_plains" | "custom"
  "generatedAt": "2026-11-15T16:00:00-07:00",
  "notes": "optional free text",
  "years": [2005, 2006, ..., 2024],          // required: 20 whole years, one after another, oldest first
  "rotations": {                             // required: all five rotation ids
    "alfalfa":       { "revenue": [..20], "nonWaterCost": [..20], "profit": [..20], "waterAf": [..20], "source": "real" },
    "cotton_barley": { ... },
    "durum_sorghum": { ... },
    "barley_fallow": { ... },
    "fallow":        { ...; "waterAf" all 0 }
  },
  "soil": {                                  // required: all five rotations, each part 0 to 20
    "alfalfa": { "legume": 20, "livingRoots": 20, "residue": 12, "lowTillage": 18, "diversity": 15 },
    ...
  },
  "calendars": {                             // optional: crop in the field each month, Jan to Dec; null = bare
    "alfalfa":       ["alfalfa", "alfalfa", ..., "alfalfa"],
    "cotton_barley": ["barley", "barley", "barley", "cotton", ..., "cotton", null, "barley"],
    ...                                      // all five rotations; fallow is all null
  },
  "waterCost": { "perAf": 75, "source": "UA AZ2168 Pinal 2025 budget, water line (link)" },  // optional: default $/AF
  "context": {                               // optional, and each series is optional
    "graceTwsCm":      [{ "date": "2005-01", "value": 3.1 }],
    "heatDaysPerYear": [{ "year": 2005, "days": 41 }],
    "et0MonthlyMm":    [{ "month": 1, "mm": 72 }],                          // 12 entries
    "monthlyRisk":     [{ "month": 1, "heatDays": 0, "frostDays": 2.1 }],   // 12 entries
    "etCheck":         [{ "crop": "alfalfa", "modeledMm": 1710, "satelliteMm": 1585 }],
    "otherRegions":    [{ "id": "central_valley", "label": "Central Valley, California",
                          "series": [{ "date": "2005-01", "value": 2.0 }], "source": "real" }]
  },
  "waterPresets": {                          // optional
    "full":     { "afPerAcre": 4.5, "label": "Full canal allotment", "source": "https://..." },
    "cut2022":  { "afPerAcre": 3.2, "label": "2022-style cut", "source": "https://..." },
    "zero2023": { "afPerAcre": 2.0, "label": "Zero canal water (like 2023)", "source": "https://..." }
  },
  "validation": {                            // optional
    "lpCrossCheck": { "method": "Exact linear program, scipy HiGHS", "maxShareDifference": 0.05, "note": "..." },
    "checks": [{ "id": "openet", "label": "...", "result": "pass", "detail": "...", "source": "https://..." }]
  },
  "sources": {                               // optional; a dataset not listed counts as sample
    "weather": "real", "grace": "real", "etCheck": "real", "cropBudgets": "real",
    "prices": "real", "soil": "real", "otherRegions": "real"
  }
}
```

## Rules

| Field | Rule |
| --- | --- |
| Rotation ids | Fixed: `alfalfa`, `cotton_barley`, `durum_sorghum`, `barley_fallow`, `fallow`. No others. |
| Per-year arrays | Exactly 20 numbers, in the same order as `years`. |
| `profit` | US dollars per acre, 2025 dollars. Must equal `revenue - nonWaterCost` within $1. It **leaves out the cost of buying water**: the engine subtracts the user's water cost per acre-foot times water used. |
| `waterAf` | Applied irrigation water, acre-feet per acre, at **75% irrigation efficiency**. Never negative; all 0 for `fallow`. The engine rescales it when the user changes efficiency. |
| Soil parts | Each 0 to 20. The rotation's soil score is the sum of its five parts (0 to 100). |
| Dates / months | Dates are `"YYYY-MM"`; months are 1 to 12. |
| `monthlyRisk` | Average days per calendar month over the 20 years with daily max temperature 43.3 °C (110 °F) or more (`heatDays`) and daily min 0 °C or less (`frostDays`). Calendar strips mark a heat month at 5 or more days and a frost month at 1 or more. |
| `checks[].result` | `"pass"`, `"partial"`, or `"fail"`. List the checks you fail too. |
| Source flags | `"real"` or `"sample"`. |
| `calendars` | 12 entries per rotation, all five rotations. A crop name (any text, e.g. `"cotton"`) means a crop is in the field that month; `null` means bare. The first letter labels the calendar strip. `fallow` must be all `null`. |
| `waterCost.perAf` | Default price of water, dollars per acre-foot of applied water (0 to 1000), and where it comes from. The engine takes `perAf x waterAf` off each year's profit; farmers can change it. Without it the site uses a $200 placeholder marked TODO. |
| Required sections | `years`, `rotations`, `soil`. Everything else is optional. |

## Soil reasons (`public/data/soil_rubric_reasons.json`)

A separate, optional file with one plain English sentence per rotation and soil part,
saying why it scores what it does:

```jsonc
{
  "alfalfa": { "legume": "...", "livingRoots": "...", "residue": "...", "lowTillage": "...", "diversity": "..." },
  "cotton_barley": { ... }, "durum_sorghum": { ... }, "barley_fallow": { ... }, "fallow": { ... }
}
```

All five rotations and all five parts are required. The reasons are shown only when the
`soil` section of `real_data.json` loads (otherwise they would describe other scores).
Spanish drafts live in `src/i18n/locales/es.json` under `method.soilRubric.reasonEs`;
update them when this file changes. `npm run check:data` checks this file too.

## What happens with a bad section

The loader parses each section on its own. If one fails, it uses real data for
the rest and sample data for that section only, and logs in the browser console:

```
[real-data] fell back to sample for context.graceTwsCm: context.graceTwsCm.5.date: date must be "YYYY-MM"
```

Sections: `years` + `rotations` (together: one scenario table), `soil`, `calendars`,
`waterCost`, each `context.*` series, `waterPresets`, `validation`, `sources`.

A dataset's badge drops only when the file marks it `"real"` **and** every
section behind it loaded from the file:

| Flag | Needs |
| --- | --- |
| `weather` | `rotations`, `context.heatDaysPerYear`, `context.et0MonthlyMm` |
| `cropBudgets`, `prices` | `rotations`, with every rotation's `source` set to `"real"` |
| `soil` | `soil` |
| `grace` | `context.graceTwsCm` |
| `etCheck` | `context.etCheck` |
| `otherRegions` | `context.otherRegions` (each region also has its own `source`) |

With any section from the file in use, plans report `dataSource: "static"`.
The file is fetched once at app start with `cache: "no-store"` and handed to the
Web Worker once, before the first plan.
