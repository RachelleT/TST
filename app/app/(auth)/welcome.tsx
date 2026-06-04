import { View, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';

// A small mock card shown at an angle — the "being handed to you" moment.
function TiltedCard({ isDark }: { isDark: boolean }) {
  const cardBg       = isDark ? '#252B26' : '#FFFFFF';
  const frameBg      = isDark ? '#5C7B66' : '#2F5240'; // adjective frame, dark/light
  const wordColor    = isDark ? '#EFC860' : '#3D2400'; // adjective headerText — light in dark mode
  const secondaryColor = isDark ? '#A8B0A6' : '#6B7568';
  const tertiaryColor  = isDark ? '#7A847B' : '#8A9088';
  const bodyColor    = isDark ? '#F4F0E6' : '#1A2520'; // definition + sentence text
  const sentenceBg   = isDark ? '#2A2115' : '#FDF3E0';
  const borderColor  = isDark ? '#3A413B' : '#E5E0D2';

  return (
    <View style={[styles.tiltWrapper, { transform: [{ rotate: '-7deg' }] }]}>
      {/* Colored frame */}
      <View style={[styles.frame, { backgroundColor: frameBg }]}>
        {/* Inner card */}
        <View style={[styles.innerCard, { backgroundColor: cardBg, borderColor }]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <AppText
              variant="title"
              style={{ color: wordColor, flex: 1 }}
            >
              {t('eloquent')}
            </AppText>
            <View style={[styles.posBadge, { backgroundColor: '#EF9F27' }]}>
              <AppText variant="meta" style={{ color: '#3D2400', fontSize: 9 }}>
                {t('adj')}
              </AppText>
            </View>
          </View>

          {/* Pronunciation */}
          <AppText variant="pronunciation" style={{ color: secondaryColor, marginTop: 2 }}>
            el·o·quent
          </AppText>

          {/* Definition */}
          <AppText variant="meta" style={{ color: tertiaryColor, marginTop: 10 }}>
            {t('DEFINITION')}
          </AppText>
          <AppText variant="caption" style={{ color: bodyColor, marginTop: 3, lineHeight: 18 }}>
            {t('Fluent and persuasive in speaking or writing.')}
          </AppText>

          {/* Example sentence */}
          <View style={[styles.sentence, { backgroundColor: sentenceBg, borderColor: '#D4A050' }]}>
            <AppText variant="meta" style={{ color: tertiaryColor }}>
              {t('IN A SENTENCE')}
            </AppText>
            <AppText variant="caption" style={{ color: bodyColor, fontStyle: 'italic', marginTop: 2 }}>
              {t('She gave an eloquent speech.')}
            </AppText>
          </View>

          {/* Footer */}
          <View style={[styles.cardFooter, { borderTopColor: borderColor }]}>
            <AppText variant="cardNumber" style={{ color: tertiaryColor }}>
              № 001
            </AppText>
            <AppText style={{ color: isDark ? '#7CA890' : '#2F5240', fontSize: 16 }}>♥</AppText>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function WelcomeScreen() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <View style={[styles.container, isTablet && styles.containerTablet]}>

        {/* Wordmark */}
        <AppText
          variant="meta"
          style={{ color: colors.accent.primary, letterSpacing: 3, marginBottom: 40 }}
        >
          TST
        </AppText>

        {/* Tilted card illustration */}
        <View style={styles.cardArea}>
          <TiltedCard isDark={isDark} />
        </View>

        {/* Headline */}
        <AppText
          variant="display"
          style={{ color: colors.text.primary, textAlign: 'center', marginTop: 48 }}
        >
          {t('Every word teaches two things.')}
        </AppText>

        <AppText
          variant="body"
          style={{ color: colors.text.secondary, textAlign: 'center', marginTop: 12, lineHeight: 24 }}
        >
          {t('A definition to know it. A small fact from the world to remember it.')}
        </AppText>

        {/* Three loops — brief */}
        <View style={styles.loops}>
          {[
            { icon: '🔍', label: t('Search & save words you want to learn.') },
            { icon: '🔔', label: t('Gentle daily reminders surface them over time.') },
            { icon: '✎',  label: t('Short quizzes test what actually stuck.') },
          ].map(({ icon, label }) => (
            <View key={label} style={styles.loopRow}>
              <AppText style={{ fontSize: 18, marginRight: 12, color: colors.text.primary }}>
                {icon}
              </AppText>
              <AppText variant="caption" style={{ color: colors.text.secondary, flex: 1, lineHeight: 18 }}>
                {label}
              </AppText>
            </View>
          ))}
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
            onPress={() => router.push('/(auth)/sign-up')}
            accessibilityRole="button"
            accessibilityLabel={t('Create account')}
          >
            <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
              {t('Create account')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/sign-in')}
            accessibilityRole="button"
            accessibilityLabel={t('Sign in to existing account')}
          >
            <AppText variant="body" style={{ color: colors.text.secondary }}>
              {t('I already have an account')}
            </AppText>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerTablet: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  cardArea: {
    height: 220,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tiltWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  frame: {
    borderRadius: 18,
    padding: 8,
    width: 220,
  },
  innerCard: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    // borderColor is set inline so it responds to dark mode
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  posBadge: {
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginLeft: 8,
  },
  sentence: {
    marginTop: 8,
    borderRadius: 6,
    borderLeftWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E0D2',
  },
  loops: {
    marginTop: 28,
    width: '100%',
    gap: 12,
  },
  loopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actions: {
    width: '100%',
    marginTop: 36,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
