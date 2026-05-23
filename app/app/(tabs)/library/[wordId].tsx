import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { IconBookmarkFilled } from '@tabler/icons-react-native';
import { SavedWord, Fact, PartOfSpeech, FactCategory, FactRegion } from '@tst/shared';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { ZoneLabel } from '@/components/ZoneLabel';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useLibraryStore } from '@/lib/stores/library';
import { getDb } from '@/lib/db/migrations';
import { removeSavedWord } from '@/lib/actions/save-word';
import { freeDictionary } from '@/lib/dictionary/free-dictionary';
import { DictionarySense } from '@/lib/dictionary/types';
import { t } from '@/lib/i18n';

// ─── DB types ────────────────────────────────────────────────────────────────

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

function rowToEntry(row: DetailRow): { word: SavedWord; fact?: Fact } {
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

async function fetchWordGroup(
  wordId: string,
  userId: string,
): Promise<Array<{ word: SavedWord; fact?: Fact }>> {
  const db = await getDb();

  const target = await db.getFirstAsync<{ word: string }>(
    `SELECT word FROM saved_words WHERE id = ? AND deleted = 0`,
    [wordId],
  );
  if (!target) return [];

  const rows = await db.getAllAsync<DetailRow>(
    `SELECT
       sw.id, sw.user_id, sw.word, sw.sense_index, sw.part_of_speech,
       sw.pronunciation, sw.definition, sw.example_sentence, sw.synonyms,
       sw.card_number, sw.created_at, sw.updated_at,
       f.id                AS fact_id,
       f.category          AS fact_category,
       f.region            AS fact_region,
       f.name              AS fact_name,
       f.name_local        AS fact_name_local,
       f.illustration_path AS fact_illustration_path,
       f.fact_sentence     AS fact_sentence,
       f.active            AS fact_active
     FROM saved_words sw
     LEFT JOIN fact_assignments fa ON fa.saved_word_id = sw.id AND fa.deleted = 0
     LEFT JOIN facts f ON f.id = fa.fact_id
     WHERE sw.user_id = ? AND sw.word = ? AND sw.deleted = 0
     ORDER BY sw.sense_index ASC`,
    [userId, target.word],
  );

  return rows.map(rowToEntry);
}

// ─── Card (matches SearchResultCard layout exactly) ───────────────────────────

interface PosGroup {
  pos: PartOfSpeech;
  /** SQLite rows for this POS — used for card number and remove actions. */
  sqliteEntries: Array<{ word: SavedWord; fact?: Fact }>;
  /**
   * Senses to display — from the live dictionary API when online,
   * otherwise built from the SQLite rows (may be just one sense).
   */
  sensesToShow: DictionarySense[];
}

function PosGroupCard({
  group,
  wordName,
  pronunciation,
  onRemove,
  onSynonymPress,
}: {
  group: PosGroup;
  wordName: string;
  pronunciation: string;
  onRemove: () => void;
  onSynonymPress: (word: string) => void;
}) {
  const { colors } = useTheme();
  const spacing = useSpacing();

  const pos = group.pos;
  const posColors = colors.pos[pos];
  const cardNumber = group.sqliteEntries[0].word.cardNumber;

  const allSynonyms = [
    ...new Set(group.sensesToShow.flatMap((s) => s.synonyms)),
  ].slice(0, 8);

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
        {/* ── Word + pronunciation ── */}
        <AppText
          variant="display"
          color={posColors.headerText}
          style={styles.wordText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {wordName}
        </AppText>

        {pronunciation ? (
          <AppText variant="pronunciation" color={colors.text.secondary} style={styles.pronunciation}>
            {pronunciation}
          </AppText>
        ) : null}

        {/* ── POS badge ── */}
        <View style={styles.badgeRow}>
          <Badge pos={pos} />
        </View>

        {/* ── Definitions (one per sense, numbered when >1) ── */}
        {group.sensesToShow.map((sense, idx) => (
          <View key={`${sense.senseIndex}-${idx}`}>
            {idx > 0 && (
              <View style={[styles.senseDivider, { backgroundColor: colors.border.subtle }]} />
            )}

            <View style={styles.zone}>
              <ZoneLabel>
                {group.sensesToShow.length > 1
                  ? `${t('Definition')} ${idx + 1}`
                  : t('Definition')}
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
          </View>
        ))}

        {/* ── Synonyms ── */}
        {allSynonyms.length > 0 ? (
          <View style={styles.zone}>
            <ZoneLabel>{t('Synonyms')}</ZoneLabel>
            <View style={styles.chips}>
              {allSynonyms.map((syn, synIdx) => (
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

        {/* ── Footer ── */}
        <View style={[styles.footer, { borderTopColor: colors.border.subtle }]}>
          <AppText variant="cardNumber" color={colors.text.tertiary}>
            {`№ ${String(cardNumber).padStart(3, '0')}`}
          </AppText>
          <IconButton
            icon={<IconBookmarkFilled size={20} stroke={posColors.frame} />}
            onPress={onRemove}
            accessibilityLabel={t('Remove from library')}
          />
        </View>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WordDetailScreen() {
  const { wordId } = useLocalSearchParams<{ wordId: string }>();
  const { colors } = useTheme();
  const spacing = useSpacing();
  const { session } = useAuthStore();
  const { removeWord } = useLibraryStore();

  const [entries, setEntries] = useState<Array<{ word: SavedWord; fact?: Fact }>>([]);
  const [posGroups, setPosGroups] = useState<PosGroup[]>([]);
  const [pronunciation, setPronunciation] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wordId || !session?.user.id) return;

    (async () => {
      try {
        const sqliteEntries = await fetchWordGroup(wordId, session.user.id);
        setEntries(sqliteEntries);

        if (sqliteEntries.length === 0) return;

        const wordText = sqliteEntries[0].word.word;
        const savedPronunciation = sqliteEntries[0].word.pronunciation;

        // Group SQLite entries by POS
        const sqliteByPos = new Map<PartOfSpeech, Array<{ word: SavedWord; fact?: Fact }>>();
        for (const entry of sqliteEntries) {
          const pos = entry.word.partOfSpeech;
          if (!sqliteByPos.has(pos)) sqliteByPos.set(pos, []);
          sqliteByPos.get(pos)!.push(entry);
        }

        // Try to fetch fresh definitions from the API
        let apiSensesByPos: Map<PartOfSpeech, DictionarySense[]> | null = null;
        let apiPronunciation = '';
        try {
          const apiEntry = await freeDictionary.lookup(wordText);
          if (apiEntry) {
            apiPronunciation = apiEntry.pronunciation;
            apiSensesByPos = new Map<PartOfSpeech, DictionarySense[]>();
            for (const sense of apiEntry.senses) {
              const pos = sense.partOfSpeech as PartOfSpeech;
              if (!apiSensesByPos.has(pos)) apiSensesByPos.set(pos, []);
              apiSensesByPos.get(pos)!.push(sense);
            }
          }
        } catch {
          // Offline — fall back to SQLite data below
        }

        setPronunciation(apiPronunciation || savedPronunciation);

        // Build one PosGroup per saved POS, using API senses when available
        const groups: PosGroup[] = [];
        for (const [pos, saved] of sqliteByPos) {
          const apiSenses = apiSensesByPos?.get(pos) ?? null;

          // Fall back: build DictionarySense-shaped objects from SQLite rows
          const fallbackSenses: DictionarySense[] = saved.map((e) => ({
            senseIndex: e.word.senseIndex,
            partOfSpeech: e.word.partOfSpeech as PartOfSpeech,
            definition: e.word.definition,
            exampleSentence: e.word.exampleSentence,
            synonyms: e.word.synonyms,
          }));

          groups.push({
            pos,
            sqliteEntries: saved,
            sensesToShow: apiSenses ?? fallbackSenses,
          });
        }

        setPosGroups(groups);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [wordId, session?.user.id]);

  async function handleRemoveGroup(group: PosGroup) {
    const wordText = group.sqliteEntries[0].word.word;
    Alert.alert(
      t('Remove word?'),
      t(`"${wordText} (${group.pos})" will be removed from your library.`),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Remove'),
          style: 'destructive',
          onPress: async () => {
            for (const entry of group.sqliteEntries) {
              await removeSavedWord(entry.word.id);
              removeWord(entry.word.id);
            }
            const remaining = entries.filter((e) => e.word.partOfSpeech !== group.pos);
            setEntries(remaining);
            setPosGroups((prev) => prev.filter((g) => g.pos !== group.pos));
            if (remaining.length === 0) router.back();
          },
        },
      ],
    );
  }

  const wordName = entries[0]?.word.word ?? '';

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (entries.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
        <Stack.Screen options={{ title: '' }} />
        <View style={styles.center}>
          <AppText variant="body" color={colors.text.secondary}>
            {t('Word not found.')}
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
      <Stack.Screen options={{ title: wordName }} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingHorizontal: spacing.pagePadding },
        ]}
      >
        {posGroups.map((group) => (
          <PosGroupCard
            key={group.pos}
            group={group}
            wordName={wordName}
            pronunciation={pronunciation}
            onRemove={() => handleRemoveGroup(group)}
            onSynonymPress={(syn) =>
              router.push({ pathname: '/(tabs)/library/lookup', params: { q: syn } })
            }
          />
        ))}
      </ScrollView>
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
  senseDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    marginTop: 4,
    paddingTop: 12,
  },
});
