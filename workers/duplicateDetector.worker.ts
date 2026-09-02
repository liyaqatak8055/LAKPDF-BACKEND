/// <reference lib="webworker" />

/**
 * Dedicated Duplicate Detection Worker
 * Handles heavy computation without blocking UI
 */

// Import PDF.js and configure for web worker
import * as pdfjsLib from 'pdfjs-dist';

// Keep PDF.js fully local to this dedicated worker context.

// Types
interface DuplicatePageData {
  pageNumber: number;
  textHash: string;
  textContent: string;
  textLength: number;
  perceptualHash: string;
  differenceHash: string;
  imageData?: string; // Base64 thumbnail
  hasText: boolean;
  hasImages: boolean;
  orientation: 'portrait' | 'landscape';
  width: number;
  height: number;
}

interface DuplicateGroup {
  groupId: string;
  pages: number[];
  similarity: number;
  confidence: number;
  matchType: 'exact' | 'near-exact' | 'similar' | 'different';
  pageType: 'text' | 'scanned' | 'mixed';
  reasons: string[];
  textSimilarity: number;
  imageSimilarity: number;
  layoutSimilarity: number;
}

interface DuplicateDetectionResult {
  duplicates: DuplicateGroup[];
  summary: {
    totalPages: number;
    uniquePages: number;
    duplicatePages: number;
    totalDuplicates: number;
    groupsFound: number;
    processingTime: number;
    originalSize: number;
    estimatedSavings: number;
  };
  pageThumbnails: string[];
}

interface WorkerMessage {
  type: 'start' | 'progress' | 'complete' | 'error';
  data?: any;
  progress?: number;
  step?: string;
}

// Configuration
const MAX_PAGES_ANALYZE = 500; // Maximum pages to analyze
const BATCH_SIZE = 10; // Pages per batch for memory management
const SIMILARITY_THRESHOLD = 80; // Default similarity threshold (percentage)

const normalizeExtractedText = (text: string): string => {
  return (text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b(page|pg)\s*\d+\b/g, ' ')
    .replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/g, ' ')
    .replace(/\b\d+\b/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
};

// Helper function to convert blob to data URL
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const createRenderCanvas = (width: number, height: number): OffscreenCanvas | HTMLCanvasElement | null => {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  return null;
};

// Post progress update
const postProgress = (progress: number, step: string) => {
  (self as unknown as Worker).postMessage({
    type: 'progress',
    progress,
    step
  } as WorkerMessage);
};

// Generate MD5-like hash for text (simple but effective for duplicate detection)
const generateTextHash = (text: string): string => {
  if (!text || text.trim().length === 0) return '';

  const normalized = normalizeExtractedText(text);
  if (!normalized) return '';
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Also create a word-set hash for similarity
  const words = normalized.split(' ').filter(w => w.length > 2);
  words.sort();
  const wordHash = words.join(',').split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  return `${Math.abs(hash).toString(16)}-${Math.abs(wordHash).toString(16)}`;
};

// Calculate text similarity (Jaccard similarity of words)
const calculateTextSimilarity = (text1: string, text2: string): number => {
  if (!text1 || !text2) return 0;

  const words1 = new Set(normalizeExtractedText(text1).split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(normalizeExtractedText(text2).split(/\s+/).filter(w => w.length > 2));
  
  if (words1.size === 0 && words2.size === 0) return 100;
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return Math.round((intersection.size / union.size) * 100);
};

// Calculate hash similarity (Hamming distance)
const calculateHashSimilarity = (hash1: string, hash2: string): number => {
  if (!hash1 || !hash2) return 0;
  if (hash1 === hash2) return 100;
  
  // Both are format "hash1-hash2"
  const parts1 = hash1.split('-');
  const parts2 = hash2.split('-');
  
  if (parts1.length !== 2 || parts2.length !== 2) return 0;
  
  let totalDistance = 0;
  let totalBits = 0;
  
  for (let i = 0; i < 2; i++) {
    const bin1 = parseInt(parts1[i], 16).toString(2).padStart(32, '0');
    const bin2 = parseInt(parts2[i], 16).toString(2).padStart(32, '0');
    
    for (let j = 0; j < 32; j++) {
      if (bin1[j] !== bin2[j]) totalDistance++;
      totalBits++;
    }
  }
  
  return Math.round((1 - totalDistance / totalBits) * 100);
};

// Perceptual hash generation (simplified for worker)
const generatePerceptualHash = (imageData: ImageData): string => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Resize to 8x8
  const resized = new Uint8Array(64);
  const scaleX = width / 8;
  const scaleY = height / 8;
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const idx = (srcY * width + srcX) * 4;
      
      // Convert to grayscale
      const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      resized[y * 8 + x] = gray;
    }
  }
  
  // Calculate average
  const avg = resized.reduce((a, b) => a + b, 0) / 64;
  
  // Create binary hash
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += resized[i] >= avg ? '1' : '0';
  }
  
  return hash;
};

