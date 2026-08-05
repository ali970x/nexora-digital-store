import {setRequestLocale} from 'next-intl/server';

import {VerifyEmailPanel} from '@/features/auth/components/verify-email-panel';

export default async function VerifyEmailPage({
  params,
  searchParams
}: {
  params: Promise<{locale: string}>;
  searchParams: Promise<{email?: string}>;
}) {
  const {locale} = await params;
  const {email} = await searchParams;
  setRequestLocale(locale);
  return <VerifyEmailPanel email={email ?? ''} />;
}
