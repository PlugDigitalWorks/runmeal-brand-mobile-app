import { BRAND } from '@brand';

/**
 * Design tokens, copied from brandfe: src/themes/brands/default.theme.ts for the
 * brand colors and Tailwind's zinc/orange scales for the neutrals it hard-codes.
 */
export const colors = {
  // The brand's own colors, from brand/brand.json.
  primary: BRAND.colors.primary,
  primaryForeground: BRAND.colors.primaryForeground,
  primaryPressed: BRAND.colors.primaryPressed,
  accent: BRAND.colors.accent,
  accentForeground: BRAND.colors.accentForeground,
  background: BRAND.colors.background,
  card: '#ffffff',
  border: BRAND.colors.border,
  destructive: '#ef4444',
  success: '#16a34a',
  successSoft: '#f0fdf4',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  warningBorder: '#fde68a',
  orange50: '#fff7ed',
  orange700: '#c2410c',
  zinc50: '#fafafa',
  zinc100: '#f4f4f5',
  zinc200: '#e4e4e7',
  zinc300: '#d4d4d8',
  zinc400: '#a1a1aa',
  zinc500: '#71717a',
  zinc600: '#52525b',
  zinc700: '#3f3f46',
  zinc800: '#27272a',
  zinc900: '#18181b',
  overlay: 'rgba(0,0,0,0.5)',
} as const;

export const radius = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, full: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;

export const font = {
  caption: 11,
  small: 12,
  body: 14,
  base: 16,
  title: 18,
  heading: 22,
  display: 28,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  raised: {
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;
