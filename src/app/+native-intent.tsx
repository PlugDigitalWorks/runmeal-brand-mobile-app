import { parseIncomingUrl, toLinkRoute } from '@/lib/links';

/**
 * Every Universal Link / App Link arrives here first. Router paths would drop
 * the host, and the host is what tells us the cafe, so keep the whole URL.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  if (!/^https?:\/\//i.test(path)) return path;
  return parseIncomingUrl(path) ? toLinkRoute(path) : '/';
}
