import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HeroUpload } from './components/HeroUpload';
import { EditorWorkspace } from './components/EditorWorkspace';
import { BatchProcessor } from './components/BatchProcessor';
import { LandingSections } from './components/LandingSections';
import { Language } from './types';
import { sanitizeAndStripExif } from './utils/matting';

export default function App() {
  // Theme state: dark / light
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Language state: en / bn
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'bn') return saved;
    }
    return 'en';
  });

  // Active single-image editor state
  const [activeImageSrc, setActiveImageSrc] = useState<string | null>(null);
  const [activeImageTitle, setActiveImageTitle] = useState<string>('cutout');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);

  // Batch Mode Modal / View
  const [isBatchOpen, setIsBatchOpen] = useState<boolean>(false);

  // Sync dark mode class on HTML root
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Persist language
  useEffect(() => {
    localStorage.setItem('lang', currentLang);
  }, [currentLang]);

  const toggleTheme = () => setIsDark((prev) => !prev);
  const toggleLang = () => setCurrentLang((prev) => (prev === 'en' ? 'bn' : 'en'));

  // Triggered when user selects/drops/pastes an image or clicks a sample
  const handleImageSelected = async (fileOrUrl: File | string, title?: string) => {
    setIsProcessing(true);
    setProcessingProgress(15);

    try {
      let dataUrl: string;

      if (typeof fileOrUrl === 'string') {
        // Sample image or direct data URL
        dataUrl = fileOrUrl;
        setProcessingProgress(60);
      } else {
        // Strip EXIF and sanitize
        setProcessingProgress(35);
        const sanitized = await sanitizeAndStripExif(fileOrUrl);
        dataUrl = sanitized.dataUrl;
        setProcessingProgress(70);
      }

      // Simulate rapid AI neural pass animation
      const interval = setInterval(() => {
        setProcessingProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 15;
        });
      }, 120);

      setTimeout(() => {
        clearInterval(interval);
        setProcessingProgress(100);
        setActiveImageSrc(dataUrl);
        setActiveImageTitle(title || 'cutout');
        setIsProcessing(false);
        setIsBatchOpen(false);
      }, 800);
    } catch (err: any) {
      console.error(err);
      setIsProcessing(false);
      alert(err.message || 'Failed to process image');
    }
  };

  const handleResetToHome = () => {
    setActiveImageSrc(null);
    setIsBatchOpen(false);
  };

  const triggerUploadClick = () => {
    setActiveImageSrc(null);
    setIsBatchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentLang={currentLang}
        onToggleLang={toggleLang}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenBatch={() => {
          setActiveImageSrc(null);
          setIsBatchOpen(true);
        }}
        onTriggerUpload={triggerUploadClick}
        hasActiveImage={Boolean(activeImageSrc || isBatchOpen)}
        onResetToHome={handleResetToHome}
      />

      {/* Main View Router */}
      <main className="flex-1 flex flex-col">
        {activeImageSrc ? (
          /* Studio Editor View */
          <EditorWorkspace
            currentLang={currentLang}
            originalImageSrc={activeImageSrc}
            imageTitle={activeImageTitle}
            onReset={handleResetToHome}
          />
        ) : isBatchOpen ? (
          /* Batch Processing View */
          <BatchProcessor
            currentLang={currentLang}
            onClose={() => setIsBatchOpen(false)}
            onSelectSingleForEdit={(dataUrl, name) => {
              setActiveImageSrc(dataUrl);
              setActiveImageTitle(name);
              setIsBatchOpen(false);
            }}
          />
        ) : (
          /* Landing Page & Upload View */
          <>
            <HeroUpload
              currentLang={currentLang}
              onImageSelected={handleImageSelected}
              onOpenBatch={() => setIsBatchOpen(true)}
              isProcessing={isProcessing}
              processingProgress={processingProgress}
            />
            <LandingSections
              currentLang={currentLang}
              onTriggerUpload={triggerUploadClick}
              onOpenBatch={() => setIsBatchOpen(true)}
            />
          </>
        )}
      </main>
    </div>
  );
}
