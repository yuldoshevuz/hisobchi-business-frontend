import {
  useArchiveAccount,
  useDeleteAccount,
  useUpdateAccount,
} from '@/api/hooks/use-accounts';
import { Spinner } from '@/components/ui/spinner';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
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
      { id: account.id, body: { status: 'ACTIVE' } },
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
    if (!confirm(`${account.name} hisobini o‘chirishni tasdiqlaysizmi?`))
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

  const errorMessage = archive.error ?? remove.error ?? update.error ?? null;
  const isArchived = account.status === 'ARCHIVED';

  return (
    <div className="space-y-3">
      <div className="-mx-4 divide-y divide-border bg-card">
        <ActionRow
          title="Tahrirlash"
          subtitle="Nom va asosiy belgisini o‘zgartirish"
          onClick={onEdit}
        />
        {!isArchived && !account.isPrimary ? (
          <ActionRow
            title="Asosiy qilib tayinlash"
            subtitle="Yangi tranzaksiyalar uchun avtomatik tanlanadi"
            onClick={makeDefault}
            loading={update.isPending}
          />
        ) : null}
        {!isArchived ? (
          <ActionRow
            title="Arxivlash"
            subtitle="Tarix saqlanadi, lekin yangi yozuvlar yopiladi"
            onClick={handleArchive}
            loading={archive.isPending}
          />
        ) : (
          <ActionRow
            title="Arxivdan tiklash"
            subtitle="Hisob yana faol bo‘ladi"
            onClick={handleRestore}
            loading={update.isPending}
          />
        )}
        <ActionRow
          title="Hisobni o‘chirish"
          subtitle="Faqat qoldiq 0 va pul harakati bo‘lmaganda"
          destructive
          onClick={handleDelete}
          loading={remove.isPending}
        />
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
  title: string;
  subtitle?: string;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
}

function ActionRow({
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
      <div className="min-w-0 flex-1">
        <div
          className={`text-[15px] font-medium ${
            destructive ? 'text-destructive' : 'text-foreground'
          }`}
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
