import type { PlanResponse, RotationCard } from '../api/types';

/** A month counts as heat risk at this many days with max >= 43.3 C (110 F), on average. */
export const HEAT_DAYS_MIN = 5;
/** A month counts as frost risk at this many days with min <= 0 C, on average. */
export const FROST_DAYS_MIN = 1;

export type RiskMonths = { heat: number[]; frost: number[]; fromData: boolean };

/**
 * Vulnerable months for one rotation (1-12). With monthly weather data, a month
 * is marked only while the crop is in the field. Without it, the card's own
 * heat-risk months are kept as they are.
 */
export function riskMonths(card: RotationCard, monthlyRisk?: PlanResponse['context']['monthlyRisk']): RiskMonths {
  if (!monthlyRisk || monthlyRisk.length === 0) return { heat: card.heatRiskMonths, frost: [], fromData: false };
  const growing = (m: number) => card.calendar[m - 1] === 'grow';
  return {
    heat: monthlyRisk.filter((r) => r.heatDays >= HEAT_DAYS_MIN && growing(r.month)).map((r) => r.month),
    frost: monthlyRisk.filter((r) => r.frostDays >= FROST_DAYS_MIN && growing(r.month)).map((r) => r.month),
    fromData: true,
  };
}
