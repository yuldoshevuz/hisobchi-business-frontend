import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, XCircle, MinusCircle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { useSheetsSyncLogs } from '@/api/hooks/use-google-sheets';
import { cn } from '@/lib/utils';
import type {
  GoogleSheetsSyncStatus,
  SyncLog,
} from '@/types/google-sheets.types';

export function SyncLogsList(): React.ReactElement {
  const { t } = useTranslation();
  const query = useSheetsSyncLogs(50);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  const logs = query.data ?? [];
  if (logs.length === 0) {
    return (
      <p className="text-center text-[13px] text-muted-foreground">
        {t('integrations.sheets.logs.empty')}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {logs.map((log) => (
        <LogRow key={log.id} log={log} />
      ))}
    </ul>
  );
}

function LogRow({ log }: { log: SyncLog }): React.ReactElement {
  const { t } = useTranslation();
  return (
    <li className="flex items-start gap-3 px-3 py-3">
      <StatusIcon status={log.status} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {t(`integrations.sheets.logs.operation.${log.operation}`, { defaultValue: log.operation })}
          {' · #'}
          {log.transactionId}
          {log.targetRow ? ` · row ${log.targetRow}` : ''}
        </p>
        <p className="truncate text-[12px] text-muted-foreground">
          {log.sheetTabName || '—'}
          {' · '}
          {new Date(log.createdAt).toLocaleString()}
        </p>
        {log.errorMessage ? (
          <p className="mt-1 text-[12px] text-destructive">{log.errorMessage}</p>
        ) : null}
      </div>
    </li>
  );
}

function StatusIcon({
  status,
}: {
  status: GoogleSheetsSyncStatus;
}): React.ReactElement {
  const cls = 'size-4';
  if (status === 'success') {
    return <CheckCircle2 className={cn(cls, 'text-emerald-600')} />;
  }
  if (status === 'retrying') {
    return <Clock className={cn(cls, 'text-amber-600')} />;
  }
  if (status === 'skipped') {
    return <MinusCircle className={cn(cls, 'text-muted-foreground')} />;
  }
  return <XCircle className={cn(cls, 'text-destructive')} />;
}
