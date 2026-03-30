import { create } from 'zustand';
import { LanguageCode, UserProfile } from './types';

interface AppState {
  user: UserProfile | null;
  selectedLanguage: LanguageCode | null;
  setUser: (user: UserProfile | null) => void;
  setSelectedLanguage: (lang: LanguageCode | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  selectedLanguage: null,
  setUser: (user) => set({ user }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
}));
