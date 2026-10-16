/** Same rules as brandfe's src/lib/money.ts: the currency always comes from the API. */
const MONEY_LOCALE = 'en-GB';

export function formatMoney(value: number | string | null | undefined, currency: string): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(Number.isFinite(amount) ? amount : 0);
}
