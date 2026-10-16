import { useEffect, useState } from 'react';
import { Animated, type ViewStyle } from 'react-native';
import { colors } from '@/theme';

/** brandfe's animate-pulse block. */
export function Skeleton({ style }: { style?: ViewStyle }) {
  const [opacity] = useState(() => new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ backgroundColor: colors.zinc100, borderRadius: 8, opacity }, style]} />;
}
