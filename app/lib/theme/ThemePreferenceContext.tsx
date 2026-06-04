import React, { createContext, useContext, useState } from 'react';
import type { ThemePreference } from '@/lib/stores/profile';

interface ThemePreferenceContextValue {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  preference: 'system',
  setPreference: () => {},
});

export function ThemePreferenceProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>('system');
  return (
    <ThemePreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference() {
  return useContext(ThemePreferenceContext);
}
