/** Payload of `GET /tables/resolve/:qrToken`; the token is opaque, never parse it. */
export interface TableResolveResponse {
  brandId: string;
  branchId: string;
  tableId: string;
  tableLabel: string;
  checkoutOptions: { payNow: boolean; payLater: boolean };
}
