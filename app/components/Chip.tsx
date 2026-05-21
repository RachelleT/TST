import { TouchableOpacity, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { PartOfSpeech } from '@tst/shared';
import { useTheme } from '@/lib/hooks/useTheme';

interface ChipProps {
  label: string;
  pos: PartOfSpeech;
  onPress?: () => void;
}

export function Chip({ label, pos, onPress }: ChipProps) {
  const { colors } = useTheme();
  const posColors = colors.pos[pos];
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: colors.surface.card,
          borderColor: posColors.sentenceBorder,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppText variant="caption" color={posColors.frame}>
        {label}
      </AppText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
