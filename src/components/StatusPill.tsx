import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { humanize, statusTone } from '@/lib/order-display';
import { font, radius } from '@/theme';

const TONES = {
  success: { backgroundColor: '#dcfce7', color: '#15803d' },
  danger: { backgroundColor: '#fee2e2', color: '#b91c1c' },
  info: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
} as const;

export function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  const tone = TONES[statusTone(status)];
  return (
    <Text style={[styles.pill, { backgroundColor: tone.backgroundColor, color: tone.color }]}>
      {t(`orders.statuses.${status.toUpperCase()}`, { defaultValue: humanize(status) })}
    </Text>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: font.small,
    fontWeight: '700',
  },
});
