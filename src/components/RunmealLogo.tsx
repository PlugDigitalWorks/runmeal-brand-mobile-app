import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme';

const MARK = require('@/../assets/images/runmeal-mark.png');

/** brandfe's header logo: the orange R mark followed by the RUNMEAL wordmark. */
export function RunmealLogo({ size = 32 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="image" accessibilityLabel="Runmeal">
      <Image source={MARK} style={{ width: size, height: size }} />
      <Text style={[styles.word, { fontSize: size * 0.62 }]}>RUNMEAL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontWeight: '800', letterSpacing: 1.2, color: colors.zinc700 },
});
