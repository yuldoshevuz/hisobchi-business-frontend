import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Phone, Send, ShieldCheck } from 'lucide-react';
import { useMe, useUpdateMe } from '@/api/hooks/use-user';
import { useLogout } from '@/api/hooks/use-auth';
// import { useTelegramMainButton } from '@/hooks/use-tg-main-button';
import { usePermissions } from '@/hooks/use-permissions';
import { PageHeader } from '@/components/layout/PageHeader';
import { ListItem, Section } from '@/components/ui/list-item';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Modal } from '@/components/ui/modal';
import { getApiErrorMessage } from '@/lib/api-error';
import { tgHapticImpact, tgHapticNotify } from '@/lib/telegram';
import type { SupportedLocale, User } from '@/types/user.types';

export function ProfilePage(): React.ReactElement {
  const navigate = useNavigate();
  const me = useMe();
  const logout = useLogout();
  const viewerPerms = usePermissions();
  const [editOpen, setEditOpen] = useState<boolean>(false);

  function handleLogout(): void {
    tgHapticImpact('medium');
    logout.mutate(undefined, {
      onSuccess: () => navigate('/login', { replace: true }),
    });
  }

  return (
    <div className="pb-8">
      <PageHeader title="Profil" large />

      {me.isPending ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : me.isError ? (
        <Section>
          <ListItem
            asStatic
            title={
              <span className="text-destructive">
                {getApiErrorMessage(me.error)}
              </span>
            }
          />
        </Section>
      ) : me.data ? (
        <>
          <UserHero user={me.data} />

          <Section title="Hisob">
            <ListItem
              showChevron
              onClick={() => {
                tgHapticImpact('light');
                setEditOpen(true);
              }}
              title="Profilni tahrirlash"
              subtitle="Ism, email, til"
            />
            <ListItem
              asStatic
              leading={<Phone className="h-4 w-4 text-muted-foreground" />}
              title={me.data.phoneNumber ?? '—'}
              subtitle="Telefon"
            />
            <ListItem
              asStatic
              leading={<Send className="h-4 w-4 text-muted-foreground" />}
              title={me.data.telegramConnected ? 'Ulangan' : 'Ulanmagan'}
              subtitle="Telegram"
            />
          </Section>

          {viewerPerms.isReady && viewerPerms.roleNames.length > 0 ? (
            <Section title="Tashkilotdagi rolingiz">
              <ListItem
                asStatic
                leading={<ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                title={
                  <span className="flex flex-wrap items-center gap-1.5">
                    {viewerPerms.roleNames.map((name) => (
                      <Badge key={name} variant="secondary" className="text-[11px]">
                        {name}
                      </Badge>
                    ))}
                  </span>
                }
                subtitle={`${viewerPerms.slugs.size} ta ruxsat`}
              />
            </Section>
          ) : null}

          <div className="px-4 pt-6">
            <Button
              variant="outline"
              size="lg"
              className="w-full text-destructive"
              onClick={handleLogout}
              disabled={logout.isPending}
            >
              <LogOut className="h-4 w-4" />
              Chiqish
            </Button>
          </div>

          <Modal
            open={editOpen}
            onOpenChange={setEditOpen}
            title="Profilni tahrirlash"
            description="Ism, email va tilni o'zgartiring"
          >
            <ProfileForm
              key={me.data.id}
              user={me.data}
              onClose={() => setEditOpen(false)}
            />
          </Modal>
        </>
      ) : null}
    </div>
  );
}

function UserHero({ user }: { user: User }): React.ReactElement {
  const initials = user.fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div className="flex flex-col items-center px-4 py-6">
      <Avatar className="h-20 w-20">
        <AvatarFallback className="text-2xl">{initials || '?'}</AvatarFallback>
      </Avatar>
      <div className="mt-3 text-[20px] font-semibold">{user.fullName}</div>
      {user.email ? (
        <div className="text-[13px] text-muted-foreground">{user.email}</div>
      ) : null}
    </div>
  );
}

interface ProfileFormProps {
  user: User;
  onClose: () => void;
}

function ProfileForm({
  user,
  onClose,
}: ProfileFormProps): React.ReactElement {
  const update = useUpdateMe();
  const [fullName, setFullName] = useState<string>(user.fullName);
  const [email, setEmail] = useState<string>(user.email ?? '');
  const [locale, setLocale] = useState<SupportedLocale>(
    user.locale === 'ru' ? 'ru' : 'uz',
  );

  const submit = useCallback((): void => {
    update.mutate(
      {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        locale,
      },
      {
        onSuccess: () => {
          tgHapticNotify('success');
          onClose();
        },
        onError: () => tgHapticNotify('error'),
      },
    );
  }, [email, fullName, locale, onClose, update]);

  // useTelegramMainButton({
  //   text: 'Saqlash',
  //   onClick: submit,
  //   enabled: !update.isPending && fullName.trim().length >= 2,
  //   showProgress: update.isPending,
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
        <Label htmlFor="profile-name">To'liq ism</Label>
        <Input
          id="profile-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          minLength={2}
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-email">Email</Label>
        <Input
          id="profile-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@example.com"
          inputMode="email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="profile-locale">Til</Label>
        <select
          id="profile-locale"
          value={locale}
          onChange={(e) => setLocale(e.target.value as SupportedLocale)}
          className="h-11 w-full rounded-xl border border-input bg-card px-3 text-[15px] text-foreground"
        >
          <option value="uz">O'zbekcha</option>
          <option value="ru">Русский</option>
        </select>
      </div>
      {update.isError ? (
        <p className="text-[13px] text-destructive">
          {getApiErrorMessage(update.error)}
        </p>
      ) : null}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={update.isPending || fullName.trim().length < 2}
      >
        {update.isPending ? <Spinner /> : null}
        Saqlash
      </Button>
    </form>
  );
}
