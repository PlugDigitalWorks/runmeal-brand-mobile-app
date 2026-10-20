import * as WebBrowser from 'expo-web-browser';
import { BRAND } from '@brand';

export type LegalPage = 'privacy' | 'terms';

/** The brand's privacy policy and terms, on its website, in an in-app browser sheet. */
export function openLegalPage(page: LegalPage): Promise<unknown> {
  return WebBrowser.openBrowserAsync(page === 'privacy' ? BRAND.legal.privacyUrl : BRAND.legal.termsUrl);
}
