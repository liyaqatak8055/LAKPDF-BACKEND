export interface OcrPreprocessOptions {
  contrastBoost?: number;
  thresholdOffset?: number;
  binarize?: boolean;
  deskew?: boolean;
  denoise?: boolean;
}

/**
 * Fast skew detection and auto-rotation using horizontal projection variance
 * Analyzes downscaled proxy of the canvas across [-5°, +5°] in 0.5° increments.
 */
export function deskewCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  if (typeof document === 'undefined') return source;

  // Create lightweight thumbnail proxy for rapid angle profiling
  const maxProxyDim = 320;
  const proxyScale = Math.min(1, maxProxyDim / Math.max(source.width, source.height));
  const pw = Math.max(20, Math.round(source.width * proxyScale));
  const ph = Math.max(20, Math.round(source.height * proxyScale));

  const proxyCanvas = document.createElement('canvas');
  proxyCanvas.width = pw;
  proxyCanvas.height = ph;
  const pctx = proxyCanvas.getContext('2d');
  if (!pctx) return source;

  pctx.drawImage(source, 0, 0, pw, ph);
  const pData = pctx.getImageData(0, 0, pw, ph).data;

  // Binarized proxy pixel grid (1 = dark, 0 = light)
  const binaryGrid = new Uint8Array(pw * ph);
  for (let i = 0; i < binaryGrid.length; i++) {
    const idx = i * 4;
    const lum = 0.299 * pData[idx] + 0.587 * pData[idx + 1] + 0.114 * pData[idx + 2];
    binaryGrid[i] = lum < 140 ? 1 : 0;
  }

  const cx = pw / 2;
  const cy = ph / 2;
  let bestAngle = 0;
  let maxVariance = -1;

  // Test angles between -4.5° and +4.5° in 0.5° steps
  for (let deg = -4.5; deg <= 4.5; deg += 0.5) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rowSums = new Float32Array(ph);

    // Sample lines of text along the rotated projection
    for (let y = 0; y < ph; y += 2) {
      for (let x = 0; x < pw; x += 2) {
        if (binaryGrid[y * pw + x] === 1) {
          // Rotated Y coordinate
          const ry = Math.round((x - cx) * sin + (y - cy) * cos + cy);
          if (ry >= 0 && ry < ph) {
            rowSums[ry]++;
          }
        }
      }
    }

    // Variance calculation
    let sum = 0;
    for (let r = 0; r < ph; r++) sum += rowSums[r];
    const mean = sum / ph;
    let variance = 0;
    for (let r = 0; r < ph; r++) {
      const diff = rowSums[r] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = deg;
    }
  }

  // If skew is negligible (< 0.5°), avoid rotation overhead
  if (Math.abs(bestAngle) < 0.5) {
    proxyCanvas.width = 0;
    proxyCanvas.height = 0;
    return source;
  }

  // Apply deskew rotation to the full-size source canvas
  const rad = (-bestAngle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));

  const outW = Math.round(source.width * cos + source.height * sin);
  const outH = Math.round(source.width * sin + source.height * cos);

  const deskewed = document.createElement('canvas');
  deskewed.width = outW;
  deskewed.height = outH;
  const dctx = deskewed.getContext('2d');
  if (!dctx) return source;

  dctx.fillStyle = '#FFFFFF';
  dctx.fillRect(0, 0, outW, outH);

  dctx.translate(outW / 2, outH / 2);
  dctx.rotate(rad);
  dctx.drawImage(source, -source.width / 2, -source.height / 2);

  proxyCanvas.width = 0;
  proxyCanvas.height = 0;
  return deskewed;
}

/**
 * 3x3 Despeckle / Salt-and-Pepper noise filter
 * Cleans isolated dark noise pixels that cause false diacritics or punctuation
 */
export function denoiseImageData(data: Uint8ClampedArray, width: number, height: number): void {
  const binary = new Uint8Array(width * height);
  for (let i = 0; i < binary.length; i++) {
    binary[i] = data[i * 4] < 128 ? 1 : 0; // 1 = dark, 0 = light
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // If pixel is dark, check its 8 neighbors
      if (binary[idx] === 1) {
        let darkNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (binary[(y + dy) * width + (x + dx)] === 1) {
              darkNeighbors++;
            }
          }
        }
        // Isolated speckle: if fewer than 2 dark neighbors out of 8, erase to white
        if (darkNeighbors <= 1) {
          const p = idx * 4;
          data[p] = 255;
          data[p + 1] = 255;
          data[p + 2] = 255;
        }
      }
    }
  }
}

