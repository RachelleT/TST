import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SavedWord, Fact, PartOfSpeech, FactCategory, FactRegion } from '@tst/shared';
import { WordCard } from '@/components/WordCard';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useLibraryStore } from '@/lib/stores/library';
import { getDb } from '@/lib/db/migrations';
import { removeSavedWord } from '@/lib/actions/save-word';
import { t } from '@/lib/i18n';

interface DetailRow {
  id: string;
  user_id: string;
  word: string;
  sense_index: number;
  part_of_speech: string;
  pronunciation: string | null;
  definition: string;
  example_sentence: string | null;
  synonyms: string | null;
  card_number: number;
  created_at: string;
  updated_at: string;
  fact_id: string | null;
  fact_category: string | null;
  fact_region: string | null;
  fact_name: string | null;
  fact_name_local: string | null;
  fact_illustration_path: string | null;
  fact_sentence: string | null;
  fact_active: number | null;
}

async function fetchDetail(
  wordId: string,
): Promise<{ word: SavedWord; fact?: Fact } | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<DetailRow>(
    `SELECT
       sw.id, sw.user_id, sw.word, sw.sense_index, sw.part_of_speech,
       sw.pronunciation, sw.definition, sw.example_sentence, sw.synonyms,
       sw.card_number, sw.created_at, sw.updated_at,
       f.id           AS fact_id,
       f.category     AS fact_category,
       f.region       AS fact_region,
       f.name         AS fact_name,
       f.name_local   AS fact_name_local,
       f.illustration_path AS fact_illustration_path,
       f.fact_sentence AS fact_sentence,
       f.active        AS fact_active
     FROM saved_words sw
     LEFT JOIN fact_assignments fa ON fa.saved_word_id = sw.id AND fa.deleted = 0
     LEFT JOIN facts f ON f.id = fa.fact_id
     WHERE sw.id = ? AND sw.deleted = 0`,
    [wordId],
  );

  if (!row) return null;

  const word: SavedWord = {
    id: row.id,
    userId: row.user_id,
    word: row.word,
    senseIndex: row.sense_index,
    partOfSpeech: row.part_of_speech as PartOfSpeech,
    pronunciation: row.pronunciation ?? '',
    definition: row.definition,
    exampleSentence: row.example_sentence ?? '',
    synonyms: row.synonyms ? (JSON.parse(row.synonyms) as string[]) : [],
    cardNumber: row.card_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

  const fact: Fact | undefined = row.fact_id
    ? {
        id: row.fact_id,
        category: row.fact_category as FactCategory,
        region: row.fact_region as FactRegion,
        name: row.fact_name!,
        nameLocal: row.fact_name_local ?? undefined,
        illustrationPath: row.fact_illustration_path!,
        factSentence: row.fact_sentence!,
        active: row.fact_active === 1,
      }
    : undefined;

  return { word, fact };
}

export default function WordDetailScreen() {
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { removeWord } = useLibraryStore();

  const [entry, setEntry] = useState<{ word: SavedWord; fact?: Fact } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wordId) return;
    fetchDetail(wordId)
      .then(setEntry)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [wordId]);

  async function handleRemove() {
    if (!entry) return;
    Alert.alert(
      t('Remove word?'),
      t(`"${entry.word.word}" will be removed from your library.`),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            await removeSavedWord(entry.word.id);
            removeWord(entry.word.id);
            router.back();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.surface.page }]}
        edges={['bottom']}
      >
        {/* Set the header title to empty while loading */}
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!entry) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.surface.page }]}
        edges={['bottom']}
      >
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.loadingContainer}>
          <AppText variant="body" color={colors.text.secondary}>
            {t('Word not found.')}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.surface.page }]}
      edges={['bottom']}
    >
      {/* Update header title to the word name once loaded */}
      <Stack.Screen options={{ title: entry.word.word }} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: spacing.pagePadding },
        ]}
      >
        <WordCard
          word={entry.word}
          fact={entry.fact}
          mode="detail"
          saved
          onBookmarkPress={handleRemove}
          style={styles.card}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingTop: 16, paddingBottom: 40 },
  card: {},
});
