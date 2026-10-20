import { launchSettled } from '../launch';

const base = { brandReady: true, brandFailed: false, branchStatus: 'ready', menuStatus: 'ready' } as const;

it('waits for the brand, its branches and a menu', () => {
  expect(launchSettled({ ...base, brandReady: false })).toBe(false);
  expect(launchSettled({ ...base, branchStatus: 'loading' })).toBe(false);
  expect(launchSettled({ ...base, menuStatus: 'loading' })).toBe(false);
  expect(launchSettled(base)).toBe(true);
});

it('steps aside for errors the screens behind it explain', () => {
  expect(launchSettled({ ...base, brandReady: false, brandFailed: true, branchStatus: 'loading', menuStatus: 'loading' })).toBe(true);
  expect(launchSettled({ ...base, branchStatus: 'error', menuStatus: 'error' })).toBe(true);
});
