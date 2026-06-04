import { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuthStore } from '@/lib/stores/auth';
import { saveWord } from '@/lib/actions/save-word';
import { t } from '@/lib/i18n';
import type { PartOfSpeech } from '@tst/shared';
import type { DictionaryEntry } from '@/lib/dictionary/types';

interface StarterWord {
  id: string;
  word: string;
  part_of_speech: string;
  pronunciation: string | null;
  definition: string;
  example_sentence: string | null;
  synonyms: string[];
}

// Convert a Supabase starter_words row into the DictionaryEntry shape that saveWord expects.
function starterToDictionaryEntry(sw: StarterWord): DictionaryEntry {
  return {
    word: sw.word,
    pronunciation: sw.pronunciation ?? '',
    senses: [
      {
        senseIndex: 0,
        partOfSpeech: sw.part_of_speech as PartOfSpeech,
        definition: sw.definition,
        exampleSentence: sw.example_sentence ?? '',
        synonyms: sw.synonyms ?? [],
      },
    ],
  };
}

function ProgressDots({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i === current - 1 ? colors.accent.primary : colors.border.subtle,
              width: i === current - 1 ? 20 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

// Compact card used on the starter-words screen.
// Tapping toggles saved state; a check overlay appears when saved.
interface MiniCardProps {
  word: StarterWord;
  isSaved: boolean;
  onToggle: () => void;
}

function MiniCard({ word, isSaved, onToggle }: MiniCardProps) {
  const { colors } = useTheme();

  // Pull from the theme's POS tokens — they already have correct light + dark values.
  const posKey = word.part_of_speech as keyof typeof colors.pos;
  const posTokens = colors.pos[posKey];
  const pos = posTokens
    ? {
        frame:     posTokens.frame,
        badge:     posTokens.badgeFill,
        badgeText: posTokens.badgeText,
        wordText:  posTokens.headerText, // light in dark mode, dark in light mode
      }
    : {
        frame:     '#5F5E5A',
        badge:     '#D3D1C7',
        badgeText: '#2C2C2A',
        wordText:  colors.text.primary,
      };

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSaved }}
      accessibilityLabel={`${word.word}. ${isSaved ? t('Saved') : t('Tap to save')}`}
      style={{ width: '47%' }}
    >
      <View style={[styles.miniFrame, { backgroundColor: pos.frame }]}>
        <View style={[styles.miniInner, { backgroundColor: colors.surface.card }]}>

          {/* Word + POS badge */}
          <View style={styles.miniHeader}>
            <AppText
              variant="caption"
              style={{ color: pos.wordText, fontFamily: 'SourceSerif4_500Medium', flex: 1, fontSize: 14 }}
              numberOfLines={1}
            >
              {word.word}
            </AppText>
            <View style={[styles.miniPosBadge, { backgroundColor: pos.badge }]}>
              <AppText style={{ color: pos.badgeText, fontSize: 8, fontFamily: 'Inter_500Medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {word.part_of_speech.slice(0, 4)}
              </AppText>
            </View>
          </View>

          {/* Definition */}
          <AppText
            variant="caption"
            style={{ color: colors.text.primary, marginTop: 4, lineHeight: 16 }}
            numberOfLines={3}
          >
            {word.definition}
          </AppText>

          {/* Saved overlay */}
          {isSaved && (
            <View style={[styles.savedOverlay, { backgroundColor: colors.accent.primary }]}>
              <AppText style={{ color: '#FFFFFF', fontSize: 18 }}>✓</AppText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Banner that slides up after the first word is saved.
function TwoThingsBanner({ visible, colors }: { visible: boolean; colors: { accent: { muted: string; primary: string }; text: { primary: string; secondary: string } } }) {
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
      }).start();
    }
  }, [visible, slideAnim]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { backgroundColor: colors.accent.muted, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <AppText style={{ fontSize: 20, marginRight: 10 }}>✦</AppText>
      <AppText variant="caption" style={{ color: colors.text.primary, flex: 1, lineHeight: 18 }}>
        {t(
          'Every word in your library carries a small fact too — a flag, a wonder, an animal. Two small things, learned together.',
        )}
      </AppText>
    </Animated.View>
  );
}

export default function StarterWordsScreen() {
  const { colors } = useTheme();
  const { areas } = useLocalSearchParams<{ areas?: string }>();
  const { session, completeOnboarding } = useAuthStore();

  const [words, setWords] = useState<StarterWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showBanner, setShowBanner] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const selectedAreas = areas ? areas.split(',').filter(Boolean) : [];

  useEffect(() => {
    async function load() {
      let query = supabase
        .from('starter_words')
        .select('id, word, part_of_speech, pronunciation, definition, example_sentence, synonyms')
        .eq('active', true);

      if (selectedAreas.length > 0) {
        query = query.in('interest_area', selectedAreas);
      }

      const { data } = await query.limit(12);
      setWords((data as StarterWord[]) ?? []);
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleWord(word: StarterWord) {
    if (!session) return;
    const isAlreadySaved = savedIds.has(word.id);

    if (isAlreadySaved) {
      // Remove from saved set (we don't actually delete from SQLite since the
      // user hasn't fully committed yet — just deselect in UI).
      setSavedIds(prev => {
        const next = new Set(prev);
        next.delete(word.id);
        return next;
      });
      return;
    }

    // Mark saved in UI immediately for responsiveness.
    setSavedIds(prev => new Set(prev).add(word.id));

    // Show "two small things" banner on the very first save.
    if (savedIds.size === 0) {
      setShowBanner(true);
    }

    // Persist to local SQLite (and enqueue sync).
    try {
      const entry = starterToDictionaryEntry(word);
      await saveWord(session.user.id, entry, 0);
    } catch {
      // If save fails (e.g. duplicate), keep the checked state silently.
      // The word may already exist in the library from a previous session.
    }
  }

  async function handleFinish() {
    setFinishing(true);
    await completeOnboarding(selectedAreas);
    // _layout.tsx watches profile.onboardingCompletedAt and will route to library.
  }

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topRow}>
          <ProgressDots current={3} total={3} />
          <TouchableOpacity
            onPress={handleFinish}
            disabled={finishing}
            accessibilityRole="button"
            accessibilityLabel={t('Skip')}
          >
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {t('Skip')}
            </AppText>
          </TouchableOpacity>
        </View>

        <AppText
          variant="headline"
          style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 6 }}
        >
          {t('Start with a few words.')}
        </AppText>

        <AppText
          variant="caption"
          style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 24, lineHeight: 18 }}
        >
          {t('Tap any word to save it. You can always add more from Search.')}
        </AppText>

        {/* Word grid */}
        {loading ? (
          <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 40 }} />
        ) : words.length === 0 ? (
          <AppText variant="body" style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 40 }}>
            {t('No starter words yet. You can search for words after setup.')}
          </AppText>
        ) : (
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {words.map(word => (
              <MiniCard
                key={word.id}
                word={word}
                isSaved={savedIds.has(word.id)}
                onToggle={() => toggleWord(word)}
              />
            ))}
          </ScrollView>
        )}

        <View style={{ flex: 1 }} />

        {/* "Two small things" banner */}
        <TwoThingsBanner visible={showBanner} colors={colors} />

        {/* Finish */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent.primary, opacity: finishing ? 0.6 : 1 }]}
            onPress={handleFinish}
            disabled={finishing}
            accessibilityRole="button"
            accessibilityLabel={t('Start learning')}
          >
            {finishing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                {savedIds.size > 0
                  ? t(`Save ${savedIds.size} word${savedIds.size === 1 ? '' : 's'} and start`)
                  : t('Start learning')}
              </AppText>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    paddingBottom: 16,
    width: '100%',
  },
  miniFrame: {
    borderRadius: 14,
    padding: 6,
  },
  miniInner: {
    borderRadius: 10,
    padding: 12,
    minHeight: 110,
    overflow: 'hidden',
  },
  miniHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  miniPosBadge: {
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginLeft: 6,
    flexShrink: 0,
  },
  savedOverlay: {
    position: 'absolute',
    inset: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.88,
  },
  banner: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  actions: {
    width: '100%',
    paddingHorizontal: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
