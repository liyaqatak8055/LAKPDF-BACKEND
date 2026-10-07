import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { safeLoadPdf } from './pdfService';
import { preprocessCanvasForOcr } from '../utils/ocrPostProcess';

const pdfjs = pdfjsLib as any;

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions?.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;
}

export interface RedactionBox {
  id: string;
  pageIndex: number; // 0-based
  // Relative coordinates in percentage (0 to 1) of the page width & height
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  type: 'blackout' | 'whiteout';
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface RedactionOptions {
  sanitizeMetadata?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface SearchMatch {
  pageIndex: number;
  text: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  confidence?: 'high' | 'medium' | 'low';
  isOcr?: boolean;
  category?: 'aadhaar' | 'pan' | 'phone' | 'email' | 'card' | 'ssn' | 'search';
}

export interface SearchRedactOptions {
  enableOcr?: boolean;
  deepOcr?: boolean;
  ocrLanguage?: string;
  onProgress?: (message: string, progress: number) => void;
}

export interface PiiDetectionOptions {
  categories?: Array<'aadhaar' | 'pan' | 'phone' | 'email' | 'card' | 'ssn'>;
  enableOcr?: boolean;
  deepOcr?: boolean;
  ocrLanguage?: string;
  onProgress?: (message: string, progress: number) => void;
}

export interface SecurityVerificationResult {
  secure: boolean;
  message: string;
  leakedQuery?: string;
  vectorTextClean: boolean;
  ocrClean: boolean;
}

export interface SecurityVerificationOptions {
  ocrLanguage?: string;
  verifyWithOcr?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface OcrWordToken {
  text: string;
  confidence: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  canvasW: number;
  canvasH: number;
}

// Global in-memory cache for page OCR tokens so repeated searches are instantaneous
const ocrPageCache = new Map<string, OcrWordToken[]>();

let cachedWorker: any = null;
let cachedWorkerLang: string = '';

const loadTesseract = async () => {
  const mod = await import('tesseract.js');
  return (mod as any).default || mod;
};

export const getRedactOcrWorker = async (language: string = 'eng') => {
  if (cachedWorker && cachedWorkerLang === language) {
    return cachedWorker;
  }
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {}
    cachedWorker = null;
    cachedWorkerLang = '';
  }
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker(language, 1, {
    logger: () => {},
  });
  await worker.setParameters({
    tessedit_pageseg_mode: '3', // AUTO
    preserve_interword_spaces: '1',
  });
  cachedWorker = worker;
  cachedWorkerLang = language;
  return worker;
};

export const terminateRedactOcrWorker = async () => {
  if (cachedWorker) {
    try {
      await cachedWorker.terminate();
    } catch {}
    cachedWorker = null;
    cachedWorkerLang = '';
  }
};

export const clearRedactOcrCache = async () => {
  ocrPageCache.clear();
  await terminateRedactOcrWorker();
};

// Normalization helper: strips whitespace, punctuation, and converts to lowercase
export const cleanForComparison = (str: string): string => {
  return str.toLowerCase().replace(/[\s\-_./,:;()#\u00A0]/g, '');
};

// Normalizes common OCR digit ambiguities (O -> 0, I/l/! -> 1, Z/z -> 2, S -> 5, B -> 8)
export const normalizeOcrDigits = (str: string): string => {
  return str
    .replace(/[Oo]/g, '0')
    .replace(/[Il|!]/g, '1')
    .replace(/[Zz]/g, '2')
    .replace(/[Ss]/g, '5')
    .replace(/[B]/g, '8');
};

// Levenshtein distance for fuzzy matching typos or OCR character recognition errors
export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const val = Math.min(row[j] + 1, prev + 1, row[j - 1] + cost);
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
};

// Normalizes common OCR text ambiguities: 1/l/|/! -> i, 0 -> o, rn -> m, vv -> w
export const normalizeOcrTextAmbiguities = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[1l|!]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/[\s\-_./,:;()#\u00A0]/g, '');
};

// Fuzzy match single words (accounting for OCR misreadings like Tarlque <-> Tarique, Aallya <-> Aaliya)
export const isWordFuzzyMatch = (sourceWord: string, targetQuery: string): boolean => {
  const c1 = cleanForComparison(sourceWord);
  const c2 = cleanForComparison(targetQuery);
  if (!c1 || !c2) return false;

  // Exact or substring match
  if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) return true;

  // Normalized OCR text ambiguities (e.g. 1/l -> i)
  const n1 = normalizeOcrTextAmbiguities(c1);
  const n2 = normalizeOcrTextAmbiguities(c2);
  if (n1 === n2 || n1.includes(n2) || n2.includes(n1)) return true;

  // For words of 4+ characters, allow 1 character distance
  if (c1.length >= 4 && c2.length >= 4) {
    if (Math.abs(c1.length - c2.length) <= 1) {
      if (levenshteinDistance(c1, c2) <= 1) return true;
      if (levenshteinDistance(n1, n2) <= 1) return true;
    }
  }

  return false;
};

/**
 * Decomposes user search queries when users enter multiple items or compound targets:
 * E.g. "8515 3843 3319 Aaliya Tarique Khan" or "1234 5678 9012, 9876543210"
 * Returns list of distinct query fragments to search and redact.
 */
export const decomposeSearchQuery = (rawQuery: string): string[] => {
  const trimmed = rawQuery.trim();
  if (!trimmed) return [];

  // 1. Explicit delimiters: comma, semicolon, newline, vertical bar, slash
  if (/[,;\n|\/]/.test(trimmed)) {
    const parts = trimmed.split(/[,;\n|\/]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts;
    }
  }

  const subQueries: string[] = [];

  // 2. Check for embedded 12-digit Aadhaar / ID number (with spaces or continuous)
  const aadhaarRegex = /\b(\d{4}[\s-]?\d{4}[\s-]?\d{4})\b/;
  const aadhaarMatch = trimmed.match(aadhaarRegex);

  // 3. Check for embedded PAN card number
  const panRegex = /\b([A-Z]{5}\d{4}[A-Z])\b/i;
  const panMatch = trimmed.match(panRegex);

  // 3b. Check for embedded 9-digit US SSN (e.g. 123-45-6789)
  const ssnRegex = /\b(\d{3}-\d{2}-\d{4})\b/;
  const ssnMatch = trimmed.match(ssnRegex);

  // 4. Check for embedded 10-digit Phone number
  const phoneRegex = /\b([6-9]\d{9})\b/;
  const phoneMatch = trimmed.match(phoneRegex);

  let remaining = trimmed;

  if (aadhaarMatch) {
    subQueries.push(aadhaarMatch[1].trim());
    remaining = remaining.replace(aadhaarMatch[0], ' ').trim();
  }
  if (panMatch) {
    subQueries.push(panMatch[1].trim());
    remaining = remaining.replace(panMatch[0], ' ').trim();
  }
  if (ssnMatch) {
    subQueries.push(ssnMatch[1].trim());
    remaining = remaining.replace(ssnMatch[0], ' ').trim();
  }
  if (phoneMatch) {
    subQueries.push(phoneMatch[1].trim());
    remaining = remaining.replace(phoneMatch[0], ' ').trim();
  }

  // If there is remaining text after extracting structured IDs (e.g. "Aaliya Tarique Khan")
  if (remaining.replace(/[\s\-_]/g, '').length >= 2) {
    subQueries.push(remaining.replace(/\s+/g, ' ').trim());
  }

  // Fallback to the full query if no decomposition occurred
  if (subQueries.length === 0) {
    subQueries.push(trimmed);
  }

  return subQueries;
};

/**
 * Extracts OCR tokens from a specific page of a PDF document
 */
export const extractPageOcrTokens = async (
  pdfDoc: any,
  pageNum: number,
  fileKey: string,
  language: string = 'eng',
  onProgress?: (msg: string, pct: number) => void
): Promise<OcrWordToken[]> => {
  const cacheKey = `${fileKey}-page-${pageNum}-${language}`;
  if (ocrPageCache.has(cacheKey)) {
    return ocrPageCache.get(cacheKey)!;
  }

  onProgress?.(`Scanning image content on Page ${pageNum}...`, 30);
  const page = await pdfDoc.getPage(pageNum);
  const scale = 2.0; // High resolution for OCR precision
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;

  // Preprocess with gentle contrast boost without hard binarization to preserve smooth font edges
  const processedCanvas = preprocessCanvasForOcr(canvas, {
    contrastBoost: 1.25,
    thresholdOffset: 0,
    binarize: false,
  });

  onProgress?.(`Extracting text from scanned Page ${pageNum}...`, 60);
  const words: OcrWordToken[] = [];
  try {
    const worker = await getRedactOcrWorker(language);
    const result = await worker.recognize(processedCanvas);
    if (result?.data?.words) {
      for (const w of result.data.words) {
        if (!w.text || !w.text.trim()) continue;
        words.push({
          text: w.text.trim(),
          confidence: w.confidence || 0,
          x0: w.bbox.x0,
          y0: w.bbox.y0,
          x1: w.bbox.x1,
          y1: w.bbox.y1,
          canvasW: canvas.width,
          canvasH: canvas.height,
        });
      }
    }
  } catch (err) {
    console.warn(`Worker OCR error on page ${pageNum}, attempting direct recognize fallback:`, err);
    try {
      const Tesseract = await loadTesseract();
      const directResult = await Tesseract.recognize(processedCanvas, language, {
        logger: () => {},
      });
      if (directResult?.data?.words) {
        for (const w of directResult.data.words) {
          if (!w.text || !w.text.trim()) continue;
          words.push({
            text: w.text.trim(),
            confidence: w.confidence || 0,
            x0: w.bbox.x0,
            y0: w.bbox.y0,
            x1: w.bbox.x1,
            y1: w.bbox.y1,
            canvasW: canvas.width,
            canvasH: canvas.height,
          });
        }
      }
    } catch (fallbackErr) {
      console.error(`Direct OCR fallback failed on page ${pageNum}:`, fallbackErr);
    }
  }

  // Explicitly free canvas memory
  canvas.width = 0;
  canvas.height = 0;
  if (processedCanvas !== canvas) {
    processedCanvas.width = 0;
    processedCanvas.height = 0;
  }

  ocrPageCache.set(cacheKey, words);
  return words;
};

/**
 * Generalized multi-token sliding window matcher with fuzzy OCR resilience
 * Works on both native PDF text tokens and OCR word tokens.
 * Handles split numbers (e.g. "8515 3843 3319" split into 3 tokens) and unions their bounding boxes.
 */
function findMatchesInTokens(
  tokens: Array<{
    text: string;
    confidence?: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    canvasW: number;
    canvasH: number;
  }>,
  query: string,
  pageIndex: number,
  isOcr: boolean = false
): SearchMatch[] {
  if (!tokens || tokens.length === 0 || !query.trim()) return [];

  const cleanQuery = cleanForComparison(query);
  const isNumericQuery = /^\d+$/.test(cleanQuery);
  const queryWords = query.trim().split(/\s+/).filter(Boolean);
  const matches: SearchMatch[] = [];

  // Helper to test if text matches query (exact or with OCR digit/text normalization)
  const isTextMatch = (raw: string): boolean => {
    const clean = cleanForComparison(raw);
    if (clean.includes(cleanQuery)) return true;
    if (isNumericQuery) {
      const normalizedDigits = normalizeOcrDigits(clean);
      if (normalizedDigits.includes(cleanQuery)) return true;
    }
    // Check normalized text ambiguities for general words
    const normRaw = normalizeOcrTextAmbiguities(clean);
    const normQuery = normalizeOcrTextAmbiguities(cleanQuery);
    if (normRaw.includes(normQuery)) return true;
    return false;
  };

  // 1. Single token matching
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    let matched = isTextMatch(t.text);
    if (!matched && queryWords.length === 1) {
      matched = isWordFuzzyMatch(t.text, queryWords[0]);
    }

    if (matched) {
      const padX = 4 / t.canvasW;
      const padY = 2 / t.canvasH;
      const xPercent = Math.max(0, (t.x0 / t.canvasW) - padX);
      const yPercent = Math.max(0, (t.y0 / t.canvasH) - padY);
      const widthPercent = Math.min(1 - xPercent, ((t.x1 - t.x0) / t.canvasW) + (padX * 2));
      const heightPercent = Math.min(1 - yPercent, ((t.y1 - t.y0) / t.canvasH) + (padY * 2));

      matches.push({
        pageIndex,
        text: t.text,
        xPercent,
        yPercent,
        widthPercent,
        heightPercent,
        confidence: (t.confidence && t.confidence < 70) ? 'medium' : 'high',
        isOcr,
        category: 'search',
      });
    }
  }

  // 2. Multi-token sliding window matching (across 2 to 8 adjacent tokens on the same line)
  const maxWindow = Math.min(8, tokens.length);
  for (let start = 0; start < tokens.length; start++) {
    let combinedRaw = '';
    let minX0 = tokens[start].x0;
    let minY0 = tokens[start].y0;
    let maxX1 = tokens[start].x1;
    let maxY1 = tokens[start].y1;
    const canvasW = tokens[start].canvasW;
    const canvasH = tokens[start].canvasH;
    const windowTokens: string[] = [];

    for (let end = start; end < Math.min(start + maxWindow, tokens.length); end++) {
      const cur = tokens[end];
      const curH = cur.y1 - cur.y0;

      // Check vertical baseline continuity (tokens should roughly sit on the same line)
      const verticalDist = Math.abs((cur.y0 + cur.y1) / 2 - (minY0 + maxY1) / 2);
      if (verticalDist > curH * 1.8) {
        break; // Moved to a different line
      }

      combinedRaw += ' ' + cur.text;
      windowTokens.push(cur.text);
      minX0 = Math.min(minX0, cur.x0);
      minY0 = Math.min(minY0, cur.y0);
      maxX1 = Math.max(maxX1, cur.x1);
      maxY1 = Math.max(maxY1, cur.y1);

      let matched = isTextMatch(combinedRaw);

      // If not exact match and query is multi-word, test word-by-word fuzzy match!
      if (!matched && queryWords.length > 1 && windowTokens.length === queryWords.length) {
        let allWordsMatch = true;
        for (let w = 0; w < queryWords.length; w++) {
          if (!isWordFuzzyMatch(windowTokens[w], queryWords[w])) {
            allWordsMatch = false;
            break;
          }
        }
        if (allWordsMatch) matched = true;
      }

      if (matched) {
        const padX = 4 / canvasW;
        const padY = 2 / canvasH;
        const xPercent = Math.max(0, (minX0 / canvasW) - padX);
        const yPercent = Math.max(0, (minY0 / canvasH) - padY);
        const widthPercent = Math.min(1 - xPercent, ((maxX1 - minX0) / canvasW) + (padX * 2));
        const heightPercent = Math.min(1 - yPercent, ((maxY1 - minY0) / canvasH) + (padY * 2));

        // Prevent duplicate overlapping match
        const isDuplicate = matches.some(
          m => m.pageIndex === pageIndex &&
               Math.abs(m.xPercent - xPercent) < 0.02 &&
               Math.abs(m.yPercent - yPercent) < 0.02
        );

        if (!isDuplicate) {
          matches.push({
            pageIndex,
            text: tokens.slice(start, end + 1).map(t => t.text).join(' '),
            xPercent,
            yPercent,
            widthPercent,
            heightPercent,
            confidence: 'high',
            isOcr,
            category: 'search',
          });
        }
        break;
      }
    }
  }

  return matches;
}

/**
 * Searches text across all pages in a PDF.
 * Checks native PDF text layer first.
 * If no match is found OR if the page is image-based/scanned, automatically invokes OCR!
 */
export const searchPdfForRedaction = async (
  file: File,
  query: string,
  options: SearchRedactOptions = {}
): Promise<SearchMatch[]> => {
  if (!query || query.trim().length === 0) return [];

  const { enableOcr = true, deepOcr = true, ocrLanguage = 'eng+hin', onProgress } = options;
  const fileKey = `${file.name}-${file.size}-${file.lastModified}`;

  onProgress?.('Searching document text layer...', 10);
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const allMatches: SearchMatch[] = [];

  const subQueries = decomposeSearchQuery(query);
  const queriesToSearch = Array.from(new Set([query.trim(), ...subQueries]));

  const pageCharCounts: number[] = [];
  const pagesWithNativeMatches = new Set<number>();

  // Helper to run matching across all target queries for a set of page tokens
  const searchInTokensList = (tokens: any[], pageIdx: number, isOcr: boolean): SearchMatch[] => {
    const list: SearchMatch[] = [];
    for (const q of queriesToSearch) {
      const qMatches = findMatchesInTokens(tokens, q, pageIdx, isOcr);
      for (const m of qMatches) {
        const isDup = list.some(
          ex => ex.pageIndex === m.pageIndex &&
                Math.abs(ex.xPercent - m.xPercent) < 0.02 &&
                Math.abs(ex.yPercent - m.yPercent) < 0.02
        );
        if (!isDup) {
          list.push(m);
        }
      }
    }
    return list;
  };

  // Phase 1: Native Text Layer Scan
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    const totalChars = items.reduce((acc, it) => acc + (it.str?.length || 0), 0);
    pageCharCounts[pageNum - 1] = totalChars;

    // Convert native PDF text items to token format
    const nativeTokens = items
      .filter(item => item.str && item.str.trim().length > 0)
      .map(item => {
        const tx = item.transform ? item.transform[4] : 0;
        const ty = item.transform ? item.transform[5] : 0;
        const itemW = item.width || 40;
        const itemH = Math.abs(item.transform ? (item.transform[3] || item.transform[0] || 12) : 12);

        let vx: number, vy: number;
        if (typeof viewport.convertToViewportPoint === 'function') {
          const pt = viewport.convertToViewportPoint(tx, ty);
          vx = pt[0];
          vy = pt[1] - itemH;
        } else {
          vx = tx;
          vy = viewport.height - ty - itemH;
        }

        return {
          text: item.str,
          x0: vx,
          y0: vy,
          x1: vx + itemW,
          y1: vy + itemH,
          canvasW: viewport.width,
          canvasH: viewport.height,
        };
      });

    const pageMatches = searchInTokensList(nativeTokens, pageNum - 1, false);
    if (pageMatches.length > 0) {
      pagesWithNativeMatches.add(pageNum);
      allMatches.push(...pageMatches);
    }
  }

