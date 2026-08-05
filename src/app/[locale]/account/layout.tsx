import type {ReactNode} from 'react';

import {AccountShell} from '@/components/layout/dashboard-shell';
import {requireUser} from '@/features/auth/server/authorization';

export const dynamic = 'force-dynamic';

export default async function AccountLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const context = await requireUser(locale);
  const userName =
    context.user.email?.split('@')[0] ?? context.user.phone ?? context.user.id.slice(0, 8);
  return <AccountShell userName={userName}>{children}</AccountShell>;
}
