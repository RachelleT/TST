import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';
import { emailError, isValidEmail } from '@/lib/validation';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    const trimmed = email.trim();
    const err = emailError(trimmed);
    if (err) {
      setError(t(err));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        // Deep-link back into the app. Needs the `tst` scheme registered in app.config.ts
        // and the URL configured in Supabase → Authentication → URL Configuration.
        redirectTo: 'tst://reset-password',
      });
      if (supabaseError) {
        setError(supabaseError.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>

          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backRow}
            accessibilityRole="button"
            accessibilityLabel={t('Back')}
          >
            <AppText variant="caption" style={{ color: colors.accent.primary }}>
              ← {t('Back')}
            </AppText>
          </TouchableOpacity>

          {sent ? (
            /* ── Confirmation state ── */
            <View style={styles.centred}>
              <AppText style={{ fontSize: 40, marginBottom: 20 }}>✉️</AppText>
              <AppText
                variant="headline"
                style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 12 }}
              >
                {t('Check your inbox')}
              </AppText>
              <AppText
                variant="body"
                style={{ color: colors.text.secondary, textAlign: 'center', lineHeight: 24 }}
              >
                {t(
                  'We sent a password reset link to'
                )} {email.trim()}.{'\n'}{t('The link expires in one hour.')}
              </AppText>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent.primary, marginTop: 36 }]}
                onPress={() => router.replace('/(auth)/sign-in')}
                accessibilityRole="button"
              >
                <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                  {t('Back to sign in')}
                </AppText>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Request state ── */
            <>
              <AppText
                variant="headline"
                style={{ color: colors.text.primary, marginBottom: 8 }}
              >
                {t('Reset your password')}
              </AppText>
              <AppText
                variant="body"
                style={{ color: colors.text.secondary, marginBottom: 32, lineHeight: 24 }}
              >
                {t("Enter the email you signed up with and we'll send you a reset link.")}
              </AppText>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface.elevated,
                    color: colors.text.primary,
                    borderColor: error ? '#DC2626' : colors.border.subtle,
                  },
                ]}
                placeholder={t('Email')}
                placeholderTextColor={colors.text.tertiary}
                value={email}
                onChangeText={v => { setEmail(v); setError(null); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoFocus
                accessibilityLabel={t('Email address')}
              />

              {error && (
                <AppText
                  variant="caption"
                  style={{ color: '#DC2626', marginBottom: 12, marginTop: -4 }}
                >
                  {error}
                </AppText>
              )}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: colors.accent.primary, opacity: (loading || !isValidEmail(email)) ? 0.45 : 1 }]}
                onPress={handleSend}
                disabled={loading || !isValidEmail(email)}
                accessibilityRole="button"
                accessibilityLabel={t('Send reset link')}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                    {t('Send reset link')}
                  </AppText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backRow: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderRadius: 10,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
});
