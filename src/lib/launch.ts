type LoadStatus = 'loading' | 'ready' | 'error';

/** Longest the launch screen waits on the network before showing the storefront anyway. */
export const LAUNCH_MAX_MS = 6000;

/**
 * The launch screen stays until the storefront can draw something real: the
 * brand, its branches and a menu (or a failure the screens behind it explain).
 */
export function launchSettled(state: {
  brandReady: boolean;
  brandFailed: boolean;
  branchStatus: LoadStatus;
  menuStatus: LoadStatus;
}): boolean {
  if (state.brandFailed) return true;
  if (!state.brandReady) return false;
  return state.branchStatus !== 'loading' && state.menuStatus !== 'loading';
}
