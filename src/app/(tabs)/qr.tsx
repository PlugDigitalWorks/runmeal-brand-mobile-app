import { Redirect } from 'expo-router';

/** The middle tab only hosts the raised member-QR button; it never shows a screen. */
export default function QrTab() {
  return <Redirect href="/rewards" />;
}
