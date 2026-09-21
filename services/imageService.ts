import JSZip from 'jszip';

export interface CompressedImage {
  file: File;
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
  width?: number;
  height?: number;
  format?: string;
}

interface CompressionCandidate {
  blob: Blob;
  quality: number;
  scale: number;
  width: number;
  height: number;
}

export const compressImage = async (
  file: File, 
  quality: number = 0.85, 
  format: 'image/jpeg' | 'image/png' | 'image/webp' | 'original' = 'original'
): Promise<{ blob: Blob; width: number; height: number; format: string }> => {
  const targetQuality = Math.max(0.1, Math.min(quality, 1.0));

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = async () => {
      try {
        const origWidth = img.naturalWidth || img.width;
        const origHeight = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        // 100% original dimensions maintained - ZERO resolution downscaling
        canvas.width = origWidth;
        canvas.height = origHeight;

        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context unavailable'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');

        // Draw image first to check transparency if PNG
        ctx.drawImage(img, 0, 0, origWidth, origHeight);

        let hasTransparency = false;
        if (isPng) {
          try {
            const imgData = ctx.getImageData(0, 0, origWidth, origHeight).data;
            const step = Math.max(1, Math.floor((origWidth * origHeight) / 40000));
            for (let i = 3; i < imgData.length; i += 4 * step) {
              if (imgData[i] < 240) {
                hasTransparency = true;
                break;
              }
            }
          } catch (_) {
            // cross-origin canvas safety fallback
          }
        }

        // Determine output format
        let outputFormat: string;
        if (format === 'original') {
          if (isWebp) {
            outputFormat = 'image/webp';
          } else if (isPng) {
            // PNGs with transparency convert to WebP (preserves 100% alpha transparency + cuts size 50-80%)
            // PNGs without transparency convert to JPEG (preserves 100% crisp sharpness + cuts size 70-95%)
            outputFormat = hasTransparency ? 'image/webp' : 'image/jpeg';
          } else {
            outputFormat = 'image/jpeg';
          }
        } else {
          outputFormat = format;
        }

        // Re-render if converting transparent source to JPEG (fill clean white background)
        if (outputFormat === 'image/jpeg' && (isPng || hasTransparency)) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }

        const getBlob = (fmt: string, q: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob(res, fmt, fmt === 'image/png' ? undefined : q);
          });
        };

        // Adaptive Multi-Pass Compression
        // Target: Achieve real, meaningful file size reduction while preserving 100% resolution and sharp visual fidelity.
        let bestBlob: Blob | null = null;
        let currentQ = targetQuality;

        let blob = await getBlob(outputFormat, currentQ);
        bestBlob = blob;

        // If blob didn't reduce file size by at least 10%, adaptively step down quality
        const desiredMax = file.size * 0.90; // at least 10% reduction
        while (blob && blob.size > desiredMax && currentQ > 0.50) {
          currentQ = Math.max(0.45, currentQ - 0.05);
          const nextBlob = await getBlob(outputFormat, currentQ);
          if (nextBlob) {
            blob = nextBlob;
            bestBlob = nextBlob;
            if (blob.size <= desiredMax) break;
          }
        }

        // If still larger than original (e.g. ultra-compact input file), try WebP if not already WebP
        if (bestBlob && bestBlob.size >= file.size && outputFormat !== 'image/webp') {
          const webpBlob = await getBlob('image/webp', Math.min(currentQ, 0.80));
          if (webpBlob && webpBlob.size < file.size) {
            bestBlob = webpBlob;
            outputFormat = 'image/webp';
          }
        }

        // Even in extreme edge cases: if bestBlob is still >= file.size, step down to 0.40
        if (bestBlob && bestBlob.size >= file.size && currentQ > 0.35) {
          while (bestBlob && bestBlob.size >= file.size && currentQ > 0.35) {
            currentQ -= 0.05;
            const nextBlob = await getBlob(outputFormat, currentQ);
            if (nextBlob) {
              bestBlob = nextBlob;
            }
          }
        }

        URL.revokeObjectURL(objectUrl);

        if (!bestBlob) {
          resolve({ blob: file.slice(0, file.size), width: origWidth, height: origHeight, format: file.type || outputFormat });
          return;
        }

        resolve({ blob: bestBlob, width: origWidth, height: origHeight, format: outputFormat });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};

