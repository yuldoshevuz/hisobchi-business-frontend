import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCurrentOrganization,
  useUpdateCurrentOrganization,
} from '@/api/hooks/use-organizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticNotify } from '@/lib/telegram';

const CURRENCY_OPTIONS = ['UZS', 'USD', 'EUR', 'RUB'] as const;

/**
 * Organization-level settings. Lives inside Sozlamalar as a third tab so
 * it sits alongside Xodimlar and Rollar — admins land in the same place
 * for every org-wide tweak.
 *
 * Edits go through the existing `PATCH /web/organizations/current`
 * endpoint guarded by the `organizations.manage` permission. Currency
 * changes only take effect for FUTURE transactions; existing rows keep
 * the currency they were posted in (call-out shown in the form).
 */
export function OrganizationSettingsPage(): React.ReactElement {
  const { t } = useTranslation();
  const currentOrgQuery = useCurrentOrganization();
  const updateMutation = useUpdateCurrentOrganization();
  const canManage = useCan(PermissionSlug.ORGANIZATIONS_MANAGE);

  const [name, setName] = useState<string>('');
  const [baseCurrency, setBaseCurrency] = useState<string>('UZS');

  // Sync form when the query result first lands (or refreshes after save).
  useEffect(() => {
    const data = currentOrgQuery.data;
    if (!data) return;
    setName(data.name);
    setBaseCurrency(data.baseCurrency);
  }, [currentOrgQuery.data]);

  if (currentOrgQuery.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }
  if (currentOrgQuery.isError || !currentOrgQuery.data) {
    return (
      <p className="px-4 py-6 text-[13px] text-destructive">
        {getApiErrorMessage(currentOrgQuery.error, t('org_settings.load_error'))}
      </p>
    );
  }

  const org = currentOrgQuery.data;
  const trimmedName = name.trim();
  const isValid = trimmedName.length >= 1 && trimmedName.length <= 255;
  const hasChanges =
    trimmedName !== org.name ||
    baseCurrency !== org.baseCurrency;

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    if (!canManage || !isValid || !hasChanges) return;
    const body: {
      name?: string;
      baseCurrency?: string;
    } = {};
    if (trimmedName !== org.name) body.name = trimmedName;
    if (baseCurrency !== org.baseCurrency) body.baseCurrency = baseCurrency;
    updateMutation.mutate(body, {
      onSuccess: () => tgHapticNotify('success'),
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-8 pt-2">
      <div className="space-y-1.5">
        <Label htmlFor="org-name">{t('org_settings.field.name')}</Label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={255}
          disabled={!canManage}
        />
      </div>

      <div className="space-y-1.5">
        <Label>{t('org_settings.field.currency')}</Label>
        <div className="grid grid-cols-4 gap-2">
          {CURRENCY_OPTIONS.map((code) => {
            const active = baseCurrency === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => canManage && setBaseCurrency(code)}
                disabled={!canManage}
                className={`press rounded-xl border px-2 py-3 text-[13px] font-medium disabled:opacity-50 ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground'
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
        {baseCurrency !== org.baseCurrency ? (
          <p className="text-[11px] text-muted-foreground">
            {t('org_settings.currency_change_warning')}
          </p>
        ) : null}
      </div>

      {!canManage ? (
        <p className="text-[12px] text-muted-foreground">
          {t('org_settings.edit_permission_required')}
        </p>
      ) : null}

      {updateMutation.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(updateMutation.error, t('errors.fallback'))}
        </p>
      ) : null}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={
          !canManage ||
          !isValid ||
          !hasChanges ||
          updateMutation.isPending
        }
      >
        {updateMutation.isPending ? <Spinner /> : null}
        {t('common.save')}
      </Button>
    </form>
  );
}
