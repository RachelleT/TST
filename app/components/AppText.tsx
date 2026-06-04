import { Text, TextProps } from 'react-native';
import { useTheme } from '@/lib/hooks/useTheme';
import { TypeScale } from '@/lib/theme/typography';

type Variant = keyof TypeScale;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
}

export function AppText({ variant = 'body', color, style, ...rest }: AppTextProps) {
  const { type, colors } = useTheme();
  const variantStyle = type[variant];
  return (
    <Text
      // Respect the user's system font-size setting (Dynamic Type on iOS,
      // font scale on Android) — pass allowFontScaling only when the caller
      // hasn't overridden it.
      allowFontScaling
      maxFontSizeMultiplier={2}   // cap at 2× to prevent extreme layout breaks
      style={[variantStyle, { color: color ?? colors.text.primary }, style]}
      {...rest}
    />
  );
}