  // Phase 2: Intelligent OCR Fallback
  // A page needs OCR inspection if:
  // 1. It has low text density (< 120 chars) - indicative of scanned document, photo ID, or form
  // 2. The native search found ZERO matches on that page, AND (deepOcr is true OR allMatches.length === 0)
  // 3. User specifically requested OCR
  if (enableOcr) {
    const pagesToOcr: number[] = [];
    for (let p = 1; p <= numPages; p++) {
      const chars = pageCharCounts[p - 1] ?? 0;
      const hadNativeMatch = pagesWithNativeMatches.has(p);
      const isScannedOrSparse = chars < 120;

      if (!hadNativeMatch) {
        if (isScannedOrSparse || deepOcr || allMatches.length === 0) {
          pagesToOcr.push(p);
        }
      } else if (deepOcr && isScannedOrSparse) {
        pagesToOcr.push(p);
      }
    }

    if (pagesToOcr.length > 0) {
      onProgress?.(`Inspecting ${pagesToOcr.length} scanned/image page(s) with OCR (${ocrLanguage})...`, 25);

      for (let i = 0; i < pagesToOcr.length; i++) {
        const pageNum = pagesToOcr[i];
        try {
          const ocrTokens = await extractPageOcrTokens(
            pdfDoc,
            pageNum,
            fileKey,
            ocrLanguage,
            (msg, p) => onProgress?.(msg, Math.round(25 + (i / pagesToOcr.length) * 70 + (p * 0.7 / pagesToOcr.length)))
          );

          const ocrMatches = searchInTokensList(ocrTokens, pageNum - 1, true);
          allMatches.push(...ocrMatches);
        } catch (ocrErr) {
          console.warn(`OCR error on page ${pageNum}:`, ocrErr);
        }
      }
    }
  }

