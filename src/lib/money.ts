/** Same rules as brandfe's src/lib/money.ts: the currency always comes from the API. */
export function moneyLocale(language?: string | null): string {
  return language?.startsWith('en') ? 'en-US' : 'tr-TR';
}

export function formatMoney(value: number | string | null | undefined, currency: string, language?: string | null): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(moneyLocale(language), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
  }).format(Number.isFinite(amount) ? amount : 0);
}
