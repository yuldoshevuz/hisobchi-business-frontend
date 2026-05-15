import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Play, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  useDeleteSheetMapping,
  useGoogleSheetHeaders,
  useGoogleSheetsTabs,
  useSheetMappings,
  useSheetsSourceFields,
  useTestSheetMapping,
  useUpsertSheetMapping,
} from '@/api/hooks/use-google-sheets';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticNotify, tgShowAlert } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import type {
  ColumnMapping,
  IntegrationStatus,
  SheetMapping,
} from '@/types/google-sheets.types';
import type { TransactionType } from '@/types/transaction.types';
import { SOURCE_FIELD_LABEL_KEYS } from '@/types/google-sheets.types';

const TRANSACTION_TYPE_OPTIONS: readonly TransactionType[] = [
  'sale',
  'purchase',
  'expense',
  'income',
  'debt_in',
  'debt_out',
  'transfer',
];

interface Props {
  status: IntegrationStatus;
}

export function MappingEditor({ status }: Props): React.ReactElement {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<TransactionType>('sale');
  const mappingsQuery = useSheetMappings();

  if (!status.spreadsheetId) {
    return (
      <p className="text-[13px] text-muted-foreground">
        {t('integrations.sheets.editor.needSpreadsheet')}
      </p>
    );
  }

  return (
    <div>
      <div className="-mx-1 flex gap-1 overflow-x-auto rounded-xl bg-muted p-1">
        {TRANSACTION_TYPE_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={cn(
              'press shrink-0 rounded-lg px-3 py-2 text-[12px] font-medium',
              type === activeType
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground',
            )}
          >
            {t(`tx.type.${type}`, { defaultValue: type })}
          </button>
        ))}
      </div>

      <div className="mt-3">
        {mappingsQuery.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <TypeMappingForm
            type={activeType}
            existing={mappingsQuery.data?.find((m) => m.transactionType === activeType) ?? null}
          />
        )}
      </div>
    </div>
  );
}

interface FormProps {
  type: TransactionType;
  existing: SheetMapping | null;
}

