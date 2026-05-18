import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Building2, Lock, Plus, Star } from 'lucide-react';
import {
  useCreateOrganization,
  useMyOrganizations,
} from '@/api/hooks/use-organizations';
import { useLimitGuard } from '@/api/hooks/use-subscription';
import { useSelectOrganization, useLogout } from '@/api/hooks/use-auth';
import {
  usePrimaryOrganizationId,
  useSetPrimaryOrganization,
} from '@/api/hooks/use-user';
import { useMe } from '@/api/hooks/use-user';
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

interface MembershipErrorState {
  membershipError?: { organizationId: number };
}

export function OrganizationsPage(): React.ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();
  const orgs = useMyOrganizations();
  const select = useSelectOrganization();
  const logout = useLogout();
  const primaryOrgId = usePrimaryOrganizationId();
  const setPrimary = useSetPrimaryOrganization();
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  // Bot deeplinks include an organizationId; when the resolved user
  // isn't a member of that org, useDeepLink redirects here and stuffs
  // the offending id into location.state so we can surface a banner
  // (per the multi-tenant routing contract — "if not member → error").
  const membershipError = (location.state as MembershipErrorState | null)
    ?.membershipError;
  // ORGANIZATION_LIMIT is per-user, counting orgs they OWN. We approximate
  // from the local list — only those where `createdBy` matches the calling
  // user. Member-of orgs don't count.
  const ownedCount = (orgs.data ?? []).filter(
    (o) => o.createdBy === me.data?.id,
  ).length;
  const orgGuard = useLimitGuard('ORGANIZATION_LIMIT', ownedCount);

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
        title={t('organizations.title')}
        description={t('organizations.subtitle')}
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
            {t('organizations.logout')}
          </Button>
        }
      />

      <div className="space-y-3">
        {membershipError ? (
          <div className="mx-4 mb-3 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div className="space-y-1">
              <div className="font-medium">
                {t('organizations.membership_error.title')}
              </div>
              <div className="text-xs text-destructive/80">
                {t('organizations.membership_error.description', {
                  id: membershipError.organizationId,
                })}
              </div>
            </div>
          </div>
        ) : null}
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
          <Section title={t('organizations.section')}>
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
                          {t('organizations.primary_badge')}
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
                            ? t('organizations.primary_aria_set')
                            : t('organizations.primary_aria_unset')
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
              {t('organizations.empty')}
            </p>
          </div>
        )}
      </div>

      {!orgGuard.canCreate && orgGuard.isReady ? (
        <div className="mx-4 my-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Lock className="h-4 w-4" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="text-[13px] font-medium text-amber-900">
              {t('organizations.limit_title')}
            </div>
            <p className="text-[12px] text-amber-800">
              {t('organizations.limit_description', { plan: orgGuard.label })}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 bg-white"
            onClick={() => navigate('/plans')}
          >
            {t('organizations.plans_button')}
          </Button>
        </div>
      ) : null}

      <ScreenAction aboveTabBar={false}>
        <Button
          size="xl"
          variant="outline"
          disabled={!orgGuard.canCreate}
          onClick={() => {
            if (!orgGuard.canCreate) {
              navigate('/plans');
              return;
            }
            tgHapticSelectionSafe();
            setCreateOpen(true);
          }}
        >
          {orgGuard.canCreate ? (
            <Plus className="h-5 w-5" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
          {orgGuard.canCreate
            ? `${t('organizations.new_org_title')}${
                typeof orgGuard.limit === 'number' ? ` (${orgGuard.label})` : ''
              }`
            : t('organizations.limit_reached_caption')}
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
  const { t } = useTranslation();
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

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('organizations.new_org_title')}
      description={t('organizations.new_org_description')}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="org-name">{t('organizations.field.name')}</Label>
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
          <Label htmlFor="org-currency">{t('organizations.field.currency')}</Label>
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
          {t('organizations.create')}
        </Button>
      </form>
    </Modal>
  );
}
