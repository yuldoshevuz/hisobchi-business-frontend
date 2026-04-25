import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import {
  useCreateOrganization,
  useMyOrganizations,
} from '@/api/hooks/use-organizations';
import { useSelectOrganization, useLogout } from '@/api/hooks/use-auth';
import { useTelegramMainButton } from '@/hooks/use-tg-main-button';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { ListItem, Section } from '@/components/ui/list-item';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';

export function OrganizationsPage(): React.ReactElement {
  const navigate = useNavigate();
  const orgs = useMyOrganizations();
  const select = useSelectOrganization();
  const logout = useLogout();
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
            {orgs.data.map((org) => (
              <ListItem
                key={org.id}
                showChevron
                onClick={() => handleSelect(org.id)}
                leading={
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                }
                title={org.name}
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
                  select.isPending && select.variables?.organizationId === org.id ? (
                    <Spinner />
                  ) : null
                }
              />
            ))}
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Yangi tashkilot</SheetTitle>
          <SheetDescription>
            Tashkilot nomi va asosiy valyutani kiriting
          </SheetDescription>
        </SheetHeader>
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
      </SheetContent>
    </Sheet>
  );
}
