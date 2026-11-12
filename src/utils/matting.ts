import { EditorSettings, ShadowOptions } from '../types';

/**
 * Calculates Euclidean color distance between two RGB colors
 */
export function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/**
 * Computes Sobel gradient magnitude map for the image.
 * This acts as a physical edge barrier preventing flood fills from crossing into
 * white product soles, shirts, watches, or light metals.
 */
export function computeSobelEdgeMap(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const total = width * height;
  const edgeMap = new Float32Array(total);
  const grayscale = new Float32Array(total);

  // Convert to luminance
  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    grayscale[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }

  // Sobel 3x3 filter
  for (let y = 1; y < height - 1; y++) {
    const rowOffset = y * width;
    for (let x = 1; x < width - 1; x++) {
      const p = rowOffset + x;

      const gx =
        -1 * grayscale[p - width - 1] +
        1 * grayscale[p - width + 1] +
        -2 * grayscale[p - 1] +
        2 * grayscale[p + 1] +
        -1 * grayscale[p + width - 1] +
        1 * grayscale[p + width + 1];

      const gy =
        -1 * grayscale[p - width - 1] +
        -2 * grayscale[p - width] +
        -1 * grayscale[p - width + 1] +
        1 * grayscale[p + width - 1] +
        2 * grayscale[p + width] +
        1 * grayscale[p + width + 1];

      edgeMap[p] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edgeMap;
}

/**
 * Samples perimeter corner and edge clusters to fit a 2D bilinear background gradient plane.
 * In real photography, lighting is never flat—it is a smooth gradient across the surface.
 */
export interface BilinearBackgroundModel {
  tl: [number, number, number]; // top-left
  tr: [number, number, number]; // top-right
  bl: [number, number, number]; // bottom-left
  br: [number, number, number]; // bottom-right
  samples: Array<[number, number, number]>;
}

export function sampleBilinearBackgroundModel(
  data: Uint8ClampedArray,
  width: number,
  height: number
): BilinearBackgroundModel {
  // Average cluster around 4 corners (10x10 patch each)
  function getCornerAverage(startX: number, startY: number): [number, number, number] {
    let r = 0,
      g = 0,
      b = 0,
      count = 0;
    const patchSize = Math.max(5, Math.floor(Math.min(width, height) / 30));
    for (let y = startY; y < startY + patchSize; y++) {
      for (let x = startX; x < startX + patchSize; x++) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          r += data[idx];
          g += data[idx + 1];
          b += data[idx + 2];
          count++;
        }
      }
    }
    return count > 0 ? [r / count, g / count, b / count] : [240, 240, 240];
  }

  const patch = Math.max(5, Math.floor(Math.min(width, height) / 30));
  const tl = getCornerAverage(2, 2);
  const tr = getCornerAverage(width - patch - 2, 2);
  const bl = getCornerAverage(2, height - patch - 2);
  const br = getCornerAverage(width - patch - 2, height - patch - 2);

  // Border samples along all 4 perimeter edges
  const samples: Array<[number, number, number]> = [];
  const step = Math.max(1, Math.floor(Math.min(width, height) / 60));

  for (let x = 0; x < width; x += step) {
    let idx = (0 * width + x) * 4;
    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    idx = ((height - 1) * width + x) * 4;
    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
  }
  for (let y = 0; y < height; y += step) {
    let idx = (y * width + 0) * 4;
    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
    idx = (y * width + (width - 1)) * 4;
    samples.push([data[idx], data[idx + 1], data[idx + 2]]);
  }

  return { tl, tr, bl, br, samples };
}

/**
 * Predicts expected background color at coordinate (x, y) using Bilinear Interpolation.
 */
