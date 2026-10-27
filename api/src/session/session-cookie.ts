import type { CookieOptions, Request } from 'express';

export const SESSION_COOKIE = 'obraflow_session';

// Browsers cap cookie lifetime at 400 days (RFC 6265bis), so "forever" is the
// maximum allowed. GET /session refreshes it, so an active user never loses it.
const MAX_AGE_MS = 400 * 24 * 60 * 60 * 1000;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true, // not readable from JavaScript
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    signed: true, // tampered values are rejected by cookie-parser
    path: '/',
    maxAge: MAX_AGE_MS,
  };
}

/** The user id stored in the signed cookie, or null when missing or tampered. */
export function readSessionUserId(request: Request): string | null {
  const value: unknown = request.signedCookies?.[SESSION_COOKIE];
  return typeof value === 'string' && UUID_REGEX.test(value) ? value : null;
}
