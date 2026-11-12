import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, ArrowRight, Layers, ShieldCheck } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../utils/i18n';

// Sample generated images
import sampleSneakerUrl from '../assets/images/sample_sneaker_product_1794463679439.jpg';
import samplePortraitUrl from '../assets/images/sample_fashion_portrait_1794463680233.jpg';
import samplePetUrl from '../assets/images/sample_fluffy_pet_1794463680476.jpg';
import sampleCarUrl from '../assets/images/sample_modern_car_1794463681558.jpg';

interface HeroUploadProps {
  currentLang: Language;
  onImageSelected: (file: File | string, title?: string) => void;
  onOpenBatch: () => void;
  isProcessing: boolean;
  processingProgress: number;
}

export const HeroUpload: React.FC<HeroUploadProps> = ({
  currentLang,
  onImageSelected,
  onOpenBatch,
  isProcessing,
  processingProgress,
}) => {
  const t = translations[currentLang];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Clipboard Paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            validateAndSelect(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing]);

  const validateAndSelect = (file: File) => {
    setErrorMessage(null);
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage(
        currentLang === 'bn'
          ? 'শুধুমাত্র JPG, PNG বা WEBP ফরম্যাটের ছবি গ্রহণযোগ্য।'
          : 'Unsupported format. Please upload JPG, PNG, or WEBP image.'
      );
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage(
        currentLang === 'bn'
          ? 'ছবির সাইজ ১০ মেগাবাইটের বেশি হতে পারবে না।'
          : 'File size exceeds 10 MB limit. Please choose a smaller image.'
      );
      return;
    }

    onImageSelected(file, file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const sampleImages = [
    {
      id: 'sneaker',
      title: t.sampleSneaker,
      url: sampleSneakerUrl,
      category: 'Product / E-comm',
    },
    {
      id: 'portrait',
      title: t.samplePortrait,
      url: samplePortraitUrl,
      category: 'Portrait & Hair',
    },
    {
      id: 'pet',
      title: t.samplePet,
      url: samplePetUrl,
      category: 'Complex Fur',
    },
    {
      id: 'car',
      title: t.sampleCar,
      url: sampleCarUrl,
      category: 'Automotive',
    },
  ];

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 w-[1000px] h-[500px] bg-gradient-to-b from-indigo-100/50 via-purple-50/20 to-transparent dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-transparent blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Gemini 3.8 AI & Sobel Edge-Guard</span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>White Product Shield</span>
            <span className="text-neutral-300 dark:text-neutral-700">·</span>
            <span>Zero Flaws</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-neutral-900 dark:text-white text-balance leading-tight">
            {t.heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto text-balance font-normal leading-relaxed">
            {t.heroSubtitle}
          </p>
        </div>

        {/* Main Upload Dropzone Card */}
        <div className="max-w-2xl mx-auto">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-200 bg-white dark:bg-neutral-900 shadow-sm ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/30 scale-[1.01]'
                : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  validateAndSelect(e.target.files[0]);
                }
              }}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />

            {/* Loading / Processing State */}
            {isProcessing ? (
              <div className="py-8 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center relative">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
                  <Sparkles className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                    {t.processingTitle}
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{t.processingSub}</p>
                </div>
                {/* Progress bar */}
                <div className="w-48 mx-auto bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(15, processingProgress)}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform duration-200 shadow-sm">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <div className="font-display text-xl font-bold text-neutral-900 dark:text-white">
                    {t.dropzoneTitle}
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                    {t.dropzoneSubtitle}
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors shadow-sm flex items-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>{t.btnTryFree}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBatch();
                    }}
                    className="px-4 py-2.5 rounded-xl font-medium text-sm text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors flex items-center gap-2"
                  >
                    <Layers className="w-4 h-4 text-neutral-500" />
                    <span>{t.navBatch}</span>
                  </button>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{t.supportedFormats}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Sample Images Showcase */}
          <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3 text-xs font-medium text-neutral-500 dark:text-neutral-400">
              <span>{t.trySampleTitle}</span>
              <span className="hidden sm:inline">Click to test instant cutout</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {sampleImages.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onImageSelected(sample.url, sample.title)}
                  className="group relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all text-left bg-neutral-100 dark:bg-neutral-900"
                >
                  <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                    <img
                      src={sample.url}
                      alt={sample.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      {sample.title}
                    </div>
                    <div className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      {sample.category}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
