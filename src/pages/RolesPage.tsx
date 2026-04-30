import { useCallback, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import {
  useCreateRole,
  useDeleteRole,
  usePermissions,
  useRoles,
  useUpdateRole,
} from '@/api/hooks/use-rbac';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { usePermissions as useViewerPermissions } from '@/hooks/use-permissions';
import { PermissionSlug } from '@/lib/permission-slugs';
import {
  getPermissionLabel,
  getPermissionModuleLabel,
} from '@/lib/permission-i18n';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useFeature } from '@/api/hooks/use-subscription';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';
import { getApiErrorMessage } from '@/lib/api-error';
import { getFeatureLabel } from '@/lib/feature-i18n';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { PermissionGroup, Role } from '@/types/rbac.types';

interface RolesPageProps {
  /** When true, skips the top PageHeader so the page can be embedded inside Sozlamalar. */
  embedded?: boolean;
}

export function RolesPage({
  embedded = false,
}: RolesPageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const viewerPerms = useViewerPermissions();
  const canManage = viewerPerms.has(PermissionSlug.ROLES_MANAGE);
  const isReady = viewerPerms.isReady;
  const roles = useRoles({ enabled: canManage });
  const customRolesGate = useFeature('ADVANCED_RBAC');
  const canCreateCustomRole = canManage && customRolesGate.isEnabled;
  const customRolesLabel = getFeatureLabel('ADVANCED_RBAC');
  const [editing, setEditing] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<Role | null>(null);

  if (isReady && !canManage) {
    return (
      <AccessDeniedView
        title="Rollar"
        description="Bu bo'limga kirish uchun ruxsat yo'q"
        hint="Rollarni boshqarish uchun 'roles.manage' ruxsati kerak. Tashkilot egasidan so'rang."
      />
    );
  }

  return (
    <div className="pb-32">
      {embedded ? null : (
        <PageHeader
          title="Rollar"
          description="Tashkilot rollari va ruxsatlari"
          large
        />
      )}

      <div className="space-y-3">
        {roles.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : roles.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(roles.error)}
                </span>
              }
            />
          </Section>
        ) : (
          <Section title="Rollar">
            {(roles.data ?? []).map((role) => (
              <ListItem
                key={role.id}
                showChevron
                onClick={() => {
                  tgHapticImpact('light');
                  setEditing(role);
                }}
                title={
                  <span className="flex items-center gap-2">
                    <span className="truncate">{role.name}</span>
                    {role.isSystem ? (
                      <Badge variant="outline" className="text-[10px]">
                        tizim
                      </Badge>
                    ) : null}
                  </span>
                }
                subtitle={`${role.permissionSlugs.length} ruxsat • ${role.memberCount} xodim`}
              />
            ))}
          </Section>
        )}
      </div>

      {customRolesGate.isReady && !customRolesGate.isEnabled ? (
        <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Lock className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-[13px] font-medium text-amber-900">
              {customRolesLabel.name}
            </div>
            <p className="text-[12px] text-amber-800">
              Yangi rol yaratish uchun tarifni yangilashingiz kerak. Tizim
              rollari (egasi, sotuvchi, va h.k.) joriy tarifda mavjud.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 bg-white"
            onClick={() => {
              tgHapticImpact('light');
              navigate('/plans');
            }}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tariflar
          </Button>
        </div>
      ) : null}

      <ScreenAction>
        <Button
          size="xl"
          disabled={!canCreateCustomRole}
          onClick={() => {
            if (!canCreateCustomRole) {
              navigate('/plans');
              return;
            }
            tgHapticImpact('light');
            setCreateOpen(true);
          }}
        >
          {canCreateCustomRole ? (
            <Plus className="h-5 w-5" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
          {canCreateCustomRole ? 'Yangi rol' : 'Yangi rol (tarif kerak)'}
        </Button>
      </ScreenAction>

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi rol"
        description="Rol nomi va ruxsatlarni tanlang"
      >
        <RoleForm mode="create" onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title={editing?.name}
        description={
          editing?.isSystem
            ? "Tizim roli — faqat ko'rish uchun"
            : 'Rol nomi va ruxsatlarni tanlang'
        }
      >
        {editing ? (
          <RoleForm
            mode="edit"
            role={editing}
            onClose={() => setEditing(null)}
            onAskDelete={() => {
              setDeleting(editing);
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title="Rolni o'chirish"
        description={
          deleting ? `"${deleting.name}" — bu amal qaytarib bo'lmaydi` : undefined
        }
      >
        {deleting ? (
          <DeleteRoleConfirm
            role={deleting}
            onClose={() => setDeleting(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}

interface RoleFormProps {
  mode: 'create' | 'edit';
  role?: Role;
  onClose: () => void;
  onAskDelete?: () => void;
}

function RoleForm({
  mode,
  role,
  onClose,
  onAskDelete,
}: RoleFormProps): React.ReactElement {
  const permissions = usePermissions();
  const create = useCreateRole();
  const update = useUpdateRole();
  const [name, setName] = useState<string>(role?.name ?? '');
  const [selected, setSelected] = useState<Set<string>>(
    new Set(role?.permissionSlugs ?? []),
  );

  const groups: PermissionGroup[] = useMemo(
    () => permissions.data?.groups ?? [],
    [permissions.data],
  );

  function toggle(slug: string): void {
    tgHapticImpact('light');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const submit = useCallback((): void => {
    const payload = {
      name: name.trim(),
      permissionSlugs: Array.from(selected),
    };
    if (mode === 'create') {
      create.mutate(payload, {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      });
    } else if (role) {
      update.mutate(
        { id: role.id, body: payload },
        {
          onSuccess: () => {
            tgHapticNotify('success');
            onClose();
          },
          onError: () => tgHapticNotify('error'),
        },
      );
    }
  }, [create, mode, name, onClose, role, selected, update]);

  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const isSystem = role?.isSystem ?? false;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
        <div className="space-y-1.5">
          <Label htmlFor="role-name">Nomi</Label>
          <Input
            id="role-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            disabled={isSystem}
          />
        </div>

        {permissions.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <Section
                key={group.module}
                title={getPermissionModuleLabel(group.module)}
              >
                {group.permissions.map((perm) => {
                  const label = getPermissionLabel(perm.slug);
                  return (
                    <label
                      key={perm.slug}
                      htmlFor={`perm-${perm.slug}`}
                      className="press flex cursor-pointer items-start gap-3 px-4 py-3 active:bg-accent"
                    >
                      <Checkbox
                        id={`perm-${perm.slug}`}
                        checked={selected.has(perm.slug)}
                        onCheckedChange={() => toggle(perm.slug)}
                        disabled={isSystem}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px]">{label.title}</div>
                        {label.description ? (
                          <div className="text-[12px] text-muted-foreground">
                            {label.description}
                          </div>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </Section>
            ))}
          </div>
        )}

        {error ? (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(error)}
          </p>
        ) : null}

        {!isSystem ? (
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || name.trim().length < 2}
          >
            {pending ? <Spinner /> : null}
            Saqlash
          </Button>
        ) : null}

        {mode === 'edit' && !isSystem && onAskDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full text-destructive"
            onClick={onAskDelete}
          >
            Rolni o'chirish
        </Button>
      ) : null}
    </form>
  );
}

interface DeleteRoleConfirmProps {
  role: Role;
  onClose: () => void;
}

function DeleteRoleConfirm({
  role,
  onClose,
}: DeleteRoleConfirmProps): React.ReactElement {
  const remove = useDeleteRole();

  function confirm(): void {
    tgHapticImpact('heavy');
    remove.mutate(role.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="space-y-2">
      <Button
        variant="destructive"
        size="lg"
        className="w-full"
        onClick={confirm}
        disabled={remove.isPending}
      >
        {remove.isPending ? <Spinner /> : null}
        O'chirish
      </Button>
      <Button
        variant="ghost"
        size="lg"
        className="w-full"
        onClick={onClose}
        disabled={remove.isPending}
      >
        Bekor qilish
      </Button>
    </div>
  );
}

