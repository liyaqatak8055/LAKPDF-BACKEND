/**
 * Image Fingerprinting Utilities for Duplicate Detection
 * Implements perceptual hashing for scanned document comparison
 */

// Convert image to grayscale and resize to 8x8 for hashing
const preprocessImage = (imageData: ImageData): Uint8Array => {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;
  
  // Resize to 32x32 for consistent fingerprinting
  const resizedWidth = 32;
  const resizedHeight = 32;
  const resizedPixels = new Uint8Array(resizedWidth * resizedHeight);
  
  // Calculate scaling factors
  const scaleX = width / resizedWidth;
  const scaleY = height / resizedHeight;
  
  for (let y = 0; y < resizedHeight; y++) {
    for (let x = 0; x < resizedWidth; x++) {
      // Get corresponding pixel from original
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIndex = (srcY * width + srcX) * 4;
      
      // Convert to grayscale (luminance)
      const r = pixels[srcIndex];
      const g = pixels[srcIndex + 1];
      const b = pixels[srcIndex + 2];
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      
      resizedPixels[y * resizedWidth + x] = gray;
    }
  }
  
  return resizedPixels;
};

// Calculate average value of pixels
const calculateAverage = (pixels: Uint8Array): number => {
  const sum = pixels.reduce((acc, val) => acc + val, 0);
  return sum / pixels.length;
};

// Generate perceptual hash (pHash) - more robust to minor changes
export const generatePerceptualHash = (imageData: ImageData): string => {
  const pixels = preprocessImage(imageData);
  const avg = calculateAverage(pixels);
  
  // Create binary hash based on comparison to average
  let hash = '';
  for (let i = 0; i < pixels.length; i++) {
    hash += pixels[i] >= avg ? '1' : '0';
  }
  
  return hash;
};

// Generate difference hash (dHash) - good for detecting slight variations
export const generateDifferenceHash = (imageData: ImageData): string => {
  const pixels = preprocessImage(imageData);
  const width = 32;
  const height = 32;
  
  let hash = '';
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width - 1; x++) {
      const current = pixels[y * width + x];
      const right = pixels[y * width + (x + 1)];
      hash += current < right ? '1' : '0';
    }
  }
  
  return hash;
};

// Calculate Hamming distance between two hashes
export const calculateHashDistance = (hash1: string, hash2: string): number => {
  if (hash1.length !== hash2.length) {
    // If lengths differ, compare common length
    const minLen = Math.min(hash1.length, hash2.length);
    let distance = Math.abs(hash1.length - hash2.length);
    for (let i = 0; i < minLen; i++) {
      if (hash1[i] !== hash2[i]) distance++;
    }
    return distance;
  }
  
  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) distance++;
  }
  return distance;
};

// Calculate similarity percentage from hash distance
export const hashSimilarity = (hash1: string, hash2: string): number => {
  const distance = calculateHashDistance(hash1, hash2);
  const maxDistance = hash1.length;
  return Math.round((1 - distance / maxDistance) * 100);
};

// Generate a simple visual fingerprint for debugging
export const generateVisualFingerprint = (imageData: ImageData): string => {
  const pixels = preprocessImage(imageData);
  const avg = calculateAverage(pixels);
  
  let result = '';
  const width = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const idx = Math.floor(y * 4) * width + Math.floor(x * 4);
      const pixel = pixels[idx];
      result += pixel >= avg ? '█' : '░';
    }
    result += '\n';
  }
  return result;
};

// Calculate structural similarity for layout comparison
export interface LayoutFeatures {
  aspectRatio: number;
  contentDensity: number;
  horizontalProjection: number[];
  verticalProjection: number[];
  edgeDensity: number;
}

