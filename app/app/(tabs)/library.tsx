import { StyleSheet, View, Text } from 'react-native';
import { t } from '@/lib/i18n';

export default function LibraryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>{t('Your saved words will appear here.')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAF8' },
  placeholder: { fontSize: 16, color: '#6B6B6B', fontFamily: 'Inter_400Regular' },
});
