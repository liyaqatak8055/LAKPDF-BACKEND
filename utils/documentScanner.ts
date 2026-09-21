/**
 * CamScanner-grade Document Scanning & Computer Vision Engine
 * Pure client-side processing for document boundary detection,
 * perspective transformation (homography warp), shadow removal,
 * illumination correction, deskew, and intelligent scanning filters.
 */

export interface Point {
  x: number;
  y: number;
}

export interface DocumentCorners {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
  confidence: number; // 0 to 1
}

export type ScanFilterType =
  | 'auto'
  | 'magic'
  | 'color'
  | 'bw'
  | 'grayscale'
  | 'high_contrast'
  | 'original';

export interface DocumentScanOptions {
  corners?: DocumentCorners;
  filter?: ScanFilterType;
  deskew?: boolean;
  removeShadows?: boolean;
  sharpen?: boolean;
  outputWidth?: number;
  outputHeight?: number;
}

export interface ImageContentAnalysis {
  isDocument: boolean; // true if white paper document (CV, receipts, forms, letters)
  isPhoto: boolean; // true if natural photo (portrait, scenery, camera capture of people/objects)
  hasPhotosOrStamps: boolean;
  paperWhitenessRatio: number;
  photoColorRatio: number;
}

/**
 * Calculates Euclidean distance between two points
 */
export function distance(p1: Point, p2: Point): number {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

/**
 * Ensures 4 corners are ordered correctly: Top-Left, Top-Right, Bottom-Right, Bottom-Left
 */
export function orderCorners(pts: Point[]): [Point, Point, Point, Point] {
  if (pts.length !== 4) {
    throw new Error('Exactly 4 corners required');
  }

  // Sort by sum of coordinates (x + y)
  // Top-Left has smallest sum, Bottom-Right has largest sum
  const sumSorted = [...pts].sort((a, b) => a.x + a.y - (b.x + b.y));
  const topLeft = sumSorted[0];
  const bottomRight = sumSorted[3];

  // Sort remaining two by difference (y - x)
  const remaining = [sumSorted[1], sumSorted[2]];
  const diffSorted = remaining.sort((a, b) => a.y - a.x - (b.y - b.x));
  const topRight = diffSorted[0];
  const bottomLeft = diffSorted[1];

  return [topLeft, topRight, bottomRight, bottomLeft];
}

/**
 * Checks if an RGB pixel matches human skin or rich photograph colors.
 * Used to protect faces, skin tones, portraits, and colored badges from paper whitening.
 */
export function isSkinOrPhotoColor(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max > 0 ? (max - min) / max : 0;

  // Human skin tone bounds across varied skin tones (fair to dark)
  const isSkin =
    r > 70 &&
    g > 35 &&
    b > 20 &&
    r > g &&
    g >= b &&
    r - g >= 8 &&
    sat >= 0.10 &&
    sat <= 0.70;

  // Colored element (stamps, photos, colored clothes, logos)
  const isColored = sat > 0.16 && max > 45;

  return isSkin || isColored;
}

/**
 * Classifies image content: Paper Document vs Photograph / Natural Scene.
 */
export function analyzeDocumentColorProfile(canvas: HTMLCanvasElement): ImageContentAnalysis {
  const w = Math.min(200, canvas.width);
  const h = Math.min(250, canvas.height);

  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, w, h);

  const d = ctx.getImageData(0, 0, w, h).data;
  const total = w * h;

  let paperPixelCount = 0;
  let textPixelCount = 0;
  let photoColorCount = 0;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];

    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max > 0 ? (max - min) / max : 0;

    // Neutral paper background: high luminance and very low saturation
    if (lum > 175 && sat < 0.12) {
      paperPixelCount++;
    } else if (lum < 115 && sat < 0.25) {
      textPixelCount++;
    }

    if (isSkinOrPhotoColor(r, g, b)) {
      photoColorCount++;
    }
  }

  const paperWhitenessRatio = paperPixelCount / total;
  const textPixelRatio = textPixelCount / total;
  const photoColorRatio = photoColorCount / total;

  // A document typically has > 40% paper background with text lines
  const isDocument = paperWhitenessRatio >= 0.40 && textPixelRatio >= 0.015;
  // A photograph has rich continuous colors or skin tones covering > 20% and lower pure paper ratio
  const isPhoto = !isDocument || photoColorRatio > 0.25;

  return {
    isDocument,
    isPhoto,
    hasPhotosOrStamps: photoColorRatio > 0.015,
    paperWhitenessRatio,
    photoColorRatio
  };
}

