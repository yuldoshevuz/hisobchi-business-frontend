import { useCallback, useState } from 'react';
import {
  ChevronRight,
  Pause,
  Pencil,
  Play,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import {
  useAssignMemberRoles,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateEmployeeDefaults,
  useUpdateMemberStatus,
} from '@/api/hooks/use-members';
import { useRoles } from '@/api/hooks/use-rbac';
import {
  formatAmount,
  unformatAmount,
} from '@/components/transactions/forms/form-utils';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Member } from '@/types/member.types';
import type { Role } from '@/types/rbac.types';

interface MembersPageProps {
  /** When true, skips the top PageHeader so the page can be embedded inside Sozlamalar. */
  embedded?: boolean;
}

export function MembersPage({
  embedded = false,
}: MembersPageProps = {}): React.ReactElement {
  const { isReady } = usePermissions();
  const canManage = useCan(PermissionSlug.MEMBERS_MANAGE);
  const members = useMembers({ page: 1, limit: 50 }, { enabled: canManage });
  const roles = useRoles({ enabled: canManage });
  const [inviteOpen, setInviteOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [actionMember, setActionMember] = useState<Member | null>(null);

  if (isReady && !canManage) {
    return (
      <AccessDeniedView
        title="Xodimlar"
        description="Bu bo'limga kirish uchun ruxsat yo'q"
        hint="Xodimlarni boshqarish uchun 'members.manage' ruxsati kerak. Tashkilot egasidan so'rang."
      />
    );
  }

  return (
    <div className="pb-32">
      {embedded ? null : (
        <PageHeader
          title="Xodimlar"
          description="Tashkilot xodimlarini boshqarish"
          large
        />
      )}

      <div className="space-y-3">
        {members.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : members.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(members.error)}
                </span>
              }
            />
          </Section>
        ) : members.data && members.data.data.length > 0 ? (
          <Section title="Faol va to'xtatilgan xodimlar">
            {members.data.data.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                onTap={() => {
                  tgHapticImpact('light');
                  setActionMember(m);
                }}
              />
            ))}
          </Section>
        ) : (
          <div className="px-6 py-12 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              Xodim topilmadi
            </p>
          </div>
        )}
      </div>

      {canManage ? (
        <ScreenAction>
          <Button
            size="xl"
            onClick={() => {
              tgHapticImpact('light');
              setInviteOpen(true);
            }}
          >
            <UserPlus className="h-5 w-5" />
            Xodim taklif qilish
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="Xodim taklif qilish"
        description="Telefon raqami bo'yicha taklif yuboring"
      >
        <InviteMemberForm onClose={() => setInviteOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionMember)}
        onOpenChange={(o) => {
          if (!o) setActionMember(null);
        }}
        title={actionMember?.user.fullName}
        description={actionMember?.user.phoneNumber ?? '—'}
      >
        {actionMember ? (
          <MemberActions
            member={actionMember}
            onClose={() => setActionMember(null)}
            onEdit={() => {
              setEditing(actionMember);
              setActionMember(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Xodimni tahrirlash"
        description={editing?.user.fullName}
      >
        {editing ? (
          <EditEmployeeForm
            member={editing}
            roles={roles.data ?? []}
            rolesLoading={roles.isPending}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

interface MemberRowProps {
  member: Member;
  onTap: () => void;
}

function MemberRow({ member, onTap }: MemberRowProps): React.ReactElement {
  const initials = member.user.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <ListItem
      onClick={onTap}
      showChevron
      leading={
        <Avatar>
          <AvatarFallback>{initials || '?'}</AvatarFallback>
        </Avatar>
      }
      title={
        <span className="flex items-center gap-2">
          <span className="truncate">{member.user.fullName}</span>
          {member.status === 'suspended' ? (
            <Badge variant="destructive" className="text-[10px]">
              to'xtatilgan
            </Badge>
          ) : null}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1">
          <span className="truncate">{member.user.phoneNumber ?? '—'}</span>
          {member.roles.map((r) => (
            <Badge key={r.id} variant="secondary" className="text-[10px]">
              {r.name}
            </Badge>
          ))}
        </span>
      }
    />
  );
}

interface MemberActionsProps {
  member: Member;
  onClose: () => void;
  onEdit: () => void;
}

function MemberActions({
  member,
  onClose,
  onEdit,
}: MemberActionsProps): React.ReactElement {
  const updateStatus = useUpdateMemberStatus();
  const remove = useRemoveMember();

  function toggleStatus(): void {
    tgHapticImpact('medium');
    updateStatus.mutate(
      {
        id: member.id,
        body: { status: member.status === 'active' ? 'suspended' : 'active' },
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }

  function handleRemove(): void {
    if (!confirm(`${member.user.fullName} ni o'chirishni tasdiqlaysizmi?`))
      return;
    tgHapticImpact('heavy');
    remove.mutate(member.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  const salarySummary =
    member.defaultSalaryAmount && member.defaultSalaryCurrency
      ? `${member.defaultSalaryAmount} ${member.defaultSalaryCurrency}`
      : '—';
  const commissionSummary = member.defaultCommissionPercentage
    ? `${member.defaultCommissionPercentage}%`
    : '—';
  const rolesSummary =
    member.roles.length > 0
      ? member.roles.map((r) => r.name).join(', ')
      : 'Rol yo‘q';

  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      <ActionRow
        title="Tahrirlash"
        subtitle={`Oylik: ${salarySummary} · Foiz: ${commissionSummary} · Rollar: ${rolesSummary}`}
        onClick={onEdit}
        icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
      />
      <ActionRow
        title={
          member.status === 'active' ? "Xodimni to'xtatish" : 'Faollashtirish'
        }
        subtitle={
          member.status === 'active'
            ? 'Xodim tashkilotga kira olmaydi'
            : 'Xodimga kirish ruxsatini qaytaring'
        }
        onClick={toggleStatus}
        loading={updateStatus.isPending}
        icon={
          member.status === 'active' ? (
            <Pause className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Play className="h-4 w-4 text-muted-foreground" />
          )
        }
      />
      <ActionRow
        title="Xodimni o'chirish"
        subtitle="Bu amal qaytarib bo'lmaydi"
        destructive
        onClick={handleRemove}
        loading={remove.isPending}
        icon={<Trash2 className="h-4 w-4 text-destructive" />}
      />
    </div>
  );
}

interface ActionRowProps {
  title: string;
  subtitle?: string;
  onClick: () => void;
  loading?: boolean;
  destructive?: boolean;
  /** Optional leading icon — same shape as the other Actions sheets. */
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
          className={`flex items-center gap-2 text-[15px] font-medium ${
            destructive ? 'text-destructive' : 'text-foreground'
          }`}
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
      {loading ? (
        <Spinner />
      ) : (
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

interface InviteMemberFormProps {
  onClose: () => void;
}

function InviteMemberForm({
  onClose,
}: InviteMemberFormProps): React.ReactElement {
  const invite = useInviteMember();
  const [phone, setPhone] = useState<string>('+998');
  const [name, setName] = useState<string>('');

  const submit = useCallback((): void => {
    invite.mutate(
      {
        phoneNumber: phone.trim(),
        fullName: name.trim() || undefined,
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
          setPhone('+998');
          setName('');
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [invite, phone, name, onClose]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="invite-phone">Telefon</Label>
        <Input
          id="invite-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998901234567"
          inputMode="tel"
          required
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">Ism (ixtiyoriy)</Label>
        <Input
          id="invite-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Azizbek Karimov"
        />
      </div>
      {invite.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(invite.error)}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={invite.isPending || phone.trim().length < 9}
      >
        {invite.isPending ? <Spinner /> : null}
        Taklif qilish
      </Button>
    </form>
  );
}

interface EditEmployeeFormProps {
  member: Member;
  roles: Role[];
  rolesLoading: boolean;
  onClose: () => void;
}

const EMP_CURRENCIES = ['UZS', 'USD', 'EUR', 'RUB'] as const;

/**
 * Single sheet that edits salary, commission percentage AND role assignments
 * in one submit. Behind the scenes it diffs the current member against the
 * form state and only fires the mutations whose data actually changed:
 *   - PATCH /employee-defaults  → salary + commission
 *   - POST /:id/roles           → role assignments
 * If the user touches one block but not the other, only one network call is
 * made. Both succeed → close. Either fails → show its error and stay open.
 */
function EditEmployeeForm({
  member,
  roles,
  rolesLoading,
  onClose,
}: EditEmployeeFormProps): React.ReactElement {
  const updateDefaults = useUpdateEmployeeDefaults();
  const assign = useAssignMemberRoles();

  const [salary, setSalary] = useState<string>(
    member.defaultSalaryAmount ?? '',
  );
  const [salaryCurrency, setSalaryCurrency] = useState<string>(
    member.defaultSalaryCurrency ?? 'UZS',
  );
  const [percentage, setPercentage] = useState<string>(
    member.defaultCommissionPercentage ?? '',
  );
  const [selectedRoles, setSelectedRoles] = useState<Set<number>>(
    new Set(member.roles.map((r) => r.id)),
  );

  function toggleRole(id: number): void {
    tgHapticImpact('light');
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const trimmedSalary = salary.trim();
  const trimmedPercentage = percentage.trim();

  const salaryValid =
    trimmedSalary === '' ||
    (Number.isFinite(Number(trimmedSalary)) && Number(trimmedSalary) > 0);
  const percentageValid =
    trimmedPercentage === '' ||
    (Number.isFinite(Number(trimmedPercentage)) &&
      Number(trimmedPercentage) >= 0 &&
      Number(trimmedPercentage) <= 100);

  const isValid = salaryValid && percentageValid;

  // Diff detection — used to decide which mutations to run on submit.
  const originalSalary = member.defaultSalaryAmount ?? '';
  const originalCurrency = member.defaultSalaryCurrency ?? 'UZS';
  const originalPercentage = member.defaultCommissionPercentage ?? '';
  const defaultsChanged =
    trimmedSalary !== originalSalary ||
    salaryCurrency !== originalCurrency ||
    trimmedPercentage !== originalPercentage;

  const originalRoleIds = new Set(member.roles.map((r) => r.id));
  const rolesChanged =
    selectedRoles.size !== originalRoleIds.size ||
    Array.from(selectedRoles).some((id) => !originalRoleIds.has(id));

  const isPending = updateDefaults.isPending || assign.isPending;

  const submit = useCallback(async (): Promise<void> => {
    if (!isValid) return;
    try {
      if (defaultsChanged) {
        await updateDefaults.mutateAsync({
          id: member.id,
          body: {
            defaultSalaryAmount:
              trimmedSalary === '' ? null : trimmedSalary,
            defaultSalaryCurrency:
              trimmedSalary === '' ? null : salaryCurrency,
            defaultCommissionPercentage:
              trimmedPercentage === '' ? null : Number(trimmedPercentage),
          },
        });
      }
      if (rolesChanged) {
        await assign.mutateAsync({
          id: member.id,
          body: { roleIds: Array.from(selectedRoles) },
        });
      }
      tgHapticNotify('success');
      onClose();
    } catch {
      tgHapticNotify('error');
    }
  }, [
    isValid,
    defaultsChanged,
    rolesChanged,
    updateDefaults,
    assign,
    member.id,
    trimmedSalary,
    salaryCurrency,
    trimmedPercentage,
    selectedRoles,
    onClose,
  ]);

  const errorMessage =
    updateDefaults.isError && updateDefaults.error
      ? getApiErrorMessage(updateDefaults.error)
      : assign.isError && assign.error
        ? getApiErrorMessage(assign.error)
        : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      {/* ── Oylik (salary) + valyuta ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="emp-salary">Oylik (ixtiyoriy)</Label>
          <Input
            id="emp-salary"
            inputMode="decimal"
            value={formatAmount(salary)}
            onChange={(e) => setSalary(unformatAmount(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valyuta</Label>
          <div className="flex flex-wrap gap-2">
            {EMP_CURRENCIES.map((c) => {
              const selected = salaryCurrency === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    tgHapticImpact('light');
                    setSalaryCurrency(c);
                  }}
                  className={`press min-w-[56px] rounded-xl border px-2 py-2 text-[13px] font-medium ${
                    selected
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Sotuvdan foiz (commission %) ──────────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="emp-percentage">Sotuvdan foiz (ixtiyoriy)</Label>
        <Input
          id="emp-percentage"
          inputMode="decimal"
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          placeholder="0–100"
        />
        <p className="text-[12px] text-muted-foreground">
          Komissiya yaratishda asosiy qiymat sifatida ishlatiladi.
        </p>
      </div>

      {/* ── Rollar ─────────────────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Rollar</Label>
        {rolesLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : roles.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            Tashkilotda hali rol mavjud emas
          </p>
        ) : (
          <div className="-mx-4 divide-y divide-border bg-card">
            {roles.map((r) => (
              <label
                key={r.id}
                htmlFor={`role-${r.id}`}
                className="press flex cursor-pointer items-center gap-3 px-4 py-3 active:bg-accent"
              >
                <Checkbox
                  id={`role-${r.id}`}
                  checked={selectedRoles.has(r.id)}
                  onCheckedChange={() => toggleRole(r.id)}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-medium">{r.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {r.permissionSlugs.length} ruxsat
                  </div>
                </div>
                {r.isSystem ? (
                  <Badge variant="outline" className="text-[10px]">
                    tizim
                  </Badge>
                ) : null}
              </label>
            ))}
          </div>
        )}
      </div>

      {errorMessage ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button
        type="submit"
        size="xl"
        className="w-full"
        disabled={
          !isValid || isPending || (!defaultsChanged && !rolesChanged)
        }
      >
        {isPending ? <Spinner className="h-5 w-5" /> : null}
        Saqlash
      </Button>
    </form>
  );
}
