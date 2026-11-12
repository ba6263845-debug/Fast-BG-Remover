import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileArchive,
  Trash2,
  Play,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Language, BatchItem } from '../types';
import { translations } from '../utils/i18n';
import { sanitizeAndStripExif, processAlphaMatting } from '../utils/matting';

interface BatchProcessorProps {
  currentLang: Language;
  onClose: () => void;
  onSelectSingleForEdit: (dataUrl: string, name: string) => void;
}

export const BatchProcessor: React.FC<BatchProcessorProps> = ({
  currentLang,
  onClose,
  onSelectSingleForEdit,
}) => {
  const t = translations[currentLang];
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add files to batch queue
  const handleAddFiles = async (files: FileList | null) => {
    if (!files) return;
    const newItems: BatchItem[] = [];

    const maxToAdd = Math.min(20 - items.length, files.length);
    for (let i = 0; i < maxToAdd; i++) {
      const file = files[i];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const id = Math.random().toString(36).substring(2, 9);
      const url = URL.createObjectURL(file);

      newItems.push({
        id,
        file,
        name: file.name,
        size: file.size,
        originalUrl: url,
        resultUrl: null,
        status: 'pending',
        progress: 0,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  // Process a single item
  const processItem = async (item: BatchItem): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return reject(new Error('Canvas error'));
        ctx.drawImage(img, 0, 0);

        const processed = processAlphaMatting(canvas, {
          tolerance: 20,
          feather: 2,
          whiteShield: true,
          defringe: 45,
        });
        const resultDataUrl = processed.toDataURL('image/png');
        resolve(resultDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = item.originalUrl;
    });
  };

  // Process All items sequentially / concurrently
  const handleProcessAll = async () => {
    if (items.length === 0 || isProcessingAll) return;
    setIsProcessingAll(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'done') continue;

      // Update state to processing
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing', progress: 40 } : it))
      );

      try {
        const start = Date.now();
        const resultUrl = await processItem(item);
        const duration = Date.now() - start;

        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? {
                  ...it,
                  status: 'done',
                  progress: 100,
                  resultUrl,
                  processingTimeMs: duration,
                }
              : it
          )
        );
      } catch (err: any) {
        setItems((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'error', errorMessage: err.message || 'Error' } : it
          )
        );
      }
    }

    setIsProcessingAll(false);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
  };

  // Download All as ZIP archive
  const handleDownloadZip = async () => {
    const doneItems = items.filter((it) => it.status === 'done' && it.resultUrl);
    if (doneItems.length === 0) return;

    setIsZipping(true);
    const zip = new JSZip();
    const folder = zip.folder('cutout_pro_batch');

    for (const item of doneItems) {
      if (!item.resultUrl) continue;
      const base64Data = item.resultUrl.replace(/^data:image\/png;base64,/, '');
      const cleanName = item.name.replace(/\.[^/.]+$/, '');
      folder?.file(`${cleanName}_transparent.png`, base64Data, { base64: true });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cutout_pro_batch_${Date.now()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsZipping(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const doneCount = items.filter((it) => it.status === 'done').length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.batchClear}</span>
            </button>
          )}

          {doneCount > 0 && (
            <button
              onClick={handleDownloadZip}
              disabled={isZipping}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
              <span>{t.batchDownloadZip} ({doneCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Batch Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="font-display text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t.batchTitle}
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 max-w-2xl">
          {t.batchSubtitle}
        </p>
      </div>

      {/* Drop Area & File Selector */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleAddFiles(e.dataTransfer.files);
        }}
        className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-neutral-50 dark:bg-neutral-900/40 p-8 text-center transition-colors space-y-3"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleAddFiles(e.target.files)}
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
        />

        <div className="w-12 h-12 mx-auto rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>

        <div className="space-y-1">
          <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {t.batchDropPrompt}
          </div>
          <p className="text-xs text-neutral-500">
            Select up to 20 images · JPG, PNG, WEBP (Max 10MB each)
          </p>
        </div>
      </div>

      {/* Action Controls & Summary */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
          <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            <span>Total: </span>
            <strong className="text-neutral-900 dark:text-neutral-100 font-mono">{items.length}</strong>
            <span className="mx-2">·</span>
            <span>Processed: </span>
            <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{doneCount}</strong>
          </div>

          <button
            onClick={handleProcessAll}
            disabled={isProcessingAll || doneCount === items.length}
            className="px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
          >
            {isProcessingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            <span>{t.batchProcessAll}</span>
          </button>
        </div>
      )}

      {/* Grid of Queued Items */}
      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 space-y-3 shadow-sm hover:shadow-md transition-shadow relative"
            >
              {/* Image Preview Container */}
              <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-checkerboard border border-neutral-200 dark:border-neutral-800">
                <img
                  src={item.resultUrl || item.originalUrl}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />

                {item.status === 'processing' && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                {item.status === 'done' && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Title & metadata */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate" title={item.name}>
                  {item.name}
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
                  <span>{(item.size / 1024).toFixed(0)} KB</span>
                  {item.processingTimeMs && <span>{item.processingTimeMs}ms</span>}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                {item.resultUrl ? (
                  <>
                    <button
                      onClick={() => onSelectSingleForEdit(item.resultUrl!, item.name)}
                      className="flex-1 py-1 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-medium hover:bg-indigo-100 transition-colors text-center"
                    >
                      Edit Studio
                    </button>
                    <a
                      href={item.resultUrl}
                      download={`${item.name.replace(/\.[^/.]+$/, '')}_cutout.png`}
                      className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                      title="Download PNG"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </>
                ) : (
                  <span className="text-[11px] text-neutral-400 italic">Waiting in queue...</span>
                )}

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors ml-auto"
                  title="Remove from batch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