/**
 * Boundary and corner detector for paper documents.
 * For photographs or full-frame images, returns full bounds with low confidence (never crops accidentally).
 */
export function detectDocumentCorners(
  source: HTMLCanvasElement | HTMLImageElement | ImageData
): DocumentCorners {
  let width: number;
  let height: number;
  let srcCanvas: HTMLCanvasElement;

  if (source instanceof ImageData) {
    width = source.width;
    height = source.height;
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const ctx = srcCanvas.getContext('2d')!;
    ctx.putImageData(source, 0, 0);
  } else {
    width = (source as any).videoWidth || (source as any).naturalWidth || source.width;
    height = (source as any).videoHeight || (source as any).naturalHeight || source.height;
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const ctx = srcCanvas.getContext('2d')!;
    ctx.drawImage(source as CanvasImageSource, 0, 0);
  }

  const fullFrameCorners: DocumentCorners = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
    confidence: 1.0
  };

  // Always return stable, full document boundaries on upload
  // This guarantees 100% content preservation (no chopped headers, margins, or crooked cuts)
  return fullFrameCorners;
}

/**
 * Specifically finds physical paper borders when user explicitly clicks 'Auto Detect' in Crop modal
 */
export function findPhysicalDocumentQuad(
  source: HTMLCanvasElement | HTMLImageElement | ImageData
): DocumentCorners {
  let width: number;
  let height: number;
  let srcCanvas: HTMLCanvasElement;

  if (source instanceof ImageData) {
    width = source.width;
    height = source.height;
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const ctx = srcCanvas.getContext('2d')!;
    ctx.putImageData(source, 0, 0);
  } else {
    width = (source as any).videoWidth || (source as any).naturalWidth || source.width;
    height = (source as any).videoHeight || (source as any).naturalHeight || source.height;
    srcCanvas = document.createElement('canvas');
    srcCanvas.width = width;
    srcCanvas.height = height;
    const ctx = srcCanvas.getContext('2d')!;
    ctx.drawImage(source as CanvasImageSource, 0, 0);
  }

  const fallback: DocumentCorners = {
    topLeft: { x: 0, y: 0 },
    topRight: { x: width, y: 0 },
    bottomRight: { x: width, y: height },
    bottomLeft: { x: 0, y: height },
    confidence: 0.5
  };

  // Downscale to ~400px wide for rapid edge detection
  const scale = Math.min(1, 400 / Math.max(width, height));
  const dw = Math.round(width * scale);
  const dh = Math.round(height * scale);

  const workCanvas = document.createElement('canvas');
  workCanvas.width = dw;
  workCanvas.height = dh;
  const workCtx = workCanvas.getContext('2d')!;
  workCtx.drawImage(srcCanvas, 0, 0, dw, dh);

  const imgData = workCtx.getImageData(0, 0, dw, dh);
  const data = imgData.data;

  // Convert to grayscale & compute gradient magnitude (Sobel)
  const gray = new Float32Array(dw * dh);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  const grad = new Float32Array(dw * dh);
  let maxGrad = 0;

  for (let y = 1; y < dh - 1; y++) {
    for (let x = 1; x < dw - 1; x++) {
      const idx = y * dw + x;
      const gx =
        -gray[idx - dw - 1] +
        gray[idx - dw + 1] -
        2 * gray[idx - 1] +
        2 * gray[idx + 1] -
        gray[idx + dw - 1] +
        gray[idx + dw + 1];

      const gy =
        -gray[idx - dw - 1] -
        2 * gray[idx - dw] -
        gray[idx - dw + 1] +
        gray[idx + dw - 1] +
        2 * gray[idx + dw] +
        gray[idx + dw + 1];

      const g = Math.hypot(gx, gy);
      grad[idx] = g;
      if (g > maxGrad) maxGrad = g;
    }
  }

  // Strong paper boundary edge threshold
  const edgeThreshold = Math.max(35, maxGrad * 0.28);
  const edges = new Uint8Array(dw * dh);
  for (let i = 0; i < grad.length; i++) {
    if (grad[i] > edgeThreshold) edges[i] = 255;
  }

  const marginX = Math.round(dw * 0.03);
  const marginY = Math.round(dh * 0.03);

  const sampleRays = 24;
  const topPoints: Point[] = [];
  const bottomPoints: Point[] = [];
  const leftPoints: Point[] = [];
  const rightPoints: Point[] = [];

  // Top and Bottom scans
  for (let s = 2; s < sampleRays - 1; s++) {
    const x = Math.round((dw * s) / sampleRays);
    for (let y = marginY; y < dh * 0.35; y++) {
      if (edges[y * dw + x] === 255) {
        topPoints.push({ x, y });
        break;
      }
    }
    for (let y = dh - marginY - 1; y > dh * 0.65; y--) {
      if (edges[y * dw + x] === 255) {
        bottomPoints.push({ x, y });
        break;
      }
    }
  }

  // Left and Right scans
  for (let s = 2; s < sampleRays - 1; s++) {
    const y = Math.round((dh * s) / sampleRays);
    for (let x = marginX; x < dw * 0.35; x++) {
      if (edges[y * dw + x] === 255) {
        leftPoints.push({ x, y });
        break;
      }
    }
    for (let x = dw - marginX - 1; x > dw * 0.65; x--) {
      if (edges[y * dw + x] === 255) {
        rightPoints.push({ x, y });
        break;
      }
    }
  }

  const totalDetected =
    topPoints.length + bottomPoints.length + leftPoints.length + rightPoints.length;

  // If boundary signals are weak, or paper already fills the frame, safely return full frame
  if (totalDetected < 24) {
    return fallback;
  }

  const minTopY = Math.min(...topPoints.map((p) => p.y));
  const maxBottomY = Math.max(...bottomPoints.map((p) => p.y));
  const minLeftX = Math.min(...leftPoints.map((p) => p.x));
  const maxRightX = Math.max(...rightPoints.map((p) => p.x));

  const cTL: Point = {
    x: (leftPoints.find((p) => p.y < dh * 0.25)?.x ?? minLeftX) / scale,
    y: (topPoints.find((p) => p.x < dw * 0.25)?.y ?? minTopY) / scale
  };
  const cTR: Point = {
    x: (rightPoints.find((p) => p.y < dh * 0.25)?.x ?? maxRightX) / scale,
    y: (topPoints.find((p) => p.x > dw * 0.75)?.y ?? minTopY) / scale
  };
  const cBR: Point = {
    x: (rightPoints.find((p) => p.y > dh * 0.75)?.x ?? maxRightX) / scale,
    y: (bottomPoints.find((p) => p.x > dw * 0.75)?.y ?? maxBottomY) / scale
  };
  const cBL: Point = {
    x: (leftPoints.find((p) => p.y > dh * 0.75)?.x ?? minLeftX) / scale,
    y: (bottomPoints.find((p) => p.x < dw * 0.25)?.y ?? maxBottomY) / scale
  };

  const clamp = (p: Point): Point => ({
    x: Math.max(0, Math.min(width, Math.round(p.x))),
    y: Math.max(0, Math.min(height, Math.round(p.y)))
  });

  const ordered = orderCorners([clamp(cTL), clamp(cTR), clamp(cBR), clamp(cBL)]);
  const quadArea = computeQuadArea(ordered[0], ordered[1], ordered[2], ordered[3]);
  const frameArea = width * height;
  const areaRatio = quadArea / frameArea;

  // Strict check: only auto-crop if quad covers a believable document area (> 50% of frame)
  if (areaRatio < 0.50 || areaRatio > 0.98) {
    return fallback;
  }

  return {
    topLeft: ordered[0],
    topRight: ordered[1],
    bottomRight: ordered[2],
    bottomLeft: ordered[3],
    confidence: 0.85
  };
}

