import {setRequestLocale} from 'next-intl/server';

import {AuthPanel} from '@/features/auth/components/auth-panel';

export default async function SignUpPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  return <AuthPanel mode="sign-up" />;
}
