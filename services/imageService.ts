import JSZip from 'jszip';

export interface CompressedImage {
  file: File;
  compressedBlob: Blob;
  originalSize: number;
  compressedSize: number;
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
  quality: number = 0.8, 
  format: 'image/jpeg' | 'image/png' | 'image/webp' | 'original' = 'original'
): Promise<Blob> => {
  quality = Math.max(0.05, Math.min(quality, 0.85));

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Maintain dimensions
     const scale = Math.min(1, Math.sqrt(quality));
     canvas.width = Math.floor(img.width * scale);
     canvas.height = Math.floor(img.height * scale);
     
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Canvas context unavailable'));
        return;
      }

      // White background for transparent PNGs converting to JPEG
      let outputFormat = format;
      if (format === 'original') {
        if (file.type === 'image/png') outputFormat = 'image/jpeg';
        else if (file.type === 'image/webp') outputFormat = 'image/webp';
        else outputFormat = 'image/jpeg';
      }

      if (outputFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);


      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob || blob.size >= file.size) {
            resolve(file.slice(0, file.size));
            return;
          }
          resolve(blob);
        },
        outputFormat,
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
  });
};

export const compressImages = async (
  files: File[], 
  quality: number,
  outputFormat: 'original' | 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<CompressedImage[]> => {
  const results: CompressedImage[] = [];

   for (const file of files) {
    const blob = await compressImage(file, quality, outputFormat);
    results.push({
      file,
      compressedBlob: blob,
      originalSize: file.size,
      compressedSize: blob.size
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