export function predictBackgroundColor(
  model: BilinearBackgroundModel,
  x: number,
  y: number,
  width: number,
  height: number
): [number, number, number] {
  const u = Math.min(1, Math.max(0, x / width));
  const v = Math.min(1, Math.max(0, y / height));

  // Bilinear interpolation
  const r =
    (1 - u) * (1 - v) * model.tl[0] +
    u * (1 - v) * model.tr[0] +
    (1 - u) * v * model.bl[0] +
    u * v * model.br[0];

  const g =
    (1 - u) * (1 - v) * model.tl[1] +
    u * (1 - v) * model.tr[1] +
    (1 - u) * v * model.bl[1] +
    u * v * model.br[1];

  const b =
    (1 - u) * (1 - v) * model.tl[2] +
    u * (1 - v) * model.tr[2] +
    (1 - u) * v * model.bl[2] +
    u * v * model.br[2];

  return [r, g, b];
}

/**
 * De-fringe / Color Decontamination:
 * Cleans up edge pixels where the background color bleeds into the subject perimeter.
 */
export function decontaminateEdges(
  data: Uint8ClampedArray,
  alpha: Uint8Array,
  width: number,
  height: number,
  defringeStrength: number = 50
): void {
  if (defringeStrength <= 0) return;
  const factor = defringeStrength / 100;
  const radius = 2;

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const p = y * width + x;
      const a = alpha[p];

      if (a > 10 && a < 240) {
        let bestFgR = 0,
          bestFgG = 0,
          bestFgB = 0;
        let count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const np = (y + dy) * width + (x + dx);
            if (alpha[np] >= 240) {
              const nIdx = np * 4;
              bestFgR += data[nIdx];
              bestFgG += data[nIdx + 1];
              bestFgB += data[nIdx + 2];
              count++;
            }
          }
        }

        if (count > 0) {
          const avgR = bestFgR / count;
          const avgG = bestFgG / count;
          const avgB = bestFgB / count;

          const pIdx = p * 4;
          data[pIdx] = Math.round(data[pIdx] * (1 - factor) + avgR * factor);
          data[pIdx + 1] = Math.round(data[pIdx + 1] * (1 - factor) + avgG * factor);
          data[pIdx + 2] = Math.round(data[pIdx + 2] * (1 - factor) + avgB * factor);
        }
      }
    }
  }
}

/**
 * Interactive Magic Wand Tool:
 * Click anywhere on an unwanted background area or spot to erase it.
 * Uses contiguous flood fill guided by color tolerance and Sobel edges.
 */
