import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorTokens } from '@/lib/theme/colors';
import { useTypeScale, TypeScale } from '@/lib/theme/typography';
import { useSpacing, SpacingTokens } from '@/lib/theme/spacing';

export interface Theme {
  colors: ColorTokens;
  type: TypeScale;
  spacing: SpacingTokens;
  isDark: boolean;
}

export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    colors: isDark ? darkColors : lightColors,
    type: useTypeScale(),
    spacing: useSpacing(),
    isDark,
  };
}
