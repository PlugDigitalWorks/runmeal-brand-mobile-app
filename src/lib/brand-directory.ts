import directory from '@/data/brands.json';
import type { DirectoryEntry } from '@/types/brand';
import { foldText } from './text';

/**
 * The cafes the app lists. Each `host` is the cafe's active web domain: the
 * custom domain when one is active, otherwise `{slug}.runmeal.com`. Run
 * `npm run check:brands` after editing src/data/brands.json.
 */
export const BRAND_DIRECTORY: DirectoryEntry[] = directory;

export const DIRECTORY_HOSTS: readonly string[] = BRAND_DIRECTORY.map((entry) => entry.host);

export function searchDirectory(entries: DirectoryEntry[], query: string): DirectoryEntry[] {
  const needle = foldText(query.trim());
  const matches = needle
    ? entries.filter((e) => foldText(e.name).includes(needle) || e.host.includes(needle))
    : entries;
  return [...matches].sort((a, b) => foldText(a.name).localeCompare(foldText(b.name)));
}
