# Phase 1 — Identity, authorization, and localization

## Delivered

- Supabase Auth flows for email/password, email verification, magic link, Google and Apple OAuth, phone OTP, password recovery, local/global logout, and TOTP enrollment/challenge/removal.
- A callback route that accepts PKCE OAuth codes and hashed email tokens, rejects unsafe return paths, and preserves locale.
- `profiles`, `profile_roles`, `role_permissions`, `notification_preferences`, and `user_sessions` Drizzle models plus migration, indexes, constraints, triggers, seeds, functions, and RLS.
- Private avatar storage with per-user Storage policies and validated Server Action upload.
- Live database permission resolution, pure `can()`/`hasRole()` helpers, reusable server guards, middleware checks, and independent server-component checks.
- Protected `/account`, `/admin`, and `/reseller` areas. Account includes profile, avatar, security, device sessions, notification matrix, and regional preferences.
- Cookie → `Accept-Language` → English locale resolution; Arabic RTL/English LTR; localized auth/account/email copy; data-driven locale/currency preferences; Intl currency, number, date, and relative-time helpers.
- A signed Supabase Auth Send Email Hook backed by Resend, with localized verification, magic-link, and recovery messages generated from the same locale catalogs as the application.
- Vitest coverage for permission and locale-resolution helpers and Playwright E2E definitions for signup → verification → login → TOTP → logout in both locales.

## Deployment configuration

Apply `drizzle/0001_identity_access.sql` to a Supabase project after the Phase 0 migration. Configure the application origin and callback allowlist for `/{locale}/auth/callback`, then enable:

- The `send-auth-email` Edge Function, `SEND_EMAIL_HOOK_SECRET`, Resend credentials, and the Supabase Auth Send Email Hook.
- Google and Apple provider credentials.
- An SMS provider for international phone OTP.
- A service-role secret in CI only for the verification step of the E2E test.

The browser-safe publishable key remains the only Supabase key exposed to the client. The service-role key is never imported by a Client Component.

## Verification

- Production build: passed.
- ESLint and strict TypeScript: passed.
- Vitest: 3 files and 10 permission, locale-detection, and money tests passed.
- Playwright: both `en` and `ar` auth journeys compile and are listed; the local run cleanly skips both journeys until Supabase E2E secrets are configured.
- Browser checks: English LTR and Arabic RTL auth pages render with the correct font, no horizontal overflow, no console errors, and a single `h1`.
- Unauthenticated checks: all six localized `/account`, `/admin`, and `/reseller` routes redirect to the matching localized sign-in page.
