import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Check,
  Pause,
  Pencil,
  Play,
  Plus,
  SkipForward,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import {
  useCancelScheduled,
  usePauseScheduled,
  useResumeScheduled,
  useScheduled,
  useScheduledReminders,
  useSkipScheduledReminder,
} from '@/api/hooks/use-scheduled';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { FeatureGate } from '@/components/FeatureGate';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { CreateScheduledForm } from '@/components/scheduled/CreateScheduledForm';
import { EditScheduledForm } from '@/components/scheduled/EditScheduledForm';
import {
  RECURRENCE_ICON,
  RECURRENCE_LABEL,
  REMINDER_STATUS_LABEL,
  REMINDER_STATUS_VARIANT,
  SCHEDULED_STATUS_LABEL,
  SCHEDULED_STATUS_VARIANT,
} from '@/components/scheduled/scheduled-meta';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { TRANSACTION_TYPE_LABEL } from '@/lib/transaction-meta';
import { cn } from '@/lib/utils';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  SCHEDULED_STATUS_VALUES,
  type Scheduled,
  type ScheduledStatus,
} from '@/types/scheduled.types';

type StatusFilter = ScheduledStatus | 'all';

const TABS: ReadonlyArray<{ id: 'plans' | 'reminders'; label: string }> = [
  { id: 'plans', label: 'Rejalar' },
  { id: 'reminders', label: 'Eslatmalar' },
];

/**
 * Mirrors the backend cron — see `scheduled.cron.ts`:
 *   `@Cron('15 0 * * *', { timeZone: 'Asia/Tashkent' })`.
 * Surfaced in the UI so users understand why a freshly-created plan won't
 * fire its first reminder until tomorrow 00:15. Update both sides together
 * if the cadence ever changes.
 */
const REMINDER_CRON_HINT = "Eslatmalar har kuni 00:15 (Toshkent) da yuboriladi";

