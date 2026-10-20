import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@/i18n';
import LinkScreen from '@/app/link';
import { BranchChip } from '@/components/BranchChip';
import { resolveQr } from '@/services/table.service';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockStartJourney = jest.fn().mockResolvedValue(undefined);
const mockEndJourney = jest.fn().mockResolvedValue(undefined);
const mockTable = { journey: null as null | { branchId: string; tableLabel: string }, startJourney: mockStartJourney, endJourney: mockEndJourney };
const mockStorefront = { branch: { id: 'br1', name: 'Richmond' }, branches: [{ branch: { id: 'br1', name: 'Richmond' }, distanceM: 8610000 }] };
const mockBrand = { brand: { brandId: 'b1' } };
let mockUrl = 'https://order.dharmacoffee.uk/order?qr=tok1';

jest.mock('expo-router', () => ({
  router: { replace: (p: unknown) => mockReplace(p), push: (p: unknown) => mockPush(p) },
  useLocalSearchParams: () => ({ url: mockUrl }),
}));
jest.mock('@/context/BrandContext', () => ({ useBrand: () => mockBrand }));
jest.mock('@/context/TableContext', () => ({ useTable: () => mockTable }));
jest.mock('@/context/StorefrontContext', () => ({ useStorefront: () => mockStorefront }));
jest.mock('@/services/table.service', () => ({ resolveQr: jest.fn() }));

const table = { tableId: 't1', tableLabel: 'Table 1', branchId: 'br1', brandId: 'b1', checkoutOptions: { payNow: true, payLater: false } };

beforeEach(() => {
  jest.clearAllMocks();
  mockTable.journey = null;
  mockUrl = 'https://order.dharmacoffee.uk/order?qr=tok1';
  (resolveQr as jest.Mock).mockResolvedValue(table);
});

it('opens the menu straight away for a scanned table', async () => {
  await render(<LinkScreen />);
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/menu'));
  expect(mockStartJourney).toHaveBeenCalledWith({ ...table, qrToken: 'tok1' });
});

it("refuses another brand's table", async () => {
  (resolveQr as jest.Mock).mockResolvedValue({ ...table, brandId: 'other' });
  await render(<LinkScreen />);
  expect(await screen.findByText('This QR belongs to another cafe.')).toBeTruthy();
  expect(mockStartJourney).not.toHaveBeenCalled();
});

it('shows the distance away from a table', async () => {
  await render(<BranchChip />);
  expect(screen.getByText('Richmond  ·  8,610 km')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button'));
  expect(mockPush).toHaveBeenCalledWith('/branches');
});

it('shows the table instead of the distance at a table, and offers to leave it', async () => {
  // The label is shown exactly as the API sends it.
  mockTable.journey = { branchId: 'br1', tableLabel: 'Table 1' };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  await render(<BranchChip />);
  expect(screen.getByText('Richmond · Table 1')).toBeTruthy();
  await fireEvent.press(screen.getByRole('button'));
  expect(mockPush).not.toHaveBeenCalled();
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === 'Leave table')?.onPress?.();
  expect(mockEndJourney).toHaveBeenCalled();
});