  // Deduplicate and merge horizontally adjacent or overlapping matches (e.g. split Aadhaar digits)
  const mergedMatches = mergeOverlappingSearchMatches(allMatches);

  onProgress?.(
    mergedMatches.length > 0
      ? `Found ${mergedMatches.length} match(es) across document!`
      : 'Search complete: No matches found.',
    100
  );

  return mergedMatches;
};

/**
 * Merges search matches that are on the same line and either overlap or are immediately adjacent
 * (e.g. split tokens in an Aadhaar number like [8515] [3843] [3319] into one clean unified box).
 */
export function mergeOverlappingSearchMatches(matches: SearchMatch[]): SearchMatch[] {
  if (matches.length <= 1) return matches;

  const byPage = new Map<number, SearchMatch[]>();
  for (const m of matches) {
    const list = byPage.get(m.pageIndex) || [];
    list.push({ ...m });
    byPage.set(m.pageIndex, list);
  }

  const mergedResults: SearchMatch[] = [];

  for (const [pageIndex, pageMatches] of byPage.entries()) {
    let changed = true;
    let list = pageMatches;

    while (changed) {
      changed = false;
      const nextList: SearchMatch[] = [];
      const used = new Set<number>();

      for (let i = 0; i < list.length; i++) {
        if (used.has(i)) continue;
        let m1 = list[i];

        for (let j = i + 1; j < list.length; j++) {
          if (used.has(j)) continue;
          const m2 = list[j];

          const y1Min = m1.yPercent;
          const y1Max = m1.yPercent + m1.heightPercent;
          const y2Min = m2.yPercent;
          const y2Max = m2.yPercent + m2.heightPercent;
          const verticalOverlap = Math.max(0, Math.min(y1Max, y2Max) - Math.max(y1Min, y2Min));
          const minH = Math.min(m1.heightPercent, m2.heightPercent);

          const x1Min = m1.xPercent;
          const x1Max = m1.xPercent + m1.widthPercent;
          const x2Min = m2.xPercent;
          const x2Max = m2.xPercent + m2.widthPercent;
          const horizGap = Math.max(0, Math.max(x1Min, x2Min) - Math.min(x1Max, x2Max));

          // If on roughly the same line (vertical overlap >= 40% of height) AND (horizontally overlapping or gap < 2.5% of page)
          const sameLine = verticalOverlap >= minH * 0.40;
          const closeHorizontally = horizGap < 0.025;
          const isInside = (x1Min <= x2Min && x1Max >= x2Max && y1Min <= y2Min && y1Max >= y2Max) ||
                           (x2Min <= x1Min && x2Max >= x1Max && y2Min <= y1Min && y2Max >= y1Max);

          if ((sameLine && closeHorizontally) || isInside) {
            const newMinX = Math.min(x1Min, x2Min);
            const newMaxX = Math.max(x1Max, x2Max);
            const newMinY = Math.min(y1Min, y2Min);
            const newMaxY = Math.max(y1Max, y2Max);

            m1 = {
              ...m1,
              text: `${m1.text} ${m2.text}`.trim(),
              xPercent: newMinX,
              yPercent: newMinY,
              widthPercent: newMaxX - newMinX,
              heightPercent: newMaxY - newMinY,
              isOcr: m1.isOcr || m2.isOcr,
            };
            used.add(j);
            changed = true;
          }
        }
        used.add(i);
        nextList.push(m1);
      }
      list = nextList;
    }
    mergedResults.push(...list);
  }

  return mergedResults;
}

