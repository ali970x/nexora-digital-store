import {setRequestLocale} from 'next-intl/server';
import {redirect} from 'next/navigation';

import {AuthPanel} from '@/features/auth/components/auth-panel';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function MfaPage({params}: {params: Promise<{locale: string}>}) {
  const {locale} = await params;
  setRequestLocale(locale);
  const supabase = await createClient();
  const {data} = await supabase.auth.mfa.listFactors();
  const factor = data?.totp.find((item) => item.status === 'verified');
  if (!factor) redirect(`/${locale}/account/security`);
  return <AuthPanel mode="mfa" factorId={factor.id} />;
}
