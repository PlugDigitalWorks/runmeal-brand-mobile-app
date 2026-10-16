import { StyleSheet, Text, View } from 'react-native';
import { colors, font } from '@/theme';

type Props = { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode };

/** brandfe's empty state: a 64px zinc circle holding a muted icon. */
export function EmptyState({ icon, title, body, action }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  circle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.zinc100, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: font.title, fontWeight: '700', color: colors.zinc800, textAlign: 'center' },
  body: { fontSize: font.body, color: colors.zinc500, textAlign: 'center', lineHeight: 20 },
});
