import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: "Welcome back, {{name}}!",
      continue: "Continue your {{language}} journey",
      get_started: "Get Started",
      learn_intro: "I want to learn...",
      points: "Points",
      streak: "Streak",
      level: "Level",
      lesson: "Lesson",
      check: "Check Answer",
      correct: "Correct!",
      incorrect: "Incorrect",
      next: "Next",
    }
  },
  es: {
    translation: {
      welcome: "¡Bienvenido de nuevo, {{name}}!",
      continue: "Continúa tu viaje en {{language}}",
      get_started: "EMPEZAR",
      learn_intro: "Quiero aprender...",
      points: "Puntos",
      streak: "Racha",
      level: "Nivel",
      lesson: "Lección",
      check: "Comprobar",
      correct: "¡Correcto!",
      incorrect: "Incorrecto",
      next: "Siguiente",
    }
  },
  ar: {
    translation: {
      welcome: "مرحباً بعودتك، {{name}}!",
      continue: "أكمل رحلتك في تعلم {{language}}",
      get_started: "ابدأ الآن",
      learn_intro: "أريد أن أتعلم...",
      points: "نقاط",
      streak: "سلسلة",
      level: "مستوى",
      lesson: "درس",
      check: "تحقق",
      correct: "صحيح!",
      incorrect: "خطأ",
      next: "التالي",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
