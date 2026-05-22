import { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { SavedWord, PartOfSpeech } from '@tst/shared';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { useTheme } from '@/lib/hooks/useTheme';
import { useSpacing } from '@/lib/theme/spacing';
import { useAuthStore } from '@/lib/stores/auth';
import { useLibraryStore } from '@/lib/stores/library';
import { runSync } from '@/lib/sync';
import { t } from '@/lib/i18n';

function WordRow({ word, onPress }: { word: SavedWord; onPress: () => void }) {
  const { colors } = useTheme();
  const spacing = useSpacing();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.row,
        {
          paddingHorizontal: spacing.pagePadding,
          borderBottomColor: colors.border.subtle,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${word.word}, ${word.partOfSpeech}`}
    >
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <AppText variant="bodyMedium" color={colors.text.primary} style={styles.wordName}>
            {word.word}
          </AppText>
          <Badge pos={word.partOfSpeech as PartOfSpeech} />
        </View>
        <AppText
          variant="caption"
          color={colors.text.secondary}
          numberOfLines={1}
          style={styles.rowDef}
        >
          {word.definition}
        </AppText>
      </View>
      <AppText variant="body" color={colors.text.tertiary} style={styles.chevron}>
        ›
      </AppText>
    </TouchableOpacity>
  );
}

export default function LibraryIndex() {
  const { colors } = useTheme();
  const { session } = useAuthStore();
  const { words, loading, loaded, load } = useLibraryStore();
  const [refreshing, setRefreshing] = useState(false);

  // Load on first focus; reload whenever the tab regains focus
  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      load(session.user.id).catch(console.error);
    }, [session?.user.id]),
  );

  async function handleRefresh() {
    if (!session?.user.id) return;
    setRefreshing(true);
    try {
      await runSync();
      await load(session.user.id);
    } catch (err) {
      console.error('Library refresh failed', err);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading && !loaded) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.surface.page }]}
        edges={['bottom']}
      >
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
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.surface.page }]}
      edges={['bottom']}
    >
      <FlatList
        data={words}
        keyExtractor={(item) => item.id}
        contentContainerStyle={words.length === 0 ? styles.listEmpty : undefined}
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
          <WordRow
            word={item}
            onPress={() => router.push(`/(tabs)/library/${item.id}`)}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowMain: { flex: 1, gap: 3 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  wordName: { flexShrink: 1 },
  rowDef: { flexShrink: 1 },
  chevron: { marginLeft: 8, fontSize: 20 },
});
