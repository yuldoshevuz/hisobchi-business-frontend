import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
  useGoogleSpreadsheets,
  useSelectSpreadsheet,
} from '@/api/hooks/use-google-sheets';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify, tgShowAlert } from '@/lib/telegram';
import type { IntegrationStatus } from '@/types/google-sheets.types';

interface Props {
  status: IntegrationStatus;
  onPicked: () => void;
}

export function SpreadsheetPicker({ status, onPicked }: Props): React.ReactElement {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const list = useGoogleSpreadsheets(q || undefined);
  const select = useSelectSpreadsheet();

  return (
    <div>
      <p className="text-[13px] text-muted-foreground">
        {t('integrations.sheets.picker.help')}
      </p>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('integrations.sheets.picker.searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => list.refetch()}
          disabled={list.isFetching}
          aria-label={t('common.refresh')}
        >
          <RefreshCw
            className={list.isFetching ? 'size-4 animate-spin' : 'size-4'}
          />
        </Button>
      </div>

      {list.isPending ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : list.isError ? (
        <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-[13px] text-destructive">
          {getApiErrorMessage(list.error)}
        </p>
      ) : list.data && list.data.length === 0 ? (
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {t('integrations.sheets.picker.empty')}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {(list.data ?? []).map((s) => {
            const selected = s.id === status.spreadsheetId;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="press flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-accent"
                  onClick={async () => {
                    try {
                      await select.mutateAsync(s.id);
                      onPicked();
                    } catch (err) {
                      tgHapticNotify('error');
                      tgShowAlert(getApiErrorMessage(err));
                    }
                  }}
                  disabled={select.isPending}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-[14px] font-medium">{s.name}</p>
                    {s.modifiedTime ? (
                      <p className="truncate text-[12px] text-muted-foreground">
                        {new Date(s.modifiedTime).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  {selected ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
