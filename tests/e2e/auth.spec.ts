import {createHmac} from 'node:crypto';

import {createClient} from '@supabase/supabase-js';
import {expect, test} from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const configured = Boolean(supabaseUrl && serviceRoleKey);
const testEmailPattern =
  process.env.PLAYWRIGHT_TEST_EMAIL_PATTERN ??
  'delivered+nexora-e2e-{locale}-{timestamp}@resend.dev';

const copy = {
  en: {
    signup: 'Create protected account',
    email: 'Email address',
    name: 'Display name',
    password: 'Password',
    confirm: 'Confirm password',
    continue: 'Continue securely',
    security: 'Security',
    enable: 'Set up authenticator',
    code: 'Six-digit code',
    verify: 'Verify and enable',
    signOut: 'Sign out',
    mfaCode: 'Verification code',
    mfaContinue: 'Verify and continue'
  },
  ar: {
    signup: 'إنشاء حساب محمي',
    email: 'البريد الإلكتروني',
    name: 'الاسم الظاهر',
    password: 'كلمة المرور',
    confirm: 'تأكيد كلمة المرور',
    continue: 'متابعة آمنة',
    security: 'الأمان',
    enable: 'إعداد تطبيق المصادقة',
    code: 'الرمز المكون من ستة أرقام',
    verify: 'تحقق وفعّل',
    signOut: 'تسجيل الخروج',
    mfaCode: 'رمز التحقق',
    mfaContinue: 'تحقق وتابع'
  }
} as const;

function decodeBase32(secret: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits = secret
    .toUpperCase()
    .replaceAll('=', '')
    .split('')
    .map((character) => {
      const value = alphabet.indexOf(character);
      if (value < 0) throw new Error('Invalid base32 secret');
      return value.toString(2).padStart(5, '0');
    })
    .join('');
  return Buffer.from((bits.match(/.{8}/g) ?? []).map((byte) => Number.parseInt(byte, 2)));
}

function totp(secret: string): string {
  const counter = Math.floor(Date.now() / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = (digest.at(-1) ?? 0) & 15;
  const binary =
    (((digest[offset] ?? 0) & 127) << 24) |
    ((digest[offset + 1] ?? 0) << 16) |
    ((digest[offset + 2] ?? 0) << 8) |
    (digest[offset + 3] ?? 0);
  return String(binary % 1_000_000).padStart(6, '0');
}

for (const locale of ['en', 'ar'] as const) {
  test.skip(!configured, 'Supabase E2E credentials are required');

  test(`signup, verify, password login, TOTP, and logout in ${locale}`, async ({page}) => {
    test.setTimeout(90_000);
    if (!supabaseUrl || !serviceRoleKey) return;
    const admin = createClient(supabaseUrl, serviceRoleKey, {auth: {persistSession: false}});
    const timestamp = Date.now().toString();
    const email = testEmailPattern
      .replaceAll('{locale}', locale)
      .replaceAll('{timestamp}', timestamp);
    const password = `Phase1!${Date.now()}Secure`;
    const labels = copy[locale];
    let userId: string | undefined;

    try {
      await page.goto(`/${locale}/auth/sign-up`);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await page.getByLabel(labels.name).fill(`Phase One ${locale}`);
      await page.getByLabel(labels.email).fill(email);
      await page.getByLabel(labels.password, {exact: true}).fill(password);
      await page.getByLabel(labels.confirm).fill(password);
      await page.getByRole('button', {name: labels.signup}).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth/verify-email`), {
        timeout: 20_000
      });

      const {data: users, error: usersError} = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });
      expect(usersError).toBeNull();
      const user = users.users.find((candidate) => candidate.email === email);
      userId = user?.id;
      expect(userId).toBeTruthy();
      await admin.auth.admin.updateUserById(userId ?? '', {email_confirm: true});

      await page.goto(`/${locale}/auth/sign-in`);
      await page.getByLabel(labels.email).fill(email);
      await page.getByLabel(labels.password, {exact: true}).fill(password);
      await page.getByRole('button', {name: labels.continue}).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/account`));

      await page.getByRole('link', {name: labels.security}).first().click();
      await page.getByRole('button', {name: labels.enable}).click();
      const secret = await page.locator('.mfa-enrollment code').innerText();
      await page.getByLabel(labels.code).fill(totp(secret));
      await page.getByRole('button', {name: labels.verify}).click();
      await expect(page.locator('.security-factor')).toBeVisible();

      await page.getByRole('button', {name: labels.signOut, exact: true}).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth/sign-in`));
      await page.getByLabel(labels.email).fill(email);
      await page.getByLabel(labels.password, {exact: true}).fill(password);
      await page.getByRole('button', {name: labels.continue}).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/auth/mfa`));
      await page.getByLabel(labels.mfaCode).fill(totp(secret));
      await page.getByRole('button', {name: labels.mfaContinue}).click();
      await expect(page).toHaveURL(new RegExp(`/${locale}/account`));
    } finally {
      if (!userId) {
        const {data} = await admin.auth.admin.listUsers({page: 1, perPage: 1000});
        userId = data.users.find((candidate) => candidate.email === email)?.id;
      }
      if (userId) await admin.auth.admin.deleteUser(userId);
    }
  });
}
