import { Text, TextProps, StyleSheet } from 'react-native';
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
      style={[variantStyle, { color: color ?? colors.text.primary }, style]}
      {...rest}
    />
  );
}