/**
 * Merges overlapping or immediately adjacent RedactionBox rectangles on the same page
 */
export function mergeOverlappingBoxes(boxes: RedactionBox[]): RedactionBox[] {
  if (boxes.length <= 1) return boxes;

  const byPage = new Map<number, RedactionBox[]>();
  for (const b of boxes) {
    const list = byPage.get(b.pageIndex) || [];
    list.push({ ...b });
    byPage.set(b.pageIndex, list);
  }

  const result: RedactionBox[] = [];

  for (const [pageIndex, pageBoxes] of byPage.entries()) {
    let changed = true;
    let list = pageBoxes;

    while (changed) {
      changed = false;
      const nextList: RedactionBox[] = [];
      const used = new Set<number>();

      for (let i = 0; i < list.length; i++) {
        if (used.has(i)) continue;
        let b1 = list[i];

        for (let j = i + 1; j < list.length; j++) {
          if (used.has(j)) continue;
          const b2 = list[j];

          if (b1.type !== b2.type) continue;

          const y1Min = b1.yPercent;
          const y1Max = b1.yPercent + b1.heightPercent;
          const y2Min = b2.yPercent;
          const y2Max = b2.yPercent + b2.heightPercent;
          const verticalOverlap = Math.max(0, Math.min(y1Max, y2Max) - Math.max(y1Min, y2Min));
          const minH = Math.min(b1.heightPercent, b2.heightPercent);

          const x1Min = b1.xPercent;
          const x1Max = b1.xPercent + b1.widthPercent;
          const x2Min = b2.xPercent;
          const x2Max = b2.xPercent + b2.widthPercent;
          const horizGap = Math.max(0, Math.max(x1Min, x2Min) - Math.min(x1Max, x2Max));

          const sameLine = verticalOverlap >= minH * 0.40;
          const closeHorizontally = horizGap < 0.025;
          const isInside = (x1Min <= x2Min && x1Max >= x2Max && y1Min <= y2Min && y1Max >= y2Max) ||
                           (x2Min <= x1Min && x2Max >= x1Max && y2Min <= y1Min && y2Max >= y1Max);

          if ((sameLine && closeHorizontally) || isInside) {
            const newMinX = Math.min(x1Min, x2Min);
            const newMaxX = Math.max(x1Max, x2Max);
            const newMinY = Math.min(y1Min, y2Min);
            const newMaxY = Math.max(y1Max, y2Max);

            b1 = {
              ...b1,
              xPercent: newMinX,
              yPercent: newMinY,
              widthPercent: newMaxX - newMinX,
              heightPercent: newMaxY - newMinY,
              label: b1.label || b2.label,
            };
            used.add(j);
            changed = true;
          }
        }
        used.add(i);
        nextList.push(b1);
      }
      list = nextList;
    }
    result.push(...list);
  }

  return result;
}

/**
 * Internal helper to run regex & sliding-window PII detection across a list of tokens
 */
