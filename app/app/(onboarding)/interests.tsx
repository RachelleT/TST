import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/lib/hooks/useTheme';
import { t } from '@/lib/i18n';

interface InterestArea {
  id: string;
  label: string;
}

const MAX_AREAS_SHOWN = 5;
const VARIETY_ID = 'variety';

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

export default function InterestsScreen() {
  const { colors } = useTheme();
  const [areas, setAreas] = useState<InterestArea[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('interest_areas')
        .select('id, label')
        .eq('active', true)
        .order('sort_order');

      if (!data) { setLoading(false); return; }

      const rows = data as InterestArea[];

      // Always include "variety"; fill remaining slots from the rest, randomized.
      const variety = rows.find(r => r.id === VARIETY_ID);
      const rest = rows.filter(r => r.id !== VARIETY_ID);

      // Shuffle rest
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }

      const shown = [
        ...(variety ? [variety] : []),
        ...rest.slice(0, MAX_AREAS_SHOWN - (variety ? 1 : 0)),
      ];

      setAreas(shown);
      setLoading(false);
    }
    load();
  }, []);

  function toggleArea(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleContinue() {
    const selectedArray = Array.from(selected);
    // Pass selected areas as a comma-separated param so starter-words can use them.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/(onboarding)/starter-words' as any, params: { areas: selectedArray.join(',') } });
  }

  function handleSkip() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push({ pathname: '/(onboarding)/starter-words' as any, params: { areas: '' } });
  }

  return (
    <SafeAreaView style={[styles.outer, { backgroundColor: colors.surface.page }]}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.topRow}>
          <ProgressDots current={2} total={3} />
          <TouchableOpacity onPress={handleSkip} accessibilityRole="button" accessibilityLabel={t('Skip')}>
            <AppText variant="caption" style={{ color: colors.text.tertiary }}>
              {t('Skip')}
            </AppText>
          </TouchableOpacity>
        </View>

        <AppText
          variant="headline"
          style={{ color: colors.text.primary, textAlign: 'center', marginBottom: 8 }}
        >
          {t('What kind of words do you want to learn?')}
        </AppText>

        <AppText
          variant="caption"
          style={{ color: colors.text.secondary, textAlign: 'center', marginBottom: 32, lineHeight: 18 }}
        >
          {t('Choose as many as you like. You can change this later.')}
        </AppText>

        {/* Interest pills */}
        {loading ? (
          <ActivityIndicator color={colors.accent.primary} style={{ marginTop: 32 }} />
        ) : (
          <ScrollView
            contentContainerStyle={styles.pillsContainer}
            showsVerticalScrollIndicator={false}
          >
            {areas.map(area => {
              const isSelected = selected.has(area.id);
              return (
                <TouchableOpacity
                  key={area.id}
                  onPress={() => toggleArea(area.id)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isSelected ? colors.accent.muted : colors.surface.elevated,
                      borderColor: isSelected ? colors.accent.primary : colors.border.subtle,
                      borderWidth: isSelected ? 1.5 : 0.5,
                    },
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={area.label}
                >
                  <AppText
                    variant="bodyMedium"
                    style={{
                      color: isSelected ? colors.accent.primary : colors.text.primary,
                    }}
                  >
                    {t(area.label)}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={{ flex: 1 }} />

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.accent.primary }]}
            onPress={handleContinue}
            accessibilityRole="button"
            accessibilityLabel={t('Continue')}
          >
            <AppText variant="bodyMedium" style={{ color: '#FFFFFF' }}>
              {t('Continue')}
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
    marginBottom: 32,
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
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  pill: {
    borderRadius: 99,
    paddingHorizontal: 20,
    paddingVertical: 12,
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
});
