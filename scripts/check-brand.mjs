// Checks brand/brand.json against the live API the way the app uses it:
// `host` must resolve to an active brand (Origin header on /brands/resolve),
// and every `linkHosts` entry must belong to that same brand.
import { readFile } from 'node:fs/promises';

const api = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.runmeal.com';
const brand = JSON.parse(await readFile(new URL('../brand/brand.json', import.meta.url), 'utf8'));

async function resolve(host) {
  const origin = `https://${host}`;
  const res = await fetch(`${api}/brands/resolve`, { headers: { Origin: origin, Referer: `${origin}/` } });
  const body = await res.json().catch(() => null);
  return res.ok ? body?.data ?? null : null;
}

const main = await resolve(brand.host);
if (!main?.brandId) {
  console.log(`FAIL  host ${brand.host} does not resolve to a brand`);
  process.exit(1);
}
console.log(`OK    ${brand.host}  →  ${main.name} (${main.brandId})`);

let failed = 0;
for (const host of brand.linkHosts) {
  const found = await resolve(host);
  if (found?.brandId === main.brandId) console.log(`OK    link host ${host}`);
  else {
    failed += 1;
    console.log(`FAIL  link host ${host}  →  ${found ? `${found.name} (${found.brandId})` : 'not a brand'}`);
  }
}
process.exit(failed ? 1 : 0);
