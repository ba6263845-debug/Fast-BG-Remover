import React from 'react';
import { Sun, Moon, Sparkles, Layers, Globe } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

interface NavbarProps {
  currentLang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenBatch: () => void;
  onTriggerUpload: () => void;
  hasActiveImage: boolean;
  onResetToHome: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentLang,
  onToggleLang,
  isDark,
  onToggleTheme,
  onOpenBatch,
  onTriggerUpload,
  hasActiveImage,
  onResetToHome,
}) => {
  const t = translations[currentLang];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/85 dark:bg-neutral-900/85 border-b border-neutral-200 dark:border-neutral-800 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onResetToHome}
            className="flex items-center gap-2 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
              {t.brand}
            </span>
          </button>
        </div>

        {/* Zone 2: 4–5 clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <a
            href="#how-it-works"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            {t.navHowItWorks}
          </a>
          <a
            href="#features"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            {t.navFeatures}
          </a>
          <a
            href="#use-cases"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            {t.navUseCases}
          </a>
          <a
            href="#pricing"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            {t.navPricing}
          </a>
          <a
            href="#api-docs"
            className="hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors whitespace-nowrap"
          >
            {t.navApi}
          </a>
          <button
            onClick={onOpenBatch}
            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            <span>{t.navBatch}</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action cluster */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Language Toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors whitespace-nowrap"
            title="Switch Language (English / বাংলা)"
            aria-label="Switch Language"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{currentLang === 'en' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Primary Action Button */}
          {hasActiveImage ? (
            <button
              onClick={onResetToHome}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-900 dark:hover:bg-neutral-600 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              {t.btnBackHome}
            </button>
          ) : (
            <button
              onClick={onTriggerUpload}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-lg transition-colors shadow-sm whitespace-nowrap flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t.btnTryFree}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
