import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';

export default function PlanPage() {
  const { t } = useTranslation();
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.plan.title')} intro={t('pages.plan.intro')} />
    </div>
  );
}
