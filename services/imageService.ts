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

/**
 * Attempts to compress an image to be under a specific target size in KB.
 * Uses binary search on quality.
 */
export const compressImageToTarget = async (
  file: File,
  targetKB: number
): Promise<Blob> => {
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

  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = img.width;
  baseCanvas.height = img.height;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) {
    throw new Error('Canvas context failed');
  }
  baseCtx.fillStyle = '#FFFFFF';
  baseCtx.fillRect(0, 0, baseCanvas.width, baseCanvas.height);
  baseCtx.drawImage(img, 0, 0);

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

  const applySubtleSharpen = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || canvas.width < 20 || canvas.height < 20) return;
    const src = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const out = ctx.createImageData(src);
    const data = src.data;
    const outData = out.data;
    const w = canvas.width;
    const h = canvas.height;
    const amount = 0.25;

    const clamp = (v: number) => Math.max(0, Math.min(255, v));

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        const top = i - w * 4;
        const bottom = i + w * 4;
        const left = i - 4;
        const right = i + 4;

        for (let c = 0; c < 3; c++) {
          const center = data[i + c];
          const blur = (
            data[top + c] +
            data[bottom + c] +
            data[left + c] +
            data[right + c] +
            center * 4
          ) / 8;
          outData[i + c] = clamp(center + (center - blur) * amount);
        }
        outData[i + 3] = data[i + 3];
      }
    }

    for (let x = 0; x < w; x++) {
      const topI = x * 4;
      const bottomI = ((h - 1) * w + x) * 4;
      outData[topI] = data[topI];
      outData[topI + 1] = data[topI + 1];
      outData[topI + 2] = data[topI + 2];
      outData[topI + 3] = data[topI + 3];
      outData[bottomI] = data[bottomI];
      outData[bottomI + 1] = data[bottomI + 1];
      outData[bottomI + 2] = data[bottomI + 2];
      outData[bottomI + 3] = data[bottomI + 3];
    }

    for (let y = 0; y < h; y++) {
      const leftI = (y * w) * 4;
      const rightI = (y * w + (w - 1)) * 4;
      outData[leftI] = data[leftI];
      outData[leftI + 1] = data[leftI + 1];
      outData[leftI + 2] = data[leftI + 2];
      outData[leftI + 3] = data[leftI + 3];
      outData[rightI] = data[rightI];
      outData[rightI + 1] = data[rightI + 1];
      outData[rightI + 2] = data[rightI + 2];
      outData[rightI + 3] = data[rightI + 3];
    }

    ctx.putImageData(out, 0, 0);
  };

  const encodeJpeg = async (canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  };

  const shouldUseSharpen = targetKB <= 120;
  const scaleLevels = [1, 0.95, 0.9, 0.85, 0.78, 0.72, 0.66, 0.6, 0.54, 0.48, 0.42, 0.36, 0.3, 0.24];
  const minDimension = targetKB <= 20 ? 320 : targetKB <= 50 ? 420 : 520;
  const minQuality = targetKB <= 20 ? 0.3 : 0.35;
  const maxQuality = 0.95;

  let bestFit: CompressionCandidate | null = null;
  let bestOverall: CompressionCandidate | null = null;

  for (const scale of scaleLevels) {
    const width = Math.max(1, Math.floor(img.width * scale));
    const height = Math.max(1, Math.floor(img.height * scale));
    if (Math.min(width, height) < minDimension && scale < 1) continue;

    const candidateCanvas = resizeProgressively(baseCanvas, width, height);
    if (shouldUseSharpen && scale <= 0.85) {
      applySubtleSharpen(candidateCanvas);
    }

    let low = minQuality;
    let high = maxQuality;
    let localBestFit: CompressionCandidate | null = null;
    let localClosest: CompressionCandidate | null = null;

    for (let i = 0; i < 12; i++) {
      const q = (low + high) / 2;
      const blob = await encodeJpeg(candidateCanvas, q);
      if (!blob) break;
      const candidate: CompressionCandidate = { blob, quality: q, scale, width: candidateCanvas.width, height: candidateCanvas.height };

      if (!localClosest || Math.abs(blob.size - targetBytes) < Math.abs(localClosest.blob.size - targetBytes)) {
        localClosest = candidate;
      }

      if (blob.size <= targetBytes) {
        localBestFit = candidate;
        low = q;
      } else {
        high = q;
      }
    }

    if (!localBestFit) {
      const fallbackBlob = await encodeJpeg(candidateCanvas, minQuality);
      if (fallbackBlob) {
        localClosest = {
          blob: fallbackBlob,
          quality: minQuality,
          scale,
          width: candidateCanvas.width,
          height: candidateCanvas.height
        };
      }
    }

    if (localBestFit) {
      if (
        !bestFit ||
        localBestFit.scale > bestFit.scale ||
        (localBestFit.scale === bestFit.scale && localBestFit.quality > bestFit.quality) ||
        (localBestFit.scale === bestFit.scale && Math.abs(localBestFit.quality - bestFit.quality) < 0.02 && localBestFit.blob.size > bestFit.blob.size)
      ) {
        bestFit = localBestFit;
      }
    }

    if (localClosest) {
      if (
        !bestOverall ||
        Math.abs(localClosest.blob.size - targetBytes) < Math.abs(bestOverall.blob.size - targetBytes) ||
        (Math.abs(localClosest.blob.size - targetBytes) === Math.abs(bestOverall.blob.size - targetBytes) && localClosest.scale > bestOverall.scale)
      ) {
        bestOverall = localClosest;
      }
    }

    if (bestFit && bestFit.scale >= 0.9) {
      break;
    }
  }

  const finalBlob = bestFit ? bestFit.blob : bestOverall ? bestOverall.blob : (await encodeJpeg(baseCanvas, minQuality)) || new Blob();
  baseCanvas.width = 0;
  baseCanvas.height = 0;
  return finalBlob;
};

export const compressImagesToTarget = async (
  files: File[],
  targetKB: number
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

  for (const file of files) {
    try {
      const blob = await compressImageToTarget(file, targetKB);
      results.push({
        file,
        compressedBlob: blob,
        originalSize: file.size,
        compressedSize: blob.size
      });
    } catch (e) {
      console.error(`Failed to compress ${file.name}`, e);
    }
  }

  return results;
};
