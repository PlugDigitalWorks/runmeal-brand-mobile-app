import { LINK_BASE_DOMAIN } from '@/config';
import { DIRECTORY_HOSTS } from './brand-directory';

export type IncomingLink = { host: string; qrToken: string | null };

const SLUG_PATTERN = /^[a-z0-9-]+$/;

function isCafeHost(host: string, knownHosts: readonly string[], baseDomain: string): boolean {
  if (knownHosts.includes(host)) return true;
  const suffix = `.${baseDomain}`;
  return host.endsWith(suffix) && SLUG_PATTERN.test(host.slice(0, -suffix.length));
}

/**
 * Accepts `https://{slug}.{baseDomain}/...` and the cafes' own domains from the
 * bundled directory — table QR codes carry the brand's primary domain, which
 * is the custom one when it is active (e.g. order.dharmacoffee.uk).
 */
export function parseIncomingUrl(
  url: string,
  knownHosts: readonly string[] = DIRECTORY_HOSTS,
  baseDomain = LINK_BASE_DOMAIN,
): IncomingLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!isCafeHost(host, knownHosts, baseDomain)) return null;

  const qrToken = parsed.pathname === '/order' ? parsed.searchParams.get('qr') || null : null;
  return { host, qrToken };
}

export function toLinkRoute(url: string): string {
  return `/link?url=${encodeURIComponent(url)}`;
}

/** The in-app scanner's route for a scanned code, or null when it is not a cafe link. */
export function routeForScannedCode(
  data: string,
  knownHosts: readonly string[] = DIRECTORY_HOSTS,
  baseDomain = LINK_BASE_DOMAIN,
): string | null {
  const url = data.trim();
  return parseIncomingUrl(url, knownHosts, baseDomain) ? toLinkRoute(url) : null;
}

/**
 * Rebuilds the scanned link from a Play Store `referrer`. Prefer
 * `host=<cafe host>&qr=<token>`; `brand=<slug>` is accepted as a fallback and
 * maps to the default `{slug}.runmeal.com` host.
 */
export function referrerToUrl(
  referrer: string,
  knownHosts: readonly string[] = DIRECTORY_HOSTS,
  baseDomain = LINK_BASE_DOMAIN,
): string | null {
  const params = new URLSearchParams(referrer);
  const host = params.get('host')?.toLowerCase();
  const slug = params.get('brand')?.toLowerCase();

  let base: string;
  if (host) {
    if (!isCafeHost(host, knownHosts, baseDomain)) return null;
    base = `https://${host}`;
  } else if (slug && SLUG_PATTERN.test(slug)) {
    base = `https://${slug}.${baseDomain}`;
  } else {
    return null;
  }

  const qr = params.get('qr');
  return qr ? `${base}/order?qr=${encodeURIComponent(qr)}` : `${base}/`;
}
