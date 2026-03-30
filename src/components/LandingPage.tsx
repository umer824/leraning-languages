import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LanguageSelector } from './LanguageSelector';
import { LanguageCode, LANGUAGES } from '../types';
import { Globe, ArrowRight, LogIn, UserPlus } from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register'>('landing');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: ''
  });
  const [error, setError] = useState<string | null>(null);
  const { setUser, setSelectedLanguage: setGlobalLang } = useAppStore();

  const handleLanguageSelect = (code: LanguageCode) => {
    setSelectedLanguage(code);
  };

  const handleStartLearning = () => {
    if (selectedLanguage) {
      setAuthMode('register');
      setGlobalLang(selectedLanguage);
      i18n.changeLanguage(selectedLanguage);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const endpoint = authMode === 'login' ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const payload = authMode === 'login' 
        ? { email: formData.email, password: formData.password }
        : { ...formData, selectedLanguage };
      
      const { data } = await axios.post(endpoint, payload);
      setUser(data);
      if (data.selectedLanguage) {
        setGlobalLang(data.selectedLanguage);
        i18n.changeLanguage(data.selectedLanguage);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (authMode === 'login' || authMode === 'register') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-xl"
        >
          <div className="flex justify-center mb-8">
            <div className="bg-[#58CC02] p-3 rounded-2xl">
              <Globe className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-center text-gray-800 mb-2 font-display uppercase tracking-tight">
            {authMode === 'login' ? 'Welcome Back' : 'Create Profile'}
          </h2>
          <p className="text-gray-500 text-center mb-8 font-medium">
            {authMode === 'login' ? 'Log in to continue your journey' : 'Join LinguaQuest today'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-100 text-red-600 rounded-2xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === 'register' && (
              <input 
                type="text" 
                name="displayName"
                placeholder="Display Name" 
                value={formData.displayName}
                onChange={handleInputChange}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-[#1CB0F6] outline-none transition-all font-medium"
                required
              />
            )}
            <input 
              type="email" 
              name="email"
              placeholder="Email" 
              value={formData.email}
              onChange={handleInputChange}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-[#1CB0F6] outline-none transition-all font-medium"
              required
            />
            <input 
              type="password" 
              name="password"
              placeholder="Password" 
              value={formData.password}
              onChange={handleInputChange}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-gray-100 focus:border-[#1CB0F6] outline-none transition-all font-medium"
              required
            />
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#1CB0F6] text-white rounded-2xl font-black text-lg shadow-lg shadow-[#1CB0F6]/30 hover:bg-[#1499d3] transition-all uppercase tracking-wider"
            >
              {isLoading ? 'Loading...' : authMode === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <button 
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="text-[#1CB0F6] font-bold hover:underline"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
            </button>
          </div>
        </motion.div>
        <button 
          onClick={() => {
            setAuthMode('landing');
            setError(null);
          }}
          className="mt-8 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase tracking-widest text-xs"
        >
          Back to Language Selection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F7] flex flex-col items-center justify-center p-6">
      <div className="absolute top-6 right-6">
        <button 
          onClick={() => setAuthMode('login')}
          className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-2xl font-black text-[#1CB0F6] hover:bg-gray-50 transition-all shadow-sm uppercase tracking-wider text-sm"
        >
          <LogIn className="w-4 h-4" />
          Login
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12 max-w-2xl"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="bg-[#58CC02] p-3 rounded-2xl shadow-lg shadow-[#58CC02]/20">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-black text-[#58CC02] tracking-tight font-display">
            LinguaQuest
          </h1>
        </div>
        <p className="text-xl text-gray-600 font-medium leading-relaxed">
          The free, fun, and effective way to learn a language!
          Choose your path and start your journey today.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="w-full max-w-6xl"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {t('learn_intro')}
          </h2>
          <div className="w-16 h-1 bg-[#58CC02] mx-auto rounded-full" />
        </div>

        <LanguageSelector
          onSelect={handleLanguageSelect}
          selectedCode={selectedLanguage || undefined}
        />

        <div className="mt-12 flex justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={!selectedLanguage || isLoading}
            onClick={handleStartLearning}
            className={`
              flex items-center gap-3 px-12 py-4 rounded-2xl font-black text-lg shadow-lg transition-all duration-300
              ${selectedLanguage
                ? "bg-[#58CC02] text-white hover:bg-[#46A302] shadow-[#58CC02]/30"
                : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
              }
              ${isLoading ? "opacity-70 cursor-wait" : ""}
              uppercase tracking-widest
            `}
          >
            {isLoading ? "LOADING..." : t('get_started')}
            {!isLoading && <ArrowRight className="w-5 h-5" />}
          </motion.button>
        </div>
      </motion.div>

      <footer className="mt-20 text-gray-400 text-sm font-medium tracking-wide uppercase">
        © 2026 LinguaQuest • Multilingual Gamified Learning
      </footer>
    </div>
  );
}
