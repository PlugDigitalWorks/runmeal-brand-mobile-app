import type { Branch } from '@/types/branch';

export type Coordinates = { latitude: number; longitude: number };
export type RankedBranch = { branch: Branch; distanceM: number | null };

/** Haversine distance in meters. */
export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

function branchCoordinates(branch: Branch): Coordinates | null {
  const point = branch.locationGeog?.coordinates;
  return point ? { longitude: point[0], latitude: point[1] } : null;
}

/** Nearest first when the user's location is known, otherwise alphabetical. */
export function sortBranches(branches: Branch[], me: Coordinates | null): RankedBranch[] {
  const ranked = branches.map((branch) => {
    const at = branchCoordinates(branch);
    return { branch, distanceM: me && at ? distanceMeters(me, at) : null };
  });
  return ranked.sort((a, b) =>
    a.distanceM !== null && b.distanceM !== null
      ? a.distanceM - b.distanceM
      : a.branch.name.localeCompare(b.branch.name),
  );
}

/** "850 m" / "1,2 km", as in brandfe's BranchSummary. */
export function formatDistance(meters: number, language?: string | null): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const locale = language?.startsWith('en') ? 'en-US' : 'tr-TR';
  const digits = km < 100 ? 1 : 0;
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(km)} km`;
}
