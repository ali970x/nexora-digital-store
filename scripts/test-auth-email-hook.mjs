import {createHmac, randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

function loadLocalEnvironment() {
  const contents = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

loadLocalEnvironment();

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
const configuredSecret = required('SEND_EMAIL_HOOK_SECRET');
const encodedSecret = configuredSecret.replace(/^v1,whsec_/, '');
const signingSecret = Buffer.from(encodedSecret, 'base64');
const messageId = `msg_${randomUUID()}`;
const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = JSON.stringify({
  user: {
    email: 'delivered+nexora-auth-hook@resend.dev',
    user_metadata: {locale: 'en'}
  },
  email_data: {
    token_hash: 'nexora-auth-hook-test-token',
    redirect_to: 'http://localhost:3100/en/auth/callback',
    email_action_type: 'signup'
  }
});
const signedContent = `${messageId}.${timestamp}.${payload}`;
const signature = createHmac('sha256', signingSecret).update(signedContent).digest('base64');

const response = await fetch(`${supabaseUrl}/functions/v1/send-auth-email`, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'webhook-id': messageId,
    'webhook-timestamp': timestamp,
    'webhook-signature': `v1,${signature}`
  },
  body: payload
});

if (!response.ok) {
  const details = await response.text();
  throw new Error(`Auth email hook returned HTTP ${response.status}: ${details}`);
}

console.log('Auth email hook test: accepted by Resend.');
