import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft,
  Archive,
  ArchiveRestore,
  ListChecks,
  Pencil,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  useArchiveAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/api/hooks/use-accounts';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import { cn } from '@/lib/utils';
import type { Account } from '@/types/account.types';

interface AccountActionsProps {
  account: Account;
  onClose: () => void;
  onEdit: () => void;
}

export function AccountActions({
  account,
  onClose,
  onEdit,
}: AccountActionsProps): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const archive = useArchiveAccount();
  const remove = useDeleteAccount();
  const update = useUpdateAccount();

  function makeDefault(): void {
    if (account.isPrimary) return;
    tgHapticImpact('medium');
    update.mutate(
      { id: account.id, body: { isPrimary: true } },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleArchive(): void {
    tgHapticImpact('medium');
    archive.mutate(account.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  function handleRestore(): void {
    tgHapticImpact('medium');
    update.mutate(
      { id: account.id, body: { status: 'active' } },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleDelete(): void {
    if (!confirm(t('account_actions.delete_confirm', { name: account.name })))
      return;
    tgHapticImpact('heavy');
    remove.mutate(account.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  function openTransfer(): void {
    tgHapticImpact('light');
    onClose();
    navigate(
      `/transactions/new/transfer?fromAccountId=${String(account.id)}`,
    );
  }

  function openReports(): void {
    tgHapticImpact('light');
    onClose();
    navigate(`/transactions?accountId=${String(account.id)}`);
  }

  const errorMessage = archive.error ?? remove.error ?? update.error ?? null;
  const isArchived = account.status === 'archived';
  // Hide destructive actions when they cannot succeed:
  //   • Delete needs balance == 0 AND no cash flows. We check the balance
  //     here contact-side; the cash-flow check still lives server-side.
  //   • Archive is forbidden on the primary account — promoting another
  //     account first is the user's prerequisite.
  const balanceIsZero = Number(account.currentBalance) === 0;
  const canDelete = !isArchived && balanceIsZero;
  const canArchive = !isArchived && !account.isPrimary;
  const canRestore = isArchived;

  return (
    <div className="space-y-3">
      <div className="-mx-4 divide-y divide-border bg-card">
        {!isArchived ? (
          <ActionRow
            icon={ArrowRightLeft}
            title={t('account_actions.transfer_title')}
            subtitle={t('account_actions.transfer_subtitle')}
            onClick={openTransfer}
          />
        ) : null}
        <ActionRow
          icon={ListChecks}
          title={t('account_actions.reports_title')}
          subtitle={t('account_actions.reports_subtitle')}
          onClick={openReports}
        />
        {!isArchived && !account.isPrimary ? (
          <ActionRow
            icon={Star}
            title={t('account_actions.make_default_title')}
            subtitle={t('account_actions.make_default_subtitle')}
            onClick={makeDefault}
            loading={update.isPending}
          />
        ) : null}
        <ActionRow
          icon={Pencil}
          title={t('account_actions.edit_title')}
          subtitle={t('account_actions.edit_subtitle')}
          onClick={onEdit}
        />
        {canArchive ? (
          <ActionRow
            icon={Archive}
            title={t('account_actions.archive_title')}
            subtitle={t('account_actions.archive_subtitle')}
            onClick={handleArchive}
            loading={archive.isPending}
          />
        ) : null}
        {canRestore ? (
          <ActionRow
            icon={ArchiveRestore}
            title={t('account_actions.restore_title')}
            subtitle={t('account_actions.restore_subtitle')}
            onClick={handleRestore}
            loading={update.isPending}
          />
        ) : null}
        {canDelete ? (
          <ActionRow
            icon={Trash2}
            title={t('account_actions.delete_title')}
            subtitle={t('account_actions.delete_subtitle')}
            destructive
            onClick={handleDelete}
            loading={remove.isPending}
          />
        ) : null}
      </div>
      {errorMessage ? (
        <p className="px-4 text-[13px] text-destructive">
          {getApiErrorMessage(errorMessage)}
        </p>
      ) : null}
    </div>
  );
}

interface ActionRowProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
}

function ActionRow({
  icon: Icon,
  title,
  subtitle,
  onClick,
  loading,
  destructive,
}: ActionRowProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent disabled:opacity-50"
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          destructive
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            'text-[15px] font-medium',
            destructive ? 'text-destructive' : 'text-foreground',
          )}
        >
          {title}
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-[13px] text-muted-foreground">
            {subtitle}
          </div>
        ) : null}
      </div>
      {loading ? <Spinner /> : null}
    </button>
  );
}
