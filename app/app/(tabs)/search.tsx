import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { IconSearch, IconX } from '@tabler/icons-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
import { ZoneLabel } from '@/components/ZoneLabel';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { t } from '@/lib/i18n';
import { freeDictionary } from '@/lib/dictionary/free-dictionary';
import { DictionaryEntry, DictionarySense, NetworkError } from '@/lib/dictionary/types';
import { getLocalSuggestions, getSuggestions } from '@/lib/spelling';
import { saveWord } from '@/lib/actions/save-word';
import { useLibraryStore } from '@/lib/stores/library';
import { useAuthStore } from '@/lib/stores/auth';
import { getMetaValue, setMetaValue } from '@/lib/db/crud';
import { PartOfSpeech } from '@tst/shared';

type SearchState =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'result'; entry: DictionaryEntry }
  | { tag: 'not_found'; query: string; suggestions: string[] }
  | { tag: 'offline' }
  | { tag: 'error'; query: string };

// ── Single card that shows all senses for a word ──────────────────────────────

// Group senses by POS, preserving the first-seen order of each POS
export function groupByPos(
  senses: DictionarySense[],
): Array<{ pos: PartOfSpeech; senses: DictionarySense[] }> {
  const order: PartOfSpeech[] = [];
  const map = new Map<PartOfSpeech, DictionarySense[]>();
  for (const sense of senses) {
    const pos = sense.partOfSpeech as PartOfSpeech;
    if (!map.has(pos)) {
      order.push(pos);
      map.set(pos, []);
    }
    map.get(pos)!.push(sense);
  }
  return order.map((pos) => ({ pos, senses: map.get(pos)! }));
}

