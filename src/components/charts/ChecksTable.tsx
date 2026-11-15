import { AlertTriangle, Check, ExternalLink, Minus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Validation } from '../../api/types';
import { whole } from '../../lib/format';

type Result = 'pass' | 'partial' | 'fail' | 'notRun';

/** Largest share difference we still call a match: one step of the 5% grid. */
const GRID_STEP = 0.05;

function ResultChip({ result }: { result: Result }) {
  const { t } = useTranslation();
  const style: Record<Result, { cls: string; Icon: typeof Check }> = {
    pass: { cls: 'bg-secondary-tint text-secondary ring-secondary/30', Icon: Check },
    partial: { cls: 'bg-warning-tint text-warning ring-warning/30', Icon: AlertTriangle },
    fail: { cls: 'bg-danger-tint text-danger ring-danger/30', Icon: X },
    notRun: { cls: 'bg-bg text-text-muted ring-border', Icon: Minus },
  };
  const { cls, Icon } = style[result];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ring-1 ring-inset ${cls}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      {t(`method.checks.${result}`)}
    </span>
  );
}

/** "How we checked our work": the backend's checks, failures included, plus the exact-solver cross-check. */
export function ChecksTable({ validation }: { validation?: Validation }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const lp = validation?.lpCrossCheck;
  const rows: { key: string; label: string; result: Result; detail: string; source?: string }[] = [
    ...(validation?.checks ?? []).map((c) => ({ key: c.id, label: c.label, result: c.result, detail: c.detail, source: c.source })),
    lp
      ? {
          key: 'lp',
          label: t('method.checks.lpLabel', { method: lp.method }),
          result: lp.maxShareDifference <= GRID_STEP + 1e-9 ? 'pass' : 'partial',
          detail: `${t('method.checks.lpDetail', { x: whole(lp.maxShareDifference * 100, lang), step: whole(GRID_STEP * 100, lang) })} ${lp.note}`,
        }
      : { key: 'lp', label: t('method.checks.lpLabelNone'), result: 'notRun', detail: t('method.checks.lpNone') },
  ];
  return (
    <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label={t('method.checks.caption')}>
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <caption className="mb-2 text-left font-semibold text-text">{t('method.checks.caption')}</caption>
        <thead>
          <tr className="border-b border-border">
            {(t('method.checks.head', { returnObjects: true }) as string[]).map((h) => (
              <th key={h} scope="col" className="py-2 pr-4 font-semibold text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-border-soft align-top last:border-0">
              <th scope="row" className="py-3 pr-4 font-semibold text-text">
                {r.label}
              </th>
              <td className="py-3 pr-4">
                <ResultChip result={r.result} />
              </td>
              <td className="py-3 pr-4 text-text">{r.detail}</td>
              <td className="py-3 pr-4">
                {r.source && /^https?:\/\//.test(r.source) ? (
                  <a href={r.source} target="_blank" rel="noreferrer" className="inline-flex min-h-[44px] items-center gap-1 font-semibold">
                    {t('method.checks.open')} <ExternalLink aria-hidden="true" className="h-4 w-4" />
                  </a>
                ) : (
                  <span className="text-text-muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
