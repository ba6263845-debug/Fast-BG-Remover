export type Language = 'en' | 'bn';

export type BackgroundType = 'transparent' | 'color' | 'gradient' | 'ai-scene' | 'image' | 'blur';

export interface GradientOption {
  id: string;
  name: string;
  css: string;
  colors: string[];
}

export interface ShadowOptions {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
}

export interface ContactShadowOptions {
  enabled: boolean;
  intensity: number; // 0 to 1
  spread: number; // 10 to 100
  verticalOffset: number;
}

export interface CropPreset {
  id: string;
  name: string;
  ratio?: number; // width / height
  width?: number;
  height?: number;
  description: string;
}

export type BrushMode = 'erase' | 'restore' | 'magic-wand';

export interface BrushSettings {
  mode: BrushMode;
  size: number; // in pixels (5 - 150)
  hardness: number; // 0 to 1
  opacity: number; // 0.1 to 1
}

export type AIModelType = 'birefnet' | 'gemini-vision' | 'u2net' | 'instant';

export interface EditorSettings {
  backgroundType: BackgroundType;
  backgroundColor: string;
  backgroundGradient: string;
  backgroundImageUrl: string | null;
  featherRadius: number; // 0 to 10
  smoothing: number; // 0 to 5
  tolerance: number; // 5 to 50
  autoCropPadding: number; // 0 to 100 px
  defringe: number; // 0 to 100 (removes background color cast/halo on edge pixels)
  whiteShield: boolean; // shields white product soles, shirts, and highlights
  edgeSharpness: number; // subpixel crispness
  shadow: ShadowOptions;
  contactShadow: ContactShadowOptions;
  aiModel: AIModelType;
  selectedPreset: string | null;
  zoom: number; // 0.2 to 4
  pan: { x: number; y: number };
}

export interface HistoryState {
  maskData: ImageData | null;
  settings: EditorSettings;
}

export interface BatchItem {
  id: string;
  file: File;
  name: string;
  size: number;
  originalUrl: string;
  resultUrl: string | null;
  status: 'pending' | 'processing' | 'done' | 'error';
  progress: number;
  errorMessage?: string;
  processingTimeMs?: number;
}

export interface ModelOption {
  id: AIModelType;
  name: string;
  description: string;
  badge?: string;
  speed: string;
}
