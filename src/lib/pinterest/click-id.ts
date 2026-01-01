/**
 * Pinterest Click ID (epik) Tracking
 *
 * Captures and stores the Pinterest Click ID from URL parameters
 * for server-side conversion tracking.
 *
 * Pinterest adds `_epik` parameter when users click on Pinterest ads.
 * This ID helps Pinterest match conversions back to the original click.
 */

const EPIK_COOKIE_NAME = 'pinterest_epik';
const EPIK_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Extract Pinterest Click ID from URL search params
 */
export function getEpikFromUrl(searchParams: URLSearchParams): string | null {
  // Pinterest uses _epik parameter
  return searchParams.get('_epik') || searchParams.get('epik') || null;
}

/**
 * Get Pinterest Click ID from cookie (client-side)
 */
export function getEpikFromCookie(): string | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === EPIK_COOKIE_NAME) {
      return decodeURIComponent(value);
    }
  }
  return null;
}

/**
 * Store Pinterest Click ID in cookie (client-side)
 */
export function setEpikCookie(epik: string): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + EPIK_COOKIE_MAX_AGE * 1000);

  // Set secure cookie with SameSite=Lax for cross-site tracking
  document.cookie = `${EPIK_COOKIE_NAME}=${encodeURIComponent(epik)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get Pinterest Click ID from URL or cookie
 * URL takes precedence (fresh click)
 */
export function getPinterestClickId(searchParams?: URLSearchParams): string | null {
  // Check URL first (fresh Pinterest click)
  if (searchParams) {
    const urlEpik = getEpikFromUrl(searchParams);
    if (urlEpik) {
      // Store for future use
      setEpikCookie(urlEpik);
      return urlEpik;
    }
  }

  // Fall back to cookie (previous click)
  return getEpikFromCookie();
}

/**
 * Clear Pinterest Click ID cookie
 */
export function clearEpikCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${EPIK_COOKIE_NAME}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

/**
 * Server-side: Extract epik from request headers (cookie)
 */
export function getEpikFromRequest(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === EPIK_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
}
