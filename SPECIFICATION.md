# LinguaQuest: Project Specification

## 1. Overview
LinguaQuest is a professional, gamified, multilingual language learning platform inspired by Duolingo. It offers structured, progressive language courses across the world's top 10 spoken languages.

## 2. Target Languages
The platform supports:
- English
- Hindi
- Urdu
- Spanish
- French
- Arabic
- Chinese (Mandarin)
- Portuguese
- Russian
- Japanese

## 3. Tech Stack
- **Frontend**: React 19, Tailwind CSS 4, Motion (for animations), Lucide React (icons).
- **Backend**: Node.js with Express.js (TypeScript).
- **Database**: Firebase Firestore (NoSQL) for real-time progress and user data.
- **Authentication**: Firebase Authentication (Google Login & Email/Password).
- **Deployment**: Google Cloud Run.

## 4. Key Features

### 4.1. Onboarding & Language Selection
- **First Visit**: Users are presented with a high-impact language selection screen.
- **Persistence**: The selected language is stored in the user's profile (or local storage for guests) to adapt all UI and content.

### 4.2. User Authentication & Profiles
- **Secure Login**: Robust registration and login using Firebase Auth.
- **Profiles**: Store user XP, current level, unlocked achievements, and selected language.

### 4.3. Gamified Learning Structure
- **Levels**: Content is divided into sequential levels (e.g., Basics 1, Basics 2, Phrases, etc.).
- **Unlocking**: Levels unlock only after the previous one is completed with a minimum score.
- **Exercises**: Multiple types (Multiple Choice, Translation, Listening, Matching).

### 4.4. Dashboard & Progress Tracking
- **Visual Progress**: A central dashboard showing the learning path, XP, and current streak.
- **Achievements**: Badges and visual indicators for milestones.

### 4.5. Dynamic Content Delivery
- **Backend Logic**: API endpoints serve lesson content based on the `language_id` and `level_id`.
- **UI Localization**: All buttons, labels, and instructions adapt to the selected language.

## 5. Design Principles
- **Mobile-First**: Optimized for smartphones and tablets.
- **Intuitive UX**: Minimalist interface with clear calls to action.
- **Responsive**: Fluid layouts using Tailwind CSS.

## 6. Security & Scalability
- **Security**: Firestore Security Rules to protect user data.
- **Scalability**: Stateless backend and serverless architecture to handle growth.
