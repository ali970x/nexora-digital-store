import {createServerClient} from '@supabase/ssr';
import createIntlMiddleware from 'next-intl/middleware';
import {NextResponse, type NextRequest} from 'next/server';

import {routing} from './i18n/routing';
import {resolveLocalePreference} from './i18n/locale-detection';
import {requiresMfaChallenge} from './features/auth/server/mfa';
import type {Database, UserRole} from './lib/supabase/database.types';

const handleIntl = createIntlMiddleware(routing);
const protectedPrefixes = ['/account', '/admin', '/reseller'] as const;
const localePattern = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`);

export function resolveRequestLocale(request: NextRequest) {
  return resolveLocalePreference(
    request.cookies.get('NEXT_LOCALE')?.value,
    request.headers.get('accept-language')
  );
}

function routeWithoutLocale(pathname: string): string {
  return pathname.replace(localePattern, '') || '/';
}

function isProtected(pathname: string): boolean {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hasRequiredRole(pathname: string, roles: readonly UserRole[]): boolean {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return roles.includes('admin') || roles.includes('owner');
  }
  if (pathname === '/reseller' || pathname.startsWith('/reseller/')) {
    return roles.includes('reseller') || roles.includes('admin') || roles.includes('owner');
  }
  return true;
}

export default async function middleware(request: NextRequest) {
  let response = handleIntl(request);
  const pathname = routeWithoutLocale(request.nextUrl.pathname);
  if (!isProtected(pathname)) return response;

  const localeMatch = request.nextUrl.pathname.match(localePattern);
  const locale = localeMatch?.[1] ?? resolveRequestLocale(request);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.redirect(new URL(`/${locale}/auth/sign-in`, request.url));
  }

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({name, value}) => request.cookies.set(name, value));
        response = handleIntl(request);
        cookies.forEach(({name, value, options}) => response.cookies.set(name, value, options));
      }
    }
  });
  const {
    data: {user}
  } = await supabase.auth.getUser();
  if (!user) {
    const signIn = new URL(`/${locale}/auth/sign-in`, request.url);
    signIn.searchParams.set('returnTo', request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  const {data: assurance} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (requiresMfaChallenge(assurance)) {
    return NextResponse.redirect(new URL(`/${locale}/auth/mfa`, request.url));
  }

  if (pathname.startsWith('/admin') || pathname.startsWith('/reseller')) {
    const {data} = await supabase
      .from('profile_roles')
      .select('role, expires_at')
      .eq('profile_id', user.id);
    const now = Date.now();
    const roles = (data ?? [])
      .filter((row) => !row.expires_at || new Date(row.expires_at).getTime() > now)
      .map((row) => row.role);
    if (!hasRequiredRole(pathname, roles)) {
      return NextResponse.redirect(new URL(`/${locale}/account?denied=1`, request.url));
    }
  }
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