export const extractLayoutFeatures = (imageData: ImageData): LayoutFeatures => {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;
  
  // Aspect ratio
  const aspectRatio = width / height;
  
  // Content density (ratio of non-white pixels)
  let contentPixels = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    // Consider pixel as "content" if it's not white/light
    if (r < 250 || g < 250 || b < 250) {
      contentPixels++;
    }
  }
  const contentDensity = contentPixels / (width * height);
  
  // Horizontal projection (sum of dark pixels per row)
  const horizontalProjection: number[] = [];
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      // Invert for projection (darker = higher value)
      rowSum += (255 - Math.max(r, g, b)) / 255;
    }
    horizontalProjection.push(rowSum / width);
  }
  
  // Vertical projection (sum of dark pixels per column)
  const verticalProjection: number[] = [];
  for (let x = 0; x < width; x++) {
    let colSum = 0;
    for (let y = 0; y < height; y++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      colSum += (255 - Math.max(r, g, b)) / 255;
    }
    verticalProjection.push(colSum / height);
  }
  
  // Edge density (simple Sobel-like approximation)
  let edgeCount = 0;
  const threshold = 30;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const current = pixels[idx];
      const right = pixels[idx + 4];
      const bottom = pixels[(y + 1) * width * 4];
      
      const diff = Math.abs(current - right) + Math.abs(current - bottom);
      if (diff > threshold) edgeCount++;
    }
  }
  const edgeDensity = edgeCount / ((width - 2) * (height - 2));
  
  return {
    aspectRatio,
    contentDensity,
    horizontalProjection,
    verticalProjection,
    edgeDensity
  };
};

// Calculate similarity between two layout feature sets
export const compareLayoutFeatures = (
  layout1: LayoutFeatures,
  layout2: LayoutFeatures
): number => {
  let similarity = 0;
  
  // Aspect ratio similarity (weight: 20%)
  const aspectDiff = Math.abs(layout1.aspectRatio - layout2.aspectRatio);
  const aspectSim = Math.max(0, 100 - aspectDiff * 100);
  similarity += aspectSim * 0.2;
  
  // Content density similarity (weight: 20%)
  const densityDiff = Math.abs(layout1.contentDensity - layout2.contentDensity);
  const densitySim = Math.max(0, 100 - densityDiff * 100);
  similarity += densitySim * 0.2;
  
  // Edge density similarity (weight: 10%)
  const edgeDiff = Math.abs(layout1.edgeDensity - layout2.edgeDensity);
  const edgeSim = Math.max(0, 100 - edgeDiff * 100);
  similarity += edgeSim * 0.1;
  
  // Horizontal projection correlation (weight: 25%)
  const hCorr = correlationCoefficient(
    layout1.horizontalProjection,
    layout2.horizontalProjection
  );
  similarity += (hCorr * 100) * 0.25;
  
  // Vertical projection correlation (weight: 25%)
  const vCorr = correlationCoefficient(
    layout1.verticalProjection,
    layout2.verticalProjection
  );
  similarity += (vCorr * 100) * 0.25;
  
  return similarity;
};

// Calculate Pearson correlation coefficient
const correlationCoefficient = (arr1: number[], arr2: number[]): number => {
  if (arr1.length !== arr2.length || arr1.length === 0) return 0;
  
  const n = arr1.length;
  const mean1 = arr1.reduce((a, b) => a + b, 0) / n;
  const mean2 = arr2.reduce((a, b) => a + b, 0) / n;
  
  let numerator = 0;
  let denom1 = 0;
  let denom2 = 0;
  
  for (let i = 0; i < n; i++) {
    const d1 = arr1[i] - mean1;
    const d2 = arr2[i] - mean2;
    numerator += d1 * d2;
    denom1 += d1 * d1;
    denom2 += d2 * d2;
  }
  
  const denominator = Math.sqrt(denom1 * denom2);
  return denominator === 0 ? 0 : numerator / denominator;
};

// Combine multiple similarity measures into overall score
export interface SimilarityResult {
  textSimilarity: number;
  imageSimilarity: number;
  layoutSimilarity: number;
  overallSimilarity: number;
  confidence: number;
  matchType: 'exact' | 'near-exact' | 'similar' | 'different';
  reasons: string[];
}

