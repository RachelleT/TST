import { useWindowDimensions } from 'react-native';

export const fonts = {
  serif: {
    regular: 'SourceSerif4_400Regular',
    medium: 'SourceSerif4_500Medium',
    semibold: 'SourceSerif4_600SemiBold',
  },
  sans: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
  },
} as const;

export interface TypeScale {
  display:       { fontSize: number; lineHeight: number; fontFamily: string; fontWeight?: string };
  title:         { fontSize: number; lineHeight: number; fontFamily: string; fontWeight?: string };
  headline:      { fontSize: number; lineHeight: number; fontFamily: string; fontWeight?: string };
  body:          { fontSize: number; lineHeight: number; fontFamily: string };
  bodyMedium:    { fontSize: number; lineHeight: number; fontFamily: string };
  caption:       { fontSize: number; lineHeight: number; fontFamily: string };
  meta:          { fontSize: number; lineHeight: number; fontFamily: string; letterSpacing: number; textTransform: 'uppercase' };
  pronunciation: { fontSize: number; lineHeight: number; fontFamily: string };
  cardNumber:    { fontSize: number; lineHeight: number; fontFamily: string };
}

function makeScale(isTablet: boolean): TypeScale {
  const d = isTablet ? 40 : 32;
  const t = isTablet ? 30 : 24;
  const body = isTablet ? 17 : 16;

  return {
    display:       { fontSize: d,    lineHeight: d * 1.1,   fontFamily: fonts.serif.medium },
    title:         { fontSize: t,    lineHeight: t * 1.3,   fontFamily: fonts.serif.medium },
    headline:      { fontSize: 20,   lineHeight: 20 * 1.3,  fontFamily: fonts.sans.medium },
    body:          { fontSize: body, lineHeight: body * 1.5, fontFamily: fonts.sans.regular },
    bodyMedium:    { fontSize: body, lineHeight: body * 1.5, fontFamily: fonts.sans.medium },
    caption:       { fontSize: 13,   lineHeight: 13 * 1.5,  fontFamily: fonts.sans.regular },
    meta:          { fontSize: 11,   lineHeight: 11 * 1.4,  fontFamily: fonts.sans.medium, letterSpacing: 0.8, textTransform: 'uppercase' },
    pronunciation: { fontSize: 13,   lineHeight: 13 * 1.5,  fontFamily: fonts.mono.regular },
    cardNumber:    { fontSize: 10,   lineHeight: 10 * 1.4,  fontFamily: fonts.mono.regular },
  };
}

export function useTypeScale(): TypeScale {
  const { width } = useWindowDimensions();
  return makeScale(width >= 600);
}
