import { Text, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@/lib/money';

type Props = { value: number | string | null | undefined; currency: string; style?: TextStyle | TextStyle[] };

export function Price({ value, currency, style }: Props) {
  const { i18n } = useTranslation();
  return <Text style={style}>{formatMoney(value, currency, i18n.language)}</Text>;
}
