import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';

export default function ComparePage() {
  const { t } = useTranslation();
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.compare.title')} intro={t('pages.compare.intro')} />
    </div>
  );
}