// One card = one POS group. Parent renders one per group.
function SearchResultCard({
  word,
  pronunciation,
  pos,
  senses,
  saved,
  saving,
  onSave,
  onSynonymPress,
}: {
  word: string;
  pronunciation: string | null;
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
        styles.cardFrame,
        {
          backgroundColor: posColors.frame,
          borderRadius: spacing.cardRadiusOuter,
          padding: spacing.frameThickness,
        },
      ]}
    >
      <View
        style={[
          styles.cardInner,
          {
            backgroundColor: colors.surface.card,
            borderRadius: spacing.cardRadiusInner,
            borderColor: colors.border.subtle,
            padding: spacing.cardPadding,
          },
        ]}
      >
        {/* ── Word + pronunciation ── */}
        <View style={styles.wordHeader}>
          <AppText
            variant="display"
            color={posColors.headerText}
            style={styles.wordName}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {word}
          </AppText>
        </View>

        {pronunciation ? (
          <AppText variant="pronunciation" color={colors.text.secondary} style={styles.pronunciation}>
            {pronunciation}
          </AppText>
        ) : null}

        {/* ── POS badge (once for the whole card) ── */}
        <View style={styles.senseHeader}>
          <Badge pos={pos} />
        </View>

        {/* ── Senses (all same POS) ── */}
        {senses.map((sense, senseIdx) => (
          <View key={`${pos}-${senseIdx}`}>
            {senseIdx > 0 && (
              <View style={[styles.senseDivider, { backgroundColor: colors.border.subtle }]} />
            )}

            <View style={styles.zone}>
              <ZoneLabel>
                {senses.length > 1 ? `${t('Definition')} ${senseIdx + 1}` : t('Definition')}
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

        {/* ── Save footer ── */}
        <View style={[styles.cardFooter, { borderTopColor: colors.border.subtle }]}>
          {saved ? (
            <View style={styles.savedRow}>
              <AppText variant="body" color={colors.text.secondary}>
                {t('In your library')}
              </AppText>
              <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
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

// ─────────────────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { q: qParam } = useLocalSearchParams<{ q?: string }>();

  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ tag: 'idle' });
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // Track per-POS-group save state (keyed by the first sense's senseIndex)
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedSenseIndexes, setSavedSenseIndexes] = useState<Set<number>>(new Set());

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { session } = useAuthStore();
  const { isSaved, addWord, load: loadLibrary, loaded } = useLibraryStore();

  useEffect(() => {
    if (session?.user.id && !loaded) {
      loadLibrary(session.user.id).catch(console.error);
    }
    loadRecentSearches();
  }, [session?.user.id]);

  // Navigate-from-outside: e.g. tapping a synonym in the library detail view
  useEffect(() => {
    if (qParam) {
      setQuery(qParam);
      setSavedSenseIndexes(new Set());
      handleSubmit(qParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qParam]);

  async function loadRecentSearches() {
    const raw = await getMetaValue('recent_searches');
    if (raw) setRecentSearches(JSON.parse(raw) as string[]);
  }

  async function persistRecentSearch(word: string, current: string[]) {
    const next = [word, ...current.filter((w) => w !== word)].slice(0, 10);
    setRecentSearches(next);
    await setMetaValue('recent_searches', JSON.stringify(next));
  }

  function handleQueryChange(text: string) {
    setQuery(text);
    setSavedSenseIndexes(new Set());
    if (state.tag !== 'idle') setState({ tag: 'idle' });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLocalSuggestions(getLocalSuggestions(text));
    }, 300);
  }

  const handleSubmit = useCallback(
    async (word: string) => {
      const q = word.trim();
      if (!q) return;
      Keyboard.dismiss();
      setState({ tag: 'loading' });
      setLocalSuggestions([]);

      try {
        const entry = await freeDictionary.lookup(q);
        if (!entry) {
          setState({ tag: 'not_found', query: q, suggestions: getSuggestions(q) });
        } else {
          await persistRecentSearch(entry.word, recentSearches);
          setState({ tag: 'result', entry });
        }
      } catch (err) {
        if (err instanceof NetworkError) {
          setState({ tag: 'offline' });
        } else {
          setState({ tag: 'error', query: q });
        }
      }
    },
    [recentSearches],
  );

  async function handleSave(senses: DictionarySense[]) {
    if (state.tag !== 'result' || !session?.user.id) return;
    const primaryIndex = senses[0].senseIndex;
    setSavingIndex(primaryIndex);
    try {
      // Save every sense in the POS group so the library shows all definitions
      for (const sense of senses) {
        const saved = await saveWord(session.user.id, state.entry, sense.senseIndex);
        addWord(saved);
      }
      setSavedSenseIndexes((prev) => new Set([...prev, primaryIndex]));
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSavingIndex(null);
    }
  }

  function handleSynonymSearch(word: string) {
    setQuery(word);
    handleSubmit(word);
  }

  function handleClear() {
    setQuery('');
    setState({ tag: 'idle' });
    setLocalSuggestions([]);
    setSavedSenseIndexes(new Set());
    inputRef.current?.focus();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Search bar ── */}
        <View
          style={[
            styles.barRow,
            {
              paddingHorizontal: spacing.pagePadding,
              borderBottomColor: colors.border.subtle,
            },
          ]}
        >
          <IconSearch size={18} stroke={colors.text.secondary} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={handleQueryChange}
            onSubmitEditing={() => handleSubmit(query)}
            placeholder={t('Search for a word…')}
            placeholderTextColor={colors.text.tertiary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { color: colors.text.primary }]}
            accessibilityLabel={t('Search for a word')}
          />
          {query.length > 0 && (
            <TouchableOpacity
              onPress={handleClear}
              accessibilityLabel={t('Clear search')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconX size={18} stroke={colors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── As-you-type local suggestions ── */}
        {localSuggestions.length > 0 && state.tag === 'idle' && (
          <FlatList
            data={localSuggestions}
            keyExtractor={(item, index) => `${item}-${index}`}
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.suggestionRow, { borderBottomColor: colors.border.subtle }]}
                onPress={() => { setQuery(item); handleSubmit(item); }}
                accessibilityRole="button"
                accessibilityLabel={item}
              >
                <AppText variant="body" color={colors.text.primary}>{item}</AppText>
              </TouchableOpacity>
            )}
          />
        )}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing.pagePadding }]}
        >
          {/* ── Idle: recent searches or hint ── */}
          {state.tag === 'idle' && localSuggestions.length === 0 &&
            (recentSearches.length > 0 ? (
              <View>
                <AppText variant="meta" color={colors.text.tertiary} style={styles.sectionLabel}>
                  {t('Recent')}
                </AppText>
                {recentSearches.map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.recentRow, { borderBottomColor: colors.border.subtle }]}
                    onPress={() => { setQuery(w); handleSubmit(w); }}
                    accessibilityRole="button"
                    accessibilityLabel={w}
                  >
                    <AppText variant="body" color={colors.text.primary}>{w}</AppText>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <AppText variant="body" color={colors.text.secondary} style={styles.hint}>
                {t('Try searching for a word.')}
              </AppText>
            ))}

          {/* ── Loading ── */}
          {state.tag === 'loading' && (
            <ActivityIndicator
              color={colors.accent.primary}
              style={styles.spinner}
              accessibilityLabel={t('Looking up word')}
            />
          )}

          {/* ── Result: one card per POS group ── */}
          {state.tag === 'result' && (
            <View style={styles.cardsStack}>
              {groupByPos(state.entry.senses).map(({ pos, senses }) => {
                const primaryIdx = senses[0].senseIndex;
                return (
                  <SearchResultCard
                    key={pos}
                    word={state.entry.word}
                    pronunciation={state.entry.pronunciation ?? null}
                    pos={pos}
                    senses={senses}
                    saved={isSaved(state.entry.word, primaryIdx) || savedSenseIndexes.has(primaryIdx)}
                    saving={savingIndex === primaryIdx}
                    onSave={() => handleSave(senses)}
                    onSynonymPress={handleSynonymSearch}
                  />
                );
              })}
            </View>
          )}

          {/* ── Not found ── */}
          {state.tag === 'not_found' && (
            <View style={styles.emptySection}>
              <AppText variant="body" color={colors.text.secondary}>
                {t(`No results for "${state.query}".`)}
              </AppText>
              {state.suggestions.length > 0 && (
                <View style={styles.didYouMean}>
                  <AppText variant="body" color={colors.text.secondary}>
                    {t('Did you mean: ')}
                  </AppText>
                  <View style={styles.suggestionChips}>
                    {state.suggestions.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => { setQuery(s); handleSubmit(s); }}
                        accessibilityRole="button"
                        accessibilityLabel={`Search for ${s}`}
                      >
                        <AppText variant="bodyMedium" color={colors.accent.primary}>{s}</AppText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ── Offline ── */}
          {state.tag === 'offline' && (
            <View style={styles.emptySection}>
              <AppText variant="body" color={colors.text.secondary}>
                {t('No connection. Check your network and try again.')}
              </AppText>
              <Button
                label={t('Try again')}
                variant="ghost"
                onPress={() => handleSubmit(query)}
                style={styles.retryBtn}
              />
            </View>
          )}

          {/* ── Error ── */}
          {state.tag === 'error' && (
            <View style={styles.emptySection}>
              <AppText variant="body" color={colors.text.secondary}>
                {t("We couldn't reach the dictionary. Try again?")}
              </AppText>
              <Button
                label={t('Try again')}
                variant="ghost"
                onPress={() => handleSubmit(state.query)}
                style={styles.retryBtn}
              />
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    paddingVertical: 0,
  },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  sectionLabel: { marginBottom: 8 },
  hint: { marginTop: 4 },
  recentRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  spinner: { marginTop: 40 },

  // Card frame (matches WordCard)
  cardFrame: {},
  cardInner: {
    borderWidth: 0.5,
    overflow: 'hidden',
    gap: 10,
  },
  wordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordName: { flex: 1 },
  pronunciation: {},

  cardsStack: { gap: 16 },

  // Per-sense layout
  senseDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  senseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zone: { gap: 4 },
  defText: { lineHeight: 22 },
  sentenceZone: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 6,
    borderRadius: 2,
    gap: 2,
  },
  sentenceText: { fontStyle: 'italic' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {},

  // Empty states
  emptySection: { gap: 12, marginTop: 4 },
  didYouMean: { gap: 6 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  retryBtn: { alignSelf: 'flex-start' },
});
