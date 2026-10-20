import { render, screen } from '@testing-library/react-native';
import '@/i18n';
import LegalScreen from '@/app/legal/[page]';
import { legalDocument } from '@/content/legal';

const mockParams: { page?: string } = {};
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => mockParams }));

it('fills in the cafe and names PLUG DIGITAL LTD as the controller', () => {
  const doc = legalDocument('privacy', 'Dharma Coffee');
  const text = JSON.stringify(doc);
  expect(text).not.toContain('{{brand}}');
  expect(text).toContain('order from Dharma Coffee');
  expect(text).toContain('PLUG DIGITAL LTD (company number 12458401)');
  expect(text).toContain('info@plugdigital.co.uk');
  expect(text).not.toMatch(/WORKS/);
});

it('shows the privacy policy in the app', async () => {
  mockParams.page = 'privacy';
  await render(<LegalScreen />);
  expect(screen.getByText('Privacy policy')).toBeTruthy();
  expect(screen.getByText('Last updated 20 October 2026')).toBeTruthy();
  expect(screen.getByText('Location and camera')).toBeTruthy();
});

it('shows the terms of use for /legal/terms', async () => {
  mockParams.page = 'terms';
  await render(<LegalScreen />);
  expect(screen.getByText('Terms of use')).toBeTruthy();
  expect(screen.getByText('Allergies and dietary needs')).toBeTruthy();
});
