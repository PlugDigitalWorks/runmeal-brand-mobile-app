import { Redirect } from 'expo-router';

/** The middle tab only hosts the raised table-QR scan button; it never shows a screen. */
export default function QrTab() {
  return <Redirect href="/scan" />;
}