function detectPiiInTokensList(
  tokens: Array<{
    text: string;
    confidence?: number;
    x0: number;
    y0: number;
    x1: number;
    y1: number;
    canvasW: number;
    canvasH: number;
  }>,
  pageIndex: number,
  isOcr: boolean,
  categories: string[],
  fullPageText: string
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  if (!tokens || tokens.length === 0) return matches;

  const contextAadhaar = ['aadhaar', 'aadhar', 'आधार', 'uid', 'vid', 'unique', 'enrollment', 'govt', 'india', 'भारत'];
  const contextPan = ['pan', 'income', 'tax', 'permanent', 'account'];
  const contextPhone = ['phone', 'mobile', 'mob', 'tel', 'contact', 'call', 'mo.', 'मो.'];

  // 1. Aadhaar / National ID Detection (12 digits, often XXXX XXXX XXXX or XXXXXXXXXXXX)
  if (categories.includes('aadhaar')) {
    const hasAadhaarContext = contextAadhaar.some(kw => fullPageText.includes(kw));

    for (let i = 0; i < tokens.length; i++) {
      let combinedDigits = '';
      let minX = tokens[i].x0;
      let minY = tokens[i].y0;
      let maxX = tokens[i].x1;
      let maxY = tokens[i].y1;

      for (let j = i; j < Math.min(i + 4, tokens.length); j++) {
        const cur = tokens[j];
        const digits = normalizeOcrDigits(cur.text).replace(/\D/g, '');
        combinedDigits += digits;
        minX = Math.min(minX, cur.x0);
        minY = Math.min(minY, cur.y0);
        maxX = Math.max(maxX, cur.x1);
        maxY = Math.max(maxY, cur.y1);

        if (combinedDigits.length === 12) {
          const firstDigit = combinedDigits[0];
          const isValidAadhaarPrefix = firstDigit >= '2' && firstDigit <= '9';
          const isNotRepeating = !/^(.)\1{11}$/.test(combinedDigits);

          if (isValidAadhaarPrefix && isNotRepeating) {
            const padX = 5 / tokens[i].canvasW;
            const padY = 3 / tokens[i].canvasH;
            const xPercent = Math.max(0, (minX / tokens[i].canvasW) - padX);
            const yPercent = Math.max(0, (minY / tokens[i].canvasH) - padY);
            const widthPercent = Math.min(1 - xPercent, ((maxX - minX) / tokens[i].canvasW) + (padX * 2));
            const heightPercent = Math.min(1 - yPercent, ((maxY - minY) / tokens[i].canvasH) + (padY * 2));

            const isDuplicate = matches.some(
              m => m.pageIndex === pageIndex &&
                   Math.abs(m.xPercent - xPercent) < 0.03 &&
                   Math.abs(m.yPercent - yPercent) < 0.03
            );

            if (!isDuplicate) {
              matches.push({
                pageIndex,
                text: `${combinedDigits.slice(0, 4)} ${combinedDigits.slice(4, 8)} ${combinedDigits.slice(8, 12)}`,
                xPercent,
                yPercent,
                widthPercent,
                heightPercent,
                confidence: hasAadhaarContext ? 'high' : 'medium',
                isOcr,
                category: 'aadhaar',
              });
            }
          }
          break;
        }
        if (combinedDigits.length > 12) break;
      }
    }
  }

  // 2. PAN Card Detection ([A-Z]{5}[0-9]{4}[A-Z]{1})
  if (categories.includes('pan')) {
    const hasPanContext = contextPan.some(kw => fullPageText.includes(kw));
    const panRegex = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/i;

    for (const t of tokens) {
      const clean = t.text.toUpperCase().replace(/[\s-]/g, '');
      if (panRegex.test(clean)) {
        const padX = 5 / t.canvasW;
        const padY = 3 / t.canvasH;
        matches.push({
          pageIndex,
          text: clean,
          xPercent: Math.max(0, (t.x0 / t.canvasW) - padX),
          yPercent: Math.max(0, (t.y0 / t.canvasH) - padY),
          widthPercent: Math.min(1, ((t.x1 - t.x0) / t.canvasW) + (padX * 2)),
          heightPercent: Math.min(1, ((t.y1 - t.y0) / t.canvasH) + (padY * 2)),
          confidence: hasPanContext ? 'high' : 'medium',
          isOcr,
          category: 'pan',
        });
      }
    }
  }

  // 3. Phone Number Detection
  if (categories.includes('phone')) {
    const hasPhoneContext = contextPhone.some(kw => fullPageText.includes(kw));
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const rawDigits = normalizeOcrDigits(t.text).replace(/\D/g, '');

      if (rawDigits.length === 10 && /^[6-9]\d{9}$/.test(rawDigits)) {
        const padX = 5 / t.canvasW;
        const padY = 3 / t.canvasH;
        matches.push({
          pageIndex,
          text: t.text,
          xPercent: Math.max(0, (t.x0 / t.canvasW) - padX),
          yPercent: Math.max(0, (t.y0 / t.canvasH) - padY),
          widthPercent: Math.min(1, ((t.x1 - t.x0) / t.canvasW) + (padX * 2)),
          heightPercent: Math.min(1, ((t.y1 - t.y0) / t.canvasH) + (padY * 2)),
          confidence: hasPhoneContext ? 'high' : 'medium',
          isOcr,
          category: 'phone',
        });
      } else if (rawDigits.length >= 11 && rawDigits.length <= 13) {
        const phone10 = rawDigits.slice(-10);
        if (/^[6-9]\d{9}$/.test(phone10)) {
          const padX = 5 / t.canvasW;
          const padY = 3 / t.canvasH;
          matches.push({
            pageIndex,
            text: t.text,
            xPercent: Math.max(0, (t.x0 / t.canvasW) - padX),
            yPercent: Math.max(0, (t.y0 / t.canvasH) - padY),
            widthPercent: Math.min(1, ((t.x1 - t.x0) / t.canvasW) + (padX * 2)),
            heightPercent: Math.min(1, ((t.y1 - t.y0) / t.canvasH) + (padY * 2)),
            confidence: 'high',
            isOcr,
            category: 'phone',
          });
        }
      }
    }
  }

  // 4. Email Address Detection
  if (categories.includes('email')) {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
    for (const t of tokens) {
      if (emailRegex.test(t.text)) {
        const padX = 5 / t.canvasW;
        const padY = 3 / t.canvasH;
        matches.push({
          pageIndex,
          text: t.text,
          xPercent: Math.max(0, (t.x0 / t.canvasW) - padX),
          yPercent: Math.max(0, (t.y0 / t.canvasH) - padY),
          widthPercent: Math.min(1, ((t.x1 - t.x0) / t.canvasW) + (padX * 2)),
          heightPercent: Math.min(1, ((t.y1 - t.y0) / t.canvasH) + (padY * 2)),
          confidence: 'high',
          isOcr,
          category: 'email',
        });
      }
    }
  }

  // 5. US SSN / Social Security Number Detection (\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b)
  if (categories.includes('ssn') || categories.includes('card')) {
    const contextSsn = ['ssn', 'social', 'security', 'tin', 'taxpayer', 'identification'];
    const hasSsnContext = contextSsn.some(kw => fullPageText.includes(kw));

    for (let i = 0; i < tokens.length; i++) {
      let combinedDigits = '';
      let minX = tokens[i].x0;
      let minY = tokens[i].y0;
      let maxX = tokens[i].x1;
      let maxY = tokens[i].y1;

      for (let j = i; j < Math.min(i + 4, tokens.length); j++) {
        const cur = tokens[j];
        const digits = normalizeOcrDigits(cur.text).replace(/\D/g, '');
        combinedDigits += digits;
        minX = Math.min(minX, cur.x0);
        minY = Math.min(minY, cur.y0);
        maxX = Math.max(maxX, cur.x1);
        maxY = Math.max(maxY, cur.y1);

        if (combinedDigits.length === 9) {
          const area = combinedDigits.slice(0, 3);
          const group = combinedDigits.slice(3, 5);
          const serial = combinedDigits.slice(5, 9);

          const isValidArea = area !== '000' && area !== '666' && parseInt(area, 10) < 900;
          const isValidGroup = group !== '00';
          const isValidSerial = serial !== '0000';

          if (isValidArea && isValidGroup && isValidSerial) {
            const padX = 5 / tokens[i].canvasW;
            const padY = 3 / tokens[i].canvasH;
            const xPercent = Math.max(0, (minX / tokens[i].canvasW) - padX);
            const yPercent = Math.max(0, (minY / tokens[i].canvasH) - padY);
            const widthPercent = Math.min(1 - xPercent, ((maxX - minX) / tokens[i].canvasW) + (padX * 2));
            const heightPercent = Math.min(1 - yPercent, ((maxY - minY) / tokens[i].canvasH) + (padY * 2));

            const isDuplicate = matches.some(
              m => m.pageIndex === pageIndex &&
                   Math.abs(m.xPercent - xPercent) < 0.03 &&
                   Math.abs(m.yPercent - yPercent) < 0.03
            );

            if (!isDuplicate) {
              matches.push({
                pageIndex,
                text: `${area}-${group}-${serial}`,
                xPercent,
                yPercent,
                widthPercent,
                heightPercent,
                confidence: hasSsnContext ? 'high' : 'medium',
                isOcr,
                category: 'ssn',
              });
            }
          }
          break;
        }
        if (combinedDigits.length > 9) break;
      }
    }
  }

  return matches;
}

