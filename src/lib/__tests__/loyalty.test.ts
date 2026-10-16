import {
  parseAppleWalletUrl,
  parseGoogleWalletUrl,
  passState,
  resolveStampProgress,
  shortName,
  sortCardsByProgress,
} from '@/lib/loyalty';
import type { StampCard } from '@/services/loyalty.service';

const card = (over: Partial<StampCard>): StampCard => ({
  campaignId: 'c',
  campaignName: 'Coffee Card',
  brandId: 'b',
  category: { id: 'cat', name: 'Coffee' },
  stampThreshold: 9,
  campaignStatus: 'ACTIVE',
  stampCount: 0,
  remainingStamps: 9,
  status: 'COLLECTING',
  rewardExpiresAt: null,
  ...over,
});

it('uses the API counters, full when the reward is waiting', () => {
  expect(resolveStampProgress(card({ stampCount: 3, remainingStamps: 6 }))).toEqual({ earned: 3, target: 9, remaining: 6, percent: 33 });
  expect(resolveStampProgress(card({ stampCount: 2, status: 'REWARD_AVAILABLE' }))).toMatchObject({ earned: 9, remaining: 0, percent: 100 });
});

it('names the pass state like the Wallet pass', () => {
  expect(passState(card({}))).toBe('collecting');
  expect(passState(card({ status: 'REWARD_AVAILABLE' }))).toBe('ready');
  expect(passState(card({ campaignStatus: 'INACTIVE' }))).toBe('paused');
});

it('leads with the card closest to a reward', () => {
  const sorted = sortCardsByProgress([card({ campaignId: 'a', stampCount: 1 }), card({ campaignId: 'b', stampCount: 7 })]);
  expect(sorted.map((c) => c.campaignId)).toEqual(['b', 'a']);
});

it('prints the customer as first name and initial', () => {
  expect(shortName('Gökhan', 'çalışkan')).toBe('Gökhan Ç.');
  expect(shortName('Ada', '')).toBe('Ada');
  expect(shortName('', 'X')).toBeNull();
});

it('opens only safe Wallet links', () => {
  expect(parseAppleWalletUrl('https://api.runmeal.com/apple-wallet/download/t.pkpass')).toBe('https://api.runmeal.com/apple-wallet/download/t.pkpass');
  expect(parseAppleWalletUrl('javascript:alert(1)')).toBeNull();
  expect(parseAppleWalletUrl('/relative')).toBeNull();
  expect(parseGoogleWalletUrl('https://pay.google.com/gp/v/save/abc')).toBe('https://pay.google.com/gp/v/save/abc');
  expect(parseGoogleWalletUrl('https://pay.google.com.evil.com/gp/v/save/abc')).toBeNull();
  expect(parseGoogleWalletUrl('https://evil.com/gp/v/save/abc')).toBeNull();
});
