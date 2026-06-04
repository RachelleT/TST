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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth';
import { emailError, isValidEmail } from '@/lib/validation';

export default function SignInScreen() {
  const { colors } = useTheme();
  const { signIn } = useAuthStore();

  const [email, setEmail]             = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword]       = useState('');
  const [loading, setLoading]         = useState(false);

  const emailErr = emailTouched ? emailError(email) : null;
  const canSubmit = !loading && isValidEmail(email) && password.length > 0;

  async function handleSignIn() {
    setEmailTouched(true);
    if (emailError(email)) return;
    if (!password) {
      Alert.alert(t('Missing password'), t('Please enter your password.'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Something went wrong.');
      Alert.alert(t('Sign in failed'), message);
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

          <AppText variant="headline" style={{ color: colors.text.primary, marginBottom: 8 }}>
            {t('Welcome back')}
          </AppText>
          <AppText variant="body" style={{ color: colors.text.secondary, marginBottom: 36 }}>
            {t('Sign in to your TST account.')}
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
            onChangeText={v => { setEmail(v); }}
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
                borderColor: colors.border.subtle,
                marginTop: emailErr ? 4 : 0,
              },
            ]}
            placeholder={t('Password')}
            placeholderTextColor={colors.text.tertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            accessibilityLabel={t('Password')}
          />

          <TouchableOpacity
            onPress={() => router.push('/(auth)/forgot-password' as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
            style={styles.forgotRow}
            accessibilityRole="link"
            accessibilityLabel={t('Forgot password')}
          >
            <AppText variant="caption" style={{ color: colors.accent.primary }}>
              {t('Forgot password?')}
            </AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: colors.accent.primary, opacity: canSubmit ? 1 : 0.45 },
            ]}
            onPress={handleSignIn}
            disabled={!canSubmit}
            accessibilityLabel={t('Sign in')}
            accessibilityRole="button"
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
                {t('Sign in')}
              </AppText>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity accessibilityRole="link" style={styles.linkRow}>
              <AppText variant="caption" style={{ color: colors.text.secondary, textDecorationLine: 'underline' }}>
                {t("Don't have an account? Sign up")}
              </AppText>
            </TouchableOpacity>
          </Link>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
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
    marginBottom: 8,
    marginLeft: 2,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    marginTop: 6,
    marginBottom: 8,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
