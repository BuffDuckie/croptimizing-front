import { etMaxGapPct, graceDropCm } from './context';

describe('context summaries', () => {
  it('measures the groundwater drop between first and last yearly means', () => {
    const series = [
      { date: '2005-01', value: 4 },
      { date: '2005-07', value: 2 },
      { date: '2024-01', value: -10 },
      { date: '2024-07', value: -12 },
    ];
    expect(graceDropCm(series)).toEqual({ cm: 14, from: 2005, to: 2024 });
    expect(graceDropCm(series.slice(0, 2))).toBeNull();
  });

  it('finds the largest modeled vs satellite gap in percent', () => {
    expect(etMaxGapPct([{ crop: 'a', modeledMm: 110, satelliteMm: 100 }, { crop: 'b', modeledMm: 80, satelliteMm: 100 }])).toBeCloseTo(20);
    expect(etMaxGapPct([])).toBeNull();
  });
});
