import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { AppText } from './AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Icon rendered to the left of the label */
  icon?: ReactNode;
  /** Override the background colour (text becomes white) */
  color?: string;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  icon,
  color,
}: ButtonProps) {
  const { colors } = useTheme();

  const bg = color
    ? color
    : variant === 'primary'
      ? colors.accent.primary
      : variant === 'secondary'
        ? colors.accent.muted
        : 'transparent';

  const textColor = color
    ? colors.surface.page
    : variant === 'primary'
      ? colors.surface.page
      : colors.accent.primary;

  const borderColor = !color && variant === 'ghost' ? colors.accent.primary : undefined;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        { backgroundColor: bg },
        borderColor ? { borderWidth: 1, borderColor } : undefined,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon}
          <AppText variant="bodyMedium" color={textColor}>
            {label}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  disabled: { opacity: 0.5 },
});