/**
 * Calculates area of quadrilateral using surveyor's formula
 */
function computeQuadArea(p1: Point, p2: Point, p3: Point, p4: Point): number {
  return 0.5 * Math.abs(
    p1.x * p2.y +
      p2.x * p3.y +
      p3.x * p4.y +
      p4.x * p1.y -
      (p2.x * p1.y + p3.x * p2.y + p4.x * p3.y + p1.x * p4.y)
  );
}

/**
 * Solves 8-parameter 3x3 projective homography matrix
 */
function getPerspectiveTransform(
  src: [Point, Point, Point, Point],
  dstW: number,
  dstH: number
): number[] {
  const [p0, p1, p2, p3] = src;
  const x0 = p0.x, y0 = p0.y;
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;

  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;

  const sumX = x0 - x1 + x2 - x3;
  const sumY = y0 - y1 + y2 - y3;

  let g = 0;
  let h = 0;

  if (sumX === 0 && sumY === 0) {
    return [
      (x1 - x0) / dstW,
      (x3 - x0) / dstH,
      x0,
      (y1 - y0) / dstW,
      (y3 - y0) / dstH,
      y0,
      0,
      0,
      1
    ];
  }

  const det = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(det) < 1e-7) {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  }

  g = (sumX * dy2 - sumY * dx2) / det / dstW;
  h = (sumY * dx1 - sumX * dy1) / det / dstH;

  const a = (x1 - x0 + g * dstW * x1) / dstW;
  const b = (x3 - x0 + h * dstH * x3) / dstH;
  const c = x0;

  const d = (y1 - y0 + g * dstW * y1) / dstW;
  const e = (y3 - y0 + h * dstH * y3) / dstH;
  const f = y0;

  return [a, b, c, d, e, f, g, h, 1];
}