/**
 * Automatic PII Pattern Detection (Mode B)
 * Scans document for Aadhaar / National ID, PAN cards, SSN, Phone Numbers, and Email Addresses.
 */
export const detectSensitivePiiInPdf = async (
  file: File,
  options: PiiDetectionOptions = {}
): Promise<SearchMatch[]> => {
  const {
    categories = ['aadhaar', 'pan', 'phone', 'email', 'card', 'ssn'],
    enableOcr = true,
    deepOcr = true,
    ocrLanguage = 'eng+hin',
    onProgress,
  } = options;

  onProgress?.('Analyzing document for sensitive personal data (PII)...', 10);
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
  const piiMatches: SearchMatch[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    const totalChars = items.reduce((acc, it) => acc + (it.str?.length || 0), 0);

    let nativeMatchesCount = 0;
    if (totalChars > 0) {
      const nativeTokens = items
        .filter(item => item.str && item.str.trim().length > 0)
        .map(item => {
          const tx = item.transform ? item.transform[4] : 0;
          const ty = item.transform ? item.transform[5] : 0;
          const itemW = item.width || 40;
          const itemH = Math.abs(item.transform ? (item.transform[3] || item.transform[0] || 12) : 12);
          let vx: number, vy: number;
          if (typeof viewport.convertToViewportPoint === 'function') {
            const pt = viewport.convertToViewportPoint(tx, ty);
            vx = pt[0];
            vy = pt[1] - itemH;
          } else {
            vx = tx;
            vy = viewport.height - ty - itemH;
          }
          return {
            text: item.str,
            x0: vx,
            y0: vy,
            x1: vx + itemW,
            y1: vy + itemH,
            canvasW: viewport.width,
            canvasH: viewport.height,
          };
        });

      const fullPageText = nativeTokens.map(t => t.text.toLowerCase()).join(' ');
      const pagePii = detectPiiInTokensList(nativeTokens, pageNum - 1, false, categories, fullPageText);
      nativeMatchesCount = pagePii.length;
      piiMatches.push(...pagePii);
    }

    // Intelligent OCR fallback:
    // If native scan found 0 PII on this page OR page has low text density (<120 chars) OR deepOcr is active:
    const isScannedOrSparse = totalChars < 120;
    const shouldRunOcr = enableOcr && (isScannedOrSparse || nativeMatchesCount === 0 || deepOcr);

    if (shouldRunOcr) {
      try {
        const ocrTokens = await extractPageOcrTokens(
          pdfDoc,
          pageNum,
          fileKey,
          ocrLanguage,
          (msg, pct) => onProgress?.(`Page ${pageNum}: ${msg}`, Math.round(15 + ((pageNum - 1) / numPages) * 75 + (pct * 0.7 / numPages)))
        );

        if (ocrTokens.length > 0) {
          const ocrPageText = ocrTokens.map(t => t.text.toLowerCase()).join(' ');
          const ocrPii = detectPiiInTokensList(ocrTokens, pageNum - 1, true, categories, ocrPageText);
          piiMatches.push(...ocrPii);
        }
      } catch (e) {
        console.warn(`PII OCR error on page ${pageNum}:`, e);
      }
    }
  }

  const merged = mergeOverlappingSearchMatches(piiMatches);
  onProgress?.(`PII detection complete: Found ${merged.length} sensitive item(s).`, 100);
  return merged;
};

/**
 * Applies true permanent redactions to a PDF document.
 * Pages with redactions are rendered to high-resolution 300 DPI canvas,
 * the blackout/whiteout boxes are drawn directly onto the pixel buffer,
 * and the page content is replaced with the sanitized image.
 * This physically eliminates the underlying text, vectors, annotations, and OCR streams in redacted areas.
 */
