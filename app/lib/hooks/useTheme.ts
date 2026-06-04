import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ColorTokens } from '@/lib/theme/colors';
import { useTypeScale, TypeScale } from '@/lib/theme/typography';
import { useSpacing, SpacingTokens } from '@/lib/theme/spacing';
import { useThemePreference } from '@/lib/theme/ThemePreferenceContext';

export interface Theme {
  colors: ColorTokens;
  type: TypeScale;
  spacing: SpacingTokens;
  isDark: boolean;
}

export function useTheme(): Theme {
  const systemScheme = useColorScheme();
  const { preference } = useThemePreference();

  const isDark =
    preference === 'dark'  ? true  :
    preference === 'light' ? false :
    systemScheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    type: useTypeScale(),
    spacing: useSpacing(),
    isDark,
  };
}