export function ScheduledPage(): React.ReactElement {
  const { t } = useTranslation();
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.SCHEDULED_READ);
  const canManage = useCan(PermissionSlug.SCHEDULED_MANAGE);

  const [tab, setTab] = useState<'plans' | 'reminders'>('plans');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [actionRow, setActionRow] = useState<Scheduled | null>(null);
  const [editing, setEditing] = useState<Scheduled | null>(null);

  const plans = useScheduled(
    {
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      limit: 100,
    },
    { enabled: canRead && tab === 'plans' },
  );

  const reminders = useScheduledReminders(
    { limit: 100 },
    { enabled: canRead && tab === 'reminders' },
  );

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title={t('scheduled_page.title')}
        description={t('scheduled_page.no_access')}
        hint="'scheduled.read' ruxsati kerak."
      />
    );
  }

  const planList = plans.data?.data ?? [];

  return (
    <FeatureGate feature="SCHEDULED_TRANSACTIONS">
    <div className="pb-32">
      <PageHeader
        title={t('scheduled_page.title')}
        description={t('scheduled_page.subtitle')}
        large
        showBack
      />

      <div className="px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-muted p-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  if (active) return;
                  tgHapticImpact('light');
                  setTab(t.id);
                }}
                className={cn(
                  'press flex-1 rounded-lg px-3 py-2 text-[14px] font-medium transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {tab === 'plans' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-end px-4">
            <StatusFilterButton
              value={statusFilter}
              onChange={setStatusFilter}
            />
          </div>

          {plans.isPending ? (
            <div className="flex justify-center py-16">
              <Spinner className="h-6 w-6" />
            </div>
          ) : plans.isError ? (
            <Section>
              <ListItem
                asStatic
                title={
                  <span className="text-destructive">
                    {getApiErrorMessage(plans.error)}
                  </span>
                }
              />
            </Section>
          ) : planList.length > 0 ? (
            <Section>
              {planList.map((p) => (
                <ScheduledRow
                  key={p.id}
                  scheduled={p}
                  onTap={() => {
                    tgHapticImpact('light');
                    setActionRow(p);
                  }}
                />
              ))}
            </Section>
          ) : (
            <div className="px-6 py-12 text-center">
              <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-[14px] text-muted-foreground">
                {statusFilter === 'all'
                  ? "Hozircha reja yo'q"
                  : `${SCHEDULED_STATUS_LABEL[statusFilter as ScheduledStatus]} rejalar yo'q`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <RemindersTab
          isPending={reminders.isPending}
          isError={reminders.isError}
          error={reminders.error}
          reminders={reminders.data?.data ?? []}
          plans={planList}
          canManage={canManage}
        />
      )}

      {canManage && tab === 'plans' ? (
        <ScreenAction>
          <Button
            size="xl"
            onClick={() => {
              tgHapticImpact('light');
              setCreateOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Yangi reja
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={t('scheduled_page.new_title')}
        description={t('scheduled_page.new_description')}
      >
        <CreateScheduledForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionRow)}
        onOpenChange={(o) => {
          if (!o) setActionRow(null);
        }}
        title={actionRow?.description}
        description={
          actionRow ? TRANSACTION_TYPE_LABEL[actionRow.type] : undefined
        }
      >
        {actionRow ? (
          <ScheduledActions
            scheduled={actionRow}
            canManage={canManage}
            onClose={() => setActionRow(null)}
            onEdit={() => {
              setEditing(actionRow);
              setActionRow(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={t('scheduled_page.edit_title')}
        description={editing ? TRANSACTION_TYPE_LABEL[editing.type] : undefined}
      >
        {editing ? (
          <EditScheduledForm
            scheduled={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
    </FeatureGate>
  );
}

interface ScheduledRowProps {
  scheduled: Scheduled;
  onTap: () => void;
}

function ScheduledRow({
  scheduled,
  onTap,
}: ScheduledRowProps): React.ReactElement {
  const RecurrenceIcon = RECURRENCE_ICON[scheduled.recurrenceType];
  return (
    <ListItem
      onClick={onTap}
      showChevron
      leading={
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <RecurrenceIcon className="h-4 w-4" />
        </div>
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{scheduled.description}</span>
          <Badge
            variant={SCHEDULED_STATUS_VARIANT[scheduled.status]}
            className="text-[10px]"
          >
            {SCHEDULED_STATUS_LABEL[scheduled.status]}
          </Badge>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5">
          <span>{RECURRENCE_LABEL[scheduled.recurrenceType]}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{formatDateUz(scheduled.nextOccurrence)}</span>
          {scheduled.amount !== null ? (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="font-medium tabular-nums">
                {formatMoney(scheduled.amount, scheduled.currency)}
              </span>
            </>
          ) : (
            <Badge variant="secondary" className="text-[10px]">
              summa so'raladi
            </Badge>
          )}
        </span>
      }
    />
  );
}

interface ScheduledActionsProps {
  scheduled: Scheduled;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}

function ScheduledActions({
  scheduled,
  canManage,
  onClose,
  onEdit,
}: ScheduledActionsProps): React.ReactElement {
  const pause = usePauseScheduled();
  const resume = useResumeScheduled();
  const cancel = useCancelScheduled();

  const pending = pause.isPending || resume.isPending || cancel.isPending;
  const error = pause.error ?? resume.error ?? cancel.error;
  const isActive = scheduled.status === 'active';
  const isPaused = scheduled.status === 'paused';
  const isTerminal =
    scheduled.status === 'ended' || scheduled.status === 'cancelled';

  function run(
    fn: typeof pause | typeof resume | typeof cancel,
    haptic: 'medium' | 'heavy' = 'medium',
  ): void {
    tgHapticImpact(haptic);
    fn.mutate(scheduled.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-xl bg-muted/40 px-3 py-3 text-[13px]">
        <Row label="Keyingi sana" value={formatDateUz(scheduled.nextOccurrence)} />
        {scheduled.endDate ? (
          <Row label="Tugash" value={formatDateUz(scheduled.endDate)} />
        ) : null}
        <Row
          label="Summa"
          value={
            scheduled.amount !== null
              ? `${formatMoney(scheduled.amount, scheduled.currency)} ${scheduled.currency}`
              : "Har safar so'raladi"
          }
        />
        {scheduled.lastTriggeredAt ? (
          <Row
            label="Oxirgi tasdiq"
            value={formatDateUz(scheduled.lastTriggeredAt)}
          />
        ) : null}
        <Row label="Eslatma vaqti" value="00:15 (Toshkent)" />
      </div>

      <p className="text-[12px] text-muted-foreground">
        ℹ️ {REMINDER_CRON_HINT}. Bot eslatma kelgach Tasdiqlash / O'tkazish tugmalarini ko'rsatadi.
      </p>

      {canManage && !isTerminal ? (
        <div className="-mx-4 divide-y divide-border bg-card">
          <ActionRow
            title="Tahrirlash"
            subtitle="Tavsif, summa, tugash sanasi"
            onClick={onEdit}
            icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
          />
          {isActive ? (
            <ActionRow
              title="To'xtatish"
              subtitle="Eslatmalar yaratilmaydi"
              onClick={() => run(pause)}
              loading={pending}
              icon={<Pause className="h-4 w-4 text-muted-foreground" />}
            />
          ) : null}
          {isPaused ? (
            <ActionRow
              title="Davom ettirish"
              subtitle="Eslatmalar yana yaratiladi"
              onClick={() => run(resume)}
              loading={pending}
              icon={<Play className="h-4 w-4 text-muted-foreground" />}
            />
          ) : null}
          <ActionRow
            title="Bekor qilish"
            subtitle="Reja butunlay to'xtatiladi"
            destructive
            onClick={() => run(cancel, 'heavy')}
            loading={pending}
            icon={<X className="h-4 w-4 text-destructive" />}
          />
        </div>
      ) : null}

      {error ? (
        <p className="px-4 text-[13px] text-destructive">
          {getApiErrorMessage(error)}
        </p>
      ) : null}
    </div>
  );
}

interface RemindersTabProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reminders: ReturnType<typeof useScheduledReminders>['data'] extends infer T
    ? T extends { data: infer R }
      ? R
      : never
    : never;
  plans: Scheduled[];
  canManage: boolean;
}

function RemindersTab({
  isPending,
  isError,
  error,
  reminders,
  plans,
  canManage,
}: RemindersTabProps): React.ReactElement {
  const skip = useSkipScheduledReminder();
  const planById = new Map(plans.map((p) => [p.id, p] as const));

  if (isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (isError) {
    return (
      <Section>
        <ListItem
          asStatic
          title={
            <span className="text-destructive">
              {getApiErrorMessage(error)}
            </span>
          }
        />
      </Section>
    );
  }
  if (reminders.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <CalendarClock className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-[14px] text-muted-foreground">
          Hozircha eslatma yo'q
        </p>
      </div>
    );
  }

  return (
    <Section>
      {reminders.map((r) => {
        const plan = planById.get(r.scheduledId);
        const canSkip =
          canManage && (r.status === 'pending' || r.status === 'notified');
        return (
          <ListItem
            key={r.id}
            leading={
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <CalendarClock className="h-4 w-4" />
              </div>
            }
            title={
              <span className="flex items-center gap-2">
                <span className="truncate">
                  {plan?.description ?? `#${r.scheduledId}`}
                </span>
                <Badge
                  variant={REMINDER_STATUS_VARIANT[r.status]}
                  className="text-[10px]"
                >
                  {REMINDER_STATUS_LABEL[r.status]}
                </Badge>
              </span>
            }
            subtitle={
              <span className="flex flex-wrap items-center gap-1.5">
                <span>{formatDateUz(r.dueDate)}</span>
                {plan && plan.amount !== null ? (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="tabular-nums">
                      {formatMoney(plan.amount, plan.currency)}
                    </span>
                  </>
                ) : null}
              </span>
            }
            trailing={
              canSkip ? (
                <button
                  type="button"
                  aria-label="O'tkazish"
                  onClick={(e) => {
                    e.stopPropagation();
                    tgHapticImpact('medium');
                    skip.mutate(r.id, {
                      onSuccess: () => tgHapticNotify('success'),
                      onError: () => tgHapticNotify('error'),
                    });
                  }}
                  className="press flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
                  disabled={skip.isPending}
                >
                  <SkipForward className="h-4 w-4" />
                </button>
              ) : null
            }
          />
        );
      })}
    </Section>
  );
}

interface StatusFilterButtonProps {
  value: StatusFilter;
  onChange: (next: StatusFilter) => void;
}

function StatusFilterButton({
  value,
  onChange,
}: StatusFilterButtonProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const isFiltered = value !== 'active';

  return (
    <>
      <button
        type="button"
        aria-label="Holati bo'yicha filter"
        onClick={() => {
          tgHapticImpact('light');
          setOpen(true);
        }}
        className={cn(
          'press flex h-9 items-center gap-1.5 rounded-md border px-3 text-[13px] font-medium transition-colors',
          isFiltered
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-input bg-card text-foreground hover:border-primary',
        )}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>
          {value === 'all' ? 'Hammasi' : SCHEDULED_STATUS_LABEL[value]}
        </span>
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Holati bo'yicha filter">
        <div className="-mx-4 divide-y divide-border bg-card">
          {(['all', ...SCHEDULED_STATUS_VALUES] as StatusFilter[]).map((key) => {
            const active = value === key;
            const labelText =
              key === 'all' ? 'Hammasi' : SCHEDULED_STATUS_LABEL[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  tgHapticImpact('light');
                  onChange(key);
                  setOpen(false);
                }}
                className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
              >
                <div
                  className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  <Users className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    'flex-1 text-[15px]',
                    active ? 'font-semibold text-primary' : 'text-foreground',
                  )}
                >
                  {labelText}
                </span>
                {active ? (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                ) : null}
              </button>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

interface ActionRowProps {
  title: string;
  subtitle?: string;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
  icon?: React.ReactNode;
}

function ActionRow({
  title,
  subtitle,
  onClick,
  loading,
  destructive,
  icon,
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
          className={cn(
            'flex items-center gap-2 text-[15px] font-medium',
            destructive ? 'text-destructive' : 'text-foreground',
          )}
        >
          {icon}
          <span>{title}</span>
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

interface RowProps {
  label: string;
  value: string;
}

function Row({ label, value }: RowProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

const MONTHS_UZ_SHORT = [
  'Yan',
  'Fev',
  'Mar',
  'Apr',
  'May',
  'Iyn',
  'Iyl',
  'Avg',
  'Sen',
  'Okt',
  'Noy',
  'Dek',
] as const;

function formatDateUz(iso: string): string {
  // Accept both YYYY-MM-DD and full ISO timestamps; we only need calendar
  // parts for the row subtitle / detail rows.
  const [datePart] = iso.split('T');
  const [y, m, d] = (datePart ?? '').split('-').map((p) => Number(p));
  if (!y || !m || !d) return iso;
  return `${d.toString().padStart(2, '0')} ${MONTHS_UZ_SHORT[m - 1]} ${y}`;
}
