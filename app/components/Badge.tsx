import { View, StyleSheet } from 'react-native';
import { AppText } from './AppText';
import { PartOfSpeech } from '@tst/shared';
import { useTheme } from '@/lib/hooks/useTheme';

const LABELS: Record<PartOfSpeech, string> = {
  noun: 'noun',
  verb: 'verb',
  adjective: 'adj',
  adverb: 'adv',
  preposition: 'prep',
};

interface BadgeProps {
  pos: PartOfSpeech;
}

export function Badge({ pos }: BadgeProps) {
  const { colors } = useTheme();
  const posColors = colors.pos[pos];
  return (
    <View style={[styles.pill, { backgroundColor: posColors.badgeFill }]}>
      <AppText
        variant="meta"
        color={posColors.badgeText}
        style={styles.label}
      >
        {LABELS[pos]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  label: {
    // textTransform and letterSpacing come from the meta variant
  },
});
