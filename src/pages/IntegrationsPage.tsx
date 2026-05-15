import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { GoogleSheetsCard } from '@/components/integrations/GoogleSheetsCard';
import { GoogleSheetsSetupWizard } from '@/components/integrations/GoogleSheetsSetupWizard';
import { Spinner } from '@/components/ui/spinner';
import { useGoogleSheetsStatus } from '@/api/hooks/use-google-sheets';
import { useCan } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';

/**
 * Integrations tab inside Sozlamalar. For now Google Sheets is the only
 * tile; when ERP adapters land in a later phase they slot in alongside
 * the GoogleSheetsCard.
 */
export function IntegrationsPage(): React.ReactElement {
  const { t } = useTranslation();
  const canManage = useCan(PermissionSlug.INTEGRATIONS_MANAGE);
  const statusQuery = useGoogleSheetsStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const [wizardOpen, setWizardOpen] = useState(false);

  // After the OAuth callback the backend redirects with
  // ?google_sheets=connected — auto-open the wizard so the user picks
  // a spreadsheet straight away. The setSearchParams call inside the
  // effect is the standard pattern for "consume + clear" query params;
  // rule disabled here because the cascade is intentional and bounded.
  useEffect(() => {
    if (searchParams.get('google_sheets') !== 'connected') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWizardOpen(true);
    const next = new URLSearchParams(searchParams);
    next.delete('google_sheets');
    next.delete('reason');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const oauthError = useMemo(() => {
    if (searchParams.get('google_sheets') !== 'error') return null;
    return searchParams.get('reason') ?? t('integrations.errors.oauthGeneric');
  }, [searchParams, t]);

  if (!canManage) {
    return <AccessDeniedView />;
  }

  if (statusQuery.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  const status = statusQuery.data!;

  return (
    <div className="space-y-4 px-4 pb-24 pt-2">
      {oauthError ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[14px] text-destructive">
          {t('integrations.errors.oauthFailed', { reason: oauthError })}
        </div>
      ) : null}

      <GoogleSheetsCard
        status={status}
        onConfigure={() => setWizardOpen(true)}
      />

      {wizardOpen ? (
        <GoogleSheetsSetupWizard
          status={status}
          onClose={() => setWizardOpen(false)}
        />
      ) : null}
    </div>
  );
}
