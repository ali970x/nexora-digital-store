import {Resend} from 'npm:resend@6';
import {Webhook} from 'npm:standardwebhooks@1';

import {authEmailCatalogs} from '../_shared/generated-auth-email-copy.ts';

type HookPayload = {
  user: {email: string; user_metadata?: {locale?: string}};
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
  };
};

function emailKind(action: string): 'verify' | 'magicLink' | 'passwordReset' {
  if (action === 'recovery') return 'passwordReset';
  if (action === 'magiclink') return 'magicLink';
  return 'verify';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

Deno.serve(async (request) => {
  if (request.method !== 'POST')
    return Response.json({error: {http_code: 405, message: 'method_not_allowed'}}, {status: 405});
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET')?.replace('v1,whsec_', '');
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RESEND_FROM_EMAIL');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  if (!secret || !resendKey || !from || !supabaseUrl)
    return Response.json(
      {error: {http_code: 500, message: 'email_hook_not_configured'}},
      {status: 500}
    );

  try {
    const body = await request.text();
    const payload = new Webhook(secret).verify(
      body,
      Object.fromEntries(request.headers)
    ) as HookPayload;
    const locale = payload.user.user_metadata?.locale === 'ar' ? 'ar' : 'en';
    const copy = authEmailCatalogs[locale][emailKind(payload.email_data.email_action_type)];
    const actionUrl = `${supabaseUrl}/auth/v1/verify?token=${encodeURIComponent(payload.email_data.token_hash)}&type=${encodeURIComponent(payload.email_data.email_action_type)}&redirect_to=${encodeURIComponent(payload.email_data.redirect_to)}`;
    const direction = locale === 'ar' ? 'rtl' : 'ltr';
    const html = `<!doctype html><html lang="${locale}" dir="${direction}"><body style="margin:0;background:#0a0a0f;color:#f7f7fb;font-family:Arial,sans-serif"><main style="max-width:560px;margin:0 auto;padding:48px 24px"><p style="color:#a78bfa;font-weight:700">NEXORA</p><h1>${escapeHtml(copy.title)}</h1><p style="color:#b8b8c5;line-height:1.7">${escapeHtml(copy.description)}</p><p><a href="${actionUrl}" style="display:inline-block;padding:14px 20px;border-radius:12px;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:700">${escapeHtml(copy.action)}</a></p><p style="color:#8c8c9b;font-size:13px">${escapeHtml(copy.expiry)}</p></main></body></html>`;
    const {error} = await new Resend(resendKey).emails.send({
      from,
      to: [payload.user.email],
      subject: copy.subject,
      html
    });
    if (error) throw new Error('email_provider_failed');
    return Response.json({});
  } catch {
    return Response.json(
      {error: {http_code: 401, message: 'invalid_email_hook_request'}},
      {status: 401}
    );
  }
});