function TypeMappingForm({ type, existing }: FormProps): React.ReactElement {
  const { t } = useTranslation();
  const tabsQuery = useGoogleSheetsTabs();
  const fieldsQuery = useSheetsSourceFields(type);
  const upsert = useUpsertSheetMapping();
  const remove = useDeleteSheetMapping();
  const test = useTestSheetMapping();

  const [selectedTab, setSelectedTab] = useState<{
    sheetId: number;
    title: string;
  } | null>(null);
  const [columns, setColumns] = useState<ColumnMapping[]>([]);
  const [trackingColumn, setTrackingColumn] = useState<string>('');
  const [voidMarkerColumn, setVoidMarkerColumn] = useState<string>('');
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Hydrate form state when the user switches transaction type tabs or
  // when the underlying mapping changes. Standard React form-hydration
  // pattern — the rule flags any setState-in-effect, but here the
  // cascade is bounded by `existing`/`type` deps and produces exactly
  // one extra render per change.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (existing) {
      setSelectedTab({
        sheetId: existing.sheetTabId,
        title: existing.sheetTabName,
      });
      setColumns(existing.columns.map((c) => ({ ...c })));
      setTrackingColumn(existing.trackingColumn ?? '');
      setVoidMarkerColumn(existing.voidMarkerColumn ?? '');
    } else {
      setSelectedTab(null);
      setColumns([]);
      setTrackingColumn('');
      setVoidMarkerColumn('');
    }
    setTestResult(null);
  }, [existing, type]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const headersQuery = useGoogleSheetHeaders(selectedTab?.title ?? null);

  const headerByColumn = useMemo(() => {
    const map: Record<string, string> = {};
    for (const h of headersQuery.data ?? []) map[h.column] = h.header;
    return map;
  }, [headersQuery.data]);

  function addColumn(): void {
    setColumns((prev) => [
      ...prev,
      { sourceField: '', targetColumn: nextUnusedColumn(prev), targetHeader: '' },
    ]);
  }

  function updateColumn(idx: number, patch: Partial<ColumnMapping>): void {
    setColumns((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next: ColumnMapping = { ...c, ...patch };
        if (patch.targetColumn) {
          next.targetHeader = headerByColumn[patch.targetColumn] ?? next.targetHeader;
        }
        return next;
      }),
    );
  }

  function removeColumn(idx: number): void {
    setColumns((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save(): Promise<void> {
    if (!selectedTab) {
      tgShowAlert(t('integrations.sheets.editor.pickTab'));
      return;
    }
    if (columns.length === 0) {
      tgShowAlert(t('integrations.sheets.editor.atLeastOne'));
      return;
    }
    try {
      await upsert.mutateAsync({
        transactionType: type,
        sheetTabName: selectedTab.title,
        sheetTabId: selectedTab.sheetId,
        columns,
        trackingColumn: trackingColumn || undefined,
        voidMarkerColumn: voidMarkerColumn || undefined,
        isActive: true,
      });
      tgHapticNotify('success');
    } catch (err) {
      tgHapticNotify('error');
      tgShowAlert(getApiErrorMessage(err));
    }
  }

  async function runTest(): Promise<void> {
    try {
      const res = await test.mutateAsync(type);
      setTestResult({
        ok: res.success,
        msg: res.success
          ? t('integrations.sheets.editor.testOk', { row: res.rowNumber ?? '?' })
          : (res.errorMessage ?? t('integrations.sheets.editor.testFail')),
      });
    } catch (err) {
      setTestResult({ ok: false, msg: getApiErrorMessage(err) });
    }
  }

  async function deleteMapping(): Promise<void> {
    if (!window.confirm(t('integrations.sheets.editor.deleteConfirm'))) return;
    try {
      await remove.mutateAsync(type);
    } catch (err) {
      tgShowAlert(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h4 className="text-[13px] font-medium text-muted-foreground">
          {t('integrations.sheets.editor.tabSection')}
        </h4>
        <TabSelector
          tabs={tabsQuery.data?.tabs ?? []}
          loading={tabsQuery.isPending}
          selected={selectedTab}
          onSelect={(tab) => setSelectedTab(tab)}
        />
      </section>

      {selectedTab ? (
        <section>
          <h4 className="text-[13px] font-medium text-muted-foreground">
            {t('integrations.sheets.editor.columnsSection')}
          </h4>

          {headersQuery.isPending ? (
            <div className="flex justify-center py-3">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="mt-2 space-y-2">
                {columns.map((col, idx) => (
                  <ColumnRow
                    key={idx}
                    column={col}
                    sourceFields={fieldsQuery.data?.fields ?? []}
                    availableColumns={headersQuery.data ?? []}
                    onChange={(patch) => updateColumn(idx, patch)}
                    onRemove={() => removeColumn(idx)}
                  />
                ))}
              </div>
              <Button
                onClick={addColumn}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Plus className="size-4" />
                {t('integrations.sheets.editor.addColumn')}
              </Button>
            </>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border border-border p-3">
        <h4 className="text-[13px] font-medium">
          {t('integrations.sheets.editor.advanced')}
        </h4>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {t('integrations.sheets.editor.trackingHint')}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <SmallSelect
            label={t('integrations.sheets.editor.trackingColumn')}
            value={trackingColumn}
            onChange={setTrackingColumn}
            options={headerByColumn}
          />
          <SmallSelect
            label={t('integrations.sheets.editor.voidColumn')}
            value={voidMarkerColumn}
            onChange={setVoidMarkerColumn}
            options={headerByColumn}
          />
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={upsert.isPending}>
          {t('common.save')}
        </Button>
        {existing ? (
          <>
            <Button
              onClick={runTest}
              variant="outline"
              disabled={test.isPending}
            >
              <Play className="size-4" />
              {t('integrations.sheets.editor.testPush')}
            </Button>
            <Button
              onClick={deleteMapping}
              variant="ghost"
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" />
              {t('common.delete')}
            </Button>
          </>
        ) : null}
      </div>

      {testResult ? (
        <p
          className={cn(
            'rounded-lg p-2 text-[13px]',
            testResult.ok
              ? 'bg-emerald-500/10 text-emerald-700'
              : 'bg-destructive/10 text-destructive',
          )}
        >
          {testResult.msg}
        </p>
      ) : null}
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

function TabSelector({
  tabs,
  loading,
  selected,
  onSelect,
}: {
  tabs: { sheetId: number; title: string }[];
  loading: boolean;
  selected: { sheetId: number; title: string } | null;
  onSelect: (t: { sheetId: number; title: string }) => void;
}): React.ReactElement {
  if (loading) return <Spinner />;
  if (tabs.length === 0) {
    return (
      <p className="mt-2 text-[12px] text-muted-foreground">
        No tabs available
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.sheetId}
          type="button"
          onClick={() => onSelect(tab)}
          className={cn(
            'press rounded-lg border px-3 py-1.5 text-[13px] font-medium',
            selected?.sheetId === tab.sheetId
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-card text-foreground',
          )}
        >
          {tab.title}
        </button>
      ))}
    </div>
  );
}

function ColumnRow({
  column,
  sourceFields,
  availableColumns,
  onChange,
  onRemove,
}: {
  column: ColumnMapping;
  sourceFields: Array<{ key: string; label: string; format: ColumnMapping['format'] | string }>;
  availableColumns: Array<{ column: string; header: string }>;
  onChange: (patch: Partial<ColumnMapping>) => void;
  onRemove: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="text-[12px] text-muted-foreground">
            {t('integrations.sheets.editor.hisobchiField')}
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-[14px]"
            value={column.sourceField}
            onChange={(e) => onChange({ sourceField: e.target.value })}
          >
            <option value="">—</option>
            {sourceFields.map((f) => {
              const i18nKey = SOURCE_FIELD_LABEL_KEYS[f.key];
              const label = i18nKey ? t(i18nKey, { defaultValue: f.label }) : f.label;
              return (
                <option key={f.key} value={f.key}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="text-[12px] text-muted-foreground">
            {t('integrations.sheets.editor.sheetColumn')}
          </label>
          <select
            className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-[14px]"
            value={column.targetColumn}
            onChange={(e) => onChange({ targetColumn: e.target.value })}
          >
            <option value="">—</option>
            {availableColumns.map((c) => (
              <option key={c.column} value={c.column}>
                {c.column} {c.header ? `· ${c.header}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onRemove}
          className="press inline-flex items-center gap-1 text-[12px] text-destructive"
        >
          <X className="size-3.5" />
          {t('common.delete')}
        </button>
      </div>
    </div>
  );
}

function SmallSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Record<string, string>;
}): React.ReactElement {
  return (
    <div>
      <label className="text-[12px] text-muted-foreground">{label}</label>
      <select
        className="mt-1 w-full rounded-lg border border-input bg-card px-3 py-2 text-[13px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {Object.entries(options).map(([col, header]) => (
          <option key={col} value={col}>
            {col} {header ? `· ${header}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

function nextUnusedColumn(existing: ColumnMapping[]): string {
  const used = new Set(existing.map((c) => c.targetColumn));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return 'A';
}