/**
 * Applies perspective homography transformation with bilinear interpolation
 */
export function warpPerspective(
  sourceCanvas: HTMLCanvasElement,
  corners: DocumentCorners,
  targetWidth?: number,
  targetHeight?: number
): HTMLCanvasElement {
  const [tl, tr, br, bl] = orderCorners([
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft
  ]);

  const topWidth = distance(tl, tr);
  const bottomWidth = distance(bl, br);
  const leftHeight = distance(tl, bl);
  const rightHeight = distance(tr, br);

  const calcW = Math.round(Math.max(topWidth, bottomWidth));
  const calcH = Math.round(Math.max(leftHeight, rightHeight));

  const dstW = Math.max(100, targetWidth || calcW);
  const dstH = Math.max(100, targetHeight || calcH);

  // If the corners already match full frame, return clone directly
  const isFullFrame =
    tl.x <= 2 &&
    tl.y <= 2 &&
    Math.abs(tr.x - sourceCanvas.width) <= 2 &&
    tr.y <= 2 &&
    Math.abs(br.x - sourceCanvas.width) <= 2 &&
    Math.abs(br.y - sourceCanvas.height) <= 2 &&
    bl.x <= 2 &&
    Math.abs(bl.y - sourceCanvas.height) <= 2;

  if (isFullFrame) {
    const out = document.createElement('canvas');
    out.width = sourceCanvas.width;
    out.height = sourceCanvas.height;
    const ctx = out.getContext('2d')!;
    ctx.drawImage(sourceCanvas, 0, 0);
    return out;
  }

  const matrix = getPerspectiveTransform([tl, tr, br, bl], dstW, dstH);
  const [a, b, c, d, e, f, g, h, i] = matrix;

  const srcCtx = sourceCanvas.getContext('2d')!;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const srcImgData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcData = srcImgData.data;

  const dstCanvas = document.createElement('canvas');
  dstCanvas.width = dstW;
  dstCanvas.height = dstH;
  const dstCtx = dstCanvas.getContext('2d')!;
  const dstImgData = dstCtx.createImageData(dstW, dstH);
  const dstData = dstImgData.data;

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const denom = g * x + h * y + i;
      if (Math.abs(denom) < 1e-7) continue;

      const sx = (a * x + b * y + c) / denom;
      const sy = (d * x + e * y + f) / denom;

      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        const dstIdx = (y * dstW + x) * 4;
        dstData[dstIdx] = 255;
        dstData[dstIdx + 1] = 255;
        dstData[dstIdx + 2] = 255;
        dstData[dstIdx + 3] = 255;
        continue;
      }

      const xFloor = Math.floor(sx);
      const yFloor = Math.floor(sy);
      const fx = sx - xFloor;
      const fy = sy - yFloor;

      const i00 = (yFloor * srcW + xFloor) * 4;
      const i10 = i00 + 4;
      const i01 = ((yFloor + 1) * srcW + xFloor) * 4;
      const i11 = i01 + 4;

      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;

      const dstIdx = (y * dstW + x) * 4;
      dstData[dstIdx] =
        srcData[i00] * w00 + srcData[i10] * w10 + srcData[i01] * w01 + srcData[i11] * w11;
      dstData[dstIdx + 1] =
        srcData[i00 + 1] * w00 + srcData[i10 + 1] * w10 + srcData[i01 + 1] * w01 + srcData[i11 + 1] * w11;
      dstData[dstIdx + 2] =
        srcData[i00 + 2] * w00 + srcData[i10 + 2] * w10 + srcData[i01 + 2] * w01 + srcData[i11 + 2] * w11;
      dstData[dstIdx + 3] = 255;
    }
  }

  dstCtx.putImageData(dstImgData, 0, 0);
  return dstCanvas;
}

