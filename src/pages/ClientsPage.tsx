import { useState } from 'react';
import { Archive, Plus, RotateCcw, Search, Users } from 'lucide-react';
import {
  useArchiveClient,
  useClientBalance,
  useClients,
  useDeleteClient,
  useUpdateClient,
} from '@/api/hooks/use-clients';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { CreateClientForm } from '@/components/clients/CreateClientForm';
import { EditClientForm } from '@/components/clients/EditClientForm';
import {
  CLIENT_TYPE_ICON,
  CLIENT_TYPE_LABEL,
} from '@/components/clients/client-meta';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { Client, ClientStatus } from '@/types/client.types';

export function ClientsPage(): React.ReactElement {
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.CLIENTS_READ);
  const canManage = useCan(PermissionSlug.CLIENTS_MANAGE);

  const [search, setSearch] = useState<string>('');
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionClient, setActionClient] = useState<Client | null>(null);
  const [editing, setEditing] = useState<Client | null>(null);

  const trimmedSearch = search.trim();

  const activeClients = useClients(
    {
      status: 'ACTIVE',
      include: 'balance',
      limit: 100,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
    },
    { enabled: canRead },
  );

  const archivedClients = useClients(
    { status: 'ARCHIVED', limit: 100 },
    { enabled: canRead && archiveOpen },
  );

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title="Klientlar"
        description="Bu bo‘limga kirish uchun ruxsat yo‘q"
        hint="Klientlarni ko‘rish uchun 'clients.read' ruxsati kerak."
      />
    );
  }

  const activeList = activeClients.data?.data ?? [];

  return (
    <div className="pb-32">
      <PageHeader
        title="Klientlar"
        description="Mijozlar va yetkazib beruvchilar"
        large
      />

      <div className="space-y-3">
        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom yoki telefon"
              className="pl-9"
            />
          </div>
        </div>

        {activeClients.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : activeClients.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(activeClients.error)}
                </span>
              }
            />
          </Section>
        ) : activeList.length > 0 ? (
          <Section title="Faol klientlar">
            {activeList.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                onTap={() => {
                  tgHapticImpact('light');
                  setActionClient(c);
                }}
              />
            ))}
          </Section>
        ) : (
          <div className="px-6 py-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-[14px] text-muted-foreground">
              {trimmedSearch
                ? 'Hech narsa topilmadi'
                : 'Klientlar mavjud emas'}
            </p>
          </div>
        )}

        <Section>
          <ListItem
            showChevron
            onClick={() => {
              tgHapticImpact('light');
              setArchiveOpen(true);
            }}
            leading={
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Archive className="h-4 w-4" />
              </div>
            }
            title="Arxiv"
            subtitle="Arxivlangan klientlar"
          />
        </Section>
      </div>

      {canManage ? (
        <ScreenAction>
          <Button
            size="xl"
            onClick={() => {
              tgHapticImpact('light');
              setCreateOpen(true);
            }}
          >
            <Plus className="h-5 w-5" />
            Yangi klient qo‘shish
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi klient"
        description="Mijoz, yetkazib beruvchi yoki aralash"
      >
        <CreateClientForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionClient)}
        onOpenChange={(o) => {
          if (!o) setActionClient(null);
        }}
        title={actionClient?.name}
        description={
          actionClient ? CLIENT_TYPE_LABEL[actionClient.type] : undefined
        }
      >
        {actionClient ? (
          <ClientActions
            client={actionClient}
            canManage={canManage}
            onClose={() => setActionClient(null)}
            onEdit={() => {
              setEditing(actionClient);
              setActionClient(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Klientni tahrirlash"
        description={editing ? CLIENT_TYPE_LABEL[editing.type] : undefined}
      >
        {editing ? (
          <EditClientForm
            client={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arxiv"
        description={
          archivedClients.data?.meta
            ? `${archivedClients.data.meta.total} ta arxivlangan klient`
            : undefined
        }
      >
        <ArchivedClients
          isPending={archivedClients.isPending}
          isError={archivedClients.isError}
          error={archivedClients.error}
          clients={archivedClients.data?.data ?? []}
          onTap={(c) => {
            setArchiveOpen(false);
            setActionClient(c);
          }}
        />
      </Modal>
    </div>
  );
}

interface ClientRowProps {
  client: Client;
  onTap: () => void;
}

function ClientRow({ client, onTap }: ClientRowProps): React.ReactElement {
  const initials = client.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const Icon = CLIENT_TYPE_ICON[client.type];

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
          <span className="truncate">{client.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            <Icon className="mr-0.5 h-3 w-3" />
            {CLIENT_TYPE_LABEL[client.type]}
          </Badge>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5">
          {client.phone ? (
            <span className="truncate">{client.phone}</span>
          ) : (
            <span className="text-muted-foreground/70">telefon kiritilmagan</span>
          )}
          <ClientNetBadges client={client} />
        </span>
      }
    />
  );
}

interface ClientNetBadgesProps {
  client: Client;
}

function ClientNetBadges({ client }: ClientNetBadgesProps): React.ReactElement | null {
  const balances = client.balances ?? [];
  if (balances.length === 0) return null;
  return (
    <>
      {balances.map((b) => {
        const numeric = Number(b.net);
        if (!Number.isFinite(numeric) || numeric === 0) return null;
        const positive = numeric > 0;
        return (
          <Badge
            key={b.currency}
            variant={positive ? 'success' : 'destructive'}
            className="text-[10px] tabular-nums"
          >
            {positive ? '+' : ''}
            {formatMoney(b.net, b.currency)}
          </Badge>
        );
      })}
    </>
  );
}

interface ClientActionsProps {
  client: Client;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}

function ClientActions({
  client,
  canManage,
  onClose,
  onEdit,
}: ClientActionsProps): React.ReactElement {
  const archive = useArchiveClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const balance = useClientBalance(client.id);

  const isArchived = client.status === 'ARCHIVED';
  const pending =
    archive.isPending || update.isPending || remove.isPending;
  const error = archive.error ?? update.error ?? remove.error;

  function handleArchive(): void {
    tgHapticImpact('medium');
    archive.mutate(client.id, {
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
      { id: client.id, body: { status: 'ACTIVE' satisfies ClientStatus } },
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
    if (!confirm(`${client.name} klientini butunlay o‘chirishni tasdiqlaysizmi?`))
      return;
    tgHapticImpact('heavy');
    remove.mutate(client.id, {
      onSuccess: () => {
        tgHapticNotify('success');
        onClose();
      },
      onError: () => tgHapticNotify('error'),
    });
  }

  return (
    <div className="space-y-3">
      <BalanceSummary
        isPending={balance.isPending}
        balances={balance.data?.balances ?? []}
      />

      {client.notes ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
          {client.notes}
        </p>
      ) : null}

      {canManage ? (
        <div className="-mx-4 divide-y divide-border bg-card">
          {!isArchived ? (
            <ActionRow
              title="Tahrirlash"
              subtitle="Nom, turi, telefon, eslatma"
              onClick={onEdit}
            />
          ) : null}
          {!isArchived ? (
            <ActionRow
              title="Arxivlash"
              subtitle="Yangi yozuvlarda yashiradi, tarix saqlanadi"
              onClick={handleArchive}
              loading={pending}
              icon={<Archive className="h-4 w-4 text-muted-foreground" />}
            />
          ) : (
            <ActionRow
              title="Arxivdan tiklash"
              subtitle="Klient yana faol bo‘ladi"
              onClick={handleRestore}
              loading={pending}
              icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
            />
          )}
          <ActionRow
            title="O‘chirish"
            subtitle="Faqat tranzaksiyalarda ishlatilmagan klient uchun"
            destructive
            onClick={handleDelete}
            loading={pending}
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

interface BalanceSummaryProps {
  isPending: boolean;
  balances: Client['balances'];
}

function BalanceSummary({
  isPending,
  balances,
}: BalanceSummaryProps): React.ReactElement {
  if (isPending) {
    return (
      <div className="flex justify-center py-3">
        <Spinner />
      </div>
    );
  }
  const list = balances ?? [];
  if (list.length === 0) {
    return (
      <div className="rounded-xl bg-muted/40 px-3 py-3 text-center text-[13px] text-muted-foreground">
        Hozircha ochiq qoldiq yo‘q
      </div>
    );
  }
  return (
    <div className="space-y-2 rounded-xl bg-muted/40 px-3 py-3">
      {list.map((b) => {
        const numeric = Number(b.net);
        const positive = Number.isFinite(numeric) && numeric > 0;
        const negative = Number.isFinite(numeric) && numeric < 0;
        return (
          <div
            key={b.currency}
            className="flex items-center justify-between text-[14px]"
          >
            <span className="text-muted-foreground">{b.currency}</span>
            <div className="flex flex-col items-end">
              <span
                className={`font-semibold tabular-nums ${
                  positive
                    ? 'text-[var(--color-help-success)]'
                    : negative
                      ? 'text-destructive'
                      : 'text-foreground'
                }`}
              >
                {formatMoney(b.net, b.currency)}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                +{formatMoney(b.receivable)} / −{formatMoney(b.payable)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface ArchivedClientsProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  clients: Client[];
  onTap: (c: Client) => void;
}

function ArchivedClients({
  isPending,
  isError,
  error,
  clients,
  onTap,
}: ArchivedClientsProps): React.ReactElement {
  if (isPending) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="px-4 py-4 text-[13px] text-destructive">
        {getApiErrorMessage(error)}
      </p>
    );
  }
  if (clients.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-foreground">
        Arxivlangan klientlar yo‘q
      </div>
    );
  }
  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      {clients.map((c) => {
        const initials = c.name
          .split(' ')
          .map((p) => p[0])
          .filter(Boolean)
          .slice(0, 2)
          .join('')
          .toUpperCase();
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              tgHapticImpact('light');
              onTap(c);
            }}
            className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-accent"
          >
            <Avatar>
              <AvatarFallback>{initials || '?'}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{c.name}</div>
              <div className="text-[12px] text-muted-foreground">
                {CLIENT_TYPE_LABEL[c.type]}
                {c.phone ? ` · ${c.phone}` : ''}
              </div>
            </div>
          </button>
        );
      })}
    </div>
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
      {loading ? <Spinner /> : null}
    </button>
  );
}
