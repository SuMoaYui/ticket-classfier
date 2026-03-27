import { create } from 'zustand';

type Theme = 'light' | 'dark';
type Locale = 'en' | 'es';

interface SettingsState {
  theme: Theme;
  locale: Locale;
  setTheme: (theme: Theme) => void;
  setLocale: (locale: Locale) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: 'dark',
  locale: 'es',

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
    window.electronAPI?.setTheme(theme);
  },

  setLocale: (locale) => {
    set({ locale });
    window.electronAPI?.setLocale(locale);
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    get().setTheme(next);
  },
}));
