import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Star } from 'lucide-react';
import {
  useCreateOrganization,
  useMyOrganizations,
} from '@/api/hooks/use-organizations';
import { useSelectOrganization, useLogout } from '@/api/hooks/use-auth';
import {
  usePrimaryOrganizationId,
  useSetPrimaryOrganization,
} from '@/api/hooks/use-user';
import { useTelegramMainButton } from '@/hooks/use-tg-main-button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';

export function OrganizationsPage(): React.ReactElement {
  const navigate = useNavigate();
  const orgs = useMyOrganizations();
  const select = useSelectOrganization();
  const logout = useLogout();
  const primaryOrgId = usePrimaryOrganizationId();
  const setPrimary = useSetPrimaryOrganization();
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const handleSelect = useCallback(
    (orgId: number) => {
      tgHapticImpact('light');
      select.mutate(
        { organizationId: orgId },
        {
          onSuccess: () => {
            tgHapticNotify('success');
            navigate('/', { replace: true });
          },
          onError: () => tgHapticNotify('error'),
        },
      );
    },
    [navigate, select],
  );

  const handleSetPrimary = useCallback(
    (orgId: number) => {
      tgHapticImpact('light');
      setPrimary.mutate(
        { organizationId: orgId },
        {
          onSuccess: () => tgHapticNotify('success'),
          onError: () => tgHapticNotify('error'),
        },
      );
    },
    [setPrimary],
  );

  return (
    <div className="min-h-screen pb-32">
      <PageHeader
        title="Tashkilotni tanlang"
        description="Davom etish uchun tashkilotni tanlang"
        large
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: () => navigate('/login'),
              })
            }
          >
            Chiqish
          </Button>
        }
      />

      <div className="space-y-3">
        {orgs.isPending ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : orgs.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(orgs.error)}
                </span>
              }
            />
          </Section>
        ) : orgs.data && orgs.data.length > 0 ? (
          <Section title="Tashkilotlar">
            {orgs.data.map((org) => {
              const isPrimary = org.id === primaryOrgId;
              const isSelectPending =
                select.isPending && select.variables?.organizationId === org.id;
              const isPrimaryPending =
                setPrimary.isPending &&
                setPrimary.variables?.organizationId === org.id;
              return (
                <ListItem
                  key={org.id}
                  showChevron
                  onClick={() => handleSelect(org.id)}
                  leading={
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Building2 className="h-5 w-5" />
                    </div>
                  }
                  title={
                    <span className="flex items-center gap-1.5">
                      <span>{org.name}</span>
                      {isPrimary ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Asosiy
                        </Badge>
                      ) : null}
                    </span>
                  }
                  subtitle={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span>{org.baseCurrency}</span>
                      {(org.roleNames ?? []).map((r) => (
                        <Badge
                          key={r}
                          variant="success"
                          className="text-[10px]"
                        >
                          {r}
                        </Badge>
                      ))}
                    </span>
                  }
                  trailing={
                    isSelectPending ? (
                      <Spinner />
                    ) : (
                      <button
                        type="button"
                        aria-label={
                          isPrimary
                            ? 'Asosiy tashkilot'
                            : 'Asosiy qilib belgilash'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPrimary || isPrimaryPending) return;
                          handleSetPrimary(org.id);
                        }}
                        disabled={isPrimary || isPrimaryPending}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-primary disabled:opacity-100"
                      >
                        {isPrimaryPending ? (
                          <Spinner />
                        ) : (
                          <Star
                            className={
                              isPrimary
                                ? 'h-4 w-4 fill-primary text-primary'
                                : 'h-4 w-4'
                            }
                          />
                        )}
                      </button>
                    )
                  }
                />
              );
            })}
          </Section>
        ) : (
          <div className="px-6 py-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              Sizda hali tashkilot yo'q
            </p>
          </div>
        )}
      </div>

      <ScreenAction aboveTabBar={false}>
        <Button
          size="xl"
          variant="outline"
          onClick={() => {
            tgHapticSelectionSafe();
            setCreateOpen(true);
          }}
        >
          <Plus className="h-5 w-5" />
          Yangi tashkilot
        </Button>
      </ScreenAction>

      <CreateOrgSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}

function tgHapticSelectionSafe(): void {
  tgHapticImpact('light');
}

interface CreateOrgSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateOrgSheet({
  open,
  onOpenChange,
}: CreateOrgSheetProps): React.ReactElement {
  const create = useCreateOrganization();
  const [name, setName] = useState<string>('');
  const [currency, setCurrency] = useState<string>('UZS');

  const submit = useCallback((): void => {
    const trimmed = name.trim();
    if (trimmed.length < 2) return;
    create.mutate(
      { name: trimmed, baseCurrency: currency.trim() || 'UZS' },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onOpenChange(false);
          setName('');
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [create, currency, name, onOpenChange]);

  useTelegramMainButton(
    open
      ? {
          text: 'Yaratish',
          onClick: submit,
          enabled: name.trim().length >= 2 && !create.isPending,
          showProgress: create.isPending,
        }
      : null,
  );

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Yangi tashkilot"
      description="Tashkilot nomi va asosiy valyutani kiriting"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-name">Nomi</Label>
          <Input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hisobchi LLC"
            required
            minLength={2}
            maxLength={50}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="org-currency">Valyuta</Label>
          <Input
            id="org-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder="UZS"
            maxLength={3}
          />
        </div>
        {create.isError ? (
          <p className="text-[13px] text-destructive">
            {getApiErrorMessage(create.error)}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={create.isPending || name.trim().length < 2}
        >
          {create.isPending ? <Spinner /> : null}
          Yaratish
        </Button>
      </form>
    </Modal>
  );
}