// Difference hash generation
const generateDifferenceHash = (imageData: ImageData): string => {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  
  // Resize to 9x8 (for difference calculation)
  const resized = new Uint8Array(72);
  const scaleX = width / 9;
  const scaleY = height / 8;
  
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const idx = (srcY * width + srcX) * 4;
      const gray = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      resized[y * 9 + x] = gray;
    }
  }
  
  // Create difference hash
  let hash = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const current = resized[y * 9 + x];
      const right = resized[y * 9 + (x + 1)];
      hash += current < right ? '1' : '0';
    }
  }
  
  return hash;
};

// Render page to image and extract features
const analyzePage = async (
  page: any,
  pageNum: number,
  pdf: any,
  thumbnailScale: number = 0.15
): Promise<DuplicatePageData> => {
  const viewport = page.getViewport({ scale: 1.0 });
  const orientation = viewport.width > viewport.height ? 'landscape' : 'portrait';
  
  // Extract text content
  let textContent = '';
  let textLength = 0;
  let hasText = false;
  
  try {
    const textData = await page.getTextContent();
    textContent = textData.items
      .map((item: any) => item.str || '')
      .join(' ')
      .trim();
    textLength = textContent.length;
    hasText = textLength > 0;
  } catch (e) {
    // Text extraction failed
  }
  
  // Generate text hash
  const textHash = generateTextHash(textContent);
  
  // Check for images using operator list
  let hasImages = false;
  try {
    const ops = await page.getOperatorList();
    hasImages = ops.fnArray.some((fn: any) => 
      fn === pdfjsLib.OPS.paintImageXObject || 
      fn === pdfjsLib.OPS.paintInlineImageXObject
    );
  } catch (e) {
    // Image detection failed
  }
  
  // Generate visual hashes from one render pass
  let perceptualHash = '';
  let differenceHash = '';
  try {
    const renderViewport = page.getViewport({ scale: 0.5 });
    const canvas = createRenderCanvas(renderViewport.width, renderViewport.height);
    if (!canvas) throw new Error('No canvas available in worker context');

    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport: renderViewport
      }).promise;

      const bitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      perceptualHash = generatePerceptualHash(bitmap);
      differenceHash = generateDifferenceHash(bitmap);
    }
  } catch (e) {
    // Visual hash extraction failed
  }
  
  // Generate thumbnail
  let imageData: string = '';
  try {
    const thumbViewport = page.getViewport({ scale: thumbnailScale });
    const canvas = createRenderCanvas(thumbViewport.width, thumbViewport.height);
    if (!canvas) throw new Error('No canvas available in worker context');
    
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport: thumbViewport
      }).promise;
      
      // Convert to data URL based on canvas type
      if ('convertToBlob' in canvas) {
        const blob = await (canvas as OffscreenCanvas).convertToBlob({ type: 'image/png' });
        imageData = await blobToDataURL(blob);
      } else {
        imageData = (canvas as HTMLCanvasElement).toDataURL('image/png');
      }
    }
  } catch (e) {
    // Thumbnail generation failed - use placeholder
    imageData = '';
  }
  
  return {
    pageNumber: pageNum,
    textHash,
    textContent,
    textLength,
    perceptualHash,
    differenceHash,
    imageData,
    hasText,
    hasImages,
    orientation,
    width: Math.round(viewport.width),
    height: Math.round(viewport.height)
  };
};

