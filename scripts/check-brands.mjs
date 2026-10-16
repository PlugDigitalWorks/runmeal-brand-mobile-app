// Verifies that every host in src/data/brands.json resolves to an active brand
// on the live API, the same way the app does (Origin header on /brands/resolve).
import { readFile } from 'node:fs/promises';

const api = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.runmeal.com';
const entries = JSON.parse(await readFile(new URL('../src/data/brands.json', import.meta.url), 'utf8'));

let failed = 0;
for (const { host, name } of entries) {
  const origin = `https://${host}`;
  const res = await fetch(`${api}/brands/resolve`, { headers: { Origin: origin, Referer: `${origin}/` } });
  const body = await res.json().catch(() => null);
  if (res.ok && body?.data?.brandId) {
    console.log(`OK    ${host}  →  ${body.data.name} (${body.data.brandId})`);
  } else {
    failed += 1;
    console.log(`FAIL  ${host}  (${name})  →  ${res.status} ${body?.code ?? ''}`);
  }
}
process.exit(failed ? 1 : 0);
