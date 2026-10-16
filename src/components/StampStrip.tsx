import { useId } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import type { PassState } from '@/lib/loyalty';

/**
 * The stamp band of the loyalty pass, ported from brandfe's StampStrip (itself
 * a port of runmeal-api's Apple Wallet strip), so the card here, on the web and
 * in Wallet look the same. The last slot is always the reward, faded until the
 * card is full.
 */

export const WALLET_ORANGE = '#F6921E';

const WIDTH = 1125;
const HEIGHT = 369;
// Above this many stamps the icons get too small; draw a progress bar.
const MAX_GRID_STAMPS = 30;
const MARGIN = 36;
const GAP = 24;
const MAX_STAMP = 140;

type Kind = 'filled' | 'empty' | 'reward';

/** Drawn in a 112×112 box, as in the backend source. */
function StampArt({ kind, gold }: { kind: Kind; gold: string }) {
  if (kind === 'filled') {
    return (
      <>
        <Circle cx={56} cy={56} r={50} fill="#FFFFFF" fillOpacity={0.22} />
        <Circle cx={56} cy={56} r={48} fill="#FFFFFF" fillOpacity={0.95} />
        <Circle cx={56} cy={56} r={43} fill="none" stroke={WALLET_ORANGE} strokeWidth={2.5} strokeDasharray="3 3" />
        <Path d="M36 57 L50 71 L77 42" fill="none" stroke={WALLET_ORANGE} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      </>
    );
  }
  if (kind === 'empty') {
    return (
      <>
        <Circle cx={56} cy={56} r={48} fill="#FFFFFF" fillOpacity={0.08} />
        <Circle cx={56} cy={56} r={47} fill="none" stroke="#FFFFFF" strokeWidth={3} strokeDasharray="6 5" strokeOpacity={0.45} />
        <Circle cx={56} cy={56} r={16} fill="#FFFFFF" fillOpacity={0.12} />
        <Circle cx={56} cy={56} r={6} fill="#FFFFFF" fillOpacity={0.35} />
      </>
    );
  }
  return (
    <>
      <Circle cx={56} cy={56} r={50} fill="#FFFFFF" fillOpacity={0.28} />
      <Circle cx={56} cy={56} r={47} fill="#FFFFFF" fillOpacity={0.96} />
      <Circle cx={56} cy={56} r={43} fill={`url(#${gold})`} />
      <G transform="translate(30, 30) scale(0.46)">
        <Path d="M56 12 L68 38 L96 42 L75 62 L80 90 L56 76 L32 90 L37 62 L16 42 L44 38 Z" fill="#FFFFFF" />
        <Circle cx={56} cy={54} r={12} fill="#EAB308" />
        <Path d="M52 50 L56 58 L63 47" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </>
  );
}

function Stamp({ kind, x, y, size, opacity = 1, gold }: { kind: Kind; x: number; y: number; size: number; opacity?: number; gold: string }) {
  return (
    <G transform={`translate(${x}, ${y}) scale(${size / 112})`} opacity={opacity}>
      <StampArt kind={kind} gold={gold} />
    </G>
  );
}

type Props = { count: number; threshold: number; state: PassState };

function Grid({ count, threshold, state, gold }: Props & { gold: string }) {
  const rows = threshold <= 6 ? 1 : threshold <= 20 ? 2 : 3;
  const cols = Math.ceil(threshold / rows);
  const size = Math.min(
    MAX_STAMP,
    Math.floor((WIDTH - 2 * MARGIN - (cols - 1) * GAP) / cols),
    Math.floor((HEIGHT - 2 * MARGIN - (rows - 1) * GAP) / rows),
  );
  const left = (WIDTH - (cols * size + (cols - 1) * GAP)) / 2;
  const top = (HEIGHT - (rows * size + (rows - 1) * GAP)) / 2;
  return (
    <>
      {Array.from({ length: threshold }, (_, i) => {
        const x = left + (i % cols) * (size + GAP);
        const y = top + Math.floor(i / cols) * (size + GAP);
        if (i === threshold - 1) {
          return <Stamp key={i} kind="reward" x={x} y={y} size={size} opacity={state === 'ready' ? 1 : 0.45} gold={gold} />;
        }
        const filled = state === 'ready' || i < count;
        return <Stamp key={i} kind={filled ? 'filled' : 'empty'} x={x} y={y} size={size} gold={gold} />;
      })}
    </>
  );
}

function Bar({ count, threshold, state, gold }: Props & { gold: string }) {
  const trackWidth = WIDTH - 2 * MARGIN - MAX_STAMP - GAP;
  const ratio = state === 'ready' ? 1 : Math.min(1, count / threshold);
  const y = (HEIGHT - 36) / 2;
  return (
    <>
      <Rect x={MARGIN} y={y} width={trackWidth} height={36} rx={18} fill="#FFFFFF" fillOpacity={0.25} />
      <Rect x={MARGIN} y={y} width={Math.max(36, trackWidth * ratio)} height={36} rx={18} fill="#FFFFFF" fillOpacity={0.95} />
      <Stamp
        kind="reward"
        x={WIDTH - MARGIN - MAX_STAMP}
        y={(HEIGHT - MAX_STAMP) / 2}
        size={MAX_STAMP}
        opacity={state === 'ready' ? 1 : 0.45}
        gold={gold}
      />
    </>
  );
}

export function StampStrip({ count, threshold, state }: Props) {
  // Several passes sit side by side in the carousel; each strip gets its own gradient ids.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const ids = { bg: `${uid}bg`, orb: `${uid}orb`, dots: `${uid}dots`, gold: `${uid}gold` };
  const safeThreshold = Math.max(1, threshold);

  return (
    <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={styles.strip} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Defs>
        <LinearGradient id={ids.bg} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.14} />
          <Stop offset="50%" stopColor="#FFFFFF" stopOpacity={0.05} />
          <Stop offset="100%" stopColor="#000000" stopOpacity={0.12} />
        </LinearGradient>
        <RadialGradient id={ids.orb} cx="85%" cy="30%" r="60%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.18} />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
        <Pattern id={ids.dots} width={30} height={30} patternUnits="userSpaceOnUse">
          <Circle cx={15} cy={15} r={1.5} fill="#FFFFFF" fillOpacity={0.06} />
        </Pattern>
        <RadialGradient id={ids.gold} cx="40%" cy="35%" r="65%">
          <Stop offset="0%" stopColor="#FEF08A" />
          <Stop offset="60%" stopColor="#EAB308" />
          <Stop offset="100%" stopColor="#CA8A04" />
        </RadialGradient>
      </Defs>
      <Rect width={WIDTH} height={HEIGHT} fill={WALLET_ORANGE} />
      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${ids.bg})`} />
      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${ids.orb})`} />
      <Rect width={WIDTH} height={HEIGHT} fill={`url(#${ids.dots})`} />
      {/* A paused campaign is drawn faded, as the web greys it out. */}
      <G opacity={state === 'paused' ? 0.6 : 1}>
        {safeThreshold <= MAX_GRID_STAMPS ? (
          <Grid count={count} threshold={safeThreshold} state={state} gold={ids.gold} />
        ) : (
          <Bar count={count} threshold={safeThreshold} state={state} gold={ids.gold} />
        )}
      </G>
    </Svg>
  );
}

const styles = StyleSheet.create({
  strip: { width: '100%', aspectRatio: WIDTH / HEIGHT },
});
