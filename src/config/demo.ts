import type { Mix, PlanRequest } from '../api/types';

/**
 * The Pinal County demo farm. One place to retune the demo once real data loads.
 * A test runs the engine on these values and requires a plan with 2+ rotations.
 */
export const DEMO_DEFAULTS = {
  name: 'Pinal County demo farm',
  region: 'pinal' as PlanRequest['region'],
  acres: 640,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 } as Mix,
  /** Water budget, AF per acre. */
  water: 2.4,
  /** Risk comfort slider, 0 (play it safe) to 100 (go for profit). */
  risk: 40,
  /** Soil-health minimum, 0 to 100. */
  soil: 30,
};
