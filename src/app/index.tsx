import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useBrand } from '@/context/BrandContext';
import { consumeInstallReferrerUrl } from '@/lib/install-referrer';
import { toLinkRoute } from '@/lib/links';

/** Cold start without a link: install referrer → last cafe → cafe picker. */
export default function Index() {
  const { brand, ready } = useBrand();
  const [referrerUrl, setReferrerUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    consumeInstallReferrerUrl().then(setReferrerUrl);
  }, []);

  if (!ready || referrerUrl === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (referrerUrl) return <Redirect href={toLinkRoute(referrerUrl) as Href} />;
  return <Redirect href={brand ? '/home' : '/brands'} />;
}
