import React from 'react';
import { motion } from 'motion/react';
import { LANGUAGES, LanguageCode } from '../types';
import { cn } from '../lib/utils';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  onSelect: (code: LanguageCode) => void;
  selectedCode?: LanguageCode;
}

export function LanguageSelector({ onSelect, selectedCode }: LanguageSelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 p-4 max-w-5xl mx-auto">
      {LANGUAGES.map((lang) => (
        <motion.button
          key={lang.code}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(lang.code)}
          className={cn(
            "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-200",
            "bg-white shadow-sm hover:shadow-md",
            selectedCode === lang.code
              ? "border-[#58CC02] bg-[#58CC02]/5"
              : "border-gray-200 hover:border-gray-300"
          )}
        >
          <span className="text-4xl mb-3" role="img" aria-label={lang.name}>
            {lang.flag}
          </span>
          <span className="font-bold text-gray-800 tracking-tight">
            {lang.nativeName}
          </span>
          <span className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
            {lang.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
}
