import type { StampCard } from '@/services/loyalty.service';

export type PassState = 'collecting' | 'ready' | 'paused';

export type StampProgress = { earned: number; target: number; remaining: number; percent: number };

/** brandfe's resolveStampProgress: the API counters as sent, clamped only for drawing. */
export function resolveStampProgress(card: StampCard): StampProgress {
  const target = Math.max(1, card.stampThreshold);
  const ready = card.status === 'REWARD_AVAILABLE';
  const earned = ready ? target : Math.max(0, Math.min(card.stampCount, target));
  const remaining = ready ? 0 : Math.max(0, card.remainingStamps);
  return { earned, target, remaining, percent: Math.round((earned / target) * 100) };
}

export function passState(card: StampCard): PassState {
  if (card.status === 'REWARD_AVAILABLE') return 'ready';
  return card.campaignStatus === 'ACTIVE' ? 'collecting' : 'paused';
}

/** Leads with whatever is closest to a reward. */
export const sortCardsByProgress = (cards: StampCard[]) =>
  [...cards].sort((a, b) => resolveStampProgress(b).percent - resolveStampProgress(a).percent);

/** "Gökhan Çalışkan" → "Gökhan Ç.", the name the Wallet pass prints. */
export function shortName(firstName?: string | null, lastName?: string | null): string | null {
  const first = firstName?.trim();
  if (!first) return null;
  const initial = lastName?.trim().charAt(0).toLocaleUpperCase('tr-TR');
  return initial ? `${first} ${initial}.` : first;
}

/** Only an absolute http(s) link, exactly as the API sent it, is opened. */
export function parseAppleWalletUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !/^https?:\/\/[^\s]+$/i.test(value.trim())) return null;
  return value.trim();
}

/** Stricter: only Google's own save page. */
export function parseGoogleWalletUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  return url.startsWith('https://pay.google.com/gp/v/save/') ? url : null;
}
