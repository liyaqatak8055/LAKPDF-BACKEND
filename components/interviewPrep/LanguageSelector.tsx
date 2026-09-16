import React from 'react';
import { Languages } from 'lucide-react';
import { AppLanguage } from './types';

interface LanguageSelectorProps {
  currentLanguage: AppLanguage;
  onChangeLanguage: (lang: AppLanguage) => void;
  disabled?: boolean;
}

const LANGUAGES: { id: AppLanguage; label: string; badge: string }[] = [
  { id: 'en', label: 'English', badge: 'Standard' },
  { id: 'hi', label: 'हिन्दी', badge: 'Hindi' },
  { id: 'hinglish', label: 'Hinglish', badge: 'Casual' },
];

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onChangeLanguage,
  disabled = false,
}) => {
  return (
    <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
      <div className="pl-2 pr-1 text-slate-400">
        <Languages className="w-3.5 h-3.5" />
      </div>
      {LANGUAGES.map((lang) => {
        const isActive = currentLanguage === lang.id;
        return (
          <button
            key={lang.id}
            type="button"
            disabled={disabled}
            onClick={() => onChangeLanguage(lang.id)}
            className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
              isActive
                ? 'bg-white text-primary-950 shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
            title={`Prepare in ${lang.label}`}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};
