import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className="container-content py-24">
      <h1 className="text-4xl font-semibold">{t('notFound.title')}</h1>
      <Link to="/" className="btn btn-primary mt-8">
        {t('notFound.back')}
      </Link>
    </div>
  );
}
