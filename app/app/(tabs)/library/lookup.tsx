/**
 * Word lookup screen — lives inside the library stack so the OS back button
 * returns to wherever the user came from (word detail, previous lookup, etc.).
 *
 * Reached by tapping a synonym chip in the library word detail, or recursively
 * from another lookup screen's synonym chips.
 */

import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { PartOfSpeech } from '@tst/shared';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ZoneLabel } from '@/components/ZoneLabel';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useLibraryStore } from '@/lib/stores/library';
import { freeDictionary } from '@/lib/dictionary/free-dictionary';
import { DictionaryEntry, DictionarySense } from '@/lib/dictionary/types';
import { saveWord } from '@/lib/actions/save-word';
import { groupByPos } from '@/app/(tabs)/search';
import { t } from '@/lib/i18n';

// ─── Result card (identical layout to SearchResultCard) ───────────────────────

function LookupCard({
  entry,
  pos,
  senses,
  saved,
  saving,
  onSave,
  onSynonymPress,
}: {
  entry: DictionaryEntry;
  pos: PartOfSpeech;
  senses: DictionarySense[];
  saved: boolean;
  saving: boolean;
  onSave: () => void;
  onSynonymPress: (word: string) => void;
}) {
  const { colors } = useTheme();
  const spacing = useSpacing();
  const posColors = colors.pos[pos];

  return (
    <View
      style={[
        styles.frame,
        {
          backgroundColor: posColors.frame,
          borderRadius: spacing.cardRadiusOuter,
          padding: spacing.frameThickness,
        },
      ]}
    >
      <View
        style={[
          styles.inner,
          {
            backgroundColor: colors.surface.card,
            borderRadius: spacing.cardRadiusInner,
            borderColor: colors.border.subtle,
            padding: spacing.cardPadding,
          },
        ]}
      >
        {/* Word + pronunciation */}
        <AppText
          variant="display"
          color={posColors.headerText}
          style={styles.wordText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {entry.word}
        </AppText>

        {entry.pronunciation ? (
          <AppText variant="pronunciation" color={colors.text.secondary} style={styles.pronunciation}>
            {entry.pronunciation}
          </AppText>
        ) : null}

        {/* POS badge */}
        <View style={styles.badgeRow}>
          <Badge pos={pos} />
        </View>

        {/* Definitions */}
        {senses.map((sense, idx) => (
          <View key={`${sense.senseIndex}-${idx}`}>
            {idx > 0 && (
              <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />
            )}

            <View style={styles.zone}>
              <ZoneLabel>
                {senses.length > 1 ? `${t('Definition')} ${idx + 1}` : t('Definition')}
              </ZoneLabel>
              <AppText variant="body" color={colors.text.primary} style={styles.defText}>
                {sense.definition}
              </AppText>
            </View>

            {sense.exampleSentence ? (
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
                <AppText variant="caption" color={colors.text.primary} style={styles.sentenceText}>
                  {sense.exampleSentence}
                </AppText>
              </View>
            ) : null}

            {sense.synonyms.length > 0 ? (
              <View style={styles.zone}>
                <ZoneLabel>{t('Synonyms')}</ZoneLabel>
                <View style={styles.chips}>
                  {sense.synonyms.slice(0, 6).map((syn, synIdx) => (
                    <Chip
                      key={`${syn}-${synIdx}`}
                      label={syn}
                      pos={pos}
                      onPress={() => onSynonymPress(syn)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        ))}

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border.subtle }]}>
          {saved ? (
            <View style={styles.savedRow}>
              <AppText variant="body" color={colors.text.secondary}>
                {t('In your library')}
              </AppText>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/library')}
                accessibilityRole="button"
              >
                <AppText variant="bodyMedium" color={posColors.frame}>
                  {t('View')}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <Button
              label={t('Save to library')}
              loading={saving}
              onPress={onSave}
              color={posColors.frame}
              style={styles.saveBtn}
            />
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LookupScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { session } = useAuthStore();
  const { isSaved, addWord } = useLibraryStore();

  type State =
    | { tag: 'loading' }
    | { tag: 'result'; entry: DictionaryEntry }
    | { tag: 'not_found' }
    | { tag: 'error' };

  const [state, setState] = useState<State>({ tag: 'loading' });
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedSenseIndexes, setSavedSenseIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!q) { setState({ tag: 'not_found' }); return; }
    setState({ tag: 'loading' });
    setSavedSenseIndexes(new Set());
    freeDictionary
      .lookup(q)
      .then((entry) => setState(entry ? { tag: 'result', entry } : { tag: 'not_found' }))
      .catch(() => setState({ tag: 'error' }));
  }, [q]);

  async function handleSave(entry: DictionaryEntry, senses: DictionarySense[]) {
    if (!session?.user.id) return;
    const primaryIndex = senses[0].senseIndex;
    setSavingIndex(primaryIndex);
    try {
      for (const sense of senses) {
        const saved = await saveWord(session.user.id, entry, sense.senseIndex);
        addWord(saved);
      }
      setSavedSenseIndexes((prev) => new Set([...prev, primaryIndex]));
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSavingIndex(null);
    }
  }

  function handleSynonymPress(word: string) {
    // Push another lookup within the same library stack → back button works
    router.push({ pathname: '/(tabs)/library/lookup', params: { q: word } });
  }

  const wordTitle = state.tag === 'result' ? state.entry.word : q ?? '';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
      <Stack.Screen options={{ title: wordTitle }} />

      {state.tag === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      )}

      {state.tag === 'not_found' && (
        <View style={styles.center}>
          <AppText variant="body" color={colors.text.secondary}>
            {t('Word not found.')}
          </AppText>
        </View>
      )}

      {state.tag === 'error' && (
        <View style={styles.center}>
          <AppText variant="body" color={colors.text.secondary}>
            {t('Could not load the word. Check your connection.')}
          </AppText>
        </View>
      )}

      {state.tag === 'result' && (
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: spacing.pagePadding },
          ]}
        >
          {groupByPos(state.entry.senses).map(({ pos, senses }) => {
            const primaryIdx = senses[0].senseIndex;
            const isWordSaved =
              isSaved(state.entry.word, primaryIdx) ||
              savedSenseIndexes.has(primaryIdx);

            return (
              <LookupCard
                key={pos}
                entry={state.entry}
                pos={pos}
                senses={senses}
                saved={isWordSaved}
                saving={savingIndex === primaryIdx}
                onSave={() => handleSave(state.entry, senses)}
                onSynonymPress={handleSynonymPress}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 16, paddingBottom: 40, gap: 16 },
  frame: {},
  inner: { borderWidth: 0.5, overflow: 'hidden' },
  wordText: { marginBottom: 2 },
  pronunciation: { marginBottom: 8 },
  badgeRow: { marginBottom: 14 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  zone: { gap: 6, marginBottom: 14 },
  defText: {},
  sentenceZone: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 8,
    marginBottom: 14,
    borderRadius: 2,
    gap: 4,
  },
  sentenceText: { fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  footer: {
    borderTopWidth: 0.5,
    marginTop: 4,
    paddingTop: 12,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: { alignSelf: 'stretch' },
});
