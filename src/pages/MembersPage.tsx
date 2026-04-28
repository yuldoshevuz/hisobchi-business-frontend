import { useCallback, useState } from 'react';
import { ChevronRight, UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import {
  useAssignMemberRoles,
  useInviteMember,
  useMembers,
  useRemoveMember,
  useUpdateMemberStatus,
} from '@/api/hooks/use-members';
import { useRoles } from '@/api/hooks/use-rbac';
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
        title="A'zolar"
        description="Bu bo'limga kirish uchun ruxsat yo'q"
        hint="A'zolarni boshqarish uchun 'members.manage' ruxsati kerak. Tashkilot egasidan so'rang."
      />
    );
  }

  return (
    <div className="pb-32">
      {embedded ? null : (
        <PageHeader
          title="A'zolar"
          description="Tashkilot a'zolarini boshqarish"
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
          <Section title="Faol va to'xtatilgan a'zolar">
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
              A'zolar topilmadi
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
            A'zoni taklif qilish
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        title="A'zo taklif qilish"
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
            onEditRoles={() => {
              setActionMember(null);
              setEditing(actionMember);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Rollar"
        description={editing?.user.fullName}
      >
        {editing ? (
          <EditRolesForm
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
  onEditRoles: () => void;
}

function MemberActions({
  member,
  onClose,
  onEditRoles,
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

  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      <ActionRow
        title="Rollarni o'zgartirish"
        subtitle={`${member.roles.length} rol`}
        onClick={onEditRoles}
      />
      <ActionRow
        title={
          member.status === 'active' ? "A'zoni to'xtatish" : 'Faollashtirish'
        }
        subtitle={
          member.status === 'active'
            ? "A'zo tashkilotga kira olmaydi"
            : "A'zoga kirish ruxsatini qaytaring"
        }
        onClick={toggleStatus}
        loading={updateStatus.isPending}
      />
      <ActionRow
        title="A'zoni o'chirish"
        subtitle="Bu amal qaytarib bo'lmaydi"
        destructive
        onClick={handleRemove}
        loading={remove.isPending}
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

  // useTelegramMainButton({
  //   text: 'Taklif qilish',
  //   onClick: submit,
  //   enabled: phone.trim().length >= 9 && !invite.isPending,
  //   showProgress: invite.isPending,
  // });

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

interface EditRolesFormProps {
  member: Member;
  roles: Role[];
  rolesLoading: boolean;
  onClose: () => void;
}

function EditRolesForm({
  member,
  roles,
  rolesLoading,
  onClose,
}: EditRolesFormProps): React.ReactElement {
  const assign = useAssignMemberRoles();
  const [selected, setSelected] = useState<Set<number>>(
    new Set(member.roles.map((r) => r.id)),
  );

  function toggle(id: number): void {
    tgHapticImpact('light');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const submit = useCallback((): void => {
    assign.mutate(
      { id: member.id, body: { roleIds: Array.from(selected) } },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [assign, member.id, selected, onClose]);

  // useTelegramMainButton({
  //   text: 'Saqlash',
  //   onClick: submit,
  //   enabled: !assign.isPending,
  //   showProgress: assign.isPending,
  // });

  return (
    <>
      {rolesLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
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
                checked={selected.has(r.id)}
                onCheckedChange={() => toggle(r.id)}
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

      {assign.isError ? (
        <p className="mt-3 text-[13px] text-destructive">
          {getApiErrorMessage(assign.error)}
        </p>
      ) : null}

      <Button
        size="lg"
        className="mt-4 w-full"
        onClick={submit}
        disabled={assign.isPending}
      >
        {assign.isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </>
  );
}
