import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import { LANGUAGES, Level, Lesson, Exercise } from '../types';
import { Flame, Star, Trophy, ArrowRight, CheckCircle2, Lock, Globe, X, ChevronLeft, ChevronRight, Settings, PartyPopper, WifiOff, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { saveLessons, getCachedLessons, saveUserProfile, getCachedUserProfile, addPendingSync, getPendingSyncs, clearPendingSync } from '../db';

export function Dashboard() {
  const { t, i18n } = useTranslation();
  const { user, selectedLanguage, setUser } = useAppStore();
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(user?.dailyGoal || 50);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const lang = LANGUAGES.find(l => l.code === selectedLanguage);

  const { data: levels, isLoading } = useQuery<Level[]>({
    queryKey: ['levels', selectedLanguage],
    queryFn: async () => {
      try {
        const { data } = await axios.get(`/api/v1/levels?lang=${selectedLanguage}`);
        // Cache lessons for offline use
        const allLessons = data.flatMap((l: Level) => l.lessons);
        await saveLessons(allLessons);
        return data;
      } catch (error) {
        if (!navigator.onLine) {
          const cachedLessons = await getCachedLessons();
          // Mock levels structure from cached lessons if offline
          return [{ id: 'offline', title: 'Offline Lessons', lessons: cachedLessons, requiredXp: 0 }];
        }
        throw error;
      }
    },
    enabled: !!selectedLanguage,
  });

  // Sync offline progress
  const syncOfflineData = async () => {
    if (!user || isSyncing || !navigator.onLine) return;
    
    const pending = await getPendingSyncs();
    if (pending.length === 0) return;

    setIsSyncing(true);
    try {
      for (const item of pending) {
        try {
          if (item.type === 'xp') {
            await axios.post('/api/v1/profile/xp', item.data);
          } else if (item.type === 'exercise-result') {
            await axios.post('/api/v1/profile/exercise-result', item.data);
          } else if (item.type === 'sync') {
            await axios.patch('/api/v1/profile/sync', item.data);
          } else if (item.type === 'goal') {
            await axios.patch('/api/v1/profile/goal', item.data);
          }
          await clearPendingSync(item.id!);
        } catch (e) {
          console.error("Failed to sync item", item, e);
        }
      }
      // Refresh user data after sync
      const { data } = await axios.get(`/api/v1/profile?uid=${user.uid}`);
      setUser(data);
      queryClient.invalidateQueries({ queryKey: ['levels'] });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      syncOfflineData();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (user) {
      saveUserProfile(user);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const reviewExercises = useMemo(() => {
    if (!levels || !user?.exerciseStats) return [];
    
    const allExercises: Exercise[] = [];
    levels.forEach(level => {
      level.lessons.forEach(lesson => {
        lesson.exercises.forEach(exercise => {
          allExercises.push(exercise);
        });
      });
    });

    // Filter for exercises with weight >= 5 (struggling)
    return allExercises.filter(ex => {
      const stats = user.exerciseStats?.[ex.id];
      return stats && stats.weight >= 5;
    }).sort((a, b) => (user.exerciseStats?.[b.id]?.weight || 0) - (user.exerciseStats?.[a.id]?.weight || 0));
  }, [levels, user?.exerciseStats]);

  const handleStartReview = () => {
    if (reviewExercises.length === 0) return;
    
    const reviewLesson: Lesson = {
      id: 'review-session',
      title: 'Personalized Review',
      description: 'Strengthen your weak spots!',
      xpReward: 20,
      type: 'vocabulary',
      exercises: reviewExercises.slice(0, 10)
    };
    
    setActiveLesson(reviewLesson);
  };

  useEffect(() => {
    if (user) {
      const now = new Date();
      const lastActiveDate = new Date(user.lastActive);
      const diffInHours = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60);
      const isSameDay = now.toDateString() === lastActiveDate.toDateString();
      
      let newStreak = user.streak;
      let newDailyXp = user.dailyXp;
      let needsUpdate = false;

      if (!isSameDay) {
        newDailyXp = 0;
        needsUpdate = true;
        if (diffInHours <= 24) {
          newStreak += 1;
        } else {
          newStreak = (newDailyXp >= user.dailyGoal) ? 1 : 0;
        }
      }

      if (needsUpdate) {
        const updateStreak = async () => {
          const syncData = {
            uid: user.uid,
            streak: newStreak,
            lastActive: now.toISOString(),
            dailyXp: newDailyXp
          };

          if (navigator.onLine) {
            try {
              const { data } = await axios.patch('/api/v1/profile/sync', syncData);
              setUser(data);
            } catch (error) {
              console.error("Failed to sync streak", error);
            }
          } else {
            await addPendingSync({ type: 'sync', data: syncData, timestamp: now.toISOString() });
            // Update local state optimistically
            setUser({ ...user, streak: newStreak, lastActive: now.toISOString(), dailyXp: newDailyXp });
          }
        };
        updateStreak();
      }
    }
  }, []);

  useEffect(() => {
    if (user && user.dailyXp >= user.dailyGoal && !showCelebration) {
      setShowCelebration(true);
      // Hide celebration after 5 seconds
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.dailyXp, user?.dailyGoal]);

  const handleLogout = () => {
    setUser(null);
  };

  const handleUpdateGoal = async () => {
    if (!user) return;
    const goalData = {
      uid: user.uid,
      dailyGoal: newGoal
    };

    if (navigator.onLine) {
      try {
        const { data } = await axios.patch('/api/v1/profile/goal', goalData);
        setUser(data);
        setIsEditingGoal(false);
      } catch (error) {
        console.error("Failed to update goal", error);
      }
    } else {
      await addPendingSync({ type: 'goal', data: goalData, timestamp: new Date().toISOString() });
      setUser({ ...user, dailyGoal: newGoal });
      setIsEditingGoal(false);
    }
  };

  const handleLessonComplete = async (lesson: Lesson) => {
    if (!user) return;
    const xpData = {
      uid: user.uid,
      xp: lesson.xpReward
    };

    if (navigator.onLine) {
      try {
        const { data } = await axios.post('/api/v1/profile/xp', xpData);
        
        let finalUser = data;
        // If streak is 0 and they just hit the goal, it becomes 1
        if (finalUser.streak === 0 && finalUser.dailyXp >= finalUser.dailyGoal) {
          const { data: synced } = await axios.patch('/api/v1/profile/sync', {
            uid: user.uid,
            streak: 1
          });
          finalUser = synced;
        }
        
        setUser(finalUser);
        setActiveLesson(null);
      } catch (error) {
        console.error("Failed to update XP", error);
        setActiveLesson(null);
      }
    } else {
      await addPendingSync({ type: 'xp', data: xpData, timestamp: new Date().toISOString() });
      // Optimistic update
      const newDailyXp = user.dailyXp + lesson.xpReward;
      let newStreak = user.streak;
      if (newStreak === 0 && newDailyXp >= user.dailyGoal) {
        newStreak = 1;
      }
      setUser({ ...user, xp: user.xp + lesson.xpReward, dailyXp: newDailyXp, streak: newStreak });
      setActiveLesson(null);
    }
  };

  if (!user) return null;

  if (activeLesson) {
    return <LessonView lesson={activeLesson} onComplete={() => handleLessonComplete(activeLesson)} />;
  }

  const progress = Math.min((user.dailyXp / user.dailyGoal) * 100, 100);

  return (
    <div className="min-h-screen bg-[#F7F7F7] pb-20 relative overflow-hidden">
      {/* Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl border-4 border-[#FFC800] text-center">
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <PartyPopper className="w-20 h-20 text-[#FFC800] mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tight mb-2">Goal Reached!</h2>
              <p className="text-[#58CC02] font-bold text-xl">You're a language master! 🚀</p>
            </div>
            {/* Simple Particles */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1 }}
                animate={{ 
                  x: (Math.random() - 0.5) * 1000, 
                  y: (Math.random() - 0.5) * 1000,
                  opacity: 0,
                  rotate: 360
                }}
                transition={{ duration: 2, ease: "easeOut" }}
                className="absolute w-4 h-4 rounded-full"
                style={{ 
                  backgroundColor: ['#58CC02', '#1CB0F6', '#FFC800', '#FF4B4B'][i % 4],
                  left: '50%',
                  top: '50%'
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition-colors">
              <span className="text-xl">{lang?.flag}</span>
              <span className="font-bold text-gray-700 uppercase tracking-wider text-sm">{lang?.code}</span>
            </div>
            <div className="flex items-center gap-2 text-[#FF9600] font-bold">
              <Flame className="w-5 h-5 fill-[#FF9600]" />
              <span>{user.streak}</span>
            </div>
            <div className="flex items-center gap-2 text-[#FFC800] font-bold">
              <Star className="w-5 h-5 fill-[#FFC800]" />
              <span>{user.xp}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isOffline && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-600 rounded-xl font-bold text-xs uppercase tracking-wider">
                <WifiOff className="w-4 h-4" />
                Offline
              </div>
            )}
            {isSyncing && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-600 rounded-xl font-bold text-xs uppercase tracking-wider animate-pulse">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Syncing
              </div>
            )}
            <button 
              onClick={handleLogout}
              className="w-10 h-10 bg-[#1CB0F6] rounded-full flex items-center justify-center text-white font-bold hover:opacity-80 transition-opacity"
            >
              {user.displayName[0]}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Main Path */}
        <div className="md:col-span-2 space-y-8">
          <section>
            <div className="mb-8">
              <h1 className="text-3xl font-black text-gray-800 mb-2 font-display uppercase tracking-tight">
                {t('welcome', { name: user.displayName })}
              </h1>
              <p className="text-gray-500 font-medium">
                {t('continue', { language: lang?.name })}
              </p>
            </div>
            
            <div className="space-y-4">
              {isLoading ? (
                <div className="animate-pulse space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-200 rounded-2xl" />
                  ))}
                </div>
              ) : (
                levels?.map((level, idx) => {
                  const isUnlocked = user.unlockedLevels.includes(level.id);
                  return (
                    <motion.div
                      key={level.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`
                        p-6 rounded-2xl border-2 transition-all duration-200
                        ${isUnlocked 
                          ? "bg-white border-gray-200 shadow-sm hover:shadow-md cursor-pointer" 
                          : "bg-gray-50 border-gray-100 opacity-60 grayscale"
                        }
                      `}
                      onClick={() => isUnlocked && setActiveLesson(level.lessons[0])}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`
                            w-12 h-12 rounded-xl flex items-center justify-center
                            ${isUnlocked ? "bg-[#58CC02] text-white" : "bg-gray-200 text-gray-400"}
                          `}>
                            {isUnlocked ? <CheckCircle2 className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                          </div>
                          <div>
                            <h3 className="font-black text-lg text-gray-800 uppercase tracking-tight">{level.title}</h3>
                            <p className="text-sm text-gray-500 font-medium">
                              {level.lessons.length} {t('lesson')}s • {level.requiredXp} XP Required
                            </p>
                          </div>
                        </div>
                        {isUnlocked && <ArrowRight className="w-5 h-5 text-gray-400" />}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-800 font-display uppercase tracking-tight">
                Daily Goal
              </h2>
              <button 
                onClick={() => setIsEditingGoal(!isEditingGoal)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-[#1CB0F6]"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isEditingGoal ? (
                <motion.div
                  key="edit"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-2">
                    {[10, 20, 50, 100].map(goal => (
                      <button
                        key={goal}
                        onClick={() => setNewGoal(goal)}
                        className={`
                          py-2 rounded-xl border-2 font-bold transition-all
                          ${newGoal === goal ? "border-[#1CB0F6] bg-[#1CB0F6]/5 text-[#1CB0F6]" : "border-gray-100 text-gray-500 hover:border-gray-200"}
                        `}
                      >
                        {goal} XP
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleUpdateGoal}
                      className="flex-1 bg-[#58CC02] text-white py-2 rounded-xl font-bold shadow-lg shadow-[#58CC02]/20 hover:opacity-90 transition-opacity"
                    >
                      Save
                    </button>
                    <button 
                      onClick={() => setIsEditingGoal(false)}
                      className="flex-1 bg-gray-100 text-gray-500 py-2 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between text-sm font-bold text-gray-500 uppercase tracking-wider">
                    <span>XP Progress</span>
                    <span className={user.dailyXp >= user.dailyGoal ? "text-[#58CC02]" : ""}>
                      {user.dailyXp} / {user.dailyGoal}
                    </span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full transition-colors duration-500 ${progress >= 100 ? "bg-[#58CC02]" : "bg-[#1CB0F6]"}`}
                    />
                  </div>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {progress >= 100 
                      ? "Amazing! You've crushed your goal for today. Keep going for extra XP!" 
                      : `You're ${Math.round(100 - progress)}% away from your goal. You can do it!`}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          <section className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FF4B4B] rounded-xl flex items-center justify-center text-white">
                <Trophy className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">Review</h2>
            </div>
            <p className="text-gray-500 font-medium text-sm mb-6">
              {reviewExercises.length > 0 
                ? `You have ${reviewExercises.length} exercises that need attention. Ready to master them?`
                : "You're doing great! No exercises need immediate review right now."}
            </p>
            <button 
              onClick={handleStartReview}
              disabled={reviewExercises.length === 0}
              className={`
                w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all uppercase tracking-widest
                ${reviewExercises.length > 0 
                  ? "bg-[#FF4B4B] text-white shadow-[#FF4B4B]/30 hover:opacity-90" 
                  : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"}
              `}
            >
              {t('start')}
            </button>
          </section>

          <section className="bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-black text-gray-800 font-display uppercase tracking-tight">
                Achievements
              </h2>
              <Trophy className="w-5 h-5 text-[#FFC800]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="aspect-square bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
                  <div className={`w-8 h-8 rounded-full ${i <= 3 ? "bg-[#FFC800]/20 text-[#FFC800]" : "bg-gray-200 text-gray-400"}`}>
                    <Star className="w-full h-full p-1.5" />
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-[#1CB0F6] font-bold text-sm uppercase tracking-wider hover:bg-[#1CB0F6]/5 rounded-xl transition-colors">
              View All
            </button>
          </section>
        </div>
      </main>

      {/* Bottom Nav (Mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 h-16 flex items-center justify-around">
        <button className="text-[#58CC02]"><Star className="w-6 h-6" /></button>
        <button className="text-gray-400"><Trophy className="w-6 h-6" /></button>
        <button className="text-gray-400"><Flame className="w-6 h-6" /></button>
        <button className="text-gray-400"><Globe className="w-6 h-6" /></button>
      </nav>
    </div>
  );
}

function LessonView({ lesson, onComplete }: { lesson: Lesson, onComplete: () => void }) {
  const { t } = useTranslation();
  const { user, setUser } = useAppStore();
  const [step, setStep] = useState(0);
  const [answer, setAnswer] = useState<any>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [matchingPairs, setMatchingPairs] = useState<{ left: string | null; right: string | null }>({ left: null, right: null });
  const [completedPairs, setCompletedPairs] = useState<string[]>([]);
  const [isFinished, setIsFinished] = useState(false);

  const [exercises] = useState(() => {
    const allExercises = lesson.exercises || [];
    if (!user) return allExercises;

    // Weighted selection for spaced repetition
    const sorted = [...allExercises].sort((a, b) => {
      const weightA = user.exerciseStats?.[a.id]?.weight ?? 5;
      const weightB = user.exerciseStats?.[b.id]?.weight ?? 5;
      return weightB - weightA; // Harder exercises first
    });

    // Pick top 5 or all if less than 5
    const selected = sorted.slice(0, 5);
    
    // Shuffle the selected ones for variety
    return [...selected].sort(() => Math.random() - 0.5);
  });

  const currentExercise = exercises[step];

  const handleCheck = async () => {
    if (!currentExercise || !user) return;

    let correct = false;
    if (currentExercise.type === 'multiple_choice') {
      correct = answer === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'picture_choice') {
      correct = answer === currentExercise.correctAnswer;
    } else if (currentExercise.type === 'translation') {
      correct = answer?.toLowerCase().trim() === currentExercise.correctAnswer.toLowerCase().trim();
    } else if (currentExercise.type === 'matching') {
      correct = completedPairs.length === currentExercise.pairs.length;
    }

    setIsCorrect(correct);

    // Update spaced repetition stats on the backend
    const resultData = {
      uid: user.uid,
      exerciseId: currentExercise.id,
      isCorrect: correct
    };

    if (navigator.onLine) {
      try {
        const { data } = await axios.post('/api/v1/profile/exercise-result', resultData);
        setUser(data);
      } catch (error) {
        console.error("Failed to update exercise stats", error);
      }
    } else {
      await addPendingSync({ type: 'exercise-result', data: resultData, timestamp: new Date().toISOString() });
      // Optimistic update for exercise stats
      const currentStats = user.exerciseStats?.[currentExercise.id] || { weight: 5, lastAttempted: new Date().toISOString() };
      const newWeight = correct ? Math.max(1, currentStats.weight - 1) : Math.min(10, currentStats.weight + 2);
      setUser({
        ...user,
        exerciseStats: {
          ...user.exerciseStats,
          [currentExercise.id]: { weight: newWeight, lastAttempted: new Date().toISOString() }
        }
      });
    }
  };

  const handleNext = () => {
    if (step + 1 < exercises.length) {
      setStep(step + 1);
      setAnswer(null);
      setIsCorrect(null);
      setMatchingPairs({ left: null, right: null });
      setCompletedPairs([]);
    } else {
      setIsFinished(true);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setAnswer(null);
      setIsCorrect(null);
      setMatchingPairs({ left: null, right: null });
      setCompletedPairs([]);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleMatch = (side: 'left' | 'right', value: string) => {
    if (isCorrect !== null) return;
    
    const newPairs = { ...matchingPairs, [side]: value };
    setMatchingPairs(newPairs);

    if (newPairs.left && newPairs.right) {
      const isMatch = currentExercise.type === 'matching' && 
        currentExercise.pairs.some(p => p.left === newPairs.left && p.right === newPairs.right);
      
      if (isMatch) {
        setCompletedPairs([...completedPairs, newPairs.left!]);
        if (completedPairs.length + 1 === (currentExercise as any).pairs.length) {
          setAnswer(true);
        }
      }
      
      setTimeout(() => setMatchingPairs({ left: null, right: null }), 300);
    }
  };

  if (!currentExercise) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-16 border-b flex items-center px-6 justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onComplete} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
          {step > 0 && (
            <button 
              onClick={handleBack}
              className="flex items-center gap-1 text-gray-500 font-bold hover:text-gray-700 transition-colors uppercase tracking-widest text-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>
        <div className="flex-1 mx-8 h-4 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="h-full bg-[#58CC02] transition-all duration-500" 
            style={{ width: `${((step + 1) / exercises.length) * 100}%` }}
          />
        </div>
        <div className="flex items-center gap-4">
          {isCorrect === null && (
            <button 
              onClick={handleSkip}
              className="flex items-center gap-1 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase tracking-widest text-xs"
            >
              Skip
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2 text-[#FF4B4B] font-bold">
            <Flame className="w-5 h-5 fill-[#FF4B4B]" />
            <span>5</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col justify-center">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="w-full"
        >
          <h2 className="text-3xl font-black text-gray-800 mb-8 uppercase tracking-tight">
            {currentExercise.question}
          </h2>

          {currentExercise.type === 'multiple_choice' && (
            <div className="grid grid-cols-1 gap-4">
              {currentExercise.options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => isCorrect === null && setAnswer(opt)}
                  className={`
                    p-6 rounded-2xl border-2 text-xl font-bold text-left transition-all relative
                    ${answer === opt 
                      ? "border-[#1CB0F6] bg-[#1CB0F6]/5 text-[#1CB0F6]" 
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }
                    ${isCorrect !== null && opt === currentExercise.correctAnswer ? "border-[#58CC02] bg-[#58CC02]/5 text-[#58CC02]" : ""}
                    ${isCorrect === false && answer === opt ? "border-[#FF4B4B] bg-[#FF4B4B]/5 text-[#FF4B4B]" : ""}
                  `}
                >
                  <div className="flex items-center justify-between">
                    <span>{opt}</span>
                    {isCorrect !== null && opt === currentExercise.correctAnswer && (
                      <CheckCircle2 className="w-6 h-6 text-[#58CC02]" />
                    )}
                    {isCorrect === false && answer === opt && (
                      <X className="w-6 h-6 text-[#FF4B4B]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentExercise.type === 'picture_choice' && (
            <div className="grid grid-cols-3 gap-4">
              {currentExercise.options.map((opt) => (
                <button
                  key={opt.text}
                  onClick={() => isCorrect === null && setAnswer(opt.text)}
                  className={`
                    flex flex-col items-center p-4 rounded-2xl border-2 transition-all relative
                    ${answer === opt.text 
                      ? "border-[#1CB0F6] bg-[#1CB0F6]/5 text-[#1CB0F6]" 
                      : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }
                    ${isCorrect !== null && opt.text === currentExercise.correctAnswer ? "border-[#58CC02] bg-[#58CC02]/5 text-[#58CC02]" : ""}
                    ${isCorrect === false && answer === opt.text ? "border-[#FF4B4B] bg-[#FF4B4B]/5 text-[#FF4B4B]" : ""}
                  `}
                >
                  <img 
                    src={opt.imageUrl} 
                    alt={opt.text} 
                    className="w-full aspect-square object-cover rounded-xl mb-3"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{opt.text}</span>
                    {isCorrect !== null && opt.text === currentExercise.correctAnswer && (
                      <CheckCircle2 className="w-4 h-4 text-[#58CC02]" />
                    )}
                    {isCorrect === false && answer === opt.text && (
                      <X className="w-4 h-4 text-[#FF4B4B]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {currentExercise.type === 'translation' && (
            <div className="space-y-4">
              <textarea
                value={answer || ''}
                onChange={(e) => isCorrect === null && setAnswer(e.target.value)}
                placeholder="Type your translation here..."
                className="w-full p-6 rounded-2xl border-2 border-gray-200 text-xl font-medium focus:border-[#1CB0F6] outline-none min-h-[150px] resize-none"
              />
            </div>
          )}

          {currentExercise.type === 'matching' && (
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                {currentExercise.pairs.map(p => (
                  <button
                    key={p.left}
                    disabled={completedPairs.includes(p.left)}
                    onClick={() => handleMatch('left', p.left)}
                    className={`
                      w-full p-4 rounded-xl border-2 font-bold transition-all
                      ${completedPairs.includes(p.left) ? "bg-gray-100 border-gray-100 text-gray-300" : 
                        matchingPairs.left === p.left ? "border-[#1CB0F6] bg-[#1CB0F6]/5 text-[#1CB0F6]" : "border-gray-200 hover:bg-gray-50"}
                    `}
                  >
                    {p.left}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {[...currentExercise.pairs].sort(() => Math.random() - 0.5).map(p => (
                  <button
                    key={p.right}
                    disabled={completedPairs.some(cp => currentExercise.pairs.find(pair => pair.left === cp)?.right === p.right)}
                    onClick={() => handleMatch('right', p.right)}
                    className={`
                      w-full p-4 rounded-xl border-2 font-bold transition-all
                      ${completedPairs.some(cp => currentExercise.pairs.find(pair => pair.left === cp)?.right === p.right) ? "bg-gray-100 border-gray-100 text-gray-300" : 
                        matchingPairs.right === p.right ? "border-[#1CB0F6] bg-[#1CB0F6]/5 text-[#1CB0F6]" : "border-gray-200 hover:bg-gray-50"}
                    `}
                  >
                    {p.right}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </main>

      <footer className={`
        p-6 border-t transition-all duration-300
        ${isCorrect === true ? "bg-[#d7ffb8]" : isCorrect === false ? "bg-[#ffdfe0]" : "bg-white"}
      `}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            {isCorrect === true && (
              <div className="flex items-center gap-3 text-[#58CC02]">
                <CheckCircle2 className="w-8 h-8" />
                <span className="text-2xl font-black uppercase tracking-tight">{t('correct')}</span>
              </div>
            )}
            {isCorrect === false && (
              <div className="space-y-1">
                <div className="flex items-center gap-3 text-[#FF4B4B]">
                  <X className="w-8 h-8" />
                  <span className="text-2xl font-black uppercase tracking-tight">{t('incorrect')}</span>
                </div>
                <div className="text-[#FF4B4B] font-bold ml-11">
                  {currentExercise.type === 'multiple_choice' && (
                    <div className="space-y-1">
                      <p>The correct answer is: <span className="underline">{currentExercise.correctAnswer}</span></p>
                      {currentExercise.explanation && <p className="text-sm font-medium opacity-80">{currentExercise.explanation}</p>}
                    </div>
                  )}
                  {currentExercise.type === 'picture_choice' && (
                    <div className="space-y-1">
                      <p>The correct answer is: <span className="underline">{currentExercise.correctAnswer}</span></p>
                      {currentExercise.explanation && <p className="text-sm font-medium opacity-80">{currentExercise.explanation}</p>}
                    </div>
                  )}
                  {currentExercise.type === 'translation' && (
                    <div className="space-y-1">
                      <p>The correct translation is: <span className="underline">{currentExercise.correctAnswer}</span></p>
                      {currentExercise.explanation && <p className="text-sm font-medium opacity-80">{currentExercise.explanation}</p>}
                    </div>
                  )}
                  {currentExercise.type === 'matching' && (
                    <div className="space-y-1">
                      <p>Make sure to match all pairs correctly!</p>
                      {currentExercise.explanation && <p className="text-sm font-medium opacity-80">{currentExercise.explanation}</p>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={isCorrect !== null ? handleNext : handleCheck}
            disabled={!answer}
            className={`
              px-12 py-4 rounded-2xl font-black text-lg shadow-lg transition-all uppercase tracking-widest
              ${!answer ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : 
                isCorrect === true ? "bg-[#58CC02] text-white shadow-[#58CC02]/30" :
                isCorrect === false ? "bg-[#FF4B4B] text-white shadow-[#FF4B4B]/30" :
                "bg-[#58CC02] text-white shadow-[#58CC02]/30"
              }
            `}
          >
            {isCorrect !== null ? t('next') : t('check')}
          </button>
        </div>
      </footer>

      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="max-w-md w-full"
            >
              <div className="w-32 h-32 bg-[#FFC800] rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-[#FFC800]/20">
                <Trophy className="w-16 h-16 text-white" />
              </div>
              
              <h2 className="text-4xl font-black text-gray-800 mb-4 uppercase tracking-tight">
                Lesson Complete!
              </h2>
              
              <p className="text-xl text-gray-500 font-medium mb-12">
                You've mastered this lesson and earned <span className="text-[#FFC800] font-black">{lesson.xpReward} XP</span>!
              </p>

              <div className="space-y-4">
                <div className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#58CC02] rounded-xl flex items-center justify-center text-white">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <span className="font-bold text-gray-700">Exercises Done</span>
                  </div>
                  <span className="font-black text-xl text-[#58CC02]">{exercises.length}</span>
                </div>

                <button
                  onClick={onComplete}
                  className="w-full py-5 bg-[#58CC02] text-white rounded-2xl font-black text-xl shadow-lg shadow-[#58CC02]/30 hover:opacity-90 transition-all uppercase tracking-widest"
                >
                  Continue to Dashboard
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
