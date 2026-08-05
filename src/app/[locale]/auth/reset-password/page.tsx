import {setRequestLocale} from 'next-intl/server';

import {AuthPanel} from '@/features/auth/components/auth-panel';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <AuthPanel mode="reset-password" />;
}
