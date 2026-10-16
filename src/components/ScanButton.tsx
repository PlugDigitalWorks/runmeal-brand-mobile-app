import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

export function ScanButton() {
  const { t } = useTranslation();
  return (
    <Pressable style={styles.button} onPress={() => router.push('/scan')} accessibilityRole="button">
      <Text style={styles.label}>{t('brands.scan')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f5a623',
    alignItems: 'center',
  },
  label: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