/**
 * Detects small deskew angle using horizontal projection profiling.
 * Only applies if horizontal line structure is pronounced.
 */
export function detectDeskewAngle(canvas: HTMLCanvasElement): number {
  const w = Math.min(500, canvas.width);
  const h = Math.min(650, canvas.height);

  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const ctx = thumb.getContext('2d')!;
  ctx.drawImage(canvas, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const bin = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const lum = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
      const lumRight = 0.299 * d[idx + 4] + 0.587 * d[idx + 5] + 0.114 * d[idx + 6];
      if (Math.abs(lum - lumRight) > 35) {
        bin[y * w + x] = 1;
      }
    }
  }

  let bestAngle = 0;
  let maxVariance = 0;

  for (let deg = -6; deg <= 6; deg += 0.5) {
    const rad = (deg * Math.PI) / 180;
    const tan = Math.tan(rad);
    const rowSums = new Float32Array(h);

    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = 0; x < w; x++) {
        const shiftedY = Math.round(y + (x - w / 2) * tan);
        if (shiftedY >= 0 && shiftedY < h) {
          sum += bin[shiftedY * w + x];
        }
      }
      rowSums[y] = sum;
    }

    let mean = 0;
    for (let y = 0; y < h; y++) mean += rowSums[y];
    mean /= h;

    let variance = 0;
    for (let y = 0; y < h; y++) {
      const diff = rowSums[y] - mean;
      variance += diff * diff;
    }

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = deg;
    }
  }

  return Math.abs(bestAngle) >= 0.5 ? bestAngle : 0;
}

/**
 * Removes shadows on paper documents without bleaching skin or photos.
 */
export function removeShadowsAndNormalize(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const downScale = Math.min(1, 140 / Math.max(w, h));
  const bw = Math.max(16, Math.round(w * downScale));
  const bh = Math.max(16, Math.round(h * downScale));

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = bw;
  bgCanvas.height = bh;
  const bgCtx = bgCanvas.getContext('2d')!;
  bgCtx.drawImage(canvas, 0, 0, bw, bh);
  const bgPixels = bgCtx.getImageData(0, 0, bw, bh).data;

  const bgGrid = new Float32Array(bw * bh);
  for (let i = 0, p = 0; i < bgPixels.length; i += 4, p++) {
    bgGrid[p] = Math.max(bgPixels[i], bgPixels[i + 1], bgPixels[i + 2]);
  }

  const smoothedBg = new Float32Array(bw * bh);
  const radius = Math.max(2, Math.floor(Math.min(bw, bh) / 8));

  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= bh) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= bw) continue;
          sum += bgGrid[ny * bw + nx];
          count++;
        }
      }
      smoothedBg[y * bw + x] = count > 0 ? sum / count : 220;
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  const outCtx = outCanvas.getContext('2d')!;
  const outImgData = outCtx.createImageData(w, h);
  const outD = outImgData.data;

  const scaleX = bw / w;
  const scaleY = bh / h;

  for (let y = 0; y < h; y++) {
    const by = Math.min(bh - 1, Math.floor(y * scaleY));
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];

      // If pixel is human skin tone or a colored photo element, preserve original values!
      if (isSkinOrPhotoColor(r, g, b)) {
        outD[idx] = r;
        outD[idx + 1] = g;
        outD[idx + 2] = b;
        outD[idx + 3] = 255;
        continue;
      }

      const bx = Math.min(bw - 1, Math.floor(x * scaleX));
      const bgVal = Math.max(90, smoothedBg[by * bw + bx]);
      const normFactor = 248 / bgVal;

      outD[idx] = Math.min(255, Math.max(0, Math.round(r * normFactor)));
      outD[idx + 1] = Math.min(255, Math.max(0, Math.round(g * normFactor)));
      outD[idx + 2] = Math.min(255, Math.max(0, Math.round(b * normFactor)));
      outD[idx + 3] = 255;
    }
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

/**
 * Text and line sharpening filter
 */