export const calculateOverallSimilarity = (
  textSim: number,
  hash1: string,
  hash2: string,
  layout1: LayoutFeatures | null,
  layout2: LayoutFeatures | null,
  options: {
    textWeight?: number;
    imageWeight?: number;
    layoutWeight?: number;
  } = {}
): SimilarityResult => {
  const { textWeight = 0.4, imageWeight = 0.4, layoutWeight = 0.2 } = options;
  
  const reasons: string[] = [];
  
  // Text similarity
  let textSimilarity = textSim;
  if (textSim >= 95) {
    textSimilarity = 100;
    reasons.push('Exact text match');
  } else if (textSim >= 80) {
    reasons.push('High text similarity');
  } else if (textSim >= 50) {
    reasons.push('Moderate text similarity');
  }
  
  // Image similarity (from perceptual hash)
  const imageSimilarity = hashSimilarity(hash1, hash2);
  if (imageSimilarity >= 95) {
    reasons.push('Identical visual content');
  } else if (imageSimilarity >= 85) {
    reasons.push('Very similar visual content');
  } else if (imageSimilarity >= 70) {
    reasons.push('Similar visual content');
  }
  
  // Layout similarity
  let layoutSimilarity = 0;
  if (layout1 && layout2) {
    layoutSimilarity = compareLayoutFeatures(layout1, layout2);
    if (layoutSimilarity >= 90) {
      reasons.push('Same page layout');
    } else if (layoutSimilarity >= 75) {
      reasons.push('Similar layout structure');
    }
  } else if (!layout1 && !layout2) {
    layoutSimilarity = 100; // Both have no significant layout
  }
  
  // Calculate weighted overall similarity
  const overallSimilarity = 
    textSimilarity * textWeight +
    imageSimilarity * imageWeight +
    layoutSimilarity * layoutWeight;
  
  // Calculate confidence based on available data
  let confidence = 100;
  if (hash1.length === 0) confidence -= 20;
  if (textSimilarity === 0) confidence -= 20;
  if (!layout1) confidence -= 10;
  
  // Determine match type
  let matchType: SimilarityResult['matchType'] = 'different';
  if (overallSimilarity >= 95 && textSimilarity >= 90) {
    matchType = 'exact';
  } else if (overallSimilarity >= 90) {
    matchType = 'near-exact';
  } else if (overallSimilarity >= 70) {
    matchType = 'similar';
  }
  
  return {
    textSimilarity,
    imageSimilarity,
    layoutSimilarity,
    overallSimilarity: Math.round(overallSimilarity),
    confidence,
    matchType,
    reasons
  };
};

// Canvas helper to get image data from PDF page
export const renderPageToImageData = async (
  page: any,
  scale: number = 1.0
): Promise<ImageData | null> => {
  try {
    const viewport = page.getViewport({ scale });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const context = canvas.getContext('2d');
    
    if (!context) return null;
    
    await page.render({
      canvasContext: context,
      viewport
    }).promise;
    
    return context.getImageData(0, 0, viewport.width, viewport.height);
  } catch (error) {
    console.error('Failed to render page to image:', error);
    return null;
  }
};

// Web Worker compatible version
export const processPageImage = async (
  page: any,
  scale: number = 0.5 // Lower scale for performance
): Promise<{
  perceptualHash: string;
  differenceHash: string;
  layoutFeatures: LayoutFeatures | null;
} | null> => {
  const imageData = await renderPageToImageData(page, scale);
  
  if (!imageData) return null;
  
  const perceptualHash = generatePerceptualHash(imageData);
  const differenceHash = generateDifferenceHash(imageData);
  const layoutFeatures = extractLayoutFeatures(imageData);
  
  return {
    perceptualHash,
    differenceHash,
    layoutFeatures
  };
};

export default {
  generatePerceptualHash,
  generateDifferenceHash,
  calculateHashDistance,
  hashSimilarity,
  extractLayoutFeatures,
  compareLayoutFeatures,
  calculateOverallSimilarity,
  processPageImage
};

