import { useTranslation } from 'react-i18next';
import { AlertCircle, CheckCircle2, ExternalLink, Pause, Play, Sheet, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useDisconnectGoogleSheets,
  usePauseGoogleSheets,
  useResumeGoogleSheets,
  useStartGoogleSheetsOAuth,
} from '@/api/hooks/use-google-sheets';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify, tgOpenExternal, tgShowAlert } from '@/lib/telegram';
import type { IntegrationStatus } from '@/types/google-sheets.types';

interface Props {
  status: IntegrationStatus;
  onConfigure: () => void;
}

export function GoogleSheetsCard({ status, onConfigure }: Props): React.ReactElement {
  const { t } = useTranslation();
  const startOAuth = useStartGoogleSheetsOAuth();
  const disconnect = useDisconnectGoogleSheets();
  const pause = usePauseGoogleSheets();
  const resume = useResumeGoogleSheets();

  if (!status.available) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <CardHeader />
        <p className="mt-3 text-[14px] text-muted-foreground">
          {t('integrations.sheets.unavailable')}
        </p>
      </div>
    );
  }

  if (!status.connected) {
    return (
      <div className="rounded-xl border border-border bg-card p-4">
        <CardHeader />
        <p className="mt-2 text-[14px] text-muted-foreground">
          {t('integrations.sheets.description')}
        </p>
        <Button
          className="mt-4 w-full"
          onClick={async () => {
            try {
              const { url } = await startOAuth.mutateAsync(undefined);
              // Open in the OS browser. Google blocks OAuth inside the
              // Telegram WebView; the user finishes consent in their
              // real browser, then the backend redirects them via a
              // `https://t.me/<bot>?startapp=integrations_connected`
              // deep link, which Telegram opens and the mini-app
              // resumes at the integrations wizard via useDeepLink.
              tgOpenExternal(url);
            } catch (err) {
              tgHapticNotify('error');
              tgShowAlert(getApiErrorMessage(err));
            }
          }}
          disabled={startOAuth.isPending}
        >
          <ExternalLink className="size-4" />
          {t('integrations.sheets.connect')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <CardHeader />
      <StatusLine status={status} />

      <dl className="mt-3 space-y-1 text-[13px]">
        {status.googleAccountEmail ? (
          <Row label={t('integrations.sheets.account')} value={status.googleAccountEmail} />
        ) : null}
        {status.spreadsheetTitle ? (
          <Row
            label={t('integrations.sheets.spreadsheet')}
            value={status.spreadsheetTitle}
          />
        ) : (
          <Row
            label={t('integrations.sheets.spreadsheet')}
            value={t('integrations.sheets.spreadsheetNotPicked')}
          />
        )}
        {status.lastSyncAt ? (
          <Row
            label={t('integrations.sheets.lastSync')}
            value={new Date(status.lastSyncAt).toLocaleString()}
          />
        ) : null}
      </dl>

      {status.lastErrorMessage && status.status === 'error' ? (
        <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-[12px] text-destructive">
          {status.lastErrorMessage}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={onConfigure} size="sm">
          {t('integrations.sheets.configure')}
        </Button>
        {status.status === 'active' ? (
          <Button
            onClick={() => pause.mutate()}
            disabled={pause.isPending}
            variant="outline"
            size="sm"
          >
            <Pause className="size-4" />
            {t('integrations.sheets.pause')}
          </Button>
        ) : null}
        {status.status === 'paused' || status.status === 'error' ? (
          <Button
            onClick={() => resume.mutate()}
            disabled={resume.isPending}
            variant="outline"
            size="sm"
          >
            <Play className="size-4" />
            {t('integrations.sheets.resume')}
          </Button>
        ) : null}
        <Button
          onClick={() => {
            if (!window.confirm(t('integrations.sheets.disconnectConfirm'))) return;
            disconnect.mutate();
          }}
          disabled={disconnect.isPending}
          variant="ghost"
          size="sm"
        >
          <Unplug className="size-4" />
          {t('integrations.sheets.disconnect')}
        </Button>
      </div>
    </div>
  );
}

function CardHeader(): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-700">
        <Sheet className="size-5" />
      </div>
      <div className="flex-1">
        <h3 className="text-[15px] font-semibold leading-tight">
          {t('integrations.sheets.title')}
        </h3>
        <p className="text-[12px] text-muted-foreground">
          {t('integrations.sheets.subtitle')}
        </p>
      </div>
    </div>
  );
}

function StatusLine({ status }: { status: IntegrationStatus }): React.ReactElement {
  const { t } = useTranslation();
  if (status.status === 'active') {
    return (
      <p className="mt-3 flex items-center gap-1 text-[13px] font-medium text-emerald-600">
        <CheckCircle2 className="size-4" />
        {t('integrations.sheets.status.active')}
      </p>
    );
  }
  if (status.status === 'paused') {
    return (
      <p className="mt-3 flex items-center gap-1 text-[13px] font-medium text-amber-600">
        <Pause className="size-4" />
        {t('integrations.sheets.status.paused')}
      </p>
    );
  }
  if (status.status === 'error') {
    return (
      <p className="mt-3 flex items-center gap-1 text-[13px] font-medium text-destructive">
        <AlertCircle className="size-4" />
        {t('integrations.sheets.status.error')}
      </p>
    );
  }
  if (status.status === 'revoked') {
    return (
      <p className="mt-3 flex items-center gap-1 text-[13px] font-medium text-destructive">
        <AlertCircle className="size-4" />
        {t('integrations.sheets.status.revoked')}
      </p>
    );
  }
  return <></>;
}

function Row({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex gap-2">
      <dt className="min-w-24 text-muted-foreground">{label}</dt>
      <dd className="flex-1 font-medium text-foreground break-all">{value}</dd>
    </div>
  );
}
