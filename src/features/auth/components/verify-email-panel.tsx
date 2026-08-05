'use client';

import {MailCheck, RefreshCw} from 'lucide-react';
import {useLocale, useTranslations} from 'next-intl';
import {useState, useTransition} from 'react';

import {Button} from '@/components/ui/button';
import {Alert} from '@/components/ui/surfaces';
import {Link} from '@/i18n/navigation';
import {resendVerificationAction, type ActionResult} from '../server/actions';

export function VerifyEmailPanel({email}: {email: string}) {
  const locale = useLocale() === 'ar' ? 'ar' : 'en';
  const t = useTranslations('Auth.verifyEmail');
  const auth = useTranslations('Auth');
  const [result, setResult] = useState<ActionResult | null>({ok: true, next: 'verify_email'});
  const [pending, startTransition] = useTransition();
  const resend = () =>
    startTransition(async () => setResult(await resendVerificationAction({email, locale})));
  return (
    <section className="auth-card" aria-labelledby="verify-email-title">
      <div className="auth-card-heading">
        <span className="auth-icon">
          <MailCheck aria-hidden="true" />
        </span>
        <div>
          <p>{t('eyebrow')}</p>
          <h1 id="verify-email-title">{t('title')}</h1>
          <span>{t('description')}</span>
        </div>
      </div>
      <Alert tone="info" title={t('sentTitle')}>
        {t('sentDescription', {email})}
      </Alert>
      {result && !result.ok ? (
        <Alert tone="danger" title={t('errorTitle')}>
          {auth(`errors.${result.error}`)}
        </Alert>
      ) : null}
      <Button variant="outline" loading={pending} onClick={resend}>
        <RefreshCw aria-hidden="true" />
        {t('resend')}
      </Button>
      <p className="auth-switch">
        <Link href="/auth/sign-in">{t('back')}</Link>
      </p>
    </section>
  );
}
