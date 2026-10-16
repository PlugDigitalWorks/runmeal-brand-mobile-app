import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

type Props = { name: string; logoUrl?: string | null; busy?: boolean; onPress: () => void };

export function BrandRow({ name, logoUrl, busy, onPress }: Props) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={busy} accessibilityRole="button">
      {logoUrl ? (
        <Image source={{ uri: logoUrl }} style={styles.logo} contentFit="cover" />
      ) : (
        <View style={[styles.logo, styles.placeholder]}>
          <Text style={styles.initial}>{name.charAt(0).toLocaleUpperCase('tr')}</Text>
        </View>
      )}
      <Text style={styles.name}>{name}</Text>
      {busy ? <ActivityIndicator /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  logo: { width: 44, height: 44, borderRadius: 22 },
  placeholder: { backgroundColor: '#f5a623', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#fff', fontWeight: '700', fontSize: 18 },
  name: { flex: 1, fontSize: 16, fontWeight: '500' },
});