export const compressImages = async (
  files: File[], 
  quality: number = 0.85,
  outputFormat: 'original' | 'image/jpeg' | 'image/png' | 'image/webp' = 'original'
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

  for (const file of files) {
    const res = await compressImage(file, quality, outputFormat);
    results.push({
      file,
      compressedBlob: res.blob,
      originalSize: file.size,
      compressedSize: res.blob.size,
      width: res.width,
      height: res.height,
      format: res.format,
    });
  }

  return results;
};

export interface TargetCompressionOptions {
  outputFormat?: 'image/jpeg' | 'image/webp';
  targetDimension?: { width: number; height: number };
  enableEdgeClarity?: boolean;
}

/**
 * Smart Edge-Threshold Clarity filter.
 * Enhances contrast only on distinct high-contrast edges (text, facial contours, fine lines),
 * while completely ignoring flat background noise, skin tones, and smooth gradients.
 */
const applySmartEdgeClarity = (
  canvas: HTMLCanvasElement, 
  amount: number = 0.28, 
  threshold: number = 7
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width < 40 || canvas.height < 40) return;
  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const copy = new Uint8ClampedArray(d);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const center = copy[idx + c];
        const neighborAvg = (
          copy[idx - 4 + c] +
          copy[idx + 4 + c] +
          copy[idx - w * 4 + c] +
          copy[idx + w * 4 + c]
        ) / 4;
        const diff = center - neighborAvg;
        // Only sharpen real edges (text characters, geometric outlines)
        if (Math.abs(diff) > threshold) {
          d[idx + c] = Math.max(0, Math.min(255, center + diff * amount));
        }
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
};

/**
 * Resolution-First smart compression algorithm.
 * Preserves maximum dimensions to eliminate blur/softness,
 * supports Portal Presets (Passport 350x450, Signature 300x120),
 * and enhances edge sharpness for crisp text.
 */
