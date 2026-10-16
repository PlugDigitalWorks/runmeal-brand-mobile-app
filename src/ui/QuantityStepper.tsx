import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { colors, font, radius } from '@/theme';

type Props = { value: number; onChange: (next: number) => void; min?: number };

/** brandfe's modal stepper: zinc-100 track with white square buttons. */
export function QuantityStepper({ value, onChange, min = 1 }: Props) {
  return (
    <View style={styles.track}>
      <Pressable
        style={styles.button}
        onPress={() => onChange(Math.max(min, value - 1))}
        accessibilityRole="button"
        accessibilityLabel="-"
      >
        <Minus size={16} color={colors.zinc600} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable style={styles.button} onPress={() => onChange(value + 1)} accessibilityRole="button" accessibilityLabel="+">
        <Plus size={16} color={colors.zinc600} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.zinc100, borderRadius: radius.md, padding: 6 },
  button: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { minWidth: 20, textAlign: 'center', fontSize: font.base, fontWeight: '700', color: colors.zinc800 },
});
