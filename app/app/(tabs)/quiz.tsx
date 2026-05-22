import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';

export default function QuizScreen() {
  const { colors } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.surface.page }]} edges={['bottom']}>
      <View style={styles.container}>
        <AppText variant="body" color={colors.text.secondary}>
          {t('Save at least 5 words to start a quiz.')}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
