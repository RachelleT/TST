import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({ icon, onPress, accessibilityLabel, style }: IconButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, style]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
    >
      {icon}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
});
