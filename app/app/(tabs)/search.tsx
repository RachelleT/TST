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
import { WordCard } from '@/components/WordCard';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { t } from '@/lib/i18n';
import { freeDictionary } from '@/lib/dictionary/free-dictionary';
import { DictionaryEntry, NetworkError } from '@/lib/dictionary/types';
import { getLocalSuggestions, getSuggestions } from '@/lib/spelling';
import { saveWord } from '@/lib/actions/save-word';
import { useLibraryStore } from '@/lib/stores/library';
import { useAuthStore } from '@/lib/stores/auth';
import { getMetaValue, setMetaValue } from '@/lib/db/crud';
import { SavedWord } from '@tst/shared';

type SearchState =
  | { tag: 'idle' }
  | { tag: 'loading' }
  | { tag: 'result'; entry: DictionaryEntry; senseIndex: number }
  | { tag: 'not_found'; query: string; suggestions: string[] }
  | { tag: 'offline' }
  | { tag: 'error'; query: string }
  | { tag: 'saving'; entry: DictionaryEntry; senseIndex: number };

function entryToPreviewWord(entry: DictionaryEntry, senseIndex: number): SavedWord {
  const sense = entry.senses[senseIndex];
  return {
    id: '__preview__',
    userId: '',
    word: entry.word,
    senseIndex,
    partOfSpeech: sense.partOfSpeech,
    pronunciation: entry.pronunciation,
    definition: sense.definition,
    exampleSentence: sense.exampleSentence,
    synonyms: sense.synonyms,
    cardNumber: 0,
    createdAt: '',
    updatedAt: '',
  };
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const spacing = useSpacing();

  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ tag: 'idle' });
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [justSaved, setJustSaved] = useState(false);

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
    setJustSaved(false);
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
      setJustSaved(false);

      try {
        const entry = await freeDictionary.lookup(q);
        if (!entry) {
          setState({ tag: 'not_found', query: q, suggestions: getSuggestions(q) });
        } else {
          await persistRecentSearch(entry.word, recentSearches);
          setState({ tag: 'result', entry, senseIndex: 0 });
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

  async function handleSave() {
    if (state.tag !== 'result' || !session?.user.id) return;
    const { entry, senseIndex } = state;
    setState({ tag: 'saving', entry, senseIndex });
    try {
      const saved = await saveWord(session.user.id, entry, senseIndex);
      addWord(saved);
      setJustSaved(true);
      setState({ tag: 'result', entry, senseIndex });
    } catch (err) {
      console.error('Save failed', err);
      setState({ tag: 'result', entry, senseIndex });
    }
  }

  function handleClear() {
    setQuery('');
    setState({ tag: 'idle' });
    setLocalSuggestions([]);
    setJustSaved(false);
    inputRef.current?.focus();
  }

  const resultState =
    state.tag === 'result' || state.tag === 'saving' ? state : null;
  const currentEntry = resultState?.entry ?? null;
  const currentSenseIndex = resultState?.senseIndex ?? 0;
  const alreadySaved =
    currentEntry !== null && isSaved(currentEntry.word, currentSenseIndex);

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

          {/* ── Result ── */}
          {currentEntry && (
            <View style={styles.resultWrapper}>
              {currentEntry.senses.length > 1 && (
                <View style={styles.senseRow}>
                  {currentEntry.senses.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.senseChip,
                        {
                          backgroundColor:
                            i === currentSenseIndex
                              ? colors.accent.primary
                              : colors.surface.elevated,
                        },
                      ]}
                      onPress={() =>
                        state.tag === 'result'
                          ? setState({ tag: 'result', entry: currentEntry, senseIndex: i })
                          : undefined
                      }
                      accessibilityRole="button"
                      accessibilityLabel={s.partOfSpeech}
                    >
                      <AppText
                        variant="meta"
                        color={
                          i === currentSenseIndex
                            ? colors.surface.page
                            : colors.text.secondary
                        }
                      >
                        {s.partOfSpeech}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <WordCard
                word={entryToPreviewWord(currentEntry, currentSenseIndex)}
                mode="preview"
                saved={alreadySaved || justSaved}
                style={styles.card}
              />

              {alreadySaved || justSaved ? (
                <View style={styles.savedRow}>
                  <AppText variant="body" color={colors.text.secondary}>
                    {t('Already in your library.')}
                  </AppText>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/library')}>
                    <AppText variant="bodyMedium" color={colors.accent.primary}>
                      {t('View')}
                    </AppText>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  label={t('Save to library')}
                  onPress={handleSave}
                  loading={state.tag === 'saving'}
                  style={styles.saveBtn}
                />
              )}
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
  resultWrapper: { gap: 12 },
  card: {},
  senseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  senseChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  saveBtn: {},
  emptySection: { gap: 12, marginTop: 4 },
  didYouMean: { gap: 6 },
  suggestionChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  retryBtn: { alignSelf: 'flex-start' },
});
