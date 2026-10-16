import type { ApiResponse } from '@/types/api';

/** Most endpoints answer `{ status, message, data }`; a few auth ones answer the payload bare. */
export function unwrap<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload && 'status' in payload) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}