// Compare two pages and return similarity metrics
const comparePages = (
  page1: DuplicatePageData,
  page2: DuplicatePageData,
  threshold: number = SIMILARITY_THRESHOLD
): {
  isDuplicate: boolean;
  similarity: number;
  confidence: number;
  matchType: 'exact' | 'near-exact' | 'similar' | 'different';
  pageType: 'text' | 'scanned' | 'mixed';
  reasons: string[];
  textSimilarity: number;
  imageSimilarity: number;
  layoutSimilarity: number;
} => {
  const reasons: string[] = [];
  let totalScore = 0;
  let weights = 0;

  const minTextLength = Math.min(page1.textLength, page2.textLength);

  // Text similarity (weight: dynamic)
  let textSim = 0;
  if (page1.textHash && page2.textHash) {
    if (page1.textHash === page2.textHash) {
      textSim = 100;
      reasons.push('Exact text match');
    } else {
      textSim = calculateTextSimilarity(page1.textContent, page2.textContent);
      if (textSim >= 80) reasons.push('High text similarity');
      else if (textSim >= 50) reasons.push('Moderate text similarity');
    }
  }
  const textWeight = minTextLength >= 100 ? 0.5 : 0.3;
  totalScore += textSim * textWeight;
  weights += textWeight;

  // Image similarity (perceptual + difference) (weight: 35%)
  let perceptualSim = 0;
  let differenceSim = 0;
  let imageSim = 0;
  if (page1.perceptualHash && page2.perceptualHash) {
    perceptualSim = calculateHashSimilarity(page1.perceptualHash, page2.perceptualHash);
  }
  if (page1.differenceHash && page2.differenceHash) {
    differenceSim = calculateHashSimilarity(page1.differenceHash, page2.differenceHash);
  }
  imageSim = (perceptualSim > 0 && differenceSim > 0)
    ? Math.round((perceptualSim * 0.6) + (differenceSim * 0.4))
    : Math.max(perceptualSim, differenceSim);

  if (imageSim >= 95) reasons.push('Identical visual content');
  else if (imageSim >= 85) reasons.push('Very similar visual content');
  else if (imageSim >= 70) reasons.push('Similar visual content');
  if (minTextLength < 25 && imageSim >= 92) {
    reasons.push('Scanned-page visual duplicate');
  }
  totalScore += imageSim * 0.35;
  weights += 0.35;

  // Layout similarity (weight: 15%)
  let layoutSim = 0;
  const widthRatio = Math.min(page1.width, page2.width) / Math.max(page1.width, page2.width);
  const heightRatio = Math.min(page1.height, page2.height) / Math.max(page1.height, page2.height);
  
  if (widthRatio > 0.95 && heightRatio > 0.95) {
    layoutSim = 100;
    if (page1.orientation === page2.orientation) {
      reasons.push('Same page dimensions and orientation');
    }
  } else {
    layoutSim = (widthRatio + heightRatio) / 2 * 100;
  }
  totalScore += layoutSim * 0.15;
  weights += 0.15;

  // Content profile similarity (weight: 10%)
  const textDensity1 = page1.textLength / Math.max(1, page1.width * page1.height);
  const textDensity2 = page2.textLength / Math.max(1, page2.width * page2.height);
  const densityRatio = Math.min(textDensity1, textDensity2) / Math.max(textDensity1, textDensity2, 0.0000001);
  const profileSim = Math.round(Math.max(0, Math.min(1, densityRatio)) * 100);
  if (profileSim >= 85) reasons.push('Similar content density profile');
  totalScore += profileSim * 0.1;
  weights += 0.1;

  // Multi-tier accurate similarity evaluation
  let overallSimilarity = weights > 0 ? totalScore / weights : 0;
  if (minTextLength >= 40 && textSim >= 90) {
    overallSimilarity = Math.max(overallSimilarity, textSim);
  } else if (minTextLength < 40 && imageSim >= 85) {
    overallSimilarity = Math.max(overallSimilarity, imageSim);
  }
  
  // Determine page type
  let pageType: 'text' | 'scanned' | 'mixed' = 'mixed';
  if (page1.hasText && !page1.hasImages && page2.hasText && !page2.hasImages) {
    pageType = 'text';
  } else if (!page1.hasText && page1.hasImages && !page2.hasText && page2.hasImages) {
    pageType = 'scanned';
  }
  
  // Determine match type
  let matchType: 'exact' | 'near-exact' | 'similar' | 'different' = 'different';
  if (overallSimilarity >= 97 && (textSim >= 95 || imageSim >= 97)) {
    matchType = 'exact';
  } else if (overallSimilarity >= 90) {
    matchType = 'near-exact';
  } else if (overallSimilarity >= threshold) {
    matchType = 'similar';
  }

  // Calculate confidence
  let confidence = 75;
  if (textSim >= 90) confidence += 12;
  if (imageSim >= 90) confidence += 12;
  if (layoutSim >= 95) confidence += 6;
  if (!page1.perceptualHash || !page2.perceptualHash) confidence -= 10;
  if (!page1.textHash || !page2.textHash) confidence -= 6;
  if (page1.textLength < 30 && page2.textLength < 30 && imageSim < 85) confidence -= 8;
  if (Math.abs(page1.textLength - page2.textLength) > 400 && textSim < 80) confidence -= 6;

  const isDuplicate =
    overallSimilarity >= threshold ||
    (minTextLength >= 40 && textSim >= 90) ||
    (minTextLength < 40 && imageSim >= 88);

  return {
    isDuplicate,
    similarity: Math.round(overallSimilarity),
    confidence: Math.max(50, confidence),
    matchType,
    pageType,
    reasons,
    textSimilarity: textSim,
    imageSimilarity: imageSim,
    layoutSimilarity: layoutSim
  };
};

