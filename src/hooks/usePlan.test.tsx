import { act, renderHook, waitFor } from '@testing-library/react';
import type { PlanRequest } from '../api/types';
import { usePlan } from './usePlan';

const req: PlanRequest = {
  region: 'pinal',
  acres: 640,
  waterCapAfPerAcre: 2.4,
  riskLevel: 0.4,
  minSoilScore: 30,
  currentMix: { alfalfa: 0.7, cotton_barley: 0.3 },
  lang: 'en',
};

describe('usePlan', () => {
  it('loads a plan and exposes data, isLoading, and error', async () => {
    const { result } = renderHook(() => usePlan(req));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.data).not.toBeNull(), { timeout: 5000 });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('debounces rapid slider changes and reports infeasible settings as an error', async () => {
    const { result, rerender } = renderHook((r: PlanRequest) => usePlan(r), { initialProps: req });
    await waitFor(() => expect(result.current.data).not.toBeNull(), { timeout: 5000 });
    act(() => {
      rerender({ ...req, waterCapAfPerAcre: 2.5 });
      rerender({ ...req, waterCapAfPerAcre: 2.6 });
      rerender({ ...req, waterCapAfPerAcre: 1, minSoilScore: 90 });
    });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.error).not.toBeNull(), { timeout: 5000 });
    // The last good plan stays on screen.
    expect(result.current.data).not.toBeNull();
  });
});
