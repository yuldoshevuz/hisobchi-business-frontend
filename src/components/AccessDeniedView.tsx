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
  title = 'Ruxsat yo‘q',
  description = 'Sizda bu bo‘limni ko‘rish uchun ruxsat yo‘q',
  hint = 'Ruxsat olish uchun tashkilot egasi bilan bog‘laning.',
}: AccessDeniedViewProps): React.ReactElement {
  const navigate = useNavigate();
  return (
    <div className="pb-32">
      <PageHeader title={title} description={description} large />
      <div className="px-6 py-12 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-[14px] text-muted-foreground">{hint}</p>
        <Button
          className="mt-6"
          variant="secondary"
          size="lg"
          onClick={() => navigate('/')}
        >
          Asosiy sahifaga qaytish
        </Button>
      </div>
    </div>
  );
}
