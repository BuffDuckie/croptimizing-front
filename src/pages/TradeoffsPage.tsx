import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';

export default function TradeoffsPage() {
  const { t } = useTranslation();
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.tradeoffs.title')} intro={t('pages.tradeoffs.intro')} />
    </div>
  );
}
