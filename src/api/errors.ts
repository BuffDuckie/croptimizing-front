export type Relax = 'soil' | 'water' | 'maxShare';

export type InfeasibleDetail = {
  code: 'infeasible';
  relax: Relax;
  /** Highest soil minimum that still has a plan at this water budget. */
  maxSoilAtThisWater?: number;
  /** Smallest water budget (AF/acre) that has a plan at this soil minimum. */
  minWaterForThisSoil?: number;
};

/** No crop mix satisfies every constraint. Carries which one to relax. */
export class InfeasibleError extends Error {
  readonly detail: InfeasibleDetail;
  constructor(detail: InfeasibleDetail) {
    super(`No plan fits these limits. Relax: ${detail.relax}`);
    this.name = 'InfeasibleError';
    this.detail = detail;
  }
}

export function isInfeasible(e: unknown): e is InfeasibleError {
  return e instanceof InfeasibleError || (e as { name?: string })?.name === 'InfeasibleError';
}
