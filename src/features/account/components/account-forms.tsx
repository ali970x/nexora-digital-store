'use client';

import {
  BellRing,
  Camera,
  Check,
  Copy,
  KeyRound,
  Laptop,
  LogOut,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import Image from 'next/image';
import {useRouter} from 'next/navigation';
import {useState, useTransition} from 'react';
import {useForm} from 'react-hook-form';

import {Button} from '@/components/ui/button';
import {
  FileUpload,
  Input,
  OtpField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@/components/ui/form-controls';
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/surfaces';
import {
  enrollTotpAction,
  removeTotpAction,
  revokeSessionAction,
  signOutAction,
  uploadAvatarAction,
  updateNotificationPreferenceAction,
  updatePreferencesAction,
  updateProfileAction,
  verifyTotpAction,
  type ActionResult
} from '@/features/auth/server/actions';
import type {NotificationChannel} from '@/lib/supabase/database.types';

type ProfileValues = {
  displayName: string;
  phone: string;
  countryCode: string;
  timezone: string;
  marketingConsent: boolean;
};

function ResultAlert({result}: {result: ActionResult<unknown> | null}) {
  const t = useTranslations('Account');
  if (!result) return null;
  return (
    <Alert tone={result.ok ? 'success' : 'danger'} title={t(result.ok ? 'saved' : 'saveError')}>
      {t(result.ok ? 'savedDescription' : `errors.${result.error}`)}
    </Alert>
  );
}

export function ProfileForm({initial}: {initial: ProfileValues}) {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useTranslations('Account.profile');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  const [avatar, setAvatar] = useState<File | null>(null);
  const form = useForm<ProfileValues>({defaultValues: initial});
  const submit = form.handleSubmit((values) =>
    startTransition(async () => setResult(await updateProfileAction({...values, locale})))
  );
  const uploadAvatar = () => {
    if (!avatar) return;
    startTransition(async () => {
      const data = new FormData();
      data.set('avatar', avatar);
      setResult(await uploadAvatarAction(data, locale));
      setAvatar(null);
    });
  };
  return (
    <Card className="account-form-card">
      <CardHeader>
        <CardTitle>{t('formTitle')}</CardTitle>
        <CardDescription>{t('formDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="account-form" onSubmit={submit}>
          <ResultAlert result={result} />
          <div className="account-avatar-upload">
            <FileUpload
              label={t('avatar')}
              description={t('avatarDescription')}
              limits={t('avatarLimits')}
              previewAlt={t('avatarPreview')}
              removeLabel={t('avatarRemove')}
              accept="image/jpeg,image/png,image/webp"
              onFilesChange={(files) => setAvatar(files[0] ?? null)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!avatar}
              loading={pending}
              onClick={uploadAvatar}
            >
              <Camera aria-hidden="true" />
              {t('uploadAvatar')}
            </Button>
          </div>
          <div className="account-form-grid">
            <Input label={t('displayName')} autoComplete="name" {...form.register('displayName')} />
            <Input
              label={t('phone')}
              type="tel"
              dir="ltr"
              autoComplete="tel"
              {...form.register('phone')}
            />
            <Input label={t('country')} maxLength={2} dir="ltr" {...form.register('countryCode')} />
            <Input label={t('timezone')} dir="ltr" {...form.register('timezone')} />
          </div>
          <Switch
            label={t('marketing')}
            checked={form.watch('marketingConsent')}
            onCheckedChange={(value) => form.setValue('marketingConsent', value)}
          />
          <div className="account-form-actions">
            <Button type="submit" variant="gradient" loading={pending}>
              {t('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

type PreferenceProps = {
  initial: {localeCode: string; currencyCode: string; timezone: string};
  locales: Array<{code: string; native_name: string}>;
  currencies: Array<{code: string; name: string}>;
};

export function PreferencesForm({initial, locales, currencies}: PreferenceProps) {
  const routeLocale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useTranslations('Account.preferences');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  const [values, setValues] = useState(initial);
  const save = () =>
    startTransition(async () => {
      const next = await updatePreferencesAction({...values, locale: routeLocale});
      setResult(next);
      if (next.ok && values.localeCode !== routeLocale)
        router.push(`/${values.localeCode}/account/preferences`);
    });
  return (
    <Card className="account-form-card">
      <CardHeader>
        <CardTitle>{t('formTitle')}</CardTitle>
        <CardDescription>{t('formDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="account-form">
          <ResultAlert result={result} />
          <div className="account-form-grid">
            <div className="ui-field">
              <label className="ui-label">{t('language')}</label>
              <Select
                value={values.localeCode}
                onValueChange={(localeCode) => setValues((current) => ({...current, localeCode}))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((item) => (
                    <SelectItem value={item.code} key={item.code}>
                      {item.native_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="ui-field">
              <label className="ui-label">{t('currency')}</label>
              <Select
                value={values.currencyCode}
                onValueChange={(currencyCode) =>
                  setValues((current) => ({...current, currencyCode}))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((item) => (
                    <SelectItem value={item.code} key={item.code}>
                      {item.code} · {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              label={t('timezone')}
              value={values.timezone}
              dir="ltr"
              onChange={(event) =>
                setValues((current) => ({...current, timezone: event.target.value}))
              }
            />
          </div>
          <div className="account-form-actions">
            <Button variant="gradient" loading={pending} onClick={save}>
              {t('save')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

type NotificationPreference = {
  channel: NotificationChannel;
  transactional: boolean;
  order_updates: boolean;
  promotions: boolean;
};

export function NotificationPreferences({preferences}: {preferences: NotificationPreference[]}) {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useTranslations('Account.notifications');
  const [rows, setRows] = useState(preferences);
  const [pending, startTransition] = useTransition();
  const update = (
    channel: NotificationChannel,
    field: 'transactional' | 'order_updates' | 'promotions',
    value: boolean
  ) => {
    setRows((current) =>
      current.map((row) => (row.channel === channel ? {...row, [field]: value} : row))
    );
    const row = rows.find((item) => item.channel === channel);
    if (!row) return;
    startTransition(async () => {
      await updateNotificationPreferenceAction({
        channel,
        transactional: field === 'transactional' ? value : row.transactional,
        orderUpdates: field === 'order_updates' ? value : row.order_updates,
        promotions: field === 'promotions' ? value : row.promotions,
        locale
      });
    });
  };
  return (
    <div className="notification-grid" aria-busy={pending}>
      {rows.map((row) => (
        <Card key={row.channel}>
          <CardHeader>
            <span className="account-card-icon">
              <BellRing aria-hidden="true" />
            </span>
            <CardTitle>{t(`channels.${row.channel}`)}</CardTitle>
            <CardDescription>{t(`channelDescriptions.${row.channel}`)}</CardDescription>
          </CardHeader>
          <CardContent className="notification-switches">
            <Switch
              label={t('transactional')}
              checked={row.transactional}
              onCheckedChange={(value) => update(row.channel, 'transactional', value)}
            />
            <Switch
              label={t('orders')}
              checked={row.order_updates}
              onCheckedChange={(value) => update(row.channel, 'order_updates', value)}
            />
            <Switch
              label={t('promotions')}
              checked={row.promotions}
              onCheckedChange={(value) => update(row.channel, 'promotions', value)}
            />
            <div className="notification-security">
              <ShieldCheck aria-hidden="true" />
              {t('securityAlwaysOn')}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type SecurityProps = {
  factors: Array<{id: string; friendlyName?: string; status: string}>;
  sessions: Array<{
    id: string;
    device_name: string;
    user_agent: string | null;
    last_seen_at: string;
    revoked_at: string | null;
  }>;
};

export function SecurityCenter({factors, sessions}: SecurityProps) {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useTranslations('Account.security');
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [enrollment, setEnrollment] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ActionResult<unknown> | null>(null);
  const enroll = () =>
    startTransition(async () => {
      const next = await enrollTotpAction(locale);
      setResult(next);
      if (next.ok && next.data) setEnrollment(next.data);
    });
  const verify = () =>
    enrollment &&
    startTransition(async () => {
      const next = await verifyTotpAction({factorId: enrollment.factorId, code, locale});
      setResult(next);
      if (next.ok) {
        setEnrollment(null);
        router.refresh();
      }
    });
  const remove = (factorId: string) =>
    startTransition(async () => {
      setResult(await removeTotpAction(factorId, locale));
      router.refresh();
    });
  const revoke = (sessionId: string) =>
    startTransition(async () => {
      setResult(await revokeSessionAction(sessionId, locale));
      router.refresh();
    });
  return (
    <div className="security-grid">
      <ResultAlert result={result} />
      <Card className="security-mfa-card">
        <CardHeader>
          <span className="account-card-icon">
            <KeyRound aria-hidden="true" />
          </span>
          <CardTitle>{t('mfaTitle')}</CardTitle>
          <CardDescription>{t('mfaDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {factors.length ? (
            factors.map((factor) => (
              <div className="security-factor" key={factor.id}>
                <div>
                  <Badge tone="success">
                    <Check />
                    {t('enabled')}
                  </Badge>
                  <strong>{factor.friendlyName ?? t('authenticator')}</strong>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  loading={pending}
                  onClick={() => remove(factor.id)}
                >
                  {t('disable')}
                </Button>
              </div>
            ))
          ) : (
            <Button variant="gradient" loading={pending} onClick={enroll}>
              {t('enable')}
            </Button>
          )}
          {enrollment ? (
            <div className="mfa-enrollment">
              <Image
                src={enrollment.qrCode}
                alt={t('qrAlt')}
                width={192}
                height={192}
                unoptimized
              />
              <div>
                <p>{t('scanQr')}</p>
                <code dir="ltr">{enrollment.secret}</code>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => navigator.clipboard.writeText(enrollment.secret)}
                >
                  <Copy />
                  {t('copySecret')}
                </Button>
              </div>
              <div className="auth-otp-field">
                <label>{t('code')}</label>
                <OtpField aria-label={t('code')} value={code} onChange={setCode} />
                <Button variant="gradient" onClick={verify} loading={pending}>
                  {t('verify')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <span className="account-card-icon">
            <Laptop aria-hidden="true" />
          </span>
          <CardTitle>{t('sessionsTitle')}</CardTitle>
          <CardDescription>{t('sessionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="session-list">
          {sessions
            .filter((session) => !session.revoked_at)
            .map((session) => (
              <div key={session.id} className="session-row">
                <span>
                  {session.user_agent?.includes('Mobile') ? (
                    <Smartphone aria-hidden="true" />
                  ) : (
                    <Laptop aria-hidden="true" />
                  )}
                </span>
                <div>
                  <strong>
                    {t(
                      `devices.${session.device_name === 'mobile' ? 'mobile' : session.device_name === 'desktop' ? 'desktop' : 'unknown'}`
                    )}
                  </strong>
                  <small>{t('lastSeen', {date: new Date(session.last_seen_at)})}</small>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  loading={pending}
                  onClick={() => revoke(session.id)}
                >
                  <LogOut />
                  {t('revoke')}
                </Button>
              </div>
            ))}
          {sessions.every((session) => session.revoked_at) ? (
            <p className="account-muted">{t('noSessions')}</p>
          ) : null}
          <form action={signOutAction.bind(null, locale, true)}>
            <Button type="submit" variant="destructive">
              <LogOut />
              {t('signOutEverywhere')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