/**
 * Comprehensive Canvas Pre-processing for high-accuracy OCR:
 * 1. Optional Deskewing (horizontal alignment)
 * 2. Adaptive contrast boost
 * 3. Thresholding / Binarization
 * 4. Noise despeckling
 */
export function preprocessCanvasForOcr(
  source: HTMLCanvasElement,
  options?: OcrPreprocessOptions
): HTMLCanvasElement {
  const config = {
    contrastBoost: options?.contrastBoost ?? 1.35,
    thresholdOffset: options?.thresholdOffset ?? 0,
    binarize: options?.binarize ?? true,
    deskew: options?.deskew ?? false,
    denoise: options?.denoise ?? true,
  };

  // Step 1: Optional Deskewing
  let canvasToProcess = source;
  if (config.deskew) {
    try {
      canvasToProcess = deskewCanvas(source);
    } catch {
      canvasToProcess = source;
    }
  }

  const out = document.createElement('canvas');
  out.width = canvasToProcess.width;
  out.height = canvasToProcess.height;
  const ctx = out.getContext('2d');
  if (!ctx) return canvasToProcess;

  ctx.drawImage(canvasToProcess, 0, 0);
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;

  // Step 2: Mean luminance
  let sum = 0;
  const totalPixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += lum;
  }
  const mean = sum / totalPixels;

  // Step 3: Contrast and Binarization
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = (lum - 128) * config.contrastBoost + 128;

    if (config.binarize) {
      const threshold = Math.max(90, Math.min(205, mean + config.thresholdOffset));
      const bin = boosted > threshold ? 255 : 0;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
    } else {
      const v = Math.max(0, Math.min(255, Math.round(boosted)));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    data[i + 3] = 255;
  }

  // Step 4: Denoising
  if (config.denoise && config.binarize) {
    try {
      denoiseImageData(data, out.width, out.height);
    } catch {}
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

/**
 * Post-processes OCR text:
 * - Fixes Devanagari ligatures, spacing before matras and viramas
 * - Repairs digit/letter ambiguities in numeric sequences (O -> 0, I/l -> 1 in IDs)
 * - Harmonizes punctuation and paragraph structures
 */
export function postProcessOcrText(raw: string): string {
  if (!raw) return '';

  let text = raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[¦|]{3,}/g, '')
    // Fix hyphenated word breaks across English and Indic scripts
    .replace(/([A-Za-z\u0900-\u097F])-\s*\n\s*([A-Za-z\u0900-\u097F])/g, '$1$2')
    // Fix stray spacing before Devanagari vowel signs, virama, anusvara, and nukta
    .replace(/([\u0905-\u0939])\s+([\u093E-\u094F\u0901-\u0903\u093C\u094D])/g, '$1$2')
    .replace(/\s+([,.;:!?\u0964\u0965])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');

  // Repair common OCR numeric ambiguities in sequences that are predominantly digits
  // e.g. "85I5 384O 3319" -> "8515 3840 3319"
  text = text.replace(/\b([0-9IOlSB]{4,5})\s+([0-9IOlSB]{4,5})\s+([0-9IOlSB]{4,5})\b/g, (match) => {
    return match
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[B]/g, '8');
  });

  // Repair 10-digit phone patterns with internal letter misrecognitions
  text = text.replace(/\b[6-9][0-9IOlSB]{9}\b/g, (match) => {
    return match
      .replace(/[Oo]/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[Ss]/g, '5')
      .replace(/[B]/g, '8');
  });

  const lines = text.split('\n').map((line) => line.trim());
  const cleaned: string[] = [];

  for (const line of lines) {
    if (!line) {
      const prev = cleaned[cleaned.length - 1];
      if (prev !== '') cleaned.push('');
      continue;
    }

    const normalized = line
      .replace(/^[•·●▪◦o]\s*/i, '• ')
      .replace(/\s{2,}/g, ' ')
      .trim();

    if (/^[^A-Za-z0-9\u0900-\u097F]+$/.test(normalized)) continue;
    cleaned.push(normalized);
  }

  const merged: string[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const current = cleaned[i];
    if (current === '') {
      if (merged[merged.length - 1] !== '') merged.push('');
      continue;
    }

    const prev = merged[merged.length - 1];
    // Check if previous line doesn't end with a sentence terminator (. ! ? : ; । ॥)
    // and current line continues the thought (lowercase, digits, or Devanagari letters)
    if (
      prev &&
      prev !== '' &&
      !/[.!?:;\u0964\u0965]$/.test(prev) &&
      /^[a-z0-9(\u0900-\u097F]/.test(current) &&
      !/^•\s/.test(current)
    ) {
      merged[merged.length - 1] = `${prev} ${current}`;
    } else {
      merged.push(current);
    }
  }

  text = merged.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return text;
}