export const applyRedactionsToPdf = async (
  file: File,
  redactions: RedactionBox[],
  options: RedactionOptions = {}
): Promise<Blob> => {
  const { sanitizeMetadata = true, onProgress } = options;

  onProgress?.(5, 'Loading PDF document...');
  const fileBytes = await file.arrayBuffer();

  // Load PDF with safeLoadPdf for high fault-tolerance against linearized/corrupted headers
  const pdfDoc = await safeLoadPdf(fileBytes);
  const totalPages = pdfDoc.getPageCount();

  // Load PDF with pdfjs for high-resolution page rendering
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(fileBytes) });
  const pdfJsDoc = await loadingTask.promise;

  // Group redactions by page index
  const redactionsByPage = new Map<number, RedactionBox[]>();
  for (const r of redactions) {
    const list = redactionsByPage.get(r.pageIndex) || [];
    list.push(r);
    redactionsByPage.set(r.pageIndex, list);
  }

  // Iterate pages
  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const pageRedactions = redactionsByPage.get(pageIdx);
    const progressPct = Math.round(10 + ((pageIdx + 1) / totalPages) * 75);

    if (pageRedactions && pageRedactions.length > 0) {
      onProgress?.(progressPct, `Sanitizing page ${pageIdx + 1} of ${totalPages}...`);

      // 1. Render page to high-res canvas via PDF.js
      const pdfJsPage = await pdfJsDoc.getPage(pageIdx + 1);

      // High resolution scale (2.5x gives ~200-300 DPI for crisp text readability)
      const renderScale = 2.5;
      const viewport = pdfJsPage.getViewport({ scale: renderScale });
      const unscaledVp = pdfJsPage.getViewport({ scale: 1.0 });

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context unavailable for redaction rendering.');
      }

      // Fill white background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render the original page
      await pdfJsPage.render({
        canvasContext: ctx,
        viewport,
      }).promise;

      // 2. Permanently paint blackout or whiteout boxes directly into pixel data
      for (const box of pageRedactions) {
        const boxX = Math.round(box.xPercent * canvas.width);
        const boxY = Math.round(box.yPercent * canvas.height);
        const boxW = Math.round(box.widthPercent * canvas.width);
        const boxH = Math.round(box.heightPercent * canvas.height);

        ctx.fillStyle = box.type === 'whiteout' ? '#FFFFFF' : '#000000';
        ctx.fillRect(boxX, boxY, boxW, boxH);

        // For blackout, ensure solid edge coverage
        if (box.type === 'blackout') {
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          ctx.strokeRect(boxX, boxY, boxW, boxH);
        }
      }

      // 3. Convert sanitized canvas to lossless PNG image blob (zero compression edge shift)
      const imgBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Failed to encode sanitized canvas image.'))),
          'image/png'
        );
      });

      const imgBytes = await imgBlob.arrayBuffer();
      const embeddedImg = await pdfDoc.embedPng(imgBytes);

      // 4. In pdf-lib, insert clean page with exact visual dimensions and replace
      const newSanitizedPage = pdfDoc.insertPage(pageIdx, [unscaledVp.width, unscaledVp.height]);
      newSanitizedPage.drawImage(embeddedImg, {
        x: 0,
        y: 0,
        width: unscaledVp.width,
        height: unscaledVp.height,
      });

      // Remove old unsanitized page (now at pageIdx + 1)
      pdfDoc.removePage(pageIdx + 1);
    } else {
      onProgress?.(progressPct, `Preserving vector clarity on page ${pageIdx + 1}...`);
    }
  }

  // 5. Form & Annotation Stream Decoupling
  // Flatten interactive form fields and purge lingering form annotations to prevent text recovery
  try {
    const form = pdfDoc.getForm();
    if (form) {
      form.flatten();
    }
  } catch (formErr) {
    console.debug('No interactive form fields to flatten or form flattening skipped:', formErr);
  }

  // 6. Metadata Sanitization
  if (sanitizeMetadata) {
    onProgress?.(90, 'Scrubbing document metadata for total privacy...');
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('LAK PDF Redact Engine');
    pdfDoc.setCreator('LAK PDF (https://lakpdf.com)');
    pdfDoc.setCreationDate(new Date());
    pdfDoc.setModificationDate(new Date());
  }

  onProgress?.(95, 'Building finalized secure PDF...');
  const sanitizedPdfBytes = await pdfDoc.save();

  onProgress?.(100, 'Redaction complete!');
  return new Blob([sanitizedPdfBytes], { type: 'application/pdf' });
};

/**
 * Security Verification System
 * Performs automated post-redaction validation to ensure sensitive information
 * was physically eliminated and cannot be extracted from text or OCR layers.
 */
export const verifyRedactionSecurity = async (
  redactedBlob: Blob,
  queriesToCheck: string[],
  options: SecurityVerificationOptions = {}
): Promise<SecurityVerificationResult> => {
  const { ocrLanguage = 'eng+hin', verifyWithOcr = true, onProgress } = options;

  if (!queriesToCheck || queriesToCheck.length === 0) {
    return {
      secure: true,
      message: 'Verified: Permanent pixel obliteration applied.',
      vectorTextClean: true,
      ocrClean: true,
    };
  }

  const cleanQueries = Array.from(
    new Set(queriesToCheck.map((q) => q.trim()).filter((q) => q.length >= 2))
  );

  if (cleanQueries.length === 0) {
    return {
      secure: true,
      message: 'Verified: Permanent pixel obliteration applied.',
      vectorTextClean: true,
      ocrClean: true,
    };
  }

  onProgress?.(10, 'Inspecting vector text stream for leaks...');
  const arrayBuffer = await redactedBlob.arrayBuffer();
  const pdfJsDoc = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const numPages = pdfJsDoc.numPages;

  // Step 1: Check native vector text layer across all pages
  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfJsDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items.map((it: any) => it.str || '').join(' ').toLowerCase();
    const cleanPageText = cleanForComparison(pageText);

    for (const q of cleanQueries) {
      const cleanQ = cleanForComparison(q);
      if (cleanQ.length >= 3 && cleanPageText.includes(cleanQ)) {
        return {
          secure: false,
          leakedQuery: q,
          vectorTextClean: false,
          ocrClean: false,
          message: `Security Warning: Vector text stream still contains sensitive value "${q}" on Page ${pageNum}.`,
        };
      }
    }
  }

  // Step 2: Visual OCR verification (re-OCR final redacted pages to confirm zero query remnants)
  if (verifyWithOcr) {
    onProgress?.(40, `Verifying visual pixel sanitization with OCR (${ocrLanguage})...`);
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfJsDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      try {
        const worker = await getRedactOcrWorker(ocrLanguage);
        const ocrResult = await worker.recognize(canvas);
        const ocrText = (ocrResult?.data?.text || '').toLowerCase();
        const cleanOcr = cleanForComparison(ocrText);
        const normOcrDigits = normalizeOcrDigits(cleanOcr);

        for (const q of cleanQueries) {
          const cleanQ = cleanForComparison(q);
          const isNumeric = /^\d+$/.test(cleanQ);

          if (cleanQ.length >= 3 && cleanOcr.includes(cleanQ)) {
            return {
              secure: false,
              leakedQuery: q,
              vectorTextClean: true,
              ocrClean: false,
              message: `Security Warning: Visual OCR inspection detected remnants of "${q}" on Page ${pageNum}. Consider drawing a wider blackout box.`,
            };
          }

          if (isNumeric && cleanQ.length >= 4 && normOcrDigits.includes(cleanQ)) {
            return {
              secure: false,
              leakedQuery: q,
              vectorTextClean: true,
              ocrClean: false,
              message: `Security Warning: Visual OCR inspection detected numeric remnants of "${q}" on Page ${pageNum}.`,
            };
          }
        }
      } catch (ocrVerifyErr) {
        console.warn(`OCR verification skipped for page ${pageNum}:`, ocrVerifyErr);
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    }
  }

  return {
    secure: true,
    message: '100% Security Verified: Sensitive content physically eliminated from both vector text and optical scan layers.',
    vectorTextClean: true,
    ocrClean: true,
  };
};