export function sharpenText(canvas: HTMLCanvasElement, isGentle: boolean = false): HTMLCanvasElement {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const src = ctx.getImageData(0, 0, w, h);
  const s = src.data;

  const out = ctx.createImageData(w, h);
  const o = out.data;

  const centerWeight = isGentle ? 1.4 : 1.8;
  const neighborWeight = isGentle ? 0.1 : 0.2;

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x) * 4;
      const top = ((y - 1) * w + x) * 4;
      const bot = ((y + 1) * w + x) * 4;
      const lft = (y * w + (x - 1)) * 4;
      const rgt = (y * w + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          centerWeight * s[idx + c] -
          neighborWeight * (s[top + c] + s[bot + c] + s[lft + c] + s[rgt + c]);
        o[idx + c] = Math.min(255, Math.max(0, val));
      }
      o[idx + 3] = 255;
    }
  }

  // Copy borders
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      o[x * 4 + c] = s[x * 4 + c];
      o[((h - 1) * w + x) * 4 + c] = s[((h - 1) * w + x) * 4 + c];
    }
  }
  for (let y = 0; y < h; y++) {
    for (let c = 0; c < 4; c++) {
      o[(y * w) * 4 + c] = s[(y * w) * 4 + c];
      o[(y * w + (w - 1)) * 4 + c] = s[(y * w + (w - 1)) * 4 + c];
    }
  }

  const resCanvas = document.createElement('canvas');
  resCanvas.width = w;
  resCanvas.height = h;
  resCanvas.getContext('2d')!.putImageData(out, 0, 0);
  return resCanvas;
}

/**
 * CamScanner Document Filters with full skin & photo protection
 */
