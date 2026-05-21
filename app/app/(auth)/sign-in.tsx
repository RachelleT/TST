import { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Link } from 'expo-router';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/lib/stores/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuthStore();

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert(t('Missing fields'), t('Please enter your email and password.'));
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
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        <Text style={styles.title}>{t('Welcome back')}</Text>
        <Text style={styles.subtitle}>{t('Sign in to your Two Small Things account.')}</Text>

        <TextInput
          style={styles.input}
          placeholder={t('Email')}
          placeholderTextColor="#9A9A9A"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          accessibilityLabel={t('Email address')}
        />
        <TextInput
          style={styles.input}
          placeholder={t('Password')}
          placeholderTextColor="#9A9A9A"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          accessibilityLabel={t('Password')}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
          accessibilityLabel={t('Sign in')}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color="#FAFAF8" />
          ) : (
            <Text style={styles.buttonText}>{t('Sign in')}</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity accessibilityRole="link">
            <Text style={styles.linkText}>{t("Don't have an account? Sign up")}</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: '#FAFAF8' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  title: {
    fontFamily: 'SourceSerif4_600SemiBold',
    fontSize: 32,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#6B6B6B',
    marginBottom: 32,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#F0F0EE',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FAFAF8',
  },
  linkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#6B6B6B',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
