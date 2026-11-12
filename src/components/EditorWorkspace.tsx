import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Download,
  RotateCcw,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Paintbrush,
  Eraser,
  Sparkles,
  Layers,
  Image as ImageIcon,
  Sliders,
  Crop,
  Sun,
  Eye,
  Check,
  Upload,
  Split,
  ChevronLeft,
  ShieldCheck,
  Loader2,
  Cpu,
  Wand2,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Language,
  EditorSettings,
  BrushSettings,
  CropPreset,
  HistoryState,
  AIModelType,
} from '../types';
import { translations } from '../utils/i18n';
import {
  processAlphaMatting,
  autoCropCanvas,
  renderCompositedCanvas,
  getSubjectBounds,
  drawContactGroundShadow,
  applyMagicWand,
} from '../utils/matting';

interface EditorWorkspaceProps {
  currentLang: Language;
  originalImageSrc: string;
  imageTitle: string;
  onReset: () => void;
}

const COLOR_PRESETS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Off-White', value: '#f8fafc' },
  { name: 'Studio Grey', value: '#e2e8f0' },
  { name: 'Charcoal', value: '#1e293b' },
  { name: 'Jet Black', value: '#0f172a' },
  { name: 'Cream', value: '#fef3c7' },
  { name: 'Warm Peach', value: '#ffedd5' },
  { name: 'Soft Rose', value: '#ffe4e6' },
  { name: 'Sky Blue', value: '#e0f2fe' },
  { name: 'Mint Green', value: '#dcfce7' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Emerald', value: '#059669' },
];

const GRADIENT_PRESETS = [
  { id: 'sunset', name: 'Sunset Glow', css: 'from-rose-200 via-amber-200 to-blue-200' },
  { id: 'ocean', name: 'Deep Ocean', css: 'from-sky-500 to-slate-900' },
  { id: 'studio-grey', name: 'Studio Backdrop', css: 'from-slate-100 to-slate-300' },
  { id: 'warm-glow', name: 'Warm Amber', css: 'from-amber-50 to-orange-200' },
];

const CROP_PRESETS: CropPreset[] = [
  { id: 'free', name: 'Original Dimensions', description: 'Keeps source resolution' },
  { id: 'amazon', name: 'Amazon & Shopify', ratio: 1, width: 1000, height: 1000, description: '1000x1000 Square on pure white' },
  { id: 'etsy', name: 'Etsy & eBay', ratio: 1, width: 2000, height: 2000, description: '2000x2000 High-Res Square' },
  { id: 'instagram', name: 'Instagram Post', ratio: 1, width: 1080, height: 1080, description: '1080x1080 Square 1:1' },
  { id: 'story', name: 'Story / Reel', ratio: 9 / 16, width: 1080, height: 1920, description: '1080x1920 Vertical 9:16' },
  { id: 'id-photo', name: 'Passport / ID Photo', ratio: 35 / 45, width: 700, height: 900, description: 'Official 35x45mm biometric ratio' },
];

