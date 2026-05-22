import { useState } from 'react';
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  useReducedMotion,
} from 'react-native-reanimated';
import {
  IconBookmark,
  IconBookmarkFilled,
} from '@tabler/icons-react-native';
import { SavedWord, Fact, PartOfSpeech } from '@tst/shared';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { AppText } from './AppText';
import { Badge } from './Badge';
import { ZoneLabel } from './ZoneLabel';
import { Chip } from './Chip';
import { IconButton } from './IconButton';
import { t } from '@/lib/i18n';

export type CardMode = 'preview' | 'detail';

interface WordCardProps {
  word: SavedWord;
  fact?: Fact;
  mode?: CardMode;
  /** Show bookmark as filled (saved). Default true when in library. */
  saved?: boolean;
  onPress?: () => void;
  onBookmarkPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function WordCard({
  word,
  fact,
  mode = 'preview',
  saved = true,
  onPress,
  onBookmarkPress,
  style,
}: WordCardProps) {
  const { colors, type } = useTheme();
  const spacing = useSpacing();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const reducedMotion = useReducedMotion();

  const pos = (word.partOfSpeech as PartOfSpeech) ?? 'noun';
  const posColors = colors.pos[pos];

  const [factRevealed, setFactRevealed] = useState(false);
  const flip = useSharedValue(0);

  function handleFactTap() {
    const toValue = factRevealed ? 0 : 1;
    if (reducedMotion) {
      flip.value = toValue;
    } else {
      flip.value = withTiming(toValue, { duration: 350 });
    }
    setFactRevealed(!factRevealed);
  }

  const frontStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [0, 0.5, 1], [1, 0, 0]),
    transform: [{ rotateX: `${interpolate(flip.value, [0, 1], [0, 90])}deg` }],
  }));

  const backStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flip.value, [0, 0.5, 1], [0, 0, 1]),
    transform: [{ rotateX: `${interpolate(flip.value, [0, 1], [-90, 0])}deg` }],
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  }));

  const outerRadius = spacing.cardRadiusOuter;
  const innerRadius = spacing.cardRadiusInner;
  const frameThickness = spacing.frameThickness;
  const cardPadding = spacing.cardPadding;

  const portraitHeight = isTablet ? 150 : 120;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.frame,
        {
          backgroundColor: posColors.frame,
          borderRadius: outerRadius,
          padding: frameThickness,
        },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : 'none'}
      accessibilityLabel={`${word.word} card`}
    >
      <View
        style={[
          styles.inner,
          {
            backgroundColor: colors.surface.card,
            borderRadius: innerRadius,
            borderColor: colors.border.subtle,
            padding: cardPadding,
          },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <AppText
            variant={mode === 'detail' ? 'display' : 'title'}
            color={posColors.headerText}
            style={styles.wordText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {word.word}
          </AppText>
          <Badge pos={pos} />
        </View>

        {/* ── Pronunciation ── */}
        {word.pronunciation ? (
          <AppText
            variant="pronunciation"
            color={colors.text.secondary}
            style={styles.pronunciation}
          >
            {word.pronunciation}
          </AppText>
        ) : null}

        {/* ── Fact portrait ── */}
        <TouchableOpacity
          onPress={handleFactTap}
          activeOpacity={0.85}
          style={[styles.portrait, { height: portraitHeight, backgroundColor: posColors.sentenceBg }]}
          accessibilityRole="button"
          accessibilityLabel={factRevealed ? t('Hide fact') : t('Show fact')}
          accessibilityHint={t('Tap to reveal or hide the general knowledge fact')}
        >
          {/* Front: illustration placeholder */}
          <Animated.View style={[styles.portraitFace, frontStyle]}>
            <View
              style={[styles.illustrationPlaceholder, { backgroundColor: posColors.sentenceBorder }]}
            />
            <AppText
              variant="caption"
              color={colors.text.secondary}
              style={styles.factName}
            >
              {fact ? fact.name : t('Tap to reveal')}
            </AppText>
            {fact ? (
              <View style={[styles.categoryTag, { backgroundColor: posColors.frame }]}>
                <AppText variant="meta" color={colors.surface.card}>
                  {fact.category.toUpperCase()}
                </AppText>
              </View>
            ) : null}
          </Animated.View>

          {/* Back: fact sentence */}
          <Animated.View style={[styles.portraitFace, backStyle, { padding: 12, justifyContent: 'center' }]}>
            <AppText
              variant="caption"
              color={colors.text.primary}
              style={{ textAlign: 'center' }}
            >
              {fact?.factSentence ?? t('No fact available yet.')}
            </AppText>
          </Animated.View>
        </TouchableOpacity>

        {/* ── Definition ── */}
        <View style={styles.zone}>
          <ZoneLabel>{t('Definition')}</ZoneLabel>
          <AppText
            variant="body"
            style={styles.definitionText}
            numberOfLines={mode === 'preview' ? 3 : undefined}
          >
            {word.definition}
          </AppText>
        </View>

        {/* ── Sentence ── */}
        {word.exampleSentence ? (
          <View
            style={[
              styles.sentenceZone,
              {
                backgroundColor: posColors.sentenceBg,
                borderLeftColor: posColors.sentenceBorder,
              },
            ]}
          >
            <ZoneLabel>{t('In a sentence')}</ZoneLabel>
            <AppText variant="caption" style={styles.sentenceText}>
              {word.exampleSentence}
            </AppText>
          </View>
        ) : null}

        {/* ── Synonyms ── */}
        {word.synonyms.length > 0 ? (
          <View style={styles.zone}>
            <ZoneLabel>{t('Similar')}</ZoneLabel>
            <View style={styles.chips}>
              {word.synonyms.slice(0, 6).map((syn) => (
                <Chip key={syn} label={syn} pos={pos} />
              ))}
            </View>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={[styles.footer, { borderTopColor: colors.border.subtle }]}>
          <AppText variant="cardNumber" color={colors.text.tertiary}>
            {`№ ${String(word.cardNumber).padStart(3, '0')}`}
          </AppText>
          <IconButton
            icon={
              saved
                ? <IconBookmarkFilled size={20} stroke={posColors.frame} />
                : <IconBookmark size={20} stroke={colors.text.secondary} />
            }
            onPress={onBookmarkPress ?? (() => {})}
            accessibilityLabel={saved ? t('Saved') : t('Save word')}
          />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    // backgroundColor and borderRadius set inline
  },
  inner: {
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  wordText: {
    flex: 1,
    marginRight: 8,
  },
  pronunciation: {
    marginBottom: 10,
  },
  portrait: {
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitFace: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationPlaceholder: {
    width: 56,
    height: 40,
    borderRadius: 4,
    marginBottom: 6,
  },
  factName: {
    textAlign: 'center',
  },
  categoryTag: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  zone: {
    marginBottom: 10,
  },
  definitionText: {
    marginTop: 2,
  },
  sentenceZone: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 6,
    marginBottom: 10,
    borderRadius: 2,
  },
  sentenceText: {
    marginTop: 2,
    fontStyle: 'italic',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    marginTop: 4,
    paddingTop: 8,
  },
});
