import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { routeForScannedCode } from '@/lib/links';

/** In-app table QR scanner: works without the web side's link verification files. */
export default function ScanScreen() {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);
  const handled = useRef(false);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.message}>{t('scan.permission')}</Text>
        <Pressable onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonLabel}>{t('scan.allow')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (handled.current) return;
          const route = routeForScannedCode(data);
          if (!route) {
            setInvalid(true);
            return;
          }
          handled.current = true;
          router.replace(route as Href);
        }}
      />
      {invalid ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{t('scan.invalid')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  message: { color: '#fff', textAlign: 'center', fontSize: 16 },
  button: { backgroundColor: '#f5a623', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  buttonLabel: { color: '#fff', fontWeight: '700' },
  banner: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  bannerText: { color: '#fff', textAlign: 'center' },
});
