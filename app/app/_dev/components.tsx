import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { IconButton } from '@/components/IconButton';
import { WordCard } from '@/components/WordCard';
import { ZoneLabel } from '@/components/ZoneLabel';
import { useTheme } from '@/lib/hooks/useTheme';
import { PartOfSpeech, SavedWord, Fact } from '@tst/shared';
import { IconStar } from '@tabler/icons-react-native';

const ALL_POS: PartOfSpeech[] = [
  'noun', 'verb', 'adjective', 'adverb',
  'preposition',
];

const SAMPLE_WORD: SavedWord = {
  id: '1',
  userId: 'u1',
  word: 'ephemeral',
  senseIndex: 0,
  partOfSpeech: 'adjective',
  definition: 'Lasting for a very short time; transitory.',
  pronunciation: '/ɪˈfɛm.ər.əl/',
  exampleSentence: 'The beauty of cherry blossoms is ephemeral, lasting only a week.',
  synonyms: ['fleeting', 'transient', 'brief', 'momentary', 'short-lived'],
  cardNumber: 7,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SAMPLE_FACT: Fact = {
  id: 'f1',
  name: 'Mayfly lifespan',
  factSentence: 'Mayflies live as adults for less than 24 hours — the shortest adult lifespan of any insect.',
  category: 'animal',
  region: 'global',
  illustrationPath: '',
  active: true,
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <AppText variant="title" color={colors.text.primary} style={styles.sectionTitle}>
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border.subtle }]} />;
}

export default function ComponentsScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <AppText variant="display" color={colors.text.primary} style={styles.pageTitle}>
          Component Gallery
        </AppText>

        {/* ── Typography ── */}
        <Section title="Typography">
          {(['display', 'title', 'body', 'bodyMedium', 'caption', 'meta', 'pronunciation', 'cardNumber'] as const).map((v) => (
            <AppText key={v} variant={v} color={colors.text.primary}>
              {v}: The quick brown fox
            </AppText>
          ))}
          <AppText variant="body" color={colors.text.secondary}>Secondary color text</AppText>
          <AppText variant="body" color={colors.text.tertiary}>Tertiary color text</AppText>
        </Section>

        <Divider />

        {/* ── ZoneLabel ── */}
        <Section title="ZoneLabel">
          <ZoneLabel>Definition</ZoneLabel>
          <ZoneLabel>In a sentence</ZoneLabel>
          <ZoneLabel>Similar</ZoneLabel>
        </Section>

        <Divider />

        {/* ── Badges ── */}
        <Section title="Badges — all POS">
          <View style={styles.row}>
            {ALL_POS.map((pos) => (
              <Badge key={pos} pos={pos} />
            ))}
          </View>
        </Section>

        <Divider />

        {/* ── Chips ── */}
        <Section title="Chips">
          <View style={styles.row}>
            {(['fleeting', 'transient', 'brief', 'momentary'] as const).map((w) => (
              <Chip key={w} label={w} pos="adjective" />
            ))}
          </View>
          <View style={styles.row}>
            {(['run', 'sprint', 'dash'] as const).map((w) => (
              <Chip key={w} label={w} pos="verb" />
            ))}
          </View>
        </Section>

        <Divider />

        {/* ── Buttons ── */}
        <Section title="Buttons">
          <Button label="Primary" onPress={() => {}} variant="primary" style={styles.btn} />
          <Button label="Secondary" onPress={() => {}} variant="secondary" style={styles.btn} />
          <Button label="Ghost" onPress={() => {}} variant="ghost" style={styles.btn} />
          <Button label="Loading" onPress={() => {}} loading style={styles.btn} />
          <Button label="Disabled" onPress={() => {}} disabled style={styles.btn} />
          <Button
            label="With icon"
            onPress={() => {}}
            icon={<IconStar size={18} stroke={colors.surface.page} />}
            style={styles.btn}
          />
        </Section>

        <Divider />

        {/* ── IconButton ── */}
        <Section title="IconButton">
          <View style={styles.row}>
            <IconButton
              icon={<IconStar size={20} stroke={colors.text.primary} />}
              onPress={() => {}}
              accessibilityLabel="Favourite"
            />
          </View>
        </Section>

        <Divider />

        {/* ── WordCard: all 8 POS, preview mode ── */}
        <Section title="WordCard — all POS (preview)">
          {ALL_POS.map((pos) => (
            <WordCard
              key={pos}
              word={{ ...SAMPLE_WORD, partOfSpeech: pos, word: pos }}
              fact={SAMPLE_FACT}
              mode="preview"
              saved
              style={styles.card}
            />
          ))}
        </Section>

        <Divider />

        {/* ── WordCard: detail mode ── */}
        <Section title="WordCard — detail mode">
          <WordCard
            word={SAMPLE_WORD}
            fact={SAMPLE_FACT}
            mode="detail"
            saved
            style={styles.card}
          />
        </Section>

        <Divider />

        {/* ── WordCard: unsaved ── */}
        <Section title="WordCard — unsaved">
          <WordCard
            word={SAMPLE_WORD}
            mode="preview"
            saved={false}
            style={styles.card}
          />
        </Section>

        <Divider />

        {/* ── WordCard: no fact ── */}
        <Section title="WordCard — no fact">
          <WordCard
            word={SAMPLE_WORD}
            mode="preview"
            saved
            style={styles.card}
          />
        </Section>

        <Divider />

        {/* ── WordCard: minimal (no sentence, no synonyms) ── */}
        <Section title="WordCard — minimal">
          <WordCard
            word={{
              ...SAMPLE_WORD,
              exampleSentence: '',
              synonyms: [],
              pronunciation: '',
            }}
            mode="preview"
            saved
            style={styles.card}
          />
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 16, gap: 0 },
  pageTitle: { marginBottom: 24 },
  section: { paddingVertical: 16, gap: 8 },
  sectionTitle: { marginBottom: 4 },
  divider: { height: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btn: { alignSelf: 'flex-start' },
  card: { marginBottom: 12 },
});