export function applyMagicWand(
  sourceCanvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  tolerance: number = 32
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const x0 = Math.min(width - 1, Math.max(0, Math.round(startX)));
  const y0 = Math.min(height - 1, Math.max(0, Math.round(startY)));
  const startIdx = (y0 * width + x0) * 4;
  const targetR = data[startIdx];
  const targetG = data[startIdx + 1];
  const targetB = data[startIdx + 2];

  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const edgeMap = computeSobelEdgeMap(data, width, height);

  const queue: number[] = [y0 * width + x0];
  const tolDist = tolerance * 3.5;

  let queueIdx = 0;
  while (queueIdx < queue.length) {
    const p = queue[queueIdx++];
    if (visited[p]) continue;
    visited[p] = 1;

    const px = p % width;
    const py = Math.floor(p / width);
    const offset = p * 4;

    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    const dist = colorDistance(r, g, b, targetR, targetG, targetB);
    const isEdge = edgeMap[p] > 55;

    if (dist <= tolDist && !isEdge) {
      // Set pixel transparent
      data[offset + 3] = 0;

      // Expand to 4 neighbors
      if (px > 0 && !visited[p - 1]) queue.push(p - 1);
      if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
      if (py > 0 && !visited[p - width]) queue.push(p - width);
      if (py < height - 1 && !visited[p + width]) queue.push(p + width);
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return sourceCanvas;
}

/**
 * Ultra-Advanced Edge-Guarded AI Matting Pipeline
 * - 2D Bilinear Background Gradient Surface Modeling
 * - Sobel gradient barrier protection for white soles, shirts, and metals
 * - Center-prior spatial saliency protection
 * - Morphological despeckling
 * - Subpixel anti-aliasing feather
 * - Color decontamination (De-fringe)
 */
export function processAlphaMatting(
  sourceCanvas: HTMLCanvasElement,
  options: {
    tolerance?: number;
    feather?: number;
    smoothing?: number;
    whiteShield?: boolean;
    defringe?: number;
  } = {}
): HTMLCanvasElement {
  const tolerance = (options.tolerance ?? 24) * 3.8;
  const feather = options.feather ?? 2;
  const smoothing = options.smoothing ?? 1;
  const whiteShield = options.whiteShield ?? true;
  const defringe = options.defringe ?? 50;

  const width = sourceCanvas.width;
  const height = sourceCanvas.height;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = width;
  outputCanvas.height = height;
  const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Calculate Sobel gradient barrier map
  const edgeMap = computeSobelEdgeMap(data, width, height);

  // 2. Fit 2D Bilinear Background lighting surface
  const bgModel = sampleBilinearBackgroundModel(data, width, height);

  // 3. Flood-fill from outer borders with 2D Bilinear Gradient Reference
  const totalPixels = width * height;
  const isBg = new Uint8Array(totalPixels);
  const visited = new Uint8Array(totalPixels);
  const queue: number[] = [];

  // Seed boundary perimeter
  for (let x = 0; x < width; x++) {
    queue.push(0 * width + x);
    queue.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    queue.push(y * width + 0);
    queue.push(y * width + (width - 1));
  }

  // Edge barrier threshold (Sobel magnitude)
  const edgeBarrierThreshold = whiteShield ? 40 : 65;

  let queueIdx = 0;
  while (queueIdx < queue.length) {
    const p = queue[queueIdx++];
    if (visited[p]) continue;
    visited[p] = 1;

    const px = p % width;
    const py = Math.floor(p / width);
    const offset = p * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Distance to local 2D bilinear background prediction
    const predBg = predictBackgroundColor(bgModel, px, py, width, height);
    const localDist = colorDistance(r, g, b, predBg[0], predBg[1], predBg[2]);

    // Also check minimum distance to sampled perimeter points
    let sampleDist = localDist;
    const checkSamplesCount = Math.min(20, bgModel.samples.length);
    for (let i = 0; i < checkSamplesCount; i++) {
      const s = bgModel.samples[i];
      const d = colorDistance(r, g, b, s[0], s[1], s[2]);
      if (d < sampleDist) sampleDist = d;
    }

    const effectiveDist = Math.min(localDist, sampleDist);
    const isEdgeBlocked = edgeMap[p] > edgeBarrierThreshold;

    if (effectiveDist < tolerance && !isEdgeBlocked) {
      isBg[p] = 1;

      // Expand to 4-connected neighbors
      if (px > 0 && !visited[p - 1]) queue.push(p - 1);
      if (px < width - 1 && !visited[p + 1]) queue.push(p + 1);
      if (py > 0 && !visited[p - width]) queue.push(p - width);
      if (py < height - 1 && !visited[p + width]) queue.push(p + width);
    }
  }

  // 4. White Product Protection: Central core shield
  if (whiteShield) {
    const marginX = Math.floor(width * 0.12);
    const marginY = Math.floor(height * 0.12);
    for (let y = marginY; y < height - marginY; y++) {
      for (let x = marginX; x < width - marginX; x++) {
        const p = y * width + x;
        if (isBg[p] === 1 && edgeMap[p] > 30) {
          // If surrounded on either side by foreground, protect it
          if (
            (isBg[p - 2] === 0 || isBg[p + 2] === 0) &&
            (isBg[p - width * 2] === 0 || isBg[p + width * 2] === 0)
          ) {
            isBg[p] = 0;
          }
        }
      }
    }
  }

  // 5. Morphological Hole-Filling & Smoothing
  if (smoothing > 0) {
    const tempBg = new Uint8Array(isBg);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const p = y * width + x;
        if (tempBg[p] === 1) {
          let fgNeighbors = 0;
          if (tempBg[p - 1] === 0) fgNeighbors++;
          if (tempBg[p + 1] === 0) fgNeighbors++;
          if (tempBg[p - width] === 0) fgNeighbors++;
          if (tempBg[p + width] === 0) fgNeighbors++;
          if (fgNeighbors >= 3) {
            isBg[p] = 0;
          }
        }
      }
    }
  }

  // 6. Subpixel Anti-Aliased Alpha Assignment
  const alphaChannel = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    alphaChannel[i] = isBg[i] === 1 ? 0 : 255;
  }

  // Smooth feathering
  if (feather > 0) {
    const radius = Math.min(5, Math.max(1, Math.round(feather)));
    const feathered = new Uint8Array(totalPixels);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        let sum = 0;
        let count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= height) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= width) continue;
            sum += alphaChannel[ny * width + nx];
            count++;
          }
        }
        feathered[p] = Math.round(sum / count);
      }
    }

    for (let i = 0; i < totalPixels; i++) {
      alphaChannel[i] = feathered[i];
      data[i * 4 + 3] = feathered[i];
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      data[i * 4 + 3] = alphaChannel[i];
    }
  }

  // 7. De-fringe color halo
  if (defringe > 0) {
    decontaminateEdges(data, alphaChannel, width, height, defringe);
  }

  ctx.putImageData(imgData, 0, 0);
  return outputCanvas;
}

