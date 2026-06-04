import { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAuthStore } from '@/lib/stores/auth';
import { t } from '@/lib/i18n';

// ── 6-box OTP input ─────────────────────────────────────────────────────────

interface OtpInputProps {
  onComplete: (code: string) => void;
  disabled: boolean;
  error: boolean;
}

function OtpInput({ onComplete, disabled, error }: OtpInputProps) {
  const { colors } = useTheme();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const refs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  function handleChange(index: number, value: string) {
    // Handle paste: SMS autofill or manual paste of a 6-digit string.
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 6) {
      const pasted = cleaned.split('');
      setDigits(pasted);
      refs.current[5]?.focus();
      onComplete(cleaned);
      return;
    }

    // Normal single digit — take the last character typed (handles replacement).
    const digit = cleaned.slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);

    if (digit && index < 5) {
      refs.current[index + 1]?.focus();
    }

    if (next.every(d => d !== '')) {
      onComplete(next.join(''));
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === 'Backspace') {
      if (digits[index]) {
        // Clear current box
        const next = [...digits];
        next[index] = '';
        setDigits(next);
      } else if (index > 0) {
        // Move back and clear previous box
        const next = [...digits];
        next[index - 1] = '';
        setDigits(next);
        refs.current[index - 1]?.focus();
      }
    }
  }

  const boxBorder = error ? '#DC2626' : colors.border.subtle;
  const boxActiveBorder = error ? '#DC2626' : colors.accent.primary;

  return (
    <View style={styles.otpRow} accessibilityLabel={t('Enter 6-digit code')}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={r => { refs.current[i] = r; }}
          value={digit}
          onChangeText={v => handleChange(i, v)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
          keyboardType="number-pad"
          maxLength={6}   // 6 allows paste of full code
          selectTextOnFocus
          editable={!disabled}
          accessibilityLabel={t(`Digit ${i + 1} of 6`)}
          style={[
            styles.otpBox,
            {
              backgroundColor: colors.surface.elevated,
              color: colors.text.primary,
              borderColor: digit ? boxActiveBorder : boxBorder,
              fontFamily: 'JetBrainsMono_400Regular',
              fontSize: 22,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function VerifyEmailScreen() {
  const { colors } = useTheme();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { verifyEmailOtp, resendVerificationEmail } = useAuthStore();

  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCodeComplete(code: string) {
    if (!email || verifying) return;
    setError(null);
    setVerifying(true);
    try {
      await verifyEmailOtp(email, code);
      // Success — onAuthStateChange fires SIGNED_IN, _layout.tsx routes to onboarding.
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('That code didn\'t work. Check it and try again.'),
      );
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email || resending) return;
    setError(null);
    setResending(true);
    try {
      await resendVerificationEmail(email);
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Could not resend. Try again.'));
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <View style={styles.container}>

        <AppText style={styles.emoji}>✉️</AppText>

        <AppText
          variant="headline"
          style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 10 }}
        >
          {t('Check your email')}
        </AppText>

        <AppText
          variant="body"
          style={{ color: colors.text.secondary, textAlign: 'center', lineHeight: 24, marginBottom: 4 }}
        >
          {t('We sent a 6-digit code to')}
        </AppText>
        {email ? (
          <AppText
            variant="bodyMedium"
            style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 32 }}
          >
            {email}
          </AppText>
        ) : null}

        {/* Code input */}
        <OtpInput
          onComplete={handleCodeComplete}
          disabled={verifying}
          error={!!error}
        />

        {/* Status */}
        <View style={styles.statusArea}>
          {verifying && (
            <View style={styles.verifyingRow}>
              <ActivityIndicator color={colors.accent.primary} size="small" />
              <AppText variant="caption" style={{ color: colors.text.secondary, marginLeft: 8 }}>
                {t('Verifying…')}
              </AppText>
            </View>
          )}
          {error && !verifying && (
            <AppText
              variant="caption"
              style={{ color: '#DC2626', textAlign: 'center' }}
              accessibilityRole="alert"
            >
              {error}
            </AppText>
          )}
        </View>

        {/* Spam hint */}
        <View style={[styles.hintBox, { backgroundColor: colors.surface.elevated, borderColor: colors.border.subtle }]}>
          <AppText variant="caption" style={{ color: colors.text.secondary, textAlign: 'center', lineHeight: 18 }}>
            {t("Can't find it? Check your spam folder. The code expires in 1 hour.")}
          </AppText>
        </View>

        <View style={{ flex: 1 }} />

        {/* Resend */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            {
              borderColor: resent ? colors.accent.primary : colors.border.subtle,
              backgroundColor: resent ? colors.accent.muted : 'transparent',
            },
          ]}
          onPress={handleResend}
          disabled={resending || resent || verifying}
          accessibilityRole="button"
          accessibilityLabel={t('Resend code')}
        >
          {resending ? (
            <ActivityIndicator color={colors.accent.primary} />
          ) : (
            <AppText
              variant="body"
              style={{ color: resent ? colors.accent.primary : colors.text.secondary }}
            >
              {resent ? t('✓ New code sent') : t('Resend code')}
            </AppText>
          )}
        </TouchableOpacity>

        {/* Back */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => router.replace('/(auth)/sign-in')}
          accessibilityRole="link"
        >
          <AppText variant="caption" style={{ color: colors.text.tertiary }}>
            {t('Wrong email? Back to sign in')}
          </AppText>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 52,
    marginBottom: 20,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: 10,
    borderWidth: 1.5,
    textAlign: 'center',
  },
  statusArea: {
    height: 28,
    justifyContent: 'center',
    marginBottom: 20,
  },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hintBox: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resendButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  backLink: {
    paddingVertical: 10,
  },
});