const AI_BACKDROP_PRESETS = [
  {
    id: 'marble',
    name: 'Marble Podium',
    prompt: 'Minimalist white Italian marble podium with golden sunlight reflections and soft studio lighting',
    icon: '🏛️',
  },
  {
    id: 'wood',
    name: 'Warm Oak Table',
    prompt: 'Rustic warm oak wood kitchen table top with warm morning sunlight and blurred leaves',
    icon: '🪵',
  },
  {
    id: 'pastel',
    name: 'Pastel Cylinder',
    prompt: 'Abstract pastel 3D geometric podium with soft peach and mint studio gradient backdrop',
    icon: '🧴',
  },
  {
    id: 'beach',
    name: 'Tropical Beach',
    prompt: 'Tropical ocean beach with turquoise water, fine white sand and blurred palm shadow',
    icon: '🏖️',
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Studio',
    prompt: 'Cyberpunk futuristic showroom with neon cyan and magenta rim light and dark matte floor',
    icon: '🟣',
  },
  {
    id: 'showroom',
    name: 'White Showroom',
    prompt: 'Commercial clean white infinity studio cove with professional softbox reflection',
    icon: '⚪',
  },
  {
    id: 'cafe',
    name: 'Cozy Cafe',
    prompt: 'Aesthetic Scandinavian cafe desk with warm bokeh lamp lighting and subtle wooden textures',
    icon: '☕',
  },
  {
    id: 'loft',
    name: 'Modern Loft',
    prompt: 'Clean architectural concrete loft shelf with gentle shadows and neutral grey wall',
    icon: '🏢',
  },
];

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  currentLang,
  originalImageSrc,
  imageTitle,
  onReset,
}) => {
  const t = translations[currentLang];

  // Canvas refs
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cutoutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const customBgInputRef = useRef<HTMLInputElement>(null);
  const loadedBgImgRef = useRef<HTMLImageElement | null>(null);

  // Active Tool Tab
  const [activeTab, setActiveTab] = useState<'background' | 'refine' | 'effects' | 'presets'>('background');

  // Comparison slider
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [comparePosition, setComparePosition] = useState<number>(50); // percentage 0 to 100

  // Deep AI mode loading state
  const [isDeepAiLoading, setIsDeepAiLoading] = useState<boolean>(false);

  // Free AI Backdrop Generator state
  const [aiPrompt, setAiPrompt] = useState<string>('Luxury minimalist marble podium with soft studio lighting');
  const [isGeneratingBackdrop, setIsGeneratingBackdrop] = useState<boolean>(false);

  // Editor Settings State
  const [settings, setSettings] = useState<EditorSettings>({
    backgroundType: 'transparent',
    backgroundColor: '#ffffff',
    backgroundGradient: 'studio-grey',
    backgroundImageUrl: null,
    featherRadius: 2,
    smoothing: 1,
    tolerance: 18,
    autoCropPadding: 24,
    defringe: 50,
    whiteShield: true,
    edgeSharpness: 80,
    shadow: {
      enabled: false,
      color: '#000000',
      blur: 20,
      offsetX: 0,
      offsetY: 15,
      opacity: 0.25,
    },
    contactShadow: {
      enabled: true,
      intensity: 0.75,
      spread: 75,
      verticalOffset: 6,
    },
    aiModel: 'birefnet',
    selectedPreset: 'free',
    zoom: 1,
    pan: { x: 0, y: 0 },
  });

  // Brush settings
  const [brush, setBrush] = useState<BrushSettings>({
    mode: 'erase',
    size: 35,
    hardness: 0.6,
    opacity: 1,
  });

  // History stack for Undo / Redo
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Pan & Zoom mouse tracking
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isBrushingRef = useRef(false);

  // Image load & processing state
  const [isReady, setIsReady] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpg'>('png');
  const [exportQuality, setExportQuality] = useState<number>(0.95);
  const [originalDims, setOriginalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // Initialize Canvas and run edge-guarded AI matting
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setOriginalDims({ width: w, height: h });

      // Create Original Canvas
      const origCanvas = document.createElement('canvas');
      origCanvas.width = w;
      origCanvas.height = h;
      const oCtx = origCanvas.getContext('2d', { willReadFrequently: true });
      if (oCtx) {
        oCtx.drawImage(img, 0, 0);
      }
      originalCanvasRef.current = origCanvas;

      // Run automatic edge-guarded matting with White Product Shield
      const processed = processAlphaMatting(origCanvas, {
        tolerance: settings.tolerance,
        feather: settings.featherRadius,
        smoothing: settings.smoothing,
        whiteShield: settings.whiteShield,
        defringe: settings.defringe,
      });

      cutoutCanvasRef.current = processed;

      // Store initial state in history
      const cCtx = processed.getContext('2d', { willReadFrequently: true });
      if (cCtx) {
        const initialData = cCtx.getImageData(0, 0, w, h);
        setHistory([initialData]);
        setHistoryIndex(0);
      }

      setIsReady(true);
    };
    img.src = originalImageSrc;
  }, [originalImageSrc]);

  // Redraw Display Canvas whenever cutout, settings, or brush changes
  const redraw = useCallback(() => {
    if (!displayCanvasRef.current || !cutoutCanvasRef.current) return;

    const displayCanvas = displayCanvasRef.current;
    const cutoutCanvas = cutoutCanvasRef.current;
    const origCanvas = originalCanvasRef.current;

    const width = cutoutCanvas.width;
    const height = cutoutCanvas.height;

    displayCanvas.width = width;
    displayCanvas.height = height;
    const ctx = displayCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);

    // If Compare mode is active, render split curtain view
    if (compareMode && origCanvas) {
      const splitX = (width * comparePosition) / 100;

      // Left side: Cutout with background & shadows
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, height);
      ctx.clip();

      if (settings.backgroundType === 'color') {
        ctx.fillStyle = settings.backgroundColor;
        ctx.fillRect(0, 0, width, height);
      } else if (settings.backgroundType === 'gradient') {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        if (settings.backgroundGradient === 'sunset') {
          grad.addColorStop(0, '#fecdd3');
          grad.addColorStop(0.5, '#fde047');
          grad.addColorStop(1, '#93c5fd');
        } else if (settings.backgroundGradient === 'ocean') {
          grad.addColorStop(0, '#0284c7');
          grad.addColorStop(1, '#0f172a');
        } else if (settings.backgroundGradient === 'warm-glow') {
          grad.addColorStop(0, '#fffbeb');
          grad.addColorStop(1, '#fed7aa');
        } else {
          grad.addColorStop(0, '#f1f5f9');
          grad.addColorStop(1, '#cbd5e1');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (
        (settings.backgroundType === 'image' || settings.backgroundType === 'ai-scene') &&
        loadedBgImgRef.current &&
        loadedBgImgRef.current.complete
      ) {
        ctx.drawImage(loadedBgImgRef.current, 0, 0, width, height);
      }

      // Draw ground shadow if enabled
      if (settings.contactShadow.enabled) {
        const bounds = getSubjectBounds(cutoutCanvas);
        drawContactGroundShadow(ctx, bounds, width, height, settings.contactShadow);
      }

      // Draw floating shadow if enabled
      if (settings.shadow.enabled) {
        ctx.shadowColor = `rgba(0, 0, 0, ${settings.shadow.opacity})`;
        ctx.shadowBlur = settings.shadow.blur;
        ctx.shadowOffsetX = settings.shadow.offsetX;
        ctx.shadowOffsetY = settings.shadow.offsetY;
      }
      ctx.drawImage(cutoutCanvas, 0, 0);
      ctx.restore();

      // Right side: Original image
      ctx.save();
      ctx.beginPath();
      ctx.rect(splitX, 0, width - splitX, height);
      ctx.clip();
      ctx.drawImage(origCanvas, 0, 0);
      ctx.restore();

      // Draw divider line
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, height);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      return;
    }

    // Normal rendering: Background + Ground Contact Shadow + Floating Shadow + Cutout
    if (settings.backgroundType === 'color') {
      ctx.fillStyle = settings.backgroundColor;
      ctx.fillRect(0, 0, width, height);
    } else if (settings.backgroundType === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (settings.backgroundGradient === 'sunset') {
        grad.addColorStop(0, '#fecdd3');
        grad.addColorStop(0.5, '#fde047');
        grad.addColorStop(1, '#93c5fd');
      } else if (settings.backgroundGradient === 'ocean') {
        grad.addColorStop(0, '#0284c7');
        grad.addColorStop(1, '#0f172a');
      } else if (settings.backgroundGradient === 'warm-glow') {
        grad.addColorStop(0, '#fffbeb');
        grad.addColorStop(1, '#fed7aa');
      } else {
        grad.addColorStop(0, '#f1f5f9');
        grad.addColorStop(1, '#cbd5e1');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else if (settings.backgroundType === 'blur' && origCanvas) {
      ctx.save();
      ctx.filter = 'blur(20px)';
      ctx.drawImage(origCanvas, 0, 0, width, height);
      ctx.restore();
    } else if (
      (settings.backgroundType === 'image' || settings.backgroundType === 'ai-scene') &&
      settings.backgroundImageUrl
    ) {
      if (loadedBgImgRef.current && loadedBgImgRef.current.complete) {
        ctx.drawImage(loadedBgImgRef.current, 0, 0, width, height);
      } else {
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.onload = () => {
          loadedBgImgRef.current = bgImg;
          redraw();
        };
        bgImg.src = settings.backgroundImageUrl;
      }
    }

    // Realistic Ground Contact Shadow under product base
    if (settings.contactShadow.enabled) {
      const bounds = getSubjectBounds(cutoutCanvas);
      drawContactGroundShadow(ctx, bounds, width, height, settings.contactShadow);
    }

    // Floating Drop Shadow
    if (settings.shadow.enabled) {
      ctx.save();
      ctx.shadowColor = `rgba(0, 0, 0, ${settings.shadow.opacity})`;
      ctx.shadowBlur = settings.shadow.blur;
      ctx.shadowOffsetX = settings.shadow.offsetX;
      ctx.shadowOffsetY = settings.shadow.offsetY;
      ctx.drawImage(cutoutCanvas, 0, 0);
      ctx.restore();
    }

    // Render Clean Subject Cutout
    ctx.drawImage(cutoutCanvas, 0, 0);
  }, [settings, compareMode, comparePosition]);

  useEffect(() => {
    if (isReady) {
      redraw();
    }
  }, [isReady, redraw]);

  // Push new state to undo/redo history
  const pushHistory = () => {
    if (!cutoutCanvasRef.current) return;
    const ctx = cutoutCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, cutoutCanvasRef.current.width, cutoutCanvasRef.current.height);

    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(currentData);
    if (nextHistory.length > 20) {
      nextHistory.shift();
    }
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0 || !cutoutCanvasRef.current) return;
    const newIdx = historyIndex - 1;
    const prevData = history[newIdx];
    const ctx = cutoutCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.putImageData(prevData, 0, 0);
      setHistoryIndex(newIdx);
      redraw();
    }
  };

  const handleRedo = () => {
    if (historyIndex >= history.length - 1 || !cutoutCanvasRef.current) return;
    const newIdx = historyIndex + 1;
    const nextData = history[newIdx];
    const ctx = cutoutCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.putImageData(nextData, 0, 0);
      setHistoryIndex(newIdx);
      redraw();
    }
  };

  // Re-run matting with updated tolerance/feather/shield/defringe
  const reprocessMatting = (
    newTolerance = settings.tolerance,
    newFeather = settings.featherRadius,
    newWhiteShield = settings.whiteShield,
    newDefringe = settings.defringe
  ) => {
    if (!originalCanvasRef.current) return;
    setSettings((prev) => ({
      ...prev,
      tolerance: newTolerance,
      featherRadius: newFeather,
      whiteShield: newWhiteShield,
      defringe: newDefringe,
    }));

    const reprocessed = processAlphaMatting(originalCanvasRef.current, {
      tolerance: newTolerance,
      feather: newFeather,
      smoothing: settings.smoothing,
      whiteShield: newWhiteShield,
      defringe: newDefringe,
    });

    cutoutCanvasRef.current = reprocessed;
    pushHistory();
    redraw();
  };

  // Call Server Gemini 3.8 AI Vision endpoint
  const runDeepAiSegmentation = async () => {
    if (!originalImageSrc) return;
    setIsDeepAiLoading(true);
    try {
      const res = await fetch('/api/remove-bg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: originalImageSrc,
          model: 'gemini-vision',
          feather: settings.featherRadius,
          tolerance: settings.tolerance,
          whiteShield: settings.whiteShield,
          defringe: settings.defringe,
        }),
      });
      const data = await res.json();
      if (data.success && data.resultImage) {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            cutoutCanvasRef.current = c;
            pushHistory();
            redraw();
          }
          setIsDeepAiLoading(false);
        };
        img.src = data.resultImage;
      } else {
        setIsDeepAiLoading(false);
      }
    } catch (err) {
      console.error('Deep AI segmentation error:', err);
      setIsDeepAiLoading(false);
    }
  };

  // Manual Brush Erase / Restore tool implementation
  const handleBrushStroke = (canvasX: number, canvasY: number) => {
    if (!cutoutCanvasRef.current || !originalCanvasRef.current) return;

    const cCtx = cutoutCanvasRef.current.getContext('2d', { willReadFrequently: true });
    const oCtx = originalCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!cCtx || !oCtx) return;

    const radius = brush.size / 2;
    const boundsLeft = Math.max(0, Math.floor(canvasX - radius));
    const boundsTop = Math.max(0, Math.floor(canvasY - radius));
    const boundsRight = Math.min(cutoutCanvasRef.current.width, Math.ceil(canvasX + radius));
    const boundsBottom = Math.min(cutoutCanvasRef.current.height, Math.ceil(canvasY + radius));
    const width = boundsRight - boundsLeft;
    const height = boundsBottom - boundsTop;

    if (width <= 0 || height <= 0) return;

    const cutoutData = cCtx.getImageData(boundsLeft, boundsTop, width, height);
    const originalData = oCtx.getImageData(boundsLeft, boundsTop, width, height);

    const cPixels = cutoutData.data;
    const oPixels = originalData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const curCanvasX = boundsLeft + x;
        const curCanvasY = boundsTop + y;
        const dist = Math.sqrt(Math.pow(curCanvasX - canvasX, 2) + Math.pow(curCanvasY - canvasY, 2));

        if (dist <= radius) {
          let brushStrength = 1;
          const innerRadius = radius * brush.hardness;
          if (dist > innerRadius) {
            brushStrength = 1 - (dist - innerRadius) / (radius - innerRadius);
          }
          brushStrength *= brush.opacity;

          const idx = (y * width + x) * 4;

          if (brush.mode === 'erase') {
            cPixels[idx + 3] = Math.max(0, Math.round(cPixels[idx + 3] * (1 - brushStrength)));
          } else {
            cPixels[idx] = oPixels[idx];
            cPixels[idx + 1] = oPixels[idx + 1];
            cPixels[idx + 2] = oPixels[idx + 2];
            cPixels[idx + 3] = Math.min(255, Math.round(cPixels[idx + 3] + (255 - cPixels[idx + 3]) * brushStrength));
          }
        }
      }
    }

    cCtx.putImageData(cutoutData, boundsLeft, boundsTop);
    redraw();
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - settings.pan.x, y: e.clientY - settings.pan.y };
      return;
    }

    if (activeTab === 'refine' && !compareMode) {
      const coords = getCanvasCoordinates(e);
      if (coords) {
        if (brush.mode === 'magic-wand' && cutoutCanvasRef.current) {
          applyMagicWand(cutoutCanvasRef.current, coords.x, coords.y, settings.tolerance);
          pushHistory();
          redraw();
          return;
        }
        isBrushingRef.current = true;
        handleBrushStroke(coords.x, coords.y);
      }
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPanning) {
      setSettings((prev) => ({
        ...prev,
        pan: {
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        },
      }));
      return;
    }

    if (isBrushingRef.current && activeTab === 'refine' && !compareMode) {
      const coords = getCanvasCoordinates(e);
      if (coords) {
        handleBrushStroke(coords.x, coords.y);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (isBrushingRef.current) {
      isBrushingRef.current = false;
      pushHistory();
    }
  };

  // Auto-Crop Execution
  const handleAutoCrop = () => {
    if (!cutoutCanvasRef.current) return;
    const cropped = autoCropCanvas(cutoutCanvasRef.current, settings.autoCropPadding);
    cutoutCanvasRef.current = cropped;
    if (originalCanvasRef.current) {
      originalCanvasRef.current = autoCropCanvas(originalCanvasRef.current, settings.autoCropPadding);
    }
    pushHistory();
    redraw();
  };

  // Apply Marketplace Preset (e.g., Amazon 1000x1000 white)
  const handleApplyPreset = (preset: CropPreset) => {
    setSettings((prev) => ({
      ...prev,
      selectedPreset: preset.id,
      backgroundType: preset.id === 'amazon' ? 'color' : prev.backgroundType,
      backgroundColor: preset.id === 'amazon' ? '#ffffff' : prev.backgroundColor,
    }));

    if (preset.ratio && cutoutCanvasRef.current) {
      const cropped = autoCropCanvas(cutoutCanvasRef.current, 40, preset.ratio);
      cutoutCanvasRef.current = cropped;
      pushHistory();
      redraw();
    }
  };

  // Upload Custom Background Image
  const handleCustomBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setSettings((prev) => ({
        ...prev,
        backgroundType: 'image',
        backgroundImageUrl: e.target?.result as string,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Generate 100% Free AI Studio Backdrop
  const handleGenerateBackdrop = async (promptOverride?: string) => {
    const promptToUse = (promptOverride || aiPrompt || '').trim();
    if (!promptToUse) return;

    if (promptOverride) {
      setAiPrompt(promptOverride);
    }

    setIsGeneratingBackdrop(true);
    try {
      const res = await fetch('/api/generate-backdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          width: originalDims.width || 1200,
          height: originalDims.height || 1200,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      const backdrop = data.backdropUrl || data.imageUrl;
      if (backdrop) {
        setSettings((prev) => ({
          ...prev,
          backgroundType: 'ai-scene',
          backgroundImageUrl: backdrop,
        }));
      }
    } catch (err) {
      console.warn('AI Backdrop server error, using high-fidelity procedural studio canvas:', err);
      const fallbackSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1200" viewBox="0 0 1200 1200">
          <defs>
            <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="70%" stop-color="#e2e8f0"/>
              <stop offset="100%" stop-color="#cbd5e1"/>
            </linearGradient>
            <radialGradient id="lightSpot" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
              <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <rect width="1200" height="1200" fill="url(#bgGrad)"/>
          <rect width="1200" height="1200" fill="url(#lightSpot)"/>
          <ellipse cx="600" cy="880" rx="420" ry="80" fill="#0f172a" opacity="0.14" filter="blur(18px)"/>
          <ellipse cx="600" cy="850" rx="380" ry="70" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
        </svg>
      `)}`;
      setSettings((prev) => ({
        ...prev,
        backgroundType: 'ai-scene',
        backgroundImageUrl: fallbackSvg,
      }));
    } finally {
      setIsGeneratingBackdrop(false);
    }
  };

  // Final Download Handler
  const handleDownload = async () => {
    if (!cutoutCanvasRef.current) return;

    let targetWidth: number | undefined;
    let targetHeight: number | undefined;

    const currentPreset = CROP_PRESETS.find((p) => p.id === settings.selectedPreset);
    if (currentPreset?.width && currentPreset?.height) {
      targetWidth = currentPreset.width;
      targetHeight = currentPreset.height;
    }

    const exportCanvas = await renderCompositedCanvas(
      cutoutCanvasRef.current,
      originalCanvasRef.current,
      settings,
      targetWidth && targetHeight ? { width: targetWidth, height: targetHeight } : undefined
    );

    const mime = exportFormat === 'png' ? 'image/png' : 'image/jpeg';
    const dataUrl = exportCanvas.toDataURL(mime, exportQuality);

    const a = document.createElement('a');
    a.href = dataUrl;
    const cleanName = (imageTitle || 'cutout').replace(/\.[^/.]+$/, '');
    a.download = `${cleanName}_cutout_${settings.backgroundType}.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.8 },
    });

    setDownloadModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* LEFT: Toolbar & Editing Panels */}
      <div className="w-full lg:w-96 shrink-0 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col z-20 shadow-sm">
        {/* Editor Header with Back & Undo/Redo */}
        <div className="px-5 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{t.btnBackHome}</span>
          </button>

          {/* History Controls */}
          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
            <button
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="p-1.5 rounded text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="p-1.5 rounded text-neutral-700 dark:text-neutral-300 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Studio Tool Tabs */}
        <div className="grid grid-cols-4 border-b border-neutral-200 dark:border-neutral-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('background')}
            className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-colors ${
              activeTab === 'background'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="truncate">{t.tabBackground}</span>
          </button>

          <button
            onClick={() => setActiveTab('refine')}
            className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-colors ${
              activeTab === 'refine'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            <span className="truncate">{t.tabRefine}</span>
          </button>

          <button
            onClick={() => setActiveTab('effects')}
            className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-colors ${
              activeTab === 'effects'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="truncate">{t.tabEffects}</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`py-3 px-2 flex flex-col items-center gap-1 border-b-2 transition-colors ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/20'
                : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Crop className="w-4 h-4" />
            <span className="truncate">{t.tabPresets}</span>
          </button>
        </div>

        {/* Tab Content Panel */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: BACKGROUND REPLACEMENT */}
          {activeTab === 'background' && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 block mb-2.5 uppercase tracking-wider">
                  {t.tabBackground} Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, backgroundType: 'transparent' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-all ${
                      settings.backgroundType === 'transparent'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-checkerboard border border-neutral-300 dark:border-neutral-700" />
                    <span>{t.bgTransparent}</span>
                  </button>

                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, backgroundType: 'color' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-all ${
                      settings.backgroundType === 'color'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md border border-neutral-300 dark:border-neutral-700 shadow-inner"
                      style={{ backgroundColor: settings.backgroundColor }}
                    />
                    <span>{t.bgColor}</span>
                  </button>

                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, backgroundType: 'gradient' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-all ${
                      settings.backgroundType === 'gradient'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-rose-300 via-amber-200 to-sky-300 border border-neutral-300 dark:border-neutral-700" />
                    <span>{t.bgGradient}</span>
                  </button>

                  <button
                    onClick={() => setSettings((prev) => ({ ...prev, backgroundType: 'blur' }))}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2.5 transition-all ${
                      settings.backgroundType === 'blur'
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-md bg-neutral-300 dark:bg-neutral-700 flex items-center justify-center text-[10px] text-neutral-500">
                      B
                    </div>
                    <span>{t.bgBlur}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSettings((prev) => ({ ...prev, backgroundType: 'ai-scene' }));
                      if (!settings.backgroundImageUrl) {
                        handleGenerateBackdrop();
                      }
                    }}
                    className={`col-span-2 p-2.5 rounded-xl border text-left text-xs font-medium flex items-center justify-between transition-all ${
                      settings.backgroundType === 'ai-scene'
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold">{t.bgAiScene}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      FREE
                    </span>
                  </button>
                </div>
              </div>

              {/* AI Backdrop Scene Generator (100% Free) */}
              {settings.backgroundType === 'ai-scene' && (
                <div className="space-y-4 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      Free AI Studio Backdrop
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {t.aiBackdropFreeBadge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={t.aiBackdropPrompt}
                      rows={2}
                      className="w-full text-xs p-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <button
                      onClick={() => handleGenerateBackdrop()}
                      disabled={isGeneratingBackdrop || !aiPrompt.trim()}
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isGeneratingBackdrop ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{t.aiBackdropGenerating}</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{t.btnGenerateBackdrop}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 1-Click Studio Scene Chips */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 block">
                      Instant 1-Click Backdrops:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {AI_BACKDROP_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleGenerateBackdrop(preset.prompt)}
                          disabled={isGeneratingBackdrop}
                          className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-neutral-50/50 dark:bg-neutral-800/40 text-left transition-all group flex items-start gap-2 disabled:opacity-50"
                        >
                          <span className="text-base leading-none">{preset.icon}</span>
                          <div className="min-w-0">
                            <span className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 block truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {preset.name}
                            </span>
                            <span className="text-[9px] text-neutral-500 truncate block">1-Click Apply</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Color Presets Picker */}
              {settings.backgroundType === 'color' && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Palette & Picker
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.backgroundColor}
                        onChange={(e) => setSettings((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                      />
                      <span className="font-mono text-xs text-neutral-500 uppercase">
                        {settings.backgroundColor}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setSettings((prev) => ({ ...prev, backgroundColor: color.value }))}
                        className={`w-full aspect-square rounded-lg border transition-transform hover:scale-110 flex items-center justify-center ${
                          settings.backgroundColor.toLowerCase() === color.value.toLowerCase()
                            ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-neutral-900 border-indigo-600'
                            : 'border-neutral-200 dark:border-neutral-700'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      >
                        {settings.backgroundColor.toLowerCase() === color.value.toLowerCase() && (
                          <Check
                            className={`w-3.5 h-3.5 ${
                              color.value === '#ffffff' || color.value === '#f8fafc' || color.value === '#e2e8f0'
                                ? 'text-neutral-900'
                                : 'text-white'
                            }`}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Gradient Presets */}
              {settings.backgroundType === 'gradient' && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                    Studio Gradients
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {GRADIENT_PRESETS.map((grad) => (
                      <button
                        key={grad.id}
                        onClick={() => setSettings((prev) => ({ ...prev, backgroundGradient: grad.id }))}
                        className={`p-2 rounded-xl border text-left transition-all ${
                          settings.backgroundGradient === grad.id
                            ? 'border-indigo-600 ring-1 ring-indigo-600'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
                        }`}
                      >
                        <div className={`h-12 rounded-lg bg-gradient-to-tr ${grad.css} mb-1.5`} />
                        <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                          {grad.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Image Upload */}
              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800">
                <input
                  type="file"
                  ref={customBgInputRef}
                  onChange={(e) => e.target.files && e.target.files[0] && handleCustomBgUpload(e.target.files[0])}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => customBgInputRef.current?.click()}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-xs font-medium text-neutral-700 dark:text-neutral-300 flex items-center justify-center gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.bgCustomImage}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL REFINE BRUSH */}
          {activeTab === 'refine' && (
            <div className="space-y-5">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300">
                {t.brushTip}
              </div>

              {/* Mode switch: Magic Wand, Erase vs Restore */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
                <button
                  onClick={() => setBrush((prev) => ({ ...prev, mode: 'magic-wand' }))}
                  className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    brush.mode === 'magic-wand'
                      ? 'bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                  title="Click any background spot to erase it"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span className="truncate">Wand</span>
                </button>

                <button
                  onClick={() => setBrush((prev) => ({ ...prev, mode: 'erase' }))}
                  className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    brush.mode === 'erase'
                      ? 'bg-white dark:bg-neutral-900 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span className="truncate">Erase</span>
                </button>

                <button
                  onClick={() => setBrush((prev) => ({ ...prev, mode: 'restore' }))}
                  className={`py-2 px-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    brush.mode === 'restore'
                      ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
                  }`}
                >
                  <Paintbrush className="w-3.5 h-3.5" />
                  <span className="truncate">Restore</span>
                </button>
              </div>

              {brush.mode === 'magic-wand' && (
                <div className="p-2.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-[11px] text-indigo-800 dark:text-indigo-300">
                  🪄 <strong>Magic Wand:</strong> Click anywhere on the background on the canvas to instantly delete that connected color region.
                </div>
              )}

              {/* Brush Size Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{t.brushSize}</span>
                  <span className="font-mono text-neutral-500">{brush.size}px</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="120"
                  value={brush.size}
                  onChange={(e) => setBrush((prev) => ({ ...prev, size: parseInt(e.target.value, 10) }))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Edge Softness / Hardness */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{t.brushHardness}</span>
                  <span className="font-mono text-neutral-500">{Math.round((1 - brush.hardness) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={brush.hardness}
                  onChange={(e) => setBrush((prev) => ({ ...prev, hardness: parseFloat(e.target.value) }))}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Live Brush Preview circle */}
              <div className="pt-3 flex flex-col items-center justify-center gap-2 border-t border-neutral-200 dark:border-neutral-800">
                <span className="text-[11px] text-neutral-500">Live Brush Size Preview</span>
                <div className="w-24 h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden">
                  <div
                    className={`rounded-full border transition-all ${
                      brush.mode === 'erase' ? 'bg-red-500/30 border-red-500' : 'bg-emerald-500/30 border-emerald-500'
                    }`}
                    style={{ width: `${Math.min(80, brush.size)}px`, height: `${Math.min(80, brush.size)}px` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADVANCED SHADOW & EDGE PERFECTION */}
          {activeTab === 'effects' && (
            <div className="space-y-6">
              {/* DEEP AI VISION ENGINE TRIGGER */}
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 font-display text-xs font-bold text-indigo-900 dark:text-indigo-200">
                      <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Gemini 3.8 Vision Neural Matting</span>
                    </div>
                    <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-relaxed">
                      Deep multimodal segmentation for complex hair strands, glass reflections, and difficult boundaries.
                    </p>
                  </div>
                </div>

                <button
                  onClick={runDeepAiSegmentation}
                  disabled={isDeepAiLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {isDeepAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing with Gemini Vision...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run Deep AI Vision Matting</span>
                    </>
                  )}
                </button>
              </div>

              {/* WHITE PRODUCT SHIELD TOGGLE */}
              <div className="p-3.5 rounded-xl bg-white dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                      {t.whiteShieldTitle}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.whiteShield}
                    onChange={(e) =>
                      reprocessMatting(settings.tolerance, settings.featherRadius, e.target.checked, settings.defringe)
                    }
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-neutral-500 leading-relaxed">{t.whiteShieldHelp}</p>
              </div>

              {/* DE-FRINGE / COLOR DECONTAMINATION */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">{t.defringeTitle}</span>
                  <span className="font-mono text-neutral-500">{settings.defringe}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.defringe}
                  onChange={(e) =>
                    reprocessMatting(settings.tolerance, settings.featherRadius, settings.whiteShield, parseInt(e.target.value, 10))
                  }
                  className="w-full accent-indigo-600"
                />
                <p className="text-[11px] text-neutral-500">{t.defringeHelp}</p>
              </div>

              {/* REALISTIC GROUND CONTACT SHADOW */}
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 block">
                      {t.groundShadowTitle}
                    </span>
                    <span className="text-[11px] text-neutral-500">{t.groundShadowHelp}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.contactShadow.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        contactShadow: { ...prev.contactShadow, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {settings.contactShadow.enabled && (
                  <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Shadow Density</span>
                        <span className="font-mono text-neutral-500">
                          {Math.round(settings.contactShadow.intensity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={settings.contactShadow.intensity}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            contactShadow: { ...prev.contactShadow, intensity: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">Ground Spread</span>
                        <span className="font-mono text-neutral-500">{settings.contactShadow.spread}%</span>
                      </div>
                      <input
                        type="range"
                        min="30"
                        max="120"
                        value={settings.contactShadow.spread}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            contactShadow: { ...prev.contactShadow, spread: parseInt(e.target.value, 10) },
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* FLOATING DROP SHADOW */}
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                      {t.dropShadow}
                    </span>
                    <span className="text-[11px] text-neutral-500">Ambient wall shadow</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.shadow.enabled}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        shadow: { ...prev.shadow, enabled: e.target.checked },
                      }))
                    }
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {settings.shadow.enabled && (
                  <div className="space-y-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">{t.shadowBlur}</span>
                        <span className="font-mono text-neutral-500">{settings.shadow.blur}px</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="60"
                        value={settings.shadow.blur}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            shadow: { ...prev.shadow, blur: parseInt(e.target.value, 10) },
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-neutral-600 dark:text-neutral-400">{t.shadowOpacity}</span>
                        <span className="font-mono text-neutral-500">
                          {Math.round(settings.shadow.opacity * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={settings.shadow.opacity}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            shadow: { ...prev.shadow, opacity: parseFloat(e.target.value) },
                          }))
                        }
                        className="w-full accent-indigo-600"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Edge Feathering & Tolerance */}
              <div className="space-y-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {t.edgeFeather}
                  </span>
                  <p className="text-[11px] text-neutral-500">{t.edgeFeatherHelp}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Radius</span>
                    <span className="font-mono text-neutral-500">{settings.featherRadius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="6"
                    step="1"
                    value={settings.featherRadius}
                    onChange={(e) =>
                      reprocessMatting(settings.tolerance, parseInt(e.target.value, 10), settings.whiteShield, settings.defringe)
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-400">Color Sensitivity (Tolerance)</span>
                    <span className="font-mono text-neutral-500">{settings.tolerance}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={settings.tolerance}
                    onChange={(e) =>
                      reprocessMatting(parseInt(e.target.value, 10), settings.featherRadius, settings.whiteShield, settings.defringe)
                    }
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MARKETPLACE PRESETS & AUTO-CROP */}
          {activeTab === 'presets' && (
            <div className="space-y-5">
              {/* Auto-Crop */}
              <div className="p-3.5 bg-neutral-50 dark:bg-neutral-800/60 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                    {t.autoCropTitle}
                  </span>
                  <p className="text-[11px] text-neutral-500">{t.autoCropDesc}</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="150"
                    value={settings.autoCropPadding}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, autoCropPadding: parseInt(e.target.value, 10) || 0 }))
                    }
                    className="w-20 px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                  <span className="text-xs text-neutral-500">{t.padding}</span>
                </div>

                <button
                  onClick={handleAutoCrop}
                  className="w-full py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Trim & Crop to Subject
                </button>
              </div>

              {/* Marketplace Presets */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block">
                  Marketplace Standards
                </span>

                <div className="space-y-2">
                  {CROP_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleApplyPreset(preset)}
                      className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-start justify-between ${
                        settings.selectedPreset === preset.id
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                          {preset.name}
                        </span>
                        <span className="text-[11px] text-neutral-500">{preset.description}</span>
                      </div>
                      {settings.selectedPreset === preset.id && (
                        <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM EXPORT CTA */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button
            onClick={() => setDownloadModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99]"
          >
            <Download className="w-4 h-4" />
            <span>{t.btnDownload}</span>
          </button>
        </div>
      </div>

      {/* RIGHT: Main Interactive Canvas Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-neutral-200 dark:bg-neutral-950 select-none"
      >
        {/* Floating Top Viewport Controls */}
        <div className="absolute top-4 z-30 flex items-center gap-2 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800/80 shadow-md">
          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
              compareMode
                ? 'bg-indigo-600 text-white'
                : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>{t.splitCompare}</span>
          </button>

          <div className="w-[1px] h-4 bg-neutral-200 dark:border-neutral-800" />

          {/* Zoom controls */}
          <button
            onClick={() => setSettings((prev) => ({ ...prev, zoom: Math.max(0.2, prev.zoom - 0.15) }))}
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            title={t.zoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs text-neutral-600 dark:text-neutral-400 min-w-10 text-center">
            {Math.round(settings.zoom * 100)}%
          </span>

          <button
            onClick={() => setSettings((prev) => ({ ...prev, zoom: Math.min(4, prev.zoom + 0.15) }))}
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            title={t.zoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSettings((prev) => ({ ...prev, zoom: 1, pan: { x: 0, y: 0 } }))}
            className="p-1.5 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            title={t.zoomFit}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Compare Slider Bar (when in Compare Mode) */}
        {compareMode && (
          <div className="absolute bottom-6 z-30 w-72 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md p-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              <span>{t.viewCutoutOnly}</span>
              <span>{t.viewOriginal}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={comparePosition}
              onChange={(e) => setComparePosition(parseInt(e.target.value, 10))}
              className="w-full accent-indigo-600 cursor-ew-resize"
            />
          </div>
        )}

        {/* Viewport Canvas Container */}
        <div
          className="relative max-w-full max-h-full transition-transform duration-75 ease-out shadow-2xl rounded-lg overflow-hidden"
          style={{
            transform: `translate(${settings.pan.x}px, ${settings.pan.y}px) scale(${settings.zoom})`,
            transformOrigin: 'center center',
          }}
        >
          {/* Transparent Checkerboard layer underneath */}
          <div className="absolute inset-0 bg-checkerboard -z-10" />

          {/* Interactive display canvas */}
          <canvas
            ref={displayCanvasRef}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`max-w-[85vw] max-h-[80vh] object-contain block ${
              activeTab === 'refine' && !compareMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
            }`}
          />
        </div>
      </div>

      {/* DOWNLOAD / EXPORT MODAL */}
      {downloadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {t.btnDownload}
              </h3>
              <button
                onClick={() => setDownloadModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Format choice */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExportFormat('png')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    exportFormat === 'png'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="font-bold text-sm">PNG (HD)</div>
                  <div className="text-[11px] text-neutral-500">Lossless transparency</div>
                </button>

                <button
                  type="button"
                  onClick={() => setExportFormat('jpg')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    exportFormat === 'jpg'
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="font-bold text-sm">JPG</div>
                  <div className="text-[11px] text-neutral-500">With background & shadow</div>
                </button>
              </div>
            </div>

            {/* Quality Slider for JPG */}
            {exportFormat === 'jpg' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-600 dark:text-neutral-400">Quality</span>
                  <span className="font-mono text-neutral-500">{Math.round(exportQuality * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.0"
                  step="0.05"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            )}

            {/* Dimension info */}
            <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Output Resolution:</span>
                <span className="font-mono font-medium text-neutral-900 dark:text-neutral-100">
                  {cutoutCanvasRef.current?.width || originalDims.width} ×{' '}
                  {cutoutCanvasRef.current?.height || originalDims.height} px
                </span>
              </div>
              <div className="flex justify-between text-neutral-600 dark:text-neutral-400">
                <span>Selected Background:</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                  {settings.backgroundType}
                </span>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDownloadModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Save Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
