import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';

interface AccessDeniedViewProps {
  title?: string;
  description?: string;
  hint?: string;
}

export function AccessDeniedView({
  title,
  description,
  hint,
}: AccessDeniedViewProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="pb-32">
      <PageHeader
        title={title ?? t('access_denied.title')}
        description={description ?? t('access_denied.description')}
        large
      />
      <div className="px-6 py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-[14px] text-muted-foreground">
          {hint ?? t('access_denied.hint')}
        </p>
        <Button
          className="mt-6"
          variant="secondary"
          size="lg"
          onClick={() => navigate('/')}
        >
          {t('access_denied.back_home')}
        </Button>
      </div>
    </div>
  );
}