// Find duplicate groups
const findDuplicateGroups = (
  pages: DuplicatePageData[],
  threshold: number
): DuplicateGroup[] => {
  const groups: DuplicateGroup[] = [];
  const n = pages.length;
  if (n < 2) return groups;

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const pairCache = new Map<string, ReturnType<typeof comparePages>>();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const comp = comparePages(pages[i], pages[j], threshold);
      pairCache.set(`${i}:${j}`, comp);
      if (comp.isDuplicate) {
        union(i, j);
      }
    }
  }

  const components = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    const list = components.get(root) || [];
    list.push(i);
    components.set(root, list);
  }

  let groupIndex = 1;
  components.forEach((component) => {
    if (component.length < 2) return;

    let totalSim = 0;
    let totalConf = 0;
    let totalTextSim = 0;
    let totalImageSim = 0;
    let totalLayoutSim = 0;
    let comparisons = 0;
    const allReasons: Set<string> = new Set();

    for (let a = 0; a < component.length; a++) {
      for (let b = a + 1; b < component.length; b++) {
        const left = component[a];
        const right = component[b];
        const key = left < right ? `${left}:${right}` : `${right}:${left}`;
        const comp = pairCache.get(key);
        if (!comp || !comp.isDuplicate) continue;

        comparisons++;
        totalSim += comp.similarity;
        totalConf += comp.confidence;
        totalTextSim += comp.textSimilarity;
        totalImageSim += comp.imageSimilarity;
        totalLayoutSim += comp.layoutSimilarity;
        comp.reasons.forEach(reason => allReasons.add(reason));
      }
    }

    if (comparisons === 0) return;

    const hasText = component.some((idx) => pages[idx].hasText);
    const hasImages = component.some((idx) => pages[idx].hasImages);
    let pageType: 'text' | 'scanned' | 'mixed' = 'mixed';
    if (hasText && !hasImages) pageType = 'text';
    else if (!hasText && hasImages) pageType = 'scanned';

    const avgSim = Math.round(totalSim / comparisons);
    const avgConf = Math.round(totalConf / comparisons);

    groups.push({
      groupId: `group-${groupIndex++}`,
      pages: component.map((idx) => pages[idx].pageNumber).sort((a, b) => a - b),
      similarity: avgSim,
      confidence: Math.max(50, avgConf),
      matchType: avgSim >= 97 ? 'exact' : avgSim >= 90 ? 'near-exact' : 'similar',
      pageType,
      reasons: Array.from(allReasons).slice(0, 4),
      textSimilarity: Math.round(totalTextSim / comparisons),
      imageSimilarity: Math.round(totalImageSim / comparisons),
      layoutSimilarity: Math.round(totalLayoutSim / comparisons)
    });
  });

  return groups.sort((a, b) => (b.similarity - a.similarity) || (b.pages.length - a.pages.length));
};

