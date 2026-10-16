import { api } from '@/lib/api';
import type { ApiResponse } from '@/types/api';

export interface StampQr {
  qrToken: string;
  /** What the cashier scans. */
  qrValue: string;
}

export interface StampCard {
  campaignId: string;
  campaignName: string;
  brandId: string;
  category: { id: string; name: string };
  stampThreshold: number;
  campaignStatus: 'ACTIVE' | 'INACTIVE';
  stampCount: number;
  remainingStamps: number;
  status: 'COLLECTING' | 'REWARD_AVAILABLE';
  rewardExpiresAt: string | null;
}

export async function getMemberQr(): Promise<StampQr> {
  const { data } = await api.get<ApiResponse<StampQr>>('/loyalty/stamps/qr');
  return data.data;
}

export async function getStampCards(brandId: string): Promise<StampCard[]> {
  const { data } = await api.get<ApiResponse<StampCard[]>>(`/loyalty/stamps/me/${brandId}`);
  return data.data ?? [];
}

/** A single-use `.pkpass` download link the backend signs; it expires after five minutes. */
export async function createAppleWalletLink(brandId: string, campaignId: string): Promise<{ url: string }> {
  const { data } = await api.post<ApiResponse<{ url: string }>>(`/loyalty/stamps/me/${brandId}/${campaignId}/apple-wallet`);
  return data.data;
}

/** A signed `https://pay.google.com/gp/v/save/…` link to Google's save page. */
export async function createGoogleWalletLink(brandId: string, campaignId: string): Promise<{ url: string }> {
  const { data } = await api.post<ApiResponse<{ url: string }>>(`/loyalty/stamps/me/${brandId}/${campaignId}/google-wallet`);
  return data.data;
}