/**
 * Calculates bounding box of foreground subject.
 */
export function getSubjectBounds(canvas: HTMLCanvasElement): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return { minX: 0, minY: 0, maxX: width, maxY: height, width, height };

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 15) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) {
    return { minX: 0, minY: 0, maxX: width, maxY: height, width, height };
  }

  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Calculates bounding box of the foreground subject and auto-crops with padding.
 */
export function autoCropCanvas(
  sourceCanvas: HTMLCanvasElement,
  padding: number = 20,
  targetRatio?: number
): HTMLCanvasElement {
  const width = sourceCanvas.width;
  const height = sourceCanvas.height;
  const bounds = getSubjectBounds(sourceCanvas);

  let minX = Math.max(0, bounds.minX - padding);
  let minY = Math.max(0, bounds.minY - padding);
  let maxX = Math.min(width - 1, bounds.maxX + padding);
  let maxY = Math.min(height - 1, bounds.maxY + padding);

  let cropW = maxX - minX + 1;
  let cropH = maxY - minY + 1;

  if (targetRatio && targetRatio > 0) {
    const currentRatio = cropW / cropH;
    if (currentRatio < targetRatio) {
      const desiredW = Math.round(cropH * targetRatio);
      const diff = desiredW - cropW;
      minX = Math.max(0, minX - Math.floor(diff / 2));
      maxX = Math.min(width - 1, maxX + Math.ceil(diff / 2));
      cropW = maxX - minX + 1;
    } else if (currentRatio > targetRatio) {
      const desiredH = Math.round(cropW / targetRatio);
      const diff = desiredH - cropH;
      minY = Math.max(0, minY - Math.floor(diff / 2));
      maxY = Math.min(height - 1, maxY + Math.ceil(diff / 2));
      cropH = maxY - minY + 1;
    }
  }

  const cropped = document.createElement('canvas');
  cropped.width = cropW;
  cropped.height = cropH;
  const cCtx = cropped.getContext('2d');
  if (cCtx) {
    cCtx.drawImage(sourceCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  }

  return cropped;
}

/**
 * Renders realistic product contact shadow underneath the base of the product.
 */
export function drawContactGroundShadow(
  ctx: CanvasRenderingContext2D,
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number },
  canvasWidth: number,
  canvasHeight: number,
  options: { intensity: number; spread: number; verticalOffset: number }
): void {
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const baseY = bounds.maxY + (options.verticalOffset || 4);
  const radiusX = (bounds.width / 2) * (options.spread / 100);
  const radiusY = Math.max(6, bounds.height * 0.05);

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, baseY, Math.max(10, radiusX), Math.max(4, radiusY), 0, 0, Math.PI * 2);

  const grad = ctx.createRadialGradient(centerX, baseY, 0, centerX, baseY, Math.max(10, radiusX));
  grad.addColorStop(0, `rgba(0, 0, 0, ${options.intensity * 0.45})`);
  grad.addColorStop(0.5, `rgba(0, 0, 0, ${options.intensity * 0.2})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

/**
 * Composites the final output with background, realistic ground shadow,
 * drop shadow, and clean subject cutout.
 */
export async function renderCompositedCanvas(
  cutoutCanvas: HTMLCanvasElement,
  originalCanvas: HTMLCanvasElement | null,
  settings: EditorSettings,
  targetDimensions?: { width: number; height: number }
): Promise<HTMLCanvasElement> {
  const width = targetDimensions?.width ?? cutoutCanvas.width;
  const height = targetDimensions?.height ?? cutoutCanvas.height;

  const compCanvas = document.createElement('canvas');
  compCanvas.width = width;
  compCanvas.height = height;
  const ctx = compCanvas.getContext('2d');
  if (!ctx) return cutoutCanvas;

  // 1. Draw Background
  if (settings.backgroundType === 'color') {
    ctx.fillStyle = settings.backgroundColor || '#ffffff';
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
    } else if (settings.backgroundGradient === 'studio-grey') {
      grad.addColorStop(0, '#f8fafc');
      grad.addColorStop(1, '#cbd5e1');
    } else if (settings.backgroundGradient === 'warm-glow') {
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(1, '#fed7aa');
    } else {
      grad.addColorStop(0, '#f1f5f9');
      grad.addColorStop(1, '#e2e8f0');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  } else if (settings.backgroundType === 'blur' && originalCanvas) {
    ctx.save();
    ctx.filter = 'blur(18px)';
    ctx.drawImage(originalCanvas, 0, 0, width, height);
    ctx.restore();
  } else if ((settings.backgroundType === 'image' || settings.backgroundType === 'ai-scene') && settings.backgroundImageUrl) {
    await new Promise<void>((resolve) => {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, width, height);
        resolve();
      };
      bgImg.onerror = () => resolve();
      bgImg.src = settings.backgroundImageUrl!;
    });
  }

  // 2. Render Realistic Ground Contact Shadow for products
  if (settings.contactShadow?.enabled) {
    const bounds = getSubjectBounds(cutoutCanvas);
    drawContactGroundShadow(ctx, bounds, width, height, settings.contactShadow);
  }

  // 3. Render Floating Drop Shadow (if enabled)
  if (settings.shadow.enabled) {
    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${settings.shadow.opacity})`;
    ctx.shadowBlur = settings.shadow.blur;
    ctx.shadowOffsetX = settings.shadow.offsetX;
    ctx.shadowOffsetY = settings.shadow.offsetY;
    ctx.drawImage(cutoutCanvas, 0, 0, width, height);
    ctx.restore();
  }

  // 4. Render Cutout Foreground on top
  ctx.drawImage(cutoutCanvas, 0, 0, width, height);

  return compCanvas;
}

/**
 * Re-encodes uploaded File to strip EXIF, verify size and MIME type.
 */
export async function sanitizeAndStripExif(file: File): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return reject(new Error('Invalid file type. Please upload a JPG, PNG, or WEBP image.'));
    }

    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error('File exceeds the 10 MB size limit.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to create canvas context.'));
        }
        ctx.drawImage(img, 0, 0);
        const cleanDataUrl = canvas.toDataURL('image/png');
        resolve({
          dataUrl: cleanDataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}
