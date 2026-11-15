import { useTranslation } from 'react-i18next';
import { PageIntro } from '../components/layout/PageIntro';

export default function StartPage() {
  const { t } = useTranslation();
  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.start.title')} intro={t('pages.start.intro')} />
    </div>
  );
}
