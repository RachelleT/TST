import { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';

function ProgressDots({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor:
                i === current - 1 ? colors.accent.primary : colors.border.subtle,
              width: i === current - 1 ? 20 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

function BellIllustration({ colors }: { colors: { accent: { primary: string; muted: string } } }) {
  return (
    <View style={[styles.bellOuter, { backgroundColor: colors.accent.muted }]}>
      <AppText style={{ fontSize: 48 }}>🔔</AppText>
    </View>
  );
}

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const [requesting, setRequesting] = useState(false);

  async function handleAllow() {
    setRequesting(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Notifications.requestPermissionsAsync();
        // We don't block progress regardless of the user's choice.
        // The status is stored by the OS; we can check it later in Settings.
        void status;
      }
    } catch {
      // Permission errors are non-fatal; proceed to the next step.
    } finally {
      setRequesting(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push('/(onboarding)/interests' as any);
    }
  }

  function handleSkip() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push('/(onboarding)/interests' as any);
  }

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topRow}>
          <ProgressDots current={1} total={3} />
          <TouchableOpacity onPress={handleSkip} accessibilityRole="button" accessibilityLabel={t('Skip')}>
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {t('Skip')}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Illustration */}
        <View style={styles.illustrationArea}>
          <BellIllustration colors={colors} />
        </View>

        {/* Copy */}
        <AppText
          variant="headline"
          style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}
        >
          {t('Stay in the habit.')}
        </AppText>

        <AppText
          variant="body"
          style={{ color: colors.text.secondary, textAlign: 'center', lineHeight: 24 }}
        >
          {t(
            'TST sends three gentle daily reminders to help words stick. No buzzing, no badges — just a quiet nudge.',
          )}
        </AppText>

        <AppText
          variant="caption"
          style={{ color: colors.text.tertiary, textAlign: 'center', marginTop: 16, lineHeight: 18 }}
        >
          {t('You can change this at any time in Settings.')}
        </AppText>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
            onPress={handleAllow}
            disabled={requesting}
            accessibilityRole="button"
            accessibilityLabel={t('Turn on reminders')}
          >
            <AppText variant="bodyMedium" style={{ color: '#FFFFFF', opacity: requesting ? 0.6 : 1 }}>
              {t('Turn on reminders')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostButton}
            onPress={handleSkip}
            accessibilityRole="button"
            accessibilityLabel={t('Not now')}
          >
            <AppText variant="body" style={{ color: colors.text.secondary }}>
              {t('Not now')}
            </AppText>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  illustrationArea: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ghostButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
