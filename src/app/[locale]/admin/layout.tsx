import type {ReactNode} from 'react';

import {AdminShell} from '@/components/layout/dashboard-shell';
import {requireRole} from '@/features/auth/server/authorization';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;
  const context = await requireRole(locale, ['finance', 'admin', 'owner']);
  const userName = context.user.email?.split('@')[0] ?? context.user.id.slice(0, 8);
  return <AdminShell userName={userName}>{children}</AdminShell>;
}
