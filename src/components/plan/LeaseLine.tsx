import { useTranslation } from 'react-i18next';
import { money } from '../../lib/format';

/**
 * "Is leasing water worth it?": compares what one more acre-foot is worth to you
 * (the plan's water value) with what it would cost to lease or pump.
 */
export function LeaseLine({ waterValue, price, className = '' }: { waterValue: number; price: number | null; className?: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  if (price === null) return null;
  const v = money(waterValue, lang);
  const p = money(price, lang);
  const text = waterValue <= 0 ? t('plan.leaseNotBinding') : waterValue > price ? t('plan.leasePays', { v, p }) : t('plan.leaseNo', { v, p });
  return (
    <p className={className} role="status">
      {text}
    </p>
  );
}
