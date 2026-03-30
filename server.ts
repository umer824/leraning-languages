import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Mock Data for LinguaQuest
  const lessons = [
    { 
      id: "1", 
      title: "Greetings", 
      description: "Learn basic greetings", 
      xpReward: 10, 
      type: "vocabulary",
      exercises: [
        { id: "e1", type: "multiple_choice", question: "Translate 'Hello'", options: ["Hola", "Adiós", "Gracias"], correctAnswer: "Hola", explanation: "'Hola' is the standard greeting in Spanish for 'Hello'." },
        { id: "e2", type: "translation", question: "Translate 'Good morning'", correctAnswer: "Buenos días", explanation: "'Buenos días' literally means 'Good days', used as 'Good morning'." },
        { id: "e3", type: "matching", question: "Match the pairs", pairs: [{ left: "Hello", right: "Hola" }, { left: "Goodbye", right: "Adiós" }], explanation: "Connect the English greeting with its Spanish equivalent." },
        {
          id: "e4_pic",
          type: "picture_choice",
          question: "Which of these is 'The Apple'?",
          options: [
            { text: "La Manzana", imageUrl: "https://picsum.photos/seed/apple/200/200" },
            { text: "El Plátano", imageUrl: "https://picsum.photos/seed/banana/200/200" },
            { text: "La Naranja", imageUrl: "https://picsum.photos/seed/orange/200/200" }
          ],
          correctAnswer: "La Manzana",
          explanation: "'La Manzana' is the Spanish word for apple."
        }
      ]
    },
    { 
      id: "2", 
      title: "Numbers", 
      description: "Count from 1 to 10", 
      xpReward: 15, 
      type: "vocabulary",
      exercises: [
        { id: "e4", type: "multiple_choice", question: "What is 'One'?", options: ["Uno", "Dos", "Tres"], correctAnswer: "Uno", explanation: "'Uno' is the first number in Spanish." },
        { id: "e5", type: "translation", question: "Translate 'Five'", correctAnswer: "Cinco", explanation: "'Cinco' is the Spanish word for the number 5." }
      ]
    },
    { 
      id: "3", 
      title: "Family", 
      description: "Family members", 
      xpReward: 20, 
      type: "vocabulary",
      exercises: [
        { id: "e6", type: "multiple_choice", question: "Who is 'Mother'?", options: ["Madre", "Padre", "Hermano"], correctAnswer: "Madre", explanation: "'Madre' is the Spanish word for mother." },
        { id: "e7", type: "matching", question: "Match family members", pairs: [{ left: "Father", right: "Padre" }, { left: "Sister", right: "Hermana" }], explanation: "Connect the family member with their Spanish name." }
      ]
    },
  ];

  const levels = [
    { id: "lvl1", title: "Basics", lessons: [lessons[0], lessons[1]], requiredXp: 0 },
    { id: "lvl2", title: "Intermediate", lessons: [lessons[2]], requiredXp: 25 },
  ];

  // Mock User Store
  const users: any[] = [
    {
      uid: "user123",
      displayName: "Sarah",
      email: "sarah@example.com",
      password: "password123",
      selectedLanguage: "es",
      xp: 12450,
      dailyXp: 120,
      dailyGoal: 50,
      level: 12,
      unlockedLevels: ["lvl1", "lvl2"],
      streak: 47,
      lastActive: new Date().toISOString(),
      exerciseStats: {
        "e1": { weight: 2, lastAttempted: new Date().toISOString() },
        "e2": { weight: 8, lastAttempted: new Date().toISOString() },
      }
    }
  ];

  // API Routes
  app.post("/api/v1/profile/exercise-result", (req, res) => {
    const { uid, exerciseId, isCorrect } = req.body;
    const user = users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.exerciseStats) user.exerciseStats = {};
    if (!user.exerciseStats[exerciseId]) {
      user.exerciseStats[exerciseId] = { weight: 5, lastAttempted: new Date().toISOString() };
    }

    const stats = user.exerciseStats[exerciseId];
    if (isCorrect) {
      stats.weight = Math.max(1, stats.weight - 1);
    } else {
      stats.weight = Math.min(10, stats.weight + 2);
    }
    stats.lastAttempted = new Date().toISOString();

    res.json(user);
  });
  app.patch("/api/v1/profile/goal", (req, res) => {
    const { uid, dailyGoal } = req.body;
    const user = users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.dailyGoal = dailyGoal;
    res.json(user);
  });

  app.post("/api/v1/profile/xp", (req, res) => {
    const { uid, xp } = req.body;
    const user = users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    user.xp += xp;
    user.dailyXp += xp;
    user.lastActive = new Date().toISOString();
    res.json(user);
  });

  app.patch("/api/v1/profile/sync", (req, res) => {
    const { uid, streak, lastActive, dailyXp } = req.body;
    const user = users.find(u => u.uid === uid);
    if (!user) return res.status(404).json({ message: "User not found" });
    
    if (streak !== undefined) user.streak = streak;
    if (lastActive !== undefined) user.lastActive = lastActive;
    if (dailyXp !== undefined) user.dailyXp = dailyXp;
    
    res.json(user);
  });

  app.post("/api/v1/auth/register", (req, res) => {
    const { email, password, displayName, selectedLanguage } = req.body;
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: "User already exists" });
    }
    const newUser = {
      uid: `user_${Date.now()}`,
      displayName,
      email,
      password,
      selectedLanguage: selectedLanguage || 'en',
      xp: 0,
      dailyXp: 0,
      dailyGoal: 50,
      level: 1,
      unlockedLevels: ["lvl1"],
      streak: 0,
      lastActive: new Date().toISOString(),
    };
    users.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  });

  app.post("/api/v1/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    user.lastActive = new Date().toISOString();
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.get("/api/v1/languages", (req, res) => {
    res.json([
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
    ]);
  });

  app.get("/api/v1/levels", (req, res) => {
    const lang = req.query.lang;
    // In a real app, we'd fetch translated content based on 'lang'
    res.json(levels);
  });

  app.get("/api/v1/profile", (req, res) => {
    // Mock profile
    res.json({
      uid: "user123",
      displayName: "Sarah",
      email: "sarah@example.com",
      selectedLanguage: "es",
      xp: 12450,
      level: 12,
      unlockedLevels: ["lvl1", "lvl2"],
      streak: 47,
      lastActive: new Date().toISOString(),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LinguaQuest server running on http://localhost:${PORT}`);
  });
}

startServer();
