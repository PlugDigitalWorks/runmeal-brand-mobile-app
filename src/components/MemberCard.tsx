import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Coffee } from 'lucide-react-native';
import { colors, font, radius } from '@/theme';

type Props = {
  name: string;
  subtitle: string;
  title: string;
  status: string;
  earned: number;
  target: number | null;
};

const SIZE = 128;
const STROKE = 9;
const R = 52;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** brandfe's MemberQrScreen card: zinc-900 card, primary progress ring, right-aligned member details. */
export function MemberCard({ name, subtitle, title, status, earned, target }: Props) {
  const progress = target ? Math.min(earned / target, 1) : 0;
  return (
    <View style={styles.card}>
      <View style={styles.seal} />
      <View style={styles.ring}>
        <Svg width={SIZE} height={SIZE} viewBox="0 0 120 120" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={60} cy={60} r={R} stroke="rgba(255,255,255,0.16)" strokeWidth={STROKE} fill="none" />
          <Circle
            cx={60}
            cy={60}
            r={R}
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Coffee size={26} color={colors.primaryForeground} />
          <Text style={styles.count}>{target ? `${earned} / ${target}` : earned}</Text>
        </View>
      </View>
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={1}>
          {name.toLocaleUpperCase('tr')}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.status} numberOfLines={2}>
          {status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: radius.xl,
    backgroundColor: colors.zinc900,
    overflow: 'hidden',
  },
  seal: {
    position: 'absolute',
    right: -64,
    bottom: -96,
    width: 192,
    height: 192,
    borderRadius: 96,
    borderWidth: 10,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.05)',
  },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center', gap: 4 },
  count: { color: 'rgba(255,255,255,0.9)', fontSize: font.body, fontWeight: '700', fontVariant: ['tabular-nums'] },
  details: { flex: 1, alignItems: 'flex-end', gap: 4 },
  name: { color: 'rgba(255,255,255,0.9)', fontSize: font.small, fontWeight: '700', letterSpacing: 1.6 },
  subtitle: { color: 'rgba(255,255,255,0.45)', fontSize: font.small },
  title: { color: 'rgba(255,255,255,0.85)', fontSize: font.base, fontWeight: '600', textAlign: 'right' },
  status: { color: 'rgba(255,255,255,0.5)', fontSize: font.small, textAlign: 'right' },
});
