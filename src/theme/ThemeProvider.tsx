import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { dark, light, type Theme } from './tokens';

export type ThemePref = 'system' | 'light' | 'dark';

interface ThemePrefState {
  pref: ThemePref;
  setPref: (p: ThemePref) => void;
}

/** Preferencia manual de Ajustes; "system" sigue al celular. */
export const useThemePref = create<ThemePrefState>()(
  persist((set) => ({ pref: 'system', setPref: (pref) => set({ pref }) }), {
    name: 'kalma-theme',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

const ThemeContext = createContext<Theme>({ scheme: 'light', c: light });

export function ThemeProvider({ children, forceScheme }: { children: ReactNode; forceScheme?: 'light' | 'dark' }) {
  const system = useColorScheme();
  const pref = useThemePref((s) => s.pref);
  const scheme = forceScheme ?? (pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref);
  const value = useMemo<Theme>(() => ({ scheme, c: scheme === 'dark' ? dark : light }), [scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
