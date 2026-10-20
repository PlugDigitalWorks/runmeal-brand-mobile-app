import { BRAND } from '@brand';

export type IncomingLink = { host: string; qrToken: string | null };

/**
 * Accepts links on the brand's own web hosts (brand.json `linkHosts`): table
 * QR codes carry the brand's primary domain, e.g. order.dharmacoffee.uk.
 */
export function parseIncomingUrl(url: string, knownHosts: readonly string[] = BRAND.linkHosts): IncomingLink | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  const host = parsed.hostname.toLowerCase();
  if (!knownHosts.includes(host)) return null;

  const qrToken = parsed.pathname === '/order' ? parsed.searchParams.get('qr') || null : null;
  return { host, qrToken };
}

export function toLinkRoute(url: string): string {
  return `/link?url=${encodeURIComponent(url)}`;
}

/** The in-app scanner's route for a scanned code, or null when it is not one of the brand's links. */
export function routeForScannedCode(data: string, knownHosts: readonly string[] = BRAND.linkHosts): string | null {
  const url = data.trim();
  return parseIncomingUrl(url, knownHosts) ? toLinkRoute(url) : null;
}

/** Rebuilds a scanned table link from a Play Store `referrer` (`host=<brand host>&qr=<token>`). */
export function referrerToUrl(referrer: string, knownHosts: readonly string[] = BRAND.linkHosts): string | null {
  const params = new URLSearchParams(referrer);
  const host = params.get('host')?.toLowerCase() ?? knownHosts[0];
  if (!host || !knownHosts.includes(host)) return null;
  const qr = params.get('qr');
  return qr ? `https://${host}/order?qr=${encodeURIComponent(qr)}` : null;
}
