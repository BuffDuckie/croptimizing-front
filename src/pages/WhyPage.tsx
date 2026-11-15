import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';

export default function WhyPage() {
  const { t } = useTranslation();
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.why.title')} intro={t('pages.why.intro')} />
    </div>
  );
}
