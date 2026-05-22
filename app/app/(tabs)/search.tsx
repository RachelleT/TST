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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { IconSearch, IconX } from '@tabler/icons-react-native';
import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Chip } from '@/components/Chip';
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

// ── Definition card shown for each sense in the search result ─────────────────

function SenseCard({
  sense,
  index,
  total,
  saved,
  saving,
  onSave,
}: {
  sense: DictionarySense;
  index: number;
  total: number;
  saved: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { colors } = useTheme();
  const posColors = colors.pos[sense.partOfSpeech as PartOfSpeech];

  // Number within its POS group (only shown when same POS appears multiple times)
  const label = total > 1 ? `${index + 1}` : null;

  return (
    <View
      style={[
        styles.senseCard,
        {
          backgroundColor: colors.surface.card,
          borderColor: colors.border.subtle,
          borderLeftColor: posColors.frame,
        },
      ]}
    >
      {/* POS badge + number */}
      <View style={styles.senseCardHeader}>
        <Badge pos={sense.partOfSpeech as PartOfSpeech} />
        {label ? (
          <AppText variant="meta" color={colors.text.tertiary}>
            {label}
          </AppText>
        ) : null}
      </View>

      {/* Definition */}
      <AppText variant="body" color={colors.text.primary} style={styles.defText}>
        {sense.definition}
      </AppText>

      {/* Example sentence */}
      {sense.exampleSentence ? (
        <View
          style={[
            styles.exampleBlock,
            {
              backgroundColor: posColors.sentenceBg,
              borderLeftColor: posColors.sentenceBorder,
            },
          ]}
        >
          <AppText variant="caption" color={colors.text.primary} style={styles.exampleText}>
            {sense.exampleSentence}
          </AppText>
        </View>
      ) : null}

      {/* Synonyms */}
      {sense.synonyms.length > 0 ? (
        <View style={styles.synonymRow}>
          <AppText variant="meta" color={colors.text.tertiary} style={styles.synonymLabel}>
            {t('Similar:')}
          </AppText>
          <View style={styles.chips}>
            {sense.synonyms.slice(0, 6).map((syn) => (
              <Chip key={syn} label={syn} pos={sense.partOfSpeech as PartOfSpeech} />
            ))}
          </View>
        </View>
      ) : null}

      {/* Save / already saved */}
      {saved ? (
        <View style={styles.savedRow}>
          <AppText variant="caption" color={colors.text.secondary}>
            {t('In your library')}
          </AppText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
            <AppText variant="caption" color={colors.accent.primary}>
              {t('View →')}
            </AppText>
          </TouchableOpacity>
        </View>
      ) : (
        <Button
          label={t('Save')}
          loading={saving}
          onPress={onSave}
          style={styles.saveBtn}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const { colors } = useTheme();
  const spacing = useSpacing();

  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ tag: 'idle' });
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  // Track which senseIndexes are saving / have been saved this session
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [savedSenses, setSavedSenses] = useState<Set<number>>(new Set());

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
    setSavedSenses(new Set());
    setSavingIndex(null);
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
      setState({ tag: 'loading' });
      setLocalSuggestions([]);
      setSavedSenses(new Set());
      setSavingIndex(null);

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

  async function handleSave(senseIndex: number) {
    if (state.tag !== 'result' || !session?.user.id) return;
    const { entry } = state;
    setSavingIndex(senseIndex);
    try {
      const saved = await saveWord(session.user.id, entry, senseIndex);
      addWord(saved);
      setSavedSenses((prev) => new Set(prev).add(senseIndex));
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setSavingIndex(null);
    }
  }

  function handleClear() {
    setQuery('');
    setState({ tag: 'idle' });
    setLocalSuggestions([]);
    setSavedSenses(new Set());
    setSavingIndex(null);
    inputRef.current?.focus();
  }

  // Group senses by POS so we know each sense's rank within its group
  function getSenseRank(senses: DictionarySense[], index: number): { rank: number; total: number } {
    const pos = senses[index].partOfSpeech;
    const group = senses.filter((s) => s.partOfSpeech === pos);
    const rank = senses.slice(0, index).filter((s) => s.partOfSpeech === pos).length;
    return { rank, total: group.length };
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
            keyExtractor={(item) => item}
            style={{ maxHeight: 200 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.suggestionRow,
                  { borderBottomColor: colors.border.subtle },
                ]}
                onPress={() => {
                  setQuery(item);
                  handleSubmit(item);
                }}
                accessibilityRole="button"
                accessibilityLabel={item}
              >
                <AppText variant="body" color={colors.text.primary}>
                  {item}
                </AppText>
              </TouchableOpacity>
            )}
          />
        )}

        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingHorizontal: spacing.pagePadding },
          ]}
        >
          {/* ── Idle: recent searches or hint ── */}
          {state.tag === 'idle' && localSuggestions.length === 0 &&
            (recentSearches.length > 0 ? (
              <View>
                <AppText
                  variant="meta"
                  color={colors.text.tertiary}
                  style={styles.sectionLabel}
                >
                  {t('Recent')}
                </AppText>
                {recentSearches.map((w) => (
                  <TouchableOpacity
                    key={w}
                    style={[
                      styles.recentRow,
                      { borderBottomColor: colors.border.subtle },
                    ]}
                    onPress={() => {
                      setQuery(w);
                      handleSubmit(w);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={w}
                  >
                    <AppText variant="body" color={colors.text.primary}>
                      {w}
                    </AppText>
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

          {/* ── Result: word header + all definitions ── */}
          {state.tag === 'result' && (
            <View style={styles.resultWrapper}>
              {/* Word name + pronunciation */}
              <View style={styles.wordHeader}>
                <AppText variant="display" color={colors.text.primary}>
                  {state.entry.word}
                </AppText>
                {state.entry.pronunciation ? (
                  <AppText variant="pronunciation" color={colors.text.secondary} style={styles.pronunciation}>
                    {state.entry.pronunciation}
                  </AppText>
                ) : null}
              </View>

              {/* One SenseCard per definition */}
              {state.entry.senses.map((sense, i) => {
                const { rank, total } = getSenseRank(state.entry.senses, i);
                const alreadySaved = isSaved(state.entry.word, sense.senseIndex);
                const justSaved = savedSenses.has(sense.senseIndex);
                return (
                  <SenseCard
                    key={i}
                    sense={sense}
                    index={rank}
                    total={total}
                    saved={alreadySaved || justSaved}
                    saving={savingIndex === sense.senseIndex}
                    onSave={() => handleSave(sense.senseIndex)}
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
                        onPress={() => {
                          setQuery(s);
                          handleSubmit(s);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Search for ${s}`}
                      >
                        <AppText variant="bodyMedium" color={colors.accent.primary}>
                          {s}
                        </AppText>
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

  // Result
  resultWrapper: { gap: 12 },
  wordHeader: { marginBottom: 4 },
  pronunciation: { marginTop: 2 },

  // Sense card
  senseCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    padding: 16,
    gap: 10,
  },
  senseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  defText: {
    lineHeight: 22,
  },
  exampleBlock: {
    borderLeftWidth: 2,
    paddingLeft: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  exampleText: {
    fontStyle: 'italic',
  },
  synonymRow: {
    gap: 6,
  },
  synonymLabel: {},
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  saveBtn: {},

  // Empty states
  emptySection: { gap: 12, marginTop: 4 },
  didYouMean: { gap: 6 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  retryBtn: { alignSelf: 'flex-start' },
});
