import directory from '@/data/brands.json';
import type { DirectoryEntry } from '@/types/brand';

/**
 * The cafes the app lists. Each `host` is the cafe's active web domain: the
 * custom domain when one is active, otherwise `{slug}.runmeal.com`. Run
 * `npm run check:brands` after editing src/data/brands.json.
 */
export const BRAND_DIRECTORY: DirectoryEntry[] = directory;

export const DIRECTORY_HOSTS: readonly string[] = BRAND_DIRECTORY.map((entry) => entry.host);

/** Case- and accent-insensitive key: "İstanbul Ağacı" → "istanbul agaci". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .toLowerCase();
}

export function searchDirectory(entries: DirectoryEntry[], query: string): DirectoryEntry[] {
  const needle = fold(query.trim());
  const matches = needle
    ? entries.filter((e) => fold(e.name).includes(needle) || e.host.includes(needle))
    : entries;
  return [...matches].sort((a, b) => fold(a.name).localeCompare(fold(b.name)));
}
