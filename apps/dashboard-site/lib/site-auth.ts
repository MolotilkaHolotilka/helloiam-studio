const AUTH_MESSAGE = 'dashboard-site-auth';

export const SITE_AUTH_COOKIE = 'site_auth';

/** Secure cookies only over HTTPS (or when COOKIE_SECURE=true). HTTP VPS needs false. */
export function getAuthCookieSecure(request?: Request) {
  if (process.env['COOKIE_SECURE'] === 'true') return true;
  if (process.env['COOKIE_SECURE'] === 'false') return false;
  return request?.headers.get('x-forwarded-proto') === 'https';
}

function readSitePassword() {
  return process.env['SITE_PASSWORD']?.trim();
}

export function isSitePasswordEnabled() {
  return Boolean(readSitePassword());
}

async function hmacSha256Hex(secret: string, message: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualStrings(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createAuthCookieValue() {
  const password = readSitePassword();
  if (!password) return '';
  return hmacSha256Hex(password, AUTH_MESSAGE);
}

export async function verifyAuthCookie(value: string | undefined) {
  if (!isSitePasswordEnabled()) return true;
  if (!value) return false;

  const expected = await createAuthCookieValue();
  if (!expected) return false;

  return timingSafeEqualStrings(value, expected);
}

export function isPasswordCorrect(password: string) {
  const expected = readSitePassword();
  if (!expected) return true;
  return password.trim() === expected;
}