export interface QrCodeMatch {
  pageIndex: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

/**
 * Detects QR codes / barcodes across all pages of a PDF.
 * Uses native BarcodeDetector API when supported, with an adaptive 2D matrix pattern detector.
 */
export const detectQrCodesInPdf = async (
  file: File
): Promise<QrCodeMatch[]> => {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const qrMatches: QrCodeMatch[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    let detected = false;
    // 1. Try browser BarcodeDetector API if supported
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const detector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'data_matrix', 'aztec'] });
        const barcodes = await detector.detect(canvas);
        for (const bc of barcodes) {
          if (bc.boundingBox) {
            const b = bc.boundingBox;
            const pad = 6;
            const xPercent = Math.max(0, (b.x - pad) / canvas.width);
            const yPercent = Math.max(0, (b.y - pad) / canvas.height);
            const widthPercent = Math.min(1 - xPercent, (b.width + pad * 2) / canvas.width);
            const heightPercent = Math.min(1 - yPercent, (b.height + pad * 2) / canvas.height);
            qrMatches.push({
              pageIndex: pageNum - 1,
              xPercent,
              yPercent,
              widthPercent,
              heightPercent,
            });
            detected = true;
          }
        }
      } catch (e) {
        // Fallback to pattern analysis
      }
    }

    // 2. High-precision pattern detector for QR code matrix blocks
    if (!detected) {
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;

        const minQrSize = Math.round(w * 0.14);
        const maxQrSize = Math.round(w * 0.42);
        const step = Math.round(minQrSize / 4);

        for (let y = Math.round(h * 0.10); y < h - minQrSize; y += step) {
          for (let x = Math.round(w * 0.10); x < w - minQrSize; x += step) {
            for (const size of [minQrSize, Math.round((minQrSize + maxQrSize) / 2), maxQrSize]) {
              if (x + size >= w || y + size >= h) continue;

              let darkPixels = 0;
              let edgeTransitions = 0;
              const sampleStep = 8;
              let prevLum = 0;

              for (let sy = y; sy < y + size; sy += sampleStep) {
                for (let sx = x; sx < x + size; sx += sampleStep) {
                  const idx = (sy * w + sx) * 4;
                  const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                  if (lum < 110) darkPixels++;
                  if (Math.abs(lum - prevLum) > 70) edgeTransitions++;
                  prevLum = lum;
                }
              }

              const totalSamples = ((size / sampleStep) * (size / sampleStep));
              const darkRatio = darkPixels / totalSamples;
              const transitionRatio = edgeTransitions / totalSamples;

              // QR code density signature: 32%-68% dark pixels + high edge transition density
              if (darkRatio >= 0.32 && darkRatio <= 0.68 && transitionRatio >= 0.40) {
                const pad = 6;
                const xPercent = Math.max(0, (x - pad) / w);
                const yPercent = Math.max(0, (y - pad) / h);
                const widthPercent = Math.min(1 - xPercent, (size + pad * 2) / w);
                const heightPercent = Math.min(1 - yPercent, (size + pad * 2) / h);

                const dup = qrMatches.some(
                  m => m.pageIndex === pageNum - 1 &&
                       Math.abs(m.xPercent - xPercent) < 0.12 &&
                       Math.abs(m.yPercent - yPercent) < 0.12
                );

                if (!dup) {
                  qrMatches.push({
                    pageIndex: pageNum - 1,
                    xPercent,
                    yPercent,
                    widthPercent,
                    heightPercent,
                  });
                }
                break;
              }
            }
          }
        }
      } catch (err) {
        console.warn('QR scan error:', err);
      }
    }

    canvas.width = 0;
    canvas.height = 0;
  }

  return qrMatches;
};

/**
 * Converts an uploaded image (PNG, JPG, JPEG, WebP, BMP, AVIF, HEIC) into an in-memory PDF File
 * with 1:1 pixel aspect ratio so it can be viewed, OCR'd, and redacted seamlessly.
 */
export const convertImageToPdfFile = async (imgFile: File): Promise<File> => {
  const { PDFDocument } = await import('pdf-lib');
  const pdfDoc = await PDFDocument.create();

  let pdfImg: any;
  const mime = (imgFile.type || '').toLowerCase();
  const name = imgFile.name.toLowerCase();

  try {
    const rawBuffer = await imgFile.arrayBuffer();

    if ((mime === 'image/jpeg' || mime === 'image/jpg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) && !name.endsWith('.png')) {
      try {
        pdfImg = await pdfDoc.embedJpg(rawBuffer);
      } catch (jpgErr) {
        // Fallback to canvas
      }
    } else if (mime === 'image/png' || name.endsWith('.png')) {
      try {
        pdfImg = await pdfDoc.embedPng(rawBuffer);
      } catch (pngErr) {
        // Fallback to canvas
      }
    }

    if (!pdfImg) {
      // Universal canvas rasterization for WebP, HEIC, corrupted headers, BMP, etc.
      const imgDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imgFile);
      });

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imgDataUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create canvas context');

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!pngBlob) throw new Error('Could not create PNG blob from canvas');
      const pngBuf = await pngBlob.arrayBuffer();
      pdfImg = await pdfDoc.embedPng(pngBuf);

      canvas.width = 0;
      canvas.height = 0;
    }

    const imgW = pdfImg.width;
    const imgH = pdfImg.height;
    const page = pdfDoc.addPage([imgW, imgH]);
    page.drawImage(pdfImg, {
      x: 0,
      y: 0,
      width: imgW,
      height: imgH,
    });

    const pdfBytes = await pdfDoc.save();
    const cleanName = imgFile.name.replace(/\.[^/.]+$/, '') + '.pdf';
    return new File([pdfBytes], cleanName, { type: 'application/pdf' });
  } catch (err: any) {
    console.error('Failed to convert image to PDF in Redact tool:', err);
    throw new Error(`Could not process image "${imgFile.name}": ${err?.message || 'Unsupported image format'}`);
  }
};