// Main detection function
const detectDuplicates = async (
  buffer: ArrayBuffer,
  options: {
    threshold?: number;
    maxPages?: number;
  } = {}
): Promise<DuplicateDetectionResult> => {
  const startTime = Date.now();
  const { threshold = SIMILARITY_THRESHOLD, maxPages = MAX_PAGES_ANALYZE } = options;
  
  postProgress(0, 'Loading PDF document...');
  
  let pdf: any = null;
  let pages: any[] = [];
  
  try {
    // Load PDF
    const loadingTask = pdfjsLib.getDocument({
      data: buffer,
      verbosity: 0,
      disableWorker: true
    } as any);
    pdf = await loadingTask.promise;
    
    const totalPages = pdf.numPages;
    const pagesToAnalyze = Math.min(totalPages, maxPages);
    
    postProgress(5, `Analyzing ${pagesToAnalyze} pages...`);
    
    // Analyze pages in batches for memory management
    const pageData: DuplicatePageData[] = [];
    
    for (let i = 1; i <= pagesToAnalyze; i++) {
      const progress = 5 + (i / pagesToAnalyze) * 70;
      postProgress(progress, `Analyzing page ${i} of ${pagesToAnalyze}...`);
      
      try {
        const page = await pdf.getPage(i);
        pages.push(page);
        
        const data = await analyzePage(page, i, pdf);
        pageData.push(data);
      } catch (e) {
        console.warn(`Failed to analyze page ${i}:`, e);
      }
      
      // Cleanup every batch
      if (i % BATCH_SIZE === 0) {
        // Keep references for rendering but clear any cached data
      }
    }
    
    postProgress(75, 'Comparing pages for duplicates...');
    
    // Find duplicate groups
    const duplicateGroups = findDuplicateGroups(pageData, threshold);
    
    postProgress(90, 'Generating thumbnails...');
    
    // Generate thumbnails for all pages
    const pageThumbnails: string[] = [];
    for (let i = 0; i < pageData.length; i++) {
      pageThumbnails.push(pageData[i].imageData || '');
    }
    
    // Calculate summary
    const totalDuplicates = duplicateGroups.reduce(
      (sum, group) => sum + group.pages.length - 1,
      0
    );
    const uniquePages = totalPages - totalDuplicates;
    
    postProgress(95, 'Finalizing results...');
    
    const processingTime = Date.now() - startTime;
    
    return {
      duplicates: duplicateGroups,
      summary: {
        totalPages,
        uniquePages,
        duplicatePages: totalDuplicates,
        totalDuplicates: duplicateGroups.length,
        groupsFound: duplicateGroups.length,
        processingTime,
        originalSize: buffer.byteLength,
        estimatedSavings: Math.round((totalDuplicates / totalPages) * 100)
      },
      pageThumbnails
    };
    
  } finally {
    // Cleanup
    try {
      pages.forEach(page => {
        if (page && page.cleanup) page.cleanup();
      });
      pages = [];
      
      if (pdf) {
        if (pdf.cleanup) pdf.cleanup();
        if (pdf.destroy) pdf.destroy();
      }
    } catch (e) {
      console.warn('Cleanup failed:', e);
    }
  }
};

// Message handler
(self as unknown as Worker).onmessage = async (e: MessageEvent) => {
  const { buffer, threshold, maxPages, action } = e.data;
  
  if (action === 'detect') {
    try {
      const result = await detectDuplicates(buffer, { threshold, maxPages });
      (self as unknown as Worker).postMessage({
        type: 'complete',
        data: result
      });
    } catch (error) {
      (self as unknown as Worker).postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export {};
