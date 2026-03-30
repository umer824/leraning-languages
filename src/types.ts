export type LanguageCode = 'en' | 'hi' | 'ur' | 'es' | 'fr' | 'ar' | 'zh' | 'pt' | 'ru' | 'ja';

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
];

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  selectedLanguage: LanguageCode;
  xp: number;
  dailyXp: number;
  dailyGoal: number;
  level: number;
  unlockedLevels: string[];
  streak: number;
  lastActive: string;
  exerciseStats?: Record<string, { weight: number; lastAttempted: string }>;
}

export type ExerciseType = 'multiple_choice' | 'translation' | 'matching' | 'picture_choice';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  question: string;
  explanation?: string;
}

export interface MultipleChoiceExercise extends BaseExercise {
  type: 'multiple_choice';
  options: string[];
  correctAnswer: string;
}

export interface TranslationExercise extends BaseExercise {
  type: 'translation';
  correctAnswer: string;
}

export interface MatchingExercise extends BaseExercise {
  type: 'matching';
  pairs: { left: string; right: string }[];
}

export interface PictureChoiceExercise extends BaseExercise {
  type: 'picture_choice';
  options: { text: string; imageUrl: string }[];
  correctAnswer: string;
}

export type Exercise = MultipleChoiceExercise | TranslationExercise | MatchingExercise | PictureChoiceExercise;

export interface Lesson {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'vocabulary' | 'grammar' | 'phrases';
  exercises: Exercise[];
}

export interface Level {
  id: string;
  title: string;
  lessons: Lesson[];
  requiredXp: number;
}