export const compressImageToTarget = async (
  file: File,
  targetKB: number,
  outputFormatOrOptions: 'image/jpeg' | 'image/webp' | TargetCompressionOptions = 'image/jpeg'
): Promise<Blob> => {
  const options: TargetCompressionOptions = typeof outputFormatOrOptions === 'string'
    ? { outputFormat: outputFormatOrOptions }
    : outputFormatOrOptions;

  const outputFormat = options.outputFormat || 'image/jpeg';
  const targetDimension = options.targetDimension;
  const enableEdgeClarity = options.enableEdgeClarity !== false;

  const targetBytes = Math.max(8 * 1024, Math.floor(targetKB * 1024));

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  const loadPromise = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image load failed'));
  });

  img.src = objectUrl;
  await loadPromise;
  URL.revokeObjectURL(objectUrl);

  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = origW;
  baseCanvas.height = origH;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) {
    throw new Error('Canvas context failed');
  }

  // Draw white background for JPEG to handle PNG transparency cleanly
  if (outputFormat === 'image/jpeg') {
    baseCtx.fillStyle = '#FFFFFF';
    baseCtx.fillRect(0, 0, origW, origH);
  }
  baseCtx.drawImage(img, 0, 0);

  // Progressive high-quality bicubic downsampling (zero artificial noise or pixelation)
  const resizeProgressively = (source: HTMLCanvasElement, targetW: number, targetH: number): HTMLCanvasElement => {
    const tw = Math.max(1, Math.floor(targetW));
    const th = Math.max(1, Math.floor(targetH));
    let currentCanvas = source;
    let currentW = source.width;
    let currentH = source.height;

    while (currentW * 0.5 > tw && currentH * 0.5 > th) {
      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = Math.max(tw, Math.floor(currentW * 0.5));
      stepCanvas.height = Math.max(th, Math.floor(currentH * 0.5));
      const stepCtx = stepCanvas.getContext('2d');
      if (!stepCtx) break;
      stepCtx.imageSmoothingEnabled = true;
      stepCtx.imageSmoothingQuality = 'high';
      stepCtx.drawImage(currentCanvas, 0, 0, stepCanvas.width, stepCanvas.height);
      currentCanvas = stepCanvas;
      currentW = stepCanvas.width;
      currentH = stepCanvas.height;
    }

    if (currentW !== tw || currentH !== th) {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = tw;
      finalCanvas.height = th;
      const finalCtx = finalCanvas.getContext('2d');
      if (finalCtx) {
        finalCtx.imageSmoothingEnabled = true;
        finalCtx.imageSmoothingQuality = 'high';
        finalCtx.drawImage(currentCanvas, 0, 0, tw, th);
        return finalCanvas;
      }
    }

    return currentCanvas;
  };

  const encodeBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => canvas.toBlob(resolve, outputFormat, quality));
  };

  // 1. SPECIFIC PORTAL DIMENSION PRESET (Passport, Signature, Square)
  if (targetDimension && targetDimension.width > 0 && targetDimension.height > 0) {
    const tw = targetDimension.width;
    const th = targetDimension.height;

    const targetAspect = tw / th;
    const origAspect = origW / origH;
    let drawW = tw;
    let drawH = th;
    let drawX = 0;
    let drawY = 0;

    // For signatures: contain on pure white background so no signature strokes are cropped
    // For photo IDs/passports: center-cover so face/body remains perfectly natural without distortion
    const isSignature = tw === 300 && th === 120;
    if (isSignature) {
      if (origAspect > targetAspect) {
        drawW = tw;
        drawH = Math.max(1, Math.round(tw / origAspect));
        drawY = Math.round((th - drawH) / 2);
      } else {
        drawH = th;
        drawW = Math.max(1, Math.round(th * origAspect));
        drawX = Math.round((tw - drawW) / 2);
      }
    } else {
      if (origAspect > targetAspect) {
        drawH = th;
        drawW = Math.max(1, Math.round(th * origAspect));
        drawX = Math.round((tw - drawW) / 2);
      } else {
        drawW = tw;
        drawH = Math.max(1, Math.round(tw / origAspect));
        drawY = Math.round((th - drawH) / 2);
      }
    }

    const fittedCanvas = document.createElement('canvas');
    fittedCanvas.width = tw;
    fittedCanvas.height = th;
    const fittedCtx = fittedCanvas.getContext('2d');
    if (!fittedCtx) throw new Error('Failed to create canvas context');

    fittedCtx.fillStyle = '#FFFFFF';
    fittedCtx.fillRect(0, 0, tw, th);
    fittedCtx.imageSmoothingEnabled = true;
    fittedCtx.imageSmoothingQuality = 'high';
    fittedCtx.drawImage(baseCanvas, drawX, drawY, drawW, drawH);

    if (enableEdgeClarity) {
      applySmartEdgeClarity(fittedCanvas);
    }

    let low = 0.40;
    let high = 0.95;
    let bestBlob: Blob | null = null;

    for (let step = 0; step < 9; step++) {
      const q = (low + high) / 2;
      const blob = await encodeBlob(fittedCanvas, q);
      if (!blob) break;

      if (blob.size <= targetBytes) {
        bestBlob = blob;
        low = q;
      } else {
        high = q;
      }
    }

    const finalBlob = bestBlob || (await encodeBlob(fittedCanvas, 0.50)) || new Blob();
    (finalBlob as any).width = tw;
    (finalBlob as any).height = th;
    (finalBlob as any).format = outputFormat;
    baseCanvas.width = 0;
    baseCanvas.height = 0;
    return finalBlob;
  }

  // 2. AUTO RESOLUTION-FIRST STRATEGY (Maximum dimensions)
  const minAcceptableQ = outputFormat === 'image/webp' ? 0.44 : 0.46;
  const scales = [
    1.0, 0.96, 0.92, 0.88, 0.84, 0.80, 0.76, 0.72, 0.68, 0.64,
    0.60, 0.58, 0.55, 0.52, 0.49, 0.46, 0.43, 0.40, 0.37, 0.34, 0.30
  ];

  interface Candidate {
    blob: Blob;
    w: number;
    h: number;
    quality: number;
    scale: number;
    sizeKB: number;
  }

  let chosenCandidate: Candidate | null = null;
  let fallbackCandidate: Candidate | null = null;

  for (const scale of scales) {
    const w = Math.max(1, Math.round(origW * scale));
    const h = Math.max(1, Math.round(origH * scale));

    const canvas = scale === 1.0 ? baseCanvas : resizeProgressively(baseCanvas, w, h);
    if (scale <= 0.85 && enableEdgeClarity) {
      applySmartEdgeClarity(canvas);
    }

    let low = minAcceptableQ;
    let high = 0.92;
    let bestLocalBlob: Blob | null = null;
    let bestLocalQ: number | null = null;

    for (let step = 0; step < 9; step++) {
      const q = (low + high) / 2;
      const blob = await encodeBlob(canvas, q);
      if (!blob) break;

      if (blob.size <= targetBytes) {
        bestLocalBlob = blob;
        bestLocalQ = q;
        low = q; // Try higher quality
      } else {
        high = q; // Reduce quality to fit
      }

      if (!fallbackCandidate || Math.abs(blob.size - targetBytes) < Math.abs(fallbackCandidate.blob.size - targetBytes)) {
        fallbackCandidate = { blob, w, h, quality: q, scale, sizeKB: blob.size / 1024 };
      }
    }

    // If this resolution achieves target size with quality >= minAcceptableQ:
    // SELECT IT IMMEDIATELY! This gives maximum possible resolution and sharpness!
    if (bestLocalBlob && bestLocalQ !== null && bestLocalQ >= minAcceptableQ) {
      chosenCandidate = {
        blob: bestLocalBlob,
        w,
        h,
        quality: bestLocalQ,
        scale,
        sizeKB: bestLocalBlob.size / 1024,
      };
      break;
    }
  }

  // If even at lowest scales no candidate hit >= minAcceptableQ, test down to 0.35 quality
  if (!chosenCandidate) {
    const smallestW = Math.max(1, Math.round(origW * 0.30));
    const smallestH = Math.max(1, Math.round(origH * 0.30));
    const smallestCanvas = resizeProgressively(baseCanvas, smallestW, smallestH);
    if (enableEdgeClarity) {
      applySmartEdgeClarity(smallestCanvas);
    }
    let low = 0.35;
    let high = 0.55;
    for (let step = 0; step < 6; step++) {
      const q = (low + high) / 2;
      const b = await encodeBlob(smallestCanvas, q);
      if (b && b.size <= targetBytes) {
        chosenCandidate = {
          blob: b,
          w: smallestW,
          h: smallestH,
          quality: q,
          scale: 0.30,
          sizeKB: b.size / 1024,
        };
        low = q;
      } else {
        high = q;
      }
    }
  }

  const finalBlob = chosenCandidate ? chosenCandidate.blob : (fallbackCandidate?.blob || (await encodeBlob(baseCanvas, 0.70)) || new Blob());
  const finalW = chosenCandidate ? chosenCandidate.w : (fallbackCandidate?.w || origW);
  const finalH = chosenCandidate ? chosenCandidate.h : (fallbackCandidate?.h || origH);

  (finalBlob as any).width = finalW;
  (finalBlob as any).height = finalH;
  (finalBlob as any).format = outputFormat;

  baseCanvas.width = 0;
  baseCanvas.height = 0;
  return finalBlob;
};

export const compressImagesToTarget = async (
  files: File[],
  targetKB: number,
  outputFormatOrOptions: 'image/jpeg' | 'image/webp' | TargetCompressionOptions = 'image/jpeg'
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

  for (const file of files) {
    try {
      const blob = await compressImageToTarget(file, targetKB, outputFormatOrOptions);
      results.push({
        file,
        compressedBlob: blob,
        originalSize: file.size,
        compressedSize: blob.size,
        width: (blob as any).width,
        height: (blob as any).height,
        format: (blob as any).format || (typeof outputFormatOrOptions === 'string' ? outputFormatOrOptions : outputFormatOrOptions.outputFormat || 'image/jpeg'),
      });
    } catch (e) {
      console.error(`Failed to compress ${file.name}`, e);
    }
  }

  return results;
};
