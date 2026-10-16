import { Text, type TextStyle } from 'react-native';
import { formatMoney } from '@/lib/money';

type Props = { value: number | string | null | undefined; currency: string; style?: TextStyle | TextStyle[] };

export function Price({ value, currency, style }: Props) {
  return <Text style={style}>{formatMoney(value, currency)}</Text>;
}
