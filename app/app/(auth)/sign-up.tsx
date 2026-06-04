import { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth';
import {
  emailError,
  checkPassword,
  passwordStrength,
  isPasswordAcceptable,
  STRENGTH_LABEL,
  STRENGTH_COLOR,
  type PasswordRequirement,
} from '@/lib/validation';

// ── Password strength UI ──────────────────────────────────────────────────────

function PasswordStrengthIndicator({ requirements }: { requirements: PasswordRequirement[] }) {
  const { colors } = useTheme();
  const strength = passwordStrength(requirements);
  const metCount = requirements.filter(r => r.met).length;
  const color = STRENGTH_COLOR[strength];

  return (
    <View style={styles.strengthWrapper}>
      {/* Bar */}
      <View style={styles.strengthBarRow}>
        {requirements.map((_, i) => (
          <View
            key={i}
            style={[
              styles.strengthSegment,
              {
                backgroundColor: i < metCount ? color : colors.border.subtle,
              },
            ]}
          />
        ))}
        <AppText
          variant="caption"
          style={{ color, fontFamily: 'Inter_500Medium', marginLeft: 8, minWidth: 44 }}
        >
          {STRENGTH_LABEL[strength]}
        </AppText>
      </View>

      {/* Requirements checklist */}
      <View style={styles.requirementsList}>
        {requirements.map(req => (
          <View key={req.key} style={styles.requirementRow}>
            <AppText
              style={{
                fontSize: 12,
                color: req.met ? STRENGTH_COLOR.strong : colors.text.tertiary,
                marginRight: 6,
                lineHeight: 18,
              }}
            >
              {req.met ? '✓' : '○'}
            </AppText>
            <AppText
              variant="caption"
              style={{
                color: req.met ? colors.text.secondary : colors.text.tertiary,
                lineHeight: 18,
              }}
            >
              {t(req.label)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const { colors } = useTheme();
  const { signUp } = useAuthStore();

  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailErr = emailTouched ? emailError(email) : null;
  const passwordReqs = checkPassword(password);
  const passwordOk = isPasswordAcceptable(passwordReqs);
  const showStrength = password.length > 0;
  const canSubmit = !loading && !emailError(email) && passwordOk;

  async function handleSignUp() {
    // Touch email to surface any error.
    setEmailTouched(true);
    if (emailError(email)) return;
    if (!passwordOk) return;

    setLoading(true);
    try {
      const { needsConfirmation } = await signUp(email.trim(), password);
      if (needsConfirmation) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        router.replace({ pathname: '/(auth)/verify-email' as any, params: { email: email.trim() } });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Something went wrong.');
      Alert.alert(t('Sign up failed'), message);
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText variant="headline" style={{ color: colors.text.primary, marginBottom: 8 }}>
            {t('Create your account')}
          </AppText>
          <AppText variant="body" style={{ color: colors.text.secondary, marginBottom: 32 }}>
            {t('Free. No ads. Your words, your library.')}
          </AppText>

          {/* Email */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface.elevated,
                color: colors.text.primary,
                borderColor: emailErr ? '#DC2626' : colors.border.subtle,
              },
            ]}
            placeholder={t('Email')}
            placeholderTextColor={colors.text.tertiary}
            value={email}
            onChangeText={v => { setEmail(v); if (!emailTouched) setEmailTouched(false); }}
            onBlur={() => setEmailTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            accessibilityLabel={t('Email address')}
          />
          {emailErr && (
            <AppText variant="caption" style={styles.fieldError}>
              {t(emailErr)}
            </AppText>
          )}

          {/* Password */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.surface.elevated,
                color: colors.text.primary,
                borderColor:
                  passwordFocused && !passwordOk && password.length > 0
                    ? '#D97706'
                    : colors.border.subtle,
                marginTop: emailErr ? 4 : 12,
              },
            ]}
            placeholder={t('Password')}
            placeholderTextColor={colors.text.tertiary}
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry
            autoComplete="new-password"
            accessibilityLabel={t('Password')}
          />

          {/* Strength indicator — shown as soon as the user starts typing */}
          {showStrength && (
            <PasswordStrengthIndicator requirements={passwordReqs} />
          )}

          <AppText
            variant="caption"
            style={{ color: colors.text.tertiary, marginTop: 16, marginBottom: 24, lineHeight: 16 }}
          >
            {t('By creating an account you agree to our Terms of Service and Privacy Policy.')}
          </AppText>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent.primary, opacity: canSubmit ? 1 : 0.45 },
            ]}
            onPress={handleSignUp}
            disabled={!canSubmit}
            accessibilityLabel={t('Create account')}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                {t('Create account')}
              </AppText>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity accessibilityRole="link" style={styles.linkRow}>
              <AppText variant="caption" style={{ color: colors.text.secondary, textDecorationLine: 'underline' }}>
                {t('Already have an account? Sign in')}
              </AppText>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    borderRadius: 10,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 2,
  },
  fieldError: {
    color: '#DC2626',
    marginBottom: 4,
    marginLeft: 2,
  },
  strengthWrapper: {
    marginTop: 8,
    marginBottom: 4,
  },
  strengthBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 3,
  },
  requirementsList: {
    gap: 2,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
