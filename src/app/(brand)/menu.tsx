import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { useBrand } from '@/context/BrandContext';
import { getBrandMenu, type BrandMenu } from '@/services/menu.service';

/** Verification screen: proves the active cafe drives API calls. The storefront plan replaces it. */
export default function MenuScreen() {
  const { brand } = useBrand();
  const [menu, setMenu] = useState<BrandMenu | null>(null);

  useEffect(() => {
    if (!brand) return;
    getBrandMenu(brand.brandId)
      .then(setMenu)
      .catch(() => setMenu({ brandId: brand.brandId, categories: [] }));
  }, [brand]);

  // A menu loaded for the previous cafe counts as still loading.
  if (!menu || menu.brandId !== brand?.brandId) return <ActivityIndicator style={{ marginTop: 32 }} />;
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={menu.categories}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16 }}>{item.name}</Text>
        </View>
      )}
    />
  );
}
