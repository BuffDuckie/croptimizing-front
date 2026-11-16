import { useTranslation } from 'react-i18next';
import type { DatasetId } from '../api/types';
import { isSample } from '../lib/sources';
import { usePlanContext } from '../state/PlanContext';

/** Dataset behind each row of the sources table (null: used in text only). */
const SOURCE_DATASETS: (DatasetId | null)[] = ['weather', 'grace', null, 'cropBudgets', 'prices', 'soil', null];

export type SourceRow = { cells: string[]; status: 'sample' | 'real' | 'text' };

/**
 * Rows of the data sources table: input, source, resolution, and a status that
 * comes from each dataset's own source flag, so it updates when real data loads.
 */
export function useSourceRows(): SourceRow[] {
  const { t } = useTranslation();
  const { data } = usePlanContext();
  const rows = t('method.sourceRows', { returnObjects: true }) as string[][];
  return rows.map((row, i) => {
    const id = SOURCE_DATASETS[i];
    const status = id === null || id === undefined ? 'text' : isSample(data, [id]) ? 'sample' : 'real';
    return { cells: [...row, t(`method.status.${status}`)], status };
  });
}
