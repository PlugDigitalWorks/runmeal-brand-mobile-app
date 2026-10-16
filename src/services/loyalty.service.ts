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
  category: { id: string; name: string };
  stampThreshold: number;
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
