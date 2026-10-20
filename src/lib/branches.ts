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

export function branchCoordinates(branch: Branch): Coordinates | null {
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

/** "850 m" / "1.2 km", as in brandfe's BranchSummary. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  const digits = km < 100 ? 1 : 0;
  return `${new Intl.NumberFormat('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(km)} km`;
}

/**
 * Turn-by-turn directions to a branch in the phone's own maps app: Apple Maps
 * on iOS, Google Maps on Android (both open these links in the app when it is
 * installed). Uses the branch's coordinates, else its address; null when it
 * has neither.
 */
export function directionsUrl(branch: Branch, platform: 'ios' | 'android'): string | null {
  const at = branchCoordinates(branch);
  const destination = at ? `${at.latitude},${at.longitude}` : branch.addressText?.trim();
  if (!destination) return null;
  const target = encodeURIComponent(destination);
  return platform === 'ios'
    ? `https://maps.apple.com/?daddr=${target}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${target}`;
}
