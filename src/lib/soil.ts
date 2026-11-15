import type { Mix, RotationCard, SoilPartId } from '../api/types';
import { SOIL_PART_IDS } from '../api/types';

/** Botanical family of legumes (alfalfa, beans): they fix their own nitrogen. */
export const LEGUME_FAMILY = 'Fabaceae';

const SMALL = 0.005;

function fixesNitrogen(r: RotationCard): boolean {
  return r.families ? r.families.includes(LEGUME_FAMILY) : r.soil.legume > 0;
}

export type SoilSummary = {
  /** Acre-weighted months a year with no crop growing (0 to 12). */
  bareMonths: number;
  /** Acres in a rotation with a nitrogen-fixing crop. */
  nitrogenAcres: number;
  /** Crop families grown anywhere in the plan, or null when the data has no families. */
  families: number | null;
  /** Acre-weighted residue points (0 to 20). */
  residue: number;
};

/** What a mix does for the soil, acre-weighted from each rotation's calendar and soil parts. */
export function soilSummary(mix: Mix, rotations: RotationCard[], acres: number): SoilSummary {
  let bare = 0;
  let nShare = 0;
  let residue = 0;
  const fams = new Set<string>();
  let haveFamilies = rotations.length > 0;
  for (const r of rotations) {
    const sh = mix[r.id] ?? 0;
    if (!r.families) haveFamilies = false;
    if (sh <= 0) continue;
    bare += sh * r.calendar.filter((c) => c === 'bare').length;
    if (fixesNitrogen(r)) nShare += sh;
    residue += sh * r.soil.residue;
    if (sh > SMALL) r.families?.forEach((f) => fams.add(f));
  }
  return { bareMonths: bare, nitrogenAcres: nShare * acres, families: haveFamilies ? fams.size : null, residue };
}

/** Share-weighted points of each soil part for a mix (each 0 to 20). */
export function mixSoilParts(mix: Mix, rotations: RotationCard[]): Record<SoilPartId, number> {
  const out = Object.fromEntries(SOIL_PART_IDS.map((p) => [p, 0])) as Record<SoilPartId, number>;
  for (const r of rotations) {
    const sh = mix[r.id] ?? 0;
    for (const p of SOIL_PART_IDS) out[p] += sh * r.soil[p];
  }
  return out;
}

/**
 * The soil score from the selected parts, rescaled to 0 to 100. With all five
 * parts selected it is simply their sum.
 */
export function soilScoreFrom(parts: Record<SoilPartId, number>, selected: readonly SoilPartId[] = SOIL_PART_IDS): number {
  if (selected.length === 0) return 0;
  const sum = selected.reduce((s, p) => s + parts[p], 0);
  return (sum * 100) / (20 * selected.length);
}
