import { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { SavedWord, Fact, PartOfSpeech, FactCategory, FactRegion } from '@tst/shared';
import { AppText } from '@/components/AppText';
import { WordCard } from '@/components/WordCard';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useLibraryStore } from '@/lib/stores/library';
import { getDb } from '@/lib/db/migrations';
import { runnSyncIfStale } from '@/lib/sync';
import { removeSavedWord } from '@/lib/actions/save-word';
import { t } from '@/lib/i18n';

// Raw row returned by the JOIN query
interface LibraryRow {
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
  // Fact columns (null when no fact assigned)
  fact_id: string | null;
  fact_category: string | null;
  fact_region: string | null;
  fact_name: string | null;
  fact_name_local: string | null;
  fact_illustration_path: string | null;
  fact_sentence: string | null;
  fact_active: number | null;
}

function rowToEntry(row: LibraryRow): { word: SavedWord; fact?: Fact } {
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

async function fetchEntries(userId: string): Promise<{ word: SavedWord; fact?: Fact }[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LibraryRow>(
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
     WHERE sw.user_id = ? AND sw.deleted = 0
     ORDER BY sw.created_at DESC`,
    [userId],
  );
  return rows.map(rowToEntry);
}

export default function LibraryScreen() {
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { session } = useAuthStore();
  const { removeWord } = useLibraryStore();

  const [entries, setEntries] = useState<{ word: SavedWord; fact?: Fact }[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Reload whenever this tab comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      setLoading(true);
      fetchEntries(session.user.id)
        .then(setEntries)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [session?.user.id]),
  );

  async function handleRefresh() {
    if (!session?.user.id) return;
    setRefreshing(true);
    try {
      await runnSyncIfStale();
      const fresh = await fetchEntries(session.user.id);
      setEntries(fresh);
    } catch (err) {
      console.error('Library refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRemove(wordId: string) {
    try {
      await removeSavedWord(wordId);
      removeWord(wordId);
      setEntries((prev) => prev.filter((e) => e.word.id !== wordId));
    } catch (err) {
      console.error('Remove failed', err);
    }
  }

  // Full-screen loader only on first load (no words yet in state)
  if (loading && entries.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.accent.primary}
            accessibilityLabel={t('Loading library')}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.word.id}
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: spacing.pagePadding },
          entries.length === 0 && styles.listEmpty,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <AppText variant="title" color={colors.text.secondary} style={styles.emptyTitle}>
              {t('No words yet')}
            </AppText>
            <AppText variant="body" color={colors.text.tertiary} style={styles.emptyBody}>
              {t('Search for a word and save it to start building your library.')}
            </AppText>
          </View>
        }
        renderItem={({ item }) => (
          <WordCard
            word={item.word}
            fact={item.fact}
            mode="detail"
            saved
            onBookmarkPress={() => handleRemove(item.word.id)}
            style={styles.card}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingTop: 16, paddingBottom: 40, gap: 16 },
  listEmpty: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: { textAlign: 'center' },
  emptyBody: { textAlign: 'center' },
  card: {},
});