export function applyScanFilter(
  canvas: HTMLCanvasElement,
  filter: ScanFilterType
): HTMLCanvasElement {
  if (filter === 'original') {
    return canvas;
  }

  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;
  const len = d.length;

  const analysis = analyzeDocumentColorProfile(canvas);

  let effectiveFilter = filter;
  if (filter === 'auto') {
    if (analysis.isPhoto && !analysis.isDocument) {
      // Natural photograph / portrait: use gentle color enhancement
      effectiveFilter = 'color';
    } else {
      // Document (with or without photo): use Magic Color
      effectiveFilter = 'magic';
    }
  }

  if (effectiveFilter === 'bw') {
    // Pure Black & White adaptive document binarization
    const gray = new Uint8Array(w * h);
    for (let i = 0, p = 0; i < len; i += 4, p++) {
      gray[p] = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
    }

    const integral = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = 0; x < w; x++) {
        sum += gray[y * w + x];
        integral[y * w + x] = (y === 0 ? 0 : integral[(y - 1) * w + x]) + sum;
      }
    }

    const s = Math.max(8, Math.floor(Math.min(w, h) / 16));
    const t = 13;

    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - s);
      const y2 = Math.min(h - 1, y + s);
      const countY = y2 - y1;

      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - s);
        const x2 = Math.min(w - 1, x + s);
        const count = countY * (x2 - x1);

        const sum =
          integral[y2 * w + x2] -
          integral[y1 * w + x2] -
          integral[y2 * w + x1] +
          integral[y1 * w + x1];

        const idx = (y * w + x) * 4;
        const val = gray[y * w + x] * count <= (sum * (100 - t)) / 100 ? 0 : 255;
        d[idx] = val;
        d[idx + 1] = val;
        d[idx + 2] = val;
      }
    }
  } else if (effectiveFilter === 'magic') {
    // CamScanner Magic Color:
    // Whiten neutral paper background, deepen dark text, preserve skin tones and photos
    for (let i = 0; i < len; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;

      if (isSkinOrPhotoColor(r, g, b)) {
        // Pixel belongs to a person's skin, photo, or colored stamp
        // DO NOT WHITEN! Preserve natural tones with subtle vibrancy
        const boost = 1.05;
        r = Math.min(255, Math.max(0, (r - lum) * boost + lum));
        g = Math.min(255, Math.max(0, (g - lum) * boost + lum));
        b = Math.min(255, Math.max(0, (b - lum) * boost + lum));

        r = Math.min(255, Math.max(0, (r - 128) * 1.05 + 128));
        g = Math.min(255, Math.max(0, (g - 128) * 1.05 + 128));
        b = Math.min(255, Math.max(0, (b - 128) * 1.05 + 128));
      } else {
        // Document paper or neutral text
        if (lum > 175 && sat < 0.12) {
          // Whiten neutral paper
          const whiten = ((lum - 175) / 80) * 55;
          r = Math.min(255, r + whiten);
          g = Math.min(255, g + whiten);
          b = Math.min(255, b + whiten);
        } else if (lum < 135) {
          // Deepen dark text ink
          r = Math.max(0, r * 0.85);
          g = Math.max(0, g * 0.85);
          b = Math.max(0, b * 0.85);
        }

        r = Math.min(255, Math.max(0, (r - 128) * 1.15 + 128));
        g = Math.min(255, Math.max(0, (g - 128) * 1.15 + 128));
        b = Math.min(255, Math.max(0, (b - 128) * 1.15 + 128));
      }

      d[i] = Math.round(r);
      d[i + 1] = Math.round(g);
      d[i + 2] = Math.round(b);
    }
  } else if (effectiveFilter === 'color') {
    // Natural Photo / Color Document: gentle contrast without altering skin or colors
    for (let i = 0; i < len; i += 4) {
      d[i] = Math.min(255, Math.max(0, (d[i] - 128) * 1.08 + 128));
      d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - 128) * 1.08 + 128));
      d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - 128) * 1.08 + 128));
    }
  } else if (effectiveFilter === 'grayscale') {
    // Grayscale Scanner
    for (let i = 0; i < len; i += 4) {
      let gray = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      if (gray > 175) {
        gray = Math.min(255, gray + ((gray - 175) / 80) * 45);
      } else if (gray < 130) {
        gray = Math.max(0, gray * 0.9);
      }
      gray = Math.min(255, Math.max(0, (gray - 128) * 1.15 + 128));
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
  } else if (effectiveFilter === 'high_contrast') {
    // High Contrast Document
    for (let i = 0; i < len; i += 4) {
      let gray = (d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8;
      gray = Math.min(255, Math.max(0, (gray - 128) * 1.5 + 128));
      d[i] = gray;
      d[i + 1] = gray;
      d[i + 2] = gray;
    }
  }

  const outCanvas = document.createElement('canvas');
  outCanvas.width = w;
  outCanvas.height = h;
  outCanvas.getContext('2d')!.putImageData(imgData, 0, 0);
  return outCanvas;
}

/**
 * Complete Scanning Pipeline
 */
export async function processDocumentScan(
  sourceCanvas: HTMLCanvasElement,
  options: DocumentScanOptions = {},
  onProgress?: (step: string) => void
): Promise<HTMLCanvasElement> {
  const {
    corners,
    filter = 'auto',
    deskew = true,
    removeShadows = true,
    sharpen = true,
    outputWidth,
    outputHeight
  } = options;

  let current = sourceCanvas;

  // Classify content
  const analysis = analyzeDocumentColorProfile(sourceCanvas);

  // 1. Perspective Warp (if not full frame)
  if (corners && corners.confidence > 0.4) {
    onProgress?.('Correcting perspective & flattening document...');
    current = warpPerspective(current, corners, outputWidth, outputHeight);
  }

  // 2. Deskew (only for documents with text, not general natural photos)
  if (deskew && analysis.isDocument) {
    onProgress?.('Checking document alignment & deskewing...');
    const angle = detectDeskewAngle(current);
    if (Math.abs(angle) >= 0.5) {
      const rotCanvas = document.createElement('canvas');
      rotCanvas.width = current.width;
      rotCanvas.height = current.height;
      const rCtx = rotCanvas.getContext('2d')!;
      rCtx.fillStyle = '#FFFFFF';
      rCtx.fillRect(0, 0, rotCanvas.width, rotCanvas.height);
      rCtx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
      rCtx.rotate((-angle * Math.PI) / 180);
      rCtx.drawImage(current, -current.width / 2, -current.height / 2);
      current = rotCanvas;
    }
  }

  // 3. Shadow Removal (only for paper documents, never for general photos)
  if (removeShadows && analysis.isDocument && filter !== 'original') {
    onProgress?.('Removing shadows and evening illumination...');
    current = removeShadowsAndNormalize(current);
  }

  // 4. Document Filter Enhancement
  if (filter !== 'original') {
    onProgress?.('Enhancing document contrast & colors...');
    current = applyScanFilter(current, filter);
  }

  // 5. Text Sharpening (gentle on photos, crisp on text)
  if (sharpen && filter !== 'original') {
    onProgress?.('Sharpening image...');
    current = sharpenText(current, analysis.isPhoto);
  }

  return current;
}
