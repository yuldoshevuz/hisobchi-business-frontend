import { useState } from 'react';
import {
  Archive,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react';
import {
  useArchiveContact,
  useContactBalance,
  useContacts,
  useDeleteContact,
  useUpdateContact,
} from '@/api/hooks/use-contacts';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListItem, Section } from '@/components/ui/list-item';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import { CreateContactForm } from '@/components/contacts/CreateContactForm';
import { EditContactForm } from '@/components/contacts/EditContactForm';
import {
  CONTACT_TYPE_ICON,
  CONTACT_TYPE_LABEL,
} from '@/components/contacts/contact-meta';
import { AccessDeniedView } from '@/components/AccessDeniedView';
import { useCan, usePermissions } from '@/hooks/use-permissions';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatMoney } from '@/lib/format';
import { PermissionSlug } from '@/lib/permission-slugs';
import { cn } from '@/lib/utils';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import {
  CONTACT_TYPE_VALUES,
  type Contact,
  type ContactStatus,
  type ContactType,
} from '@/types/contact.types';

type TypeFilter = ContactType | 'all';

export function ContactsPage(): React.ReactElement {
  const { isReady } = usePermissions();
  const canRead = useCan(PermissionSlug.CONTACTS_READ);
  const canManage = useCan(PermissionSlug.CONTACTS_MANAGE);

  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [archiveOpen, setArchiveOpen] = useState<boolean>(false);
  const [actionContact, setActionContact] = useState<Contact | null>(null);
  const [editing, setEditing] = useState<Contact | null>(null);

  const trimmedSearch = search.trim();

  const activeContacts = useContacts(
    {
      status: 'active',
      include: 'balance',
      limit: 100,
      ...(trimmedSearch ? { search: trimmedSearch } : {}),
      ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
    },
    { enabled: canRead },
  );

  const archivedContacts = useContacts(
    { status: 'archived', limit: 100 },
    { enabled: canRead && archiveOpen },
  );

  if (isReady && !canRead) {
    return (
      <AccessDeniedView
        title="Kontaktlar"
        description="Bu bo‘limga kirish uchun ruxsat yo‘q"
        hint="Kontaktlarni ko‘rish uchun 'contacts.read' ruxsati kerak."
      />
    );
  }

  const activeList = activeContacts.data?.data ?? [];

  return (
    <div className="pb-32">
      <PageHeader
        title="Kontaktlar"
        description="Mijozlar, yetkazib beruvchilar va hamkorlar"
        large
        showBack
      />

      <div className="space-y-3">
        <div className="flex items-center gap-2 px-4">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nom yoki telefon"
              className="pl-9"
            />
          </div>
          <TypeFilterButton value={typeFilter} onChange={setTypeFilter} />
        </div>

        {activeContacts.isPending ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : activeContacts.isError ? (
          <Section>
            <ListItem
              asStatic
              title={
                <span className="text-destructive">
                  {getApiErrorMessage(activeContacts.error)}
                </span>
              }
            />
          </Section>
        ) : activeList.length > 0 ? (
          <Section title="Faol kontaktlar">
            {activeList.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                onTap={() => {
                  tgHapticImpact('light');
                  setActionContact(c);
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
                : typeFilter !== 'all'
                  ? `${CONTACT_TYPE_LABEL[typeFilter]} toifasida kontakt yo'q`
                  : 'Kontaktlar mavjud emas'}
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
            subtitle="Arxivlangan kontaktlar"
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
            Yangi kontakt qo‘shish
          </Button>
        </ScreenAction>
      ) : null}

      <Modal
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Yangi kontakt"
        description="Mijoz, yetkazib beruvchi yoki hamkor"
      >
        <CreateContactForm onClose={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={Boolean(actionContact)}
        onOpenChange={(o) => {
          if (!o) setActionContact(null);
        }}
        title={actionContact?.name}
        description={
          actionContact ? CONTACT_TYPE_LABEL[actionContact.type] : undefined
        }
      >
        {actionContact ? (
          <ContactActions
            contact={actionContact}
            canManage={canManage}
            onClose={() => setActionContact(null)}
            onEdit={() => {
              setEditing(actionContact);
              setActionContact(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(editing)}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
        title="Kontaktni tahrirlash"
        description={editing ? CONTACT_TYPE_LABEL[editing.type] : undefined}
      >
        {editing ? (
          <EditContactForm
            contact={editing}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </Modal>

      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Arxiv"
        description={
          archivedContacts.data?.meta
            ? `${archivedContacts.data.meta.total} ta arxivlangan kontakt`
            : undefined
        }
      >
        <ArchivedContacts
          isPending={archivedContacts.isPending}
          isError={archivedContacts.isError}
          error={archivedContacts.error}
          contacts={archivedContacts.data?.data ?? []}
          onTap={(c) => {
            setArchiveOpen(false);
            setActionContact(c);
          }}
        />
      </Modal>
    </div>
  );
}

interface TypeFilterButtonProps {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
}

/**
 * Compact filter trigger placed beside the search input. When `value` is the
 * default (`all`) the button shows a generic funnel icon; when a specific
 * type is active, the type's icon replaces the funnel and the button picks
 * up the brand-tinted state so the active filter is visible without opening
 * the picker. Tapping opens a bottom-sheet modal with the full option list.
 */
function TypeFilterButton({
  value,
  onChange,
}: TypeFilterButtonProps): React.ReactElement {
  const [open, setOpen] = useState<boolean>(false);
  const isFiltered = value !== 'all';
  const TriggerIcon = isFiltered ? CONTACT_TYPE_ICON[value] : SlidersHorizontal;

  function handleSelect(next: TypeFilter): void {
    tgHapticImpact('light');
    onChange(next);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        aria-label="Turi bo'yicha filter"
        aria-pressed={isFiltered}
        onClick={() => {
          tgHapticImpact('light');
          setOpen(true);
        }}
        className={cn(
          'press flex h-10 w-10 shrink-0 items-center justify-center rounded-md border transition-colors',
          isFiltered
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-input bg-card text-foreground hover:border-primary',
        )}
      >
        <TriggerIcon className="h-4 w-4" />
      </button>

      <Modal open={open} onOpenChange={setOpen} title="Turi bo'yicha filter">
        <div className="-mx-4 divide-y divide-border bg-card">
          {(['all', ...CONTACT_TYPE_VALUES] as TypeFilter[]).map((key) => {
            const active = value === key;
            const Icon = key === 'all' ? Users : CONTACT_TYPE_ICON[key];
            const label = key === 'all' ? 'Hammasi' : CONTACT_TYPE_LABEL[key];
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleSelect(key)}
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
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={cn(
                    'flex-1 text-[15px]',
                    active ? 'font-semibold text-primary' : 'text-foreground',
                  )}
                >
                  {label}
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

interface ContactRowProps {
  contact: Contact;
  onTap: () => void;
}

function ContactRow({ contact, onTap }: ContactRowProps): React.ReactElement {
  const initials = contact.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const Icon = CONTACT_TYPE_ICON[contact.type];

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
          <span className="truncate">{contact.name}</span>
          <Badge variant="secondary" className="text-[10px]">
            <Icon className="mr-0.5 h-3 w-3" />
            {CONTACT_TYPE_LABEL[contact.type]}
          </Badge>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-1.5">
          {contact.phone ? (
            <span className="truncate">{contact.phone}</span>
          ) : (
            <span className="text-muted-foreground/70">telefon kiritilmagan</span>
          )}
          <ContactNetBadges contact={contact} />
        </span>
      }
    />
  );
}

interface ContactNetBadgesProps {
  contact: Contact;
}

function ContactNetBadges({ contact }: ContactNetBadgesProps): React.ReactElement | null {
  const balances = contact.balances ?? [];
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

interface ContactActionsProps {
  contact: Contact;
  canManage: boolean;
  onClose: () => void;
  onEdit: () => void;
}

function ContactActions({
  contact,
  canManage,
  onClose,
  onEdit,
}: ContactActionsProps): React.ReactElement {
  const archive = useArchiveContact();
  const update = useUpdateContact();
  const remove = useDeleteContact();
  const balance = useContactBalance(contact.id);

  const isArchived = contact.status === 'archived';
  const pending =
    archive.isPending || update.isPending || remove.isPending;
  const error = archive.error ?? update.error ?? remove.error;

  function handleArchive(): void {
    tgHapticImpact('medium');
    archive.mutate(contact.id, {
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
      { id: contact.id, body: { status: 'active' satisfies ContactStatus } },
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
    if (!confirm(`${contact.name} kontaktini butunlay o‘chirishni tasdiqlaysizmi?`))
      return;
    tgHapticImpact('heavy');
    remove.mutate(contact.id, {
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

      {contact.notes ? (
        <p className="rounded-xl bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
          {contact.notes}
        </p>
      ) : null}

      {canManage ? (
        <div className="-mx-4 divide-y divide-border bg-card">
          {!isArchived ? (
            <ActionRow
              title="Tahrirlash"
              subtitle="Nom, turi, telefon, eslatma"
              onClick={onEdit}
              icon={<Pencil className="h-4 w-4 text-muted-foreground" />}
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
              subtitle="Kontakt yana faol bo‘ladi"
              onClick={handleRestore}
              loading={pending}
              icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}
            />
          )}
          <ActionRow
            title="O'chirish"
            subtitle="Faqat tranzaksiyalarda ishlatilmagan kontakt uchun"
            destructive
            onClick={handleDelete}
            loading={pending}
            icon={<Trash2 className="h-4 w-4 text-destructive" />}
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
  balances: Contact['balances'];
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

interface ArchivedContactsProps {
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  contacts: Contact[];
  onTap: (c: Contact) => void;
}

function ArchivedContacts({
  isPending,
  isError,
  error,
  contacts,
  onTap,
}: ArchivedContactsProps): React.ReactElement {
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
  if (contacts.length === 0) {
    return (
      <div className="py-8 text-center text-[14px] text-muted-foreground">
        Arxivlangan kontaktlar yo‘q
      </div>
    );
  }
  return (
    <div className="-mx-4 divide-y divide-border bg-card">
      {contacts.map((c) => {
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
                {CONTACT_TYPE_LABEL[c.type]}
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
