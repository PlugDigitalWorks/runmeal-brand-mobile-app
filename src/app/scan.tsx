import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { QrCode, X } from 'lucide-react-native';
import { routeForScannedCode } from '@/lib/links';
import { colors, font, radius } from '@/theme';

const FRAME = 250;
const CORNER = 34;

/** In-app table QR scanner: works without the web side's link verification files. */
export default function ScanScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [invalid, setInvalid] = useState(false);
  const handled = useRef(false);

  const topBar = (
    // iOS shows this as a card below the status bar; Android draws it full screen.
    <View style={[styles.topBar, { paddingTop: Platform.OS === 'ios' ? 20 : insets.top + 12 }]}>
      <Text style={styles.title}>{t('scan.title')}</Text>
      <Pressable style={styles.close} onPress={() => router.back()} accessibilityLabel="Close" hitSlop={8}>
        <X size={22} color={colors.primaryForeground} />
      </Pressable>
    </View>
  );

  if (!permission) return <View style={styles.container}>{topBar}</View>;

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        {topBar}
        <View style={styles.center}>
          <View style={styles.permissionIcon}>
            <QrCode size={36} color={colors.primary} />
          </View>
          <Text style={styles.message}>{t('scan.permission')}</Text>
          <Pressable onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonLabel}>{t('scan.allow')}</Text>
          </Pressable>
        </View>
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
      {topBar}
      <View style={styles.center} pointerEvents="none">
        <View style={styles.frame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.hint}>{t('scan.hint')}</Text>
      </View>
      {invalid ? (
        <View style={[styles.banner, { bottom: insets.bottom + 32 }]}>
          <Text style={styles.bannerText}>{t('scan.invalid')}</Text>
        </View>
      ) : null}
    </View>
  );
}

const cornerBase = { position: 'absolute' as const, width: CORNER, height: CORNER, borderColor: colors.primary };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.zinc900 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  title: { color: colors.primaryForeground, fontSize: font.title + 2, fontWeight: '800' },
  close: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  frame: { width: FRAME, height: FRAME },
  corner: cornerBase,
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: radius.xl },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: radius.xl },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: radius.xl },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: radius.xl },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: font.base, textAlign: 'center' },
  permissionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,166,35,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: { color: colors.primaryForeground, textAlign: 'center', fontSize: font.base, lineHeight: 22 },
  button: { backgroundColor: colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: radius.lg },
  buttonLabel: { color: colors.primaryForeground, fontWeight: '700', fontSize: font.base },
  banner: {
    position: 'absolute',
    left: 24,
    right: 24,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  bannerText: { color: colors.primaryForeground, textAlign: 'center', fontSize: font.body },
});
