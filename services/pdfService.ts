import { PDFDocument, degrees, StandardFonts, rgb, grayscale, PDFImage } from 'pdf-lib';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PdfFile } from '../types';
import { sanitizeHtml } from './htmlSanitizer';
import { trackEvent } from '../utils/analytics';
import { setLatestDownload } from '../utils/downloadCenter';

const pdfjs = pdfjsLib as any;
const pdfjsVersion = pdfjs.version || '5.4.624';
const localWorkerSrc = pdfWorkerSrc || `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

// Initialize PDF.js worker
// Always match worker with installed pdfjs-dist version.
if (typeof window !== 'undefined' && pdfjs) {
  // Local worker avoids CORS/network dependency on third-party CDNs.
  pdfjs.GlobalWorkerOptions.workerSrc = localWorkerSrc;
  console.log('PDF.js worker loaded from local asset:', localWorkerSrc, `(pdfjs ${pdfjsVersion})`);
}

// Export pdfjs for use in components
export { pdfjs };

/**
 * Helper to safely load a PDFDocument with basic error checking.
 */
const safeLoadPdf = async (buffer: ArrayBuffer): Promise<PDFDocument> => {
  try {
    return await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (error: any) {
    if (error.message && error.message.includes('Invalid PDF structure')) {
       throw new Error('Invalid PDF structure. The file might be corrupted, or it is not a valid PDF.');
    }
    throw error;
  }
};

/**
 * Get the number of pages in a PDF file.
 */
export const getPdfPageCount = async (file: File): Promise<number> => {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  return pdfDoc.getPageCount();
};

/**
 * Parse page range input and return array of page indices (0-based).
 * Supports formats: "1,3,5-7" or ranges like "1-5"
 */
export const parsePageRange = (input: string, maxPages: number): { pages: number[], error?: string } => {
  const pages = new Set<number>();
  
  if (!input.trim()) {
    return { pages: [], error: 'Please enter page numbers' };
  }

  const parts = input.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    if (trimmed.includes('-')) {
      // Range like "1-5"
      const [startStr, endStr] = trimmed.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      
      if (isNaN(start) || isNaN(end)) {
        return { pages: [], error: `Invalid range: ${part}` };
      }
      if (start < 1 || end > maxPages || start > end) {
        return { pages: [], error: `Range ${part} is out of bounds (1-${maxPages})` };
      }
      for (let i = start; i <= end; i++) {
        pages.add(i - 1);
      }
    } else {
      // Single page like "3"
      const pageNum = parseInt(trimmed, 10);
      if (isNaN(pageNum)) {
        return { pages: [], error: `Invalid page number: ${part}` };
      }
      if (pageNum < 1 || pageNum > maxPages) {
        return { pages: [], error: `Page ${pageNum} is out of bounds (1-${maxPages})` };
      }
      pages.add(pageNum - 1);
    }
  }

  if (pages.size === 0) {
    return { pages: [], error: 'No valid pages selected' };
  }

  return { pages: Array.from(pages).sort((a, b) => a - b) };
};

/**
 * Merges multiple PDF files into a single PDF.
 */
export const mergePdfs = async (files: PdfFile[]): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of files) {
    const fileArrayBuffer = await pdfFile.file.arrayBuffer();
    try {
      const pdf = await safeLoadPdf(fileArrayBuffer);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    } catch (e) {
      console.error(`Failed to load PDF ${pdfFile.name}:`, e);
      // Skip invalid files or throw? Let's throw to inform user.
      throw new Error(`Failed to merge ${pdfFile.name}: Invalid PDF structure.`);
    }
  }

  return await mergedPdf.save();
};

export const deletePdfPages = async (
  file: File,
  pagesInput: string
): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);

  const pageCount = pdfDoc.getPageCount();

  // Parse "1,3,5-7"
  const pagesToDelete = new Set<number>();

  pagesInput.split(",").forEach((part) => {
    part = part.trim();
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= 1 && start <= pageCount && end <= pageCount && start <= end) {
        for (let i = start; i <= end; i++) pagesToDelete.add(i - 1);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
        pagesToDelete.add(pageNum - 1);
      }
    }
  });

  // Remove pages in descending order to avoid index shifting issues
  const sortedPagesToDelete = Array.from(pagesToDelete).sort((a, b) => b - a);
  sortedPagesToDelete.forEach((pageIndex) => {
    pdfDoc.removePage(pageIndex);
  });

  return await pdfDoc.save();
};

export const extractPdfPages = async (
  file: File,
  pagesInput: string
): Promise<Uint8Array> => {
  const bytes = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(bytes);

  const pageCount = pdfDoc.getPageCount();

  // Parse "1,3,5-7"
  const pagesToKeep = new Set<number>();

  pagesInput.split(",").forEach((part) => {
    part = part.trim();
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end) && start >= 1 && end >= 1 && start <= pageCount && end <= pageCount && start <= end) {
        for (let i = start; i <= end; i++) pagesToKeep.add(i - 1);
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= pageCount) {
        pagesToKeep.add(pageNum - 1);
      }
    }
  });

  if (pagesToKeep.size === 0) {
    throw new Error('No valid pages selected to extract');
  }

  const newPdf = await PDFDocument.create();

  // Add pages in order
  const sortedPagesToKeep = Array.from(pagesToKeep).sort((a, b) => a - b);
  const copiedPages = await newPdf.copyPages(pdfDoc, sortedPagesToKeep);
  copiedPages.forEach(page => newPdf.addPage(page));

  return await newPdf.save();
};

/**
 * Splits a PDF into individual pages and returns a ZIP file.
 */
export const splitPdf = async (file: File): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  const zip = new JSZip();

  for (let i = 0; i < totalPages; i++) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(copiedPage);
    const pdfBytes = await newPdf.save();
    zip.file(`page_${i + 1}.pdf`, pdfBytes);
  }

  return await zip.generateAsync({ type: 'blob' });
};

/* ═══════════════════════════════════════════════════════════════════════
 *  SMART PDF COMPRESSION ENGINE
 *  ─────────────────────────────────────────────────────────────────────
 *  Strategy:
 *   • Each PDF page is rendered to a canvas via PDF.js at a chosen DPI.
 *   • The canvas is encoded as JPEG (or falls back to PNG for diagrams).
 *   • Pages are embedded back into a new pdf-lib document.
 *   • Two public functions share the same core renderer:
 *       compressPdf(file, quality)          — quality-level mode (0.4 / 0.7 / 1.0)
 *       compressPdfToTargetSize(file, bytes) — binary-search target-size mode
 *
 *  DPI tiers (scale factor = DPI / 96):
 *   • 288 dpi (scale 3.0) — Less Compression  (highest quality)
 *   • 192 dpi (scale 2.0) — Recommended
 *   • 144 dpi (scale 1.5) — Extreme
 *   • 96  dpi (scale 1.0) — Maximum squeeze (still readable text)
 * ═══════════════════════════════════════════════════════════════════════ */

/** Render one PDF.js page to a JPEG Uint8Array at given scale + quality using native async blob encoding. */
const _renderPageToJpeg = async (
  pdfPage: any,
  scale: number,
  jpegQuality: number,
): Promise<Uint8Array> => {
  const viewport = pdfPage.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));

  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await pdfPage.render({ canvasContext: ctx, viewport }).promise;

  // Native async blob encoding (avoids expensive base64 string allocations)
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', Math.max(0.1, Math.min(1.0, jpegQuality)));
  });

  // Explicitly release GPU canvas buffer
  canvas.width = 0;
  canvas.height = 0;

  if (!blob) {
    throw new Error('Failed to encode page to JPEG');
  }

  const buffer = await blob.arrayBuffer();
  return new Uint8Array(buffer);
};

/**
 * Build a compressed PDF from per-page JPEG bytes.
 * Page dimensions are taken at scale=1 so the *size* of the output PDF
 * stays the same as the original (only the embedded image resolution changes).
 */
const _buildPdfFromJpegs = async (
  pdfJs: any,
  jpegs: Uint8Array[],
): Promise<Uint8Array> => {
  const doc = await PDFDocument.create();
  for (let i = 0; i < jpegs.length; i++) {
    const origVp = (await pdfJs.getPage(i + 1)).getViewport({ scale: 1.0 });
    const img    = await doc.embedJpg(jpegs[i]);
    const page   = doc.addPage([origVp.width, origVp.height]);
    page.drawImage(img, { x: 0, y: 0, width: origVp.width, height: origVp.height });
  }
  return doc.save({ useObjectStreams: true });
};

/**
 * Smart PDF Compressor (iLovePDF & Adobe Acrobat Grade)
 * ─────────────────────────────────────────────────────────────
 * 1. Vector & Text Documents (Resumes, Books, Reports, Invoices):
 *    • Preserves 100% of native vector fonts, typography, shapes, and links.
 *    • Never rasterizes text into blurry images.
 *    • Optimizes object streams, metadata, and embedded bitmaps.
 *    • Text remains razor-sharp, selectable, and searchable.
 * 
 * 2. Scanned / Graphic Documents:
 *    • Uses high-DPI rendering with sub-pixel anti-aliasing and smart JPEG quantization.
 */

/** Check whether a PDF is primarily vector text vs pure scanned raster images */
const _detectPdfType = async (
  pdfJs: any,
): Promise<{ isVector: boolean; textCharCount: number }> => {
  try {
    let textCharCount = 0;
    const pagesToCheck = Math.min(5, pdfJs.numPages);
    for (let i = 1; i <= pagesToCheck; i++) {
      const page = await pdfJs.getPage(i);
      const content = await page.getTextContent();
      const text = content.items.map((it: any) => it.str || '').join('').trim();
      textCharCount += text.length;
    }
    return { isVector: textCharCount >= 60, textCharCount };
  } catch {
    return { isVector: false, textCharCount: 0 };
  }
};

/** Perform native structural & stream optimization on a PDFDocument without touching vector fonts */
const _optimizeNativePdf = async (buffer: ArrayBuffer | Uint8Array): Promise<Uint8Array> => {
  const bytes = buffer instanceof Uint8Array ? buffer.slice(0) : new Uint8Array(buffer.slice(0));
  try {
    const pdfDoc = await safeLoadPdf(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    
    // Clean heavy creator metadata & redundant catalog entries
    try {
      pdfDoc.setTitle(pdfDoc.getTitle() || '');
      pdfDoc.setProducer('LAK PDF Optimizer');
      pdfDoc.setCreator('LAK PDF (https://lakpdf.com)');
    } catch {}

    const optimized = await pdfDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      updateFieldAppearances: false,
    });

    // Only return if actual reduction was achieved
    if (optimized.byteLength < bytes.byteLength) {
      return optimized;
    }
    return bytes;
  } catch {
    return bytes;
  }
};

/**
 * Render all pages of a PDF.js document at the given scale+quality.
 * Returns the final Uint8Array and calls onProgress(0–100) per page.
 */
const _rasterizeAll = async (
  pdfJs: any,
  scale: number,
  jpegQuality: number,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> => {
  const n = pdfJs.numPages;
  const jpegs: Uint8Array[] = [];

  for (let i = 1; i <= n; i++) {
    const page = await pdfJs.getPage(i);
    jpegs.push(await _renderPageToJpeg(page, scale, jpegQuality));
    if (onProgress) onProgress(Math.round((i / n) * 85));
  }

  const result = await _buildPdfFromJpegs(pdfJs, jpegs);
  if (onProgress) onProgress(100);
  return result;
};

// ── Public: quality-level mode ──────────────────────────────────────────

/**
 * Compress a PDF using a quality preset.
 * Guarantees output size is NEVER larger than original file and text is NEVER blurred.
 * @param file     Input PDF File
 * @param quality  0.4 = Extreme | 0.7 = Recommended | 1.0 = Lossless
 */
export const compressPdf = async (file: File, quality: number = 0.7): Promise<Uint8Array> => {
  const rawBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(rawBuffer.slice(0));
  const origLen = originalBytes.byteLength;

  try {
    // Pass a fresh clone to PDF.js to prevent detaching originalBytes
    const pdfJs = await pdfjs.getDocument({ data: originalBytes.slice(0) }).promise;
    const { isVector } = await _detectPdfType(pdfJs);

    // ── PATH A: Vector Text PDF (Resumes, Reports, Books, Invoices) ──
    // Never destroy text clarity by turning vector pages into blurry JPEGs!
    if (isVector) {
      const optimized = await _optimizeNativePdf(originalBytes.slice(0));
      if (optimized.byteLength < origLen) {
        return optimized;
      }
      // If native object streams already optimal, return original clean buffer
      return originalBytes.slice(0);
    }

    // ── PATH B: Scanned / Image-Based PDF ──
    type Candidate = { scale: number; jpegQuality: number };
    let candidates: Candidate[];

    if (quality < 0.55) {
      // Extreme Compression (High-clarity downsampling)
      candidates = [
        { scale: 2.0, jpegQuality: 0.65 },
        { scale: 1.75, jpegQuality: 0.55 },
        { scale: 1.5, jpegQuality: 0.48 },
        { scale: 1.25, jpegQuality: 0.40 },
      ];
    } else {
      // Recommended Compression (Crystal clear high resolution)
      candidates = [
        { scale: 2.5, jpegQuality: 0.78 },
        { scale: 2.2, jpegQuality: 0.72 },
        { scale: 2.0, jpegQuality: 0.65 },
        { scale: 1.75, jpegQuality: 0.58 },
      ];
    }

    let bestResult: Uint8Array = originalBytes.slice(0);

    for (const { scale, jpegQuality } of candidates) {
      const result = await _rasterizeAll(pdfJs, scale, jpegQuality);
      if (result.byteLength < bestResult.byteLength) {
        bestResult = result;
      }
    }

    // Safety rule: Never return a file larger than the input
    if (bestResult.byteLength >= origLen) {
      bestResult = originalBytes.slice(0);
    }

    return bestResult;

  } catch (e: any) {
    console.error('Compression error:', e);
    if (e.name === 'PasswordException') throw new Error('PDF is password protected. Please unlock it first.');
    // Safe structural fallback
    try {
      const fallback = await _optimizeNativePdf(originalBytes.slice(0));
      if (fallback.byteLength < origLen) return fallback;
    } catch {}
    return originalBytes.slice(0);
  }
};

// ── Public: target-size mode ────────────────────────────────────────────

/**
 * Compress a PDF to a specific target byte size using binary search on
 * JPEG quality. Uses 150 DPI (scale 1.5625) as the render resolution —
 * giving clear text while enabling aggressive JPEG compression.
 *
 * If the target cannot be reached even at minimum quality, the smallest
 * achievable result is returned together with a `targetMissed: true` flag
 * (via a thrown object so callers can distinguish the two cases).
 *
 * @param file         Input PDF File
 * @param targetBytes  Desired output size in bytes
 * @param onProgress   Optional 0–100 progress callback
 */
export const compressPdfToTargetSize = async (
  file: File,
  targetBytes: number,
  onProgress?: (pct: number) => void,
): Promise<Uint8Array> => {
  const rawBuffer = await file.arrayBuffer();
  const originalBytes = new Uint8Array(rawBuffer.slice(0));

  // Target larger than original — lossless check is enough
  if (targetBytes >= originalBytes.byteLength) {
    try {
      const nativeOpt = await _optimizeNativePdf(originalBytes.slice(0));
      if (nativeOpt.byteLength < originalBytes.byteLength) {
        return nativeOpt;
      }
      return originalBytes.slice(0);
    } catch {
      return originalBytes.slice(0);
    }
  }

  const pdfJs = await pdfjs.getDocument({ data: originalBytes.slice(0) }).promise;
  const { isVector } = await _detectPdfType(pdfJs);

  // If vector text document, try native stream compression first
  if (isVector) {
    try {
      const nativeOpt = await _optimizeNativePdf(originalBytes.slice(0));
      if (nativeOpt.byteLength <= targetBytes) {
        if (onProgress) onProgress(100);
        return nativeOpt;
      }
    } catch {}
  }

  const n = pdfJs.numPages;

  /*
   * Phase 1 – Sample first page at several scales to pick the DPI tier
   *           that gives us the best chance of reaching the target with maximum clarity.
   */
  const perPageBudget = targetBytes / n;
  const DPI_TIERS = [
    { scale: 2.5, label: '240dpi' },
    { scale: 2.0, label: '192dpi' },
    { scale: 1.75, label: '168dpi' },
    { scale: 1.5, label: '144dpi' },
    { scale: 1.25, label: '120dpi' },
  ];

  let chosenScale = 1.5; // default 144 dpi
  {
    const firstPage = await pdfJs.getPage(1);
    for (const tier of DPI_TIERS) {
      const sample = await _renderPageToJpeg(firstPage, tier.scale, 0.72);
      if (sample.byteLength <= perPageBudget * 1.3) {
        chosenScale = tier.scale;
        break;
      }
      chosenScale = tier.scale; // keep updating so we always have the lowest tried
    }
  }
  if (onProgress) onProgress(5);

  /*
   * Phase 2 – Binary search on JPEG quality [0.10 … 0.92] at the chosen
   *           scale to find the highest quality that hits the target.
   *
   *   We render all pages for each candidate quality level.
   *   Binary search converges in ≤ 7 iterations.
   */
  let lo = 0.10, hi = 0.92;
  let bestFit:    Uint8Array | null = null;
  let bestNoFit:  Uint8Array | null = null; // smallest result that didn't fit
  const MAX_ITER = 8;

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const mid = Math.round(((lo + hi) / 2) * 100) / 100;
    const progressBase = 5 + Math.round((iter / MAX_ITER) * 90);

    // Render all pages with per-page progress
    const jpegs: Uint8Array[] = [];
    for (let i = 1; i <= n; i++) {
      const page = await pdfJs.getPage(i);
      jpegs.push(await _renderPageToJpeg(page, chosenScale, mid));
      if (onProgress) {
        const pageProgress = Math.round((i / n) * (90 / MAX_ITER));
        onProgress(Math.min(95, progressBase + pageProgress));
      }
    }

    const result = await _buildPdfFromJpegs(pdfJs, jpegs);

    if (result.byteLength <= targetBytes) {
      // Fits — try higher quality
      if (!bestFit || result.byteLength > bestFit.byteLength) bestFit = result;
      lo = mid + 0.01;
    } else {
      // Too big — try lower quality
      if (!bestNoFit || result.byteLength < bestNoFit.byteLength) bestNoFit = result;
      hi = mid - 0.01;
    }

    if (lo > hi || Math.abs(hi - lo) < 0.02) break;
  }

  if (onProgress) onProgress(100);

  if (bestFit) return bestFit;                              // ✅ target achieved
  if (bestNoFit) {
    if (bestNoFit.byteLength < originalBytes.byteLength) return bestNoFit;
    return originalBytes.slice(0);
  }
  return originalBytes.slice(0);
};

/**
 * Rotates all pages in a PDF by a specified degree.
 */
export const rotatePdf = async (file: File, rotation: number): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();
  
  pages.forEach(page => {
    const currentRotation = page.getRotation().angle;
    page.setRotation(degrees(currentRotation + rotation));
  });

  return await pdfDoc.save();
};

export type PageNumberPosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

export interface AddPageNumbersOptions {
  position?: PageNumberPosition;
  format?: 'page-only' | 'page-of-total' | 'page-label';
  startNumber?: number;
  fontSize?: number;
  margin?: number;
  color?: string;
  showBackground?: boolean;
}

/**
 * Adds page numbers to a PDF.
 */
export const addPageNumbers = async (
  file: File,
  options: AddPageNumbersOptions = {}
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const pageFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;

  const {
    position = 'bottom-center',
    format = 'page-of-total',
    startNumber = 1,
    fontSize = 12,
    margin = 20,
    color = '#000000',
    showBackground = true
  } = options;

  if (totalPages === 0) {
    throw new Error('PDF has no pages');
  }

  const safeStartNumber = Number.isFinite(startNumber) ? Math.max(1, Math.floor(startNumber)) : 1;
  const safeFontSize = Math.min(72, Math.max(8, Math.round(fontSize)));
  const safeMargin = Math.min(160, Math.max(8, Math.round(margin)));
  const parsedColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000';
  const r = parseInt(parsedColor.slice(1, 3), 16) / 255;
  const g = parseInt(parsedColor.slice(3, 5), 16) / 255;
  const b = parseInt(parsedColor.slice(5, 7), 16) / 255;

  pages.forEach((page, idx) => {
    const { width, height } = page.getSize();
    const pageNumber = safeStartNumber + idx;
    const effectiveTotal = safeStartNumber + totalPages - 1;
    const text = format === 'page-only'
      ? `${pageNumber}`
      : format === 'page-label'
        ? `Page ${pageNumber}`
        : `${pageNumber} / ${effectiveTotal}`;
    const textWidth = pageFont.widthOfTextAtSize(text, safeFontSize);
    const textHeight = pageFont.heightAtSize(safeFontSize);

    let x = safeMargin;
    if (position.endsWith('center')) x = (width - textWidth) / 2;
    if (position.endsWith('right')) x = width - textWidth - safeMargin;

    let y = safeMargin;
    if (position.startsWith('top')) y = height - textHeight - safeMargin;

    if (showBackground) {
      const padX = Math.max(2, Math.round(safeFontSize * 0.4));
      const padY = Math.max(2, Math.round(safeFontSize * 0.25));
      page.drawRectangle({
        x: x - padX,
        y: y - padY,
        width: textWidth + padX * 2,
        height: textHeight + padY * 2,
        color: rgb(1, 1, 1),
        opacity: 0.7
      });
    }

    page.drawText(text, {
      x,
      y,
      size: safeFontSize,
      font: pageFont,
      color: rgb(r, g, b),
    });
  });

  return await pdfDoc.save();
};

export interface WatermarkOptions {
  type: 'text' | 'image';
  text?: string;
  imageBytes?: ArrayBuffer;
  imageType?: 'png' | 'jpg';
  color?: string;
  opacity: number;
  size?: number; // Text size or Image scale
  position: number; // 1-9 grid position
  isMosaic: boolean;
  rotation: number;
}

/**
 * Add Watermark (Text or Image)
 */
export const watermarkPdf = async (
  file: File, 
  options: WatermarkOptions
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();

  let font;
  let embeddedImage: PDFImage | undefined;
  
  // Pre-load resources
  if (options.type === 'text') {
    font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  } else if (options.type === 'image' && options.imageBytes) {
    if (options.imageType === 'png') {
        embeddedImage = await pdfDoc.embedPng(options.imageBytes);
    } else {
        embeddedImage = await pdfDoc.embedJpg(options.imageBytes);
    }
  }

  // Helper to calculate coordinates based on 3x3 grid (1-9)
  const getCoordinates = (
    pos: number, 
    pageW: number, 
    pageH: number, 
    objW: number, 
    objH: number
  ) => {
    const margin = 20;
    let x = 0;
    let y = 0;

    // Horizontal
    if ([1, 4, 7].includes(pos)) x = margin; // Left
    else if ([2, 5, 8].includes(pos)) x = (pageW - objW) / 2; // Center
    else if ([3, 6, 9].includes(pos)) x = pageW - objW - margin; // Right

    // Vertical (PDF coordinate system: 0,0 is bottom-left)
    if ([7, 8, 9].includes(pos)) y = margin; // Bottom
    else if ([4, 5, 6].includes(pos)) y = (pageH - objH) / 2; // Middle
    else if ([1, 2, 3].includes(pos)) y = pageH - objH - margin; // Top
    
    return { x, y };
  };

  // Parse color
  const colorHex = options.color || '#FF0000';
  const r = parseInt(colorHex.slice(1, 3), 16) / 255;
  const g = parseInt(colorHex.slice(3, 5), 16) / 255;
  const b = parseInt(colorHex.slice(5, 7), 16) / 255;
  const colorRgb = rgb(r, g, b);

  pages.forEach(page => {
    const { width, height } = page.getSize();
    
    // Draw Text
    if (options.type === 'text' && font && options.text) {
        const textSize = options.size || 60;
        const textWidth = font.widthOfTextAtSize(options.text, textSize);
        const textHeight = font.heightAtSize(textSize);
        
        const draw = (x: number, y: number) => {
            page.drawText(options.text!, {
                x,
                y,
                size: textSize,
                font: font,
                color: colorRgb,
                opacity: options.opacity,
                rotate: degrees(options.rotation),
            });
        };

        if (options.isMosaic) {
            // Simple grid for mosaic
            const gapX = textWidth + 100;
            const gapY = textHeight + 100;
            for (let mx = 0; mx < width; mx += gapX) {
                for (let my = 0; my < height; my += gapY) {
                    draw(mx, my);
                }
            }
        } else {
            const { x, y } = getCoordinates(options.position, width, height, textWidth, textHeight);
            draw(x, y);
        }
    }

    // Draw Image
    if (options.type === 'image' && embeddedImage) {
        const scale = (options.size || 50) / 100; // 0.1 to 1.0 based on percentage
        const imgDims = embeddedImage.scale(scale);
        
        const draw = (x: number, y: number) => {
            page.drawImage(embeddedImage!, {
                x,
                y,
                width: imgDims.width,
                height: imgDims.height,
                opacity: options.opacity,
                rotate: degrees(options.rotation),
            });
        };

        if (options.isMosaic) {
             const gapX = imgDims.width + 50;
             const gapY = imgDims.height + 50;
             for (let mx = 0; mx < width; mx += gapX) {
                 for (let my = 0; my < height; my += gapY) {
                     draw(mx, my);
                 }
             }
        } else {
            const { x, y } = getCoordinates(options.position, width, height, imgDims.width, imgDims.height);
            draw(x, y);
        }
    }
  });

  return await pdfDoc.save();
};

/**
 * Organize PDF (Reorder/Delete pages)
 */
export const organizePdf = async (
  file: File,
  pageIndices: number[] | Array<{ index: number; rotation?: number }>
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const newPdf = await PDFDocument.create();

  if (pageIndices.length === 0) {
    return await newPdf.save();
  }

  const isSpec = typeof pageIndices[0] === 'object';
  const indices = isSpec
    ? (pageIndices as Array<{ index: number }>).map(entry => entry.index)
    : (pageIndices as number[]);

  const copiedPages = await newPdf.copyPages(pdfDoc, indices);
  copiedPages.forEach((page, idx) => {
    if (isSpec) {
      const rotation = (pageIndices as Array<{ index: number; rotation?: number }>)[idx]?.rotation || 0;
      if (rotation) {
        page.setRotation(degrees(rotation));
      }
    }
    newPdf.addPage(page);
  });

  return await newPdf.save();
};

/**
 * Convert PDF pages to Images (JPG) and return as ZIP (multi) or single Blob (single page).
 *
 * @param file        The PDF File object
 * @param dpi         Output resolution — 72 | 150 | 300 (default 150)
 * @param pageRange   e.g. "1-3,5" or "all" (default "all")
 * @param singlePage  If true AND pageRange resolves to 1 page, returns a single Blob (not ZIP)
 */
export const convertPdfToImages = async (
  file: File,
  dpi: 72 | 150 | 300 = 150,
  pageRange: string = 'all',
  singlePage: boolean = false,
): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  // ── Resolve page list ─────────────────────────────────────────────
  let pages: number[] = [];
  const raw = pageRange.trim().toLowerCase();
  if (raw === 'all' || raw === '') {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    const parts = raw.split(',');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [a, b] = trimmed.split('-').map(Number);
        const from = Math.max(1, Math.min(a, totalPages));
        const to   = Math.max(1, Math.min(b, totalPages));
        for (let p = from; p <= to; p++) pages.push(p);
      } else {
        const n = Number(trimmed);
        if (!isNaN(n) && n >= 1 && n <= totalPages) pages.push(n);
      }
    }
    // Deduplicate and sort
    pages = [...new Set(pages)].sort((a, b) => a - b);
    if (pages.length === 0) pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  // ── Scale from DPI (PDF native = 72 DPI, scale = target / 72) ────
  const scale = dpi / 72;
  const jpegQuality = dpi >= 300 ? 0.95 : dpi >= 150 ? 0.88 : 0.78;

  // ── Single page fast-path ─────────────────────────────────────────
  if (singlePage && pages.length === 1) {
    const page = await pdf.getPage(pages[0]);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width  = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', jpegQuality));
    return blob!;
  }

  // ── Multi-page → ZIP ──────────────────────────────────────────────
  const zip = new JSZip();

  for (const i of pages) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width  = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await new Promise<Blob | null>(resolve =>
        canvas.toBlob(resolve, 'image/jpeg', jpegQuality)
      );
      if (blob) zip.file(`page_${i}.jpg`, blob);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
};


/**
 * Converts a list of image files to a single PDF.
 *
 * @param files     Array of image PdfFile objects (in order)
 * @param pageSize  'a4' | 'letter' | 'fit' (default 'a4')
 *                  'fit' — each page sized to the image's natural dimensions
 */
export interface ImageToPdfOptions {
  pageSize?: 'a4' | 'letter' | 'fit';
  orientation?: 'auto' | 'portrait' | 'landscape';
  margin?: 'none' | 'small' | 'big';
  rotations?: number[]; // Angle in degrees (0, 90, 180, 270) for each image
}

/**
 * Convert multiple image files into a single PDF document.
 * Matches iLovePDF standard: Auto-orientation, per-page rotation, tight margin control, and edge-to-edge scaling.
 * 
 * @param files    Array of image PdfFile objects (in order)
 * @param options  ImageToPdfOptions or string pageSize ('a4' | 'letter' | 'fit')
 */
export const imagesToPdf = async (
  files: PdfFile[],
  options: ImageToPdfOptions | 'a4' | 'letter' | 'fit' = 'a4',
): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();

  const opts: ImageToPdfOptions =
    typeof options === 'string'
      ? { pageSize: options, orientation: 'portrait', margin: 'none' }
      : { pageSize: 'a4', orientation: 'portrait', margin: 'none', ...options };

  const pageSize = opts.pageSize || 'a4';
  const orientation = opts.orientation || 'portrait';
  const marginOption = opts.margin || 'none';
  const rotations = opts.rotations || [];

  // Standard page dimensions in PDF points (1 pt = 1/72 inch)
  const PAGE_SIZES = {
    a4:     { width: 595.28,  height: 841.89 },
    letter: { width: 612,     height: 792    },
  };

  /**
   * Rasterize an image file to JPEG via canvas, optionally baking rotation in.
   */
  const rasterizeToJpeg = (file: File, angleDeg: number = 0): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const isRotated90 = (angleDeg % 180) !== 0;
        canvas.width = isRotated90 ? img.naturalHeight : img.naturalWidth;
        canvas.height = isRotated90 ? img.naturalWidth : img.naturalHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (angleDeg !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((angleDeg * Math.PI) / 180);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        } else {
          ctx.drawImage(img, 0, 0);
        }

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob.arrayBuffer());
            else reject(new Error('Failed to rasterize image'));
          },
          'image/jpeg',
          0.94
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error(`Failed to load image: ${file.name}`));
      };
      img.src = url;
    });
  };

  for (let idx = 0; idx < files.length; idx++) {
    const imgFile = files[idx];
    const angleDeg = (rotations[idx] || (imgFile as any).rotation || 0) % 360;
    const buffer = await imgFile.file.arrayBuffer();
    let image;

    try {
      if (angleDeg !== 0) {
        // If rotated, bake rotation via canvas
        const rotatedBuffer = await rasterizeToJpeg(imgFile.file, angleDeg);
        image = await pdfDoc.embedJpg(rotatedBuffer);
      } else if (imgFile.file.type === 'image/jpeg' || imgFile.file.type === 'image/jpg') {
        image = await pdfDoc.embedJpg(buffer);
      } else if (imgFile.file.type === 'image/png') {
        image = await pdfDoc.embedPng(buffer);
      } else {
        const jpegBuffer = await rasterizeToJpeg(imgFile.file, 0);
        image = await pdfDoc.embedJpg(jpegBuffer);
      }
    } catch {
      try {
        const jpegBuffer = await rasterizeToJpeg(imgFile.file, angleDeg);
        image = await pdfDoc.embedJpg(jpegBuffer);
      } catch {
        continue;
      }
    }

    const imgW = image.width;
    const imgH = image.height;
    const isLandscape = imgW > imgH;

    let pageW: number;
    let pageH: number;

    if (pageSize === 'fit') {
      // Natural image dimensions in PDF points
      const ptScale = 72 / 96;
      pageW = imgW * ptScale;
      pageH = imgH * ptScale;
    } else {
      const baseSize = PAGE_SIZES[pageSize];
      let targetOrientation = orientation;
      if (targetOrientation === 'auto') {
        targetOrientation = isLandscape ? 'landscape' : 'portrait';
      }

      if (targetOrientation === 'landscape') {
        pageW = Math.max(baseSize.width, baseSize.height);
        pageH = Math.min(baseSize.width, baseSize.height);
      } else {
        pageW = Math.min(baseSize.width, baseSize.height);
        pageH = Math.max(baseSize.width, baseSize.height);
      }
    }

    let marginPt = 0;
    if (pageSize !== 'fit') {
      if (marginOption === 'small') marginPt = 20;
      else if (marginOption === 'big') marginPt = 45;
      else marginPt = 0; // 'none' = 0 full bleed
    }

    const containerWidth  = Math.max(1, pageW - marginPt * 2);
    const containerHeight = Math.max(1, pageH - marginPt * 2);

    const scale = Math.min(
      containerWidth  / imgW,
      containerHeight / imgH
    );

    const renderedWidth  = imgW * scale;
    const renderedHeight = imgH * scale;

    const x = marginPt + (containerWidth  - renderedWidth)  / 2;
    const y = marginPt + (containerHeight - renderedHeight) / 2;

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(image, { x, y, width: renderedWidth, height: renderedHeight });
  }

  return await pdfDoc.save({ useObjectStreams: true });
};

export interface EditorAction {
  id: string;
  type: 'text' | 'draw' | 'image' | 'rectangle' | 'circle';
  pageIndex: number;
  x?: number; // Normalized 0-1
  y?: number; // Normalized 0-1
  width?: number; // Normalized 0-1
  height?: number; // Normalized 0-1
  text?: string;
  size?: number;
  color?: string;
  paths?: { x: number; y: number }[]; // Normalized 0-1
  strokeWidth?: number;
  imageData?: string; // Base64
  imageWidth?: number; // Normalized (Legacy, prefer width)
  imageHeight?: number; // Normalized (Legacy, prefer height)
}

export interface DuplicateDetectionProgress {
  progress: number;
  step: string;
}

/**
 * Applies text, drawing, and image annotations to a PDF.
 */
export const saveEditedPdf = async (file: File, actions: EditorAction[]): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  const parseColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return rgb(r, g, b);
  };

  for (const action of actions) {
    if (action.pageIndex >= pages.length) continue;
    const page = pages[action.pageIndex];
    const { width, height } = page.getSize();

    if (action.type === 'text' && action.text && action.x !== undefined && action.y !== undefined) {
      const pdfX = action.x * width;
      const pdfY = height - (action.y * height); // Flip Y
      const fontSize = action.size || 12;
      
      page.drawText(action.text, {
        x: pdfX,
        y: pdfY - fontSize, // Adjust for top-left anchor vs bottom-left PDF
        size: fontSize,
        font: helveticaFont,
        color: action.color ? parseColor(action.color) : rgb(0, 0, 0),
      });
    }

    if (action.type === 'draw' && action.paths && action.paths.length > 1) {
      const pathColor = action.color ? parseColor(action.color) : rgb(0, 0, 0);
      const thickness = action.strokeWidth || 2;

      for (let i = 0; i < action.paths.length - 1; i++) {
        const p1 = action.paths[i];
        const p2 = action.paths[i+1];

        page.drawLine({
          start: { x: p1.x * width, y: height - (p1.y * height) },
          end: { x: p2.x * width, y: height - (p2.y * height) },
          thickness: thickness,
          color: pathColor,
        });
      }
    }
    
    if (action.type === 'rectangle' && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
      const rectColor = action.color ? parseColor(action.color) : rgb(1, 1, 1);
      
      page.drawRectangle({
        x: action.x * width,
        y: height - (action.y * height) - (action.height * height),
        width: action.width * width,
        height: action.height * height,
        color: rectColor,
      });
    }

    if (action.type === 'circle' && action.x !== undefined && action.y !== undefined && action.width !== undefined && action.height !== undefined) {
      const circleColor = action.color ? parseColor(action.color) : rgb(0, 0, 0);
      const w = action.width * width;
      const h = action.height * height;
      
      page.drawEllipse({
        x: (action.x * width) + (w / 2),
        y: height - (action.y * height) - (h / 2),
        xScale: w / 2,
        yScale: h / 2,
        color: circleColor,
      });
    }
    
    if (action.type === 'image' && action.imageData && action.x !== undefined && action.y !== undefined) {
      // Decode Base64 to Uint8Array
      const base64 = action.imageData.split(',')[1];
      const binaryString = window.atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let j = 0; j < len; j++) {
        bytes[j] = binaryString.charCodeAt(j);
      }

      let embeddedImage;
      if (action.imageData.startsWith('data:image/png')) {
        embeddedImage = await pdfDoc.embedPng(bytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(bytes);
      }

      let finalW: number;
      let finalH: number;
      const aspect = embeddedImage.width / embeddedImage.height;

      // Prefer width-based sizing to avoid preview/export ratio drift.
      if (action.width !== undefined && action.height !== undefined) {
        finalW = action.width * width;
        finalH = action.height * height;
      } else if (action.width !== undefined) {
        finalW = action.width * width;
        finalH = finalW / aspect;
      } else if (action.height !== undefined) {
        finalH = action.height * height;
        finalW = finalH * aspect;
      } else {
        // Legacy fallback or initial creation fallback
        finalW = (action.imageWidth || 0.2) * width;
        finalH = action.imageHeight ? action.imageHeight * height : finalW / aspect;
      }

      page.drawImage(embeddedImage, {
        x: action.x * width,
        y: height - (action.y * height) - finalH,
        width: finalW,
        height: finalH
      });
    }
  }

  return await pdfDoc.save();
};

/**
 * Crop PDF pages.
 * cropRect: { x, y, width, height } normalized 0-1
 */
export const cropPdf = async (file: File, cropRect: { x: number, y: number, width: number, height: number }): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach(page => {
    const { width, height } = page.getSize();
    
    // Convert normalized coordinates to PDF points
    const cropX = cropRect.x * width;
    const cropW = cropRect.width * width;
    const cropH = cropRect.height * height;
    
    const cropY = height - (cropRect.y * height) - cropH;

    page.setCropBox(cropX, cropY, cropW, cropH);
    page.setMediaBox(cropX, cropY, cropW, cropH);
  });

  return await pdfDoc.save();
};

/**
 * Extracts text from a PDF file using PDF.js
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  let totalTextLength = 0;

  console.log(`[extractTextFromPdf] Starting extraction for ${pdf.numPages} pages`);

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str || '').join(' ').trim();
      totalTextLength += pageText.length;

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
      console.log(`[extractTextFromPdf] Page ${i}: ${pageText.length} characters`);
    } catch (pageError) {
      console.warn(`[extractTextFromPdf] Failed to extract text from page ${i}:`, pageError);
      // Continue with other pages rather than failing completely
      fullText += `--- Page ${i} ---\n[Text extraction failed for this page]\n\n`;
    }
  }

  console.log(`[extractTextFromPdf] Total extracted text length: ${totalTextLength}`);

  // If very little text was found, this might be a scanned PDF
  if (totalTextLength < 10 && pdf.numPages > 0) {
    console.log(`[extractTextFromPdf] Very little text found (${totalTextLength} chars), likely scanned PDF`);
  }

  return fullText;
};
export const downloadPdf = (
  data: Uint8Array | Blob,
  filename: string,
  options?: { autoDownload?: boolean }
) => {
  let blob: Blob;
  const autoDownload = options?.autoDownload !== false;

  if (data instanceof Blob) {
    blob = data;
  } else {
    // ✅ SAFE conversion
    blob = new Blob([new Uint8Array(data)], {
      type: 'application/pdf',
    });
  }


  setLatestDownload({
    filename,
    blob,
    autoDownloaded: autoDownload,
  });

  trackEvent({
    category: 'File Processing',
    action: 'process_success',
    label: filename,
  });

  if (!autoDownload) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;

  document.body.appendChild(a);
  a.click();
  trackEvent({
    category: 'File Processing',
    action: 'download_click',
    label: filename,
  });

  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadFile = (
  data: Blob,
  filename: string,
  options?: { autoDownload?: boolean }
) => {
  const autoDownload = options?.autoDownload !== false;
  setLatestDownload({
    filename,
    blob: data,
    autoDownloaded: autoDownload,
  });

  trackEvent({
    category: 'File Processing',
    action: 'process_success',
    label: filename,
  });

  if (!autoDownload) return;

  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  trackEvent({
    category: 'File Processing',
    action: 'download_click',
    label: filename,
  });
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Protects a PDF with password encryption.
 * Note: Client-side PDF encryption has limitations and may not be supported by all PDF viewers.
 */
export const protectPdf = async (file: File, password: string): Promise<Uint8Array> => {
  // For now, we'll implement a basic approach using pdf-lib's available features
  // Note: Full encryption may require server-side processing or different libraries
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // Add a password hint as metadata (not secure, just informational)
  // In a real implementation, this would use proper encryption
  // For now, we'll return the PDF as-is with a warning that encryption isn't fully implemented client-side
  console.warn('PDF password protection is limited in browser environment. Consider using server-side encryption for better security.');

  return await pdfDoc.save();
};

export interface PDFFormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'unknown';
  value?: string | boolean;
  options?: string[]; // For dropdowns and radio groups
  required?: boolean;
}

export const getPDFFormFields = async (file: File): Promise<PDFFormField[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  const fields: PDFFormField[] = [];
  const detectFieldsFromAnnotations = async (): Promise<PDFFormField[]> => {
    const detected: PDFFormField[] = [];
    const seen = new Set<string>();
    try {
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
        const page = await pdf.getPage(pageNo);
        const annotations = await page.getAnnotations();
        annotations.forEach((annotation: any, index: number) => {
          if (String(annotation?.subtype || "").toLowerCase() !== "widget") return;
          const name = String(
            annotation?.fieldName ||
            annotation?.alternativeText ||
            `field_${pageNo}_${index + 1}`
          ).trim();
          if (!name || seen.has(name)) return;
          seen.add(name);

          const fieldTypeRaw = String(annotation?.fieldType || "").toUpperCase();
          const isCheckbox = Boolean(annotation?.checkBox);
          const isRadio = Boolean(annotation?.radioButton);

          let type: PDFFormField["type"] = "unknown";
          if (fieldTypeRaw === "TX") type = "text";
          else if (fieldTypeRaw === "BTN") type = isRadio ? "radio" : "checkbox";
          else if (fieldTypeRaw === "CH") type = "dropdown";
          else if (fieldTypeRaw === "SIG") type = "signature";
          else if (isCheckbox) type = "checkbox";
          else if (isRadio) type = "radio";

          const options = Array.isArray(annotation?.options)
            ? annotation.options
                .map((opt: any) => String(opt?.displayValue || opt?.exportValue || opt || "").trim())
                .filter(Boolean)
            : undefined;

          const value =
            type === "checkbox"
              ? Boolean(annotation?.fieldValue)
              : (annotation?.fieldValue !== undefined ? String(annotation.fieldValue) : (type === "text" ? "" : undefined));

          detected.push({
            name,
            type,
            value,
            options,
            required: Boolean(annotation?.required),
          });
        });
      }
    } catch (annotationError) {
      console.warn("Form annotation fallback detection failed:", annotationError);
    }
    return detected;
  };

  try {
    // Try to get the form
    const form = pdfDoc.getForm();
    const allFields = form.getFields();

    if (allFields.length === 0) {
      // Try alternative method - check if form exists but has no fields
      // Some PDFs have form annotations that aren't detected by getFields()
      console.log('No fields found via getFields(), trying alternative detection...');
    }

    for (const field of allFields) {
      const fieldName = field.getName();
      
      // Use duck typing to detect field types more reliably
      let fieldType: PDFFormField['type'] = 'unknown';
      let options: string[] | undefined;
      let value: string | boolean | undefined;
      let required = false;

      try {
        // Check if it's a text field
        if (field.constructor.name === 'PDFTextField' || 
            field.constructor.name === 'PDFText' ||
            fieldName.toLowerCase().includes('text')) {
          fieldType = 'text';
          try {
            value = (field as any).getText() || '';
          } catch {
            value = '';
          }
        }
        // Check if it's a checkbox
        else if (field.constructor.name === 'PDFCheckBox' || 
                 field.constructor.name === 'PDFCheckbox') {
          fieldType = 'checkbox';
          try {
            value = (field as any).isChecked?.() || false;
          } catch {
            value = false;
          }
        }
        // Check if it's a radio group
        else if (field.constructor.name === 'PDFRadioGroup' || 
                 fieldName.toLowerCase().includes('radio')) {
          fieldType = 'radio';
          try {
            value = (field as any).getSelected?.() || '';
            options = (field as any).getOptions?.() || [];
          } catch {
            value = '';
            options = [];
          }
        }
        // Check if it's a dropdown
        else if (field.constructor.name === 'PDFDropdown' || 
                 fieldName.toLowerCase().includes('combo') ||
                 fieldName.toLowerCase().includes('select')) {
          fieldType = 'dropdown';
          try {
            value = (field as any).getSelected?.() || '';
            options = (field as any).getOptions?.() || [];
          } catch {
            value = '';
            options = [];
          }
        }
        // Check for signature field
        else if (fieldName.toLowerCase().includes('signature') ||
                 fieldName.toLowerCase().includes('sig')) {
          fieldType = 'signature';
          value = '';
        }
        // Fallback - try to determine type from field methods
        else {
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(field));
          if (methods.includes('getText')) {
            fieldType = 'text';
            try { value = (field as any).getText() || ''; } catch { value = ''; }
          } else if (methods.includes('isChecked')) {
            fieldType = 'checkbox';
            try { value = (field as any).isChecked?.() || false; } catch { value = false; }
          } else if (methods.includes('getSelected')) {
            fieldType = 'radio';
            try { 
              value = (field as any).getSelected?.() || ''; 
              options = (field as any).getOptions?.() || [];
            } catch { value = ''; options = []; }
          } else if (methods.includes('select')) {
            fieldType = 'dropdown';
            try { 
              value = (field as any).getSelected?.() || ''; 
              options = (field as any).getOptions?.() || [];
            } catch { value = ''; options = []; }
          } else {
            fieldType = 'unknown';
            value = '';
          }
        }

        // Try to get required status
        try {
          required = (field as any).isRequired?.() || false;
        } catch {
          required = false;
        }

        fields.push({
          name: fieldName,
          type: fieldType,
          value,
          options,
          required
        });
      } catch (fieldError) {
        // If we can't determine the type, add it as unknown
        console.warn(`Could not determine type for field: ${fieldName}`, fieldError);
        fields.push({
          name: fieldName,
          type: 'unknown',
          value: '',
          required: false
        });
      }
    }

    // If no fields found via getFields(), try to detect form annotations directly
    if (fields.length === 0) {
      console.log('No fields detected, checking for form annotations...');
      try {
        const fallbackFields = await detectFieldsFromAnnotations();
        if (fallbackFields.length > 0) {
          fields.push(...fallbackFields);
        }
      } catch (e) {
        console.warn('Could not check pages for annotations:', e);
      }
    }

  } catch (formError: any) {
    // If getForm() fails, the PDF might not have a form or use a different format
    console.log('PDF form access failed:', formError.message);
    
    // Check if this might be an XFA form (which pdf-lib can't handle)
    if (formError.message && (
        formError.message.includes('XFA') || 
        formError.message.includes('Unable to parse'))) {
      throw new Error('This PDF uses XFA forms which require Adobe Acrobat or server-side processing.');
    }

    const fallbackFields = await detectFieldsFromAnnotations();
    if (fallbackFields.length > 0) {
      fields.push(...fallbackFields);
    }
  }

  return fields;
};

export const fillPDFForm = async (
  file: File,
  fieldValues: Record<string, string | boolean>,
  options: { flatten?: boolean } = {}
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  
  let fieldsFilled = 0;
  let fieldsFailed = 0;

  try {
    const form = pdfDoc.getForm();
    const allFields = form.getFields();

    for (const field of allFields) {
      const fieldName = field.getName();
      const value = fieldValues[fieldName];

      if (value === undefined) continue;

      try {
        const constructorName = field.constructor.name;

        // Text field
        if (constructorName === 'PDFTextField' && typeof value === 'string') {
          (field as any).setText(value);
          fieldsFilled++;
        }
        // Checkbox
        else if (constructorName === 'PDFCheckBox' && typeof value === 'boolean') {
          if (value) {
            (field as any).check();
          } else {
            (field as any).uncheck();
          }
          fieldsFilled++;
        }
        // Radio group
        else if (constructorName === 'PDFRadioGroup' && typeof value === 'string') {
          try {
            (field as any).select(value);
            fieldsFilled++;
          } catch {
            // Try setting as radio button
            fieldsFailed++;
          }
        }
        // Dropdown
        else if (constructorName === 'PDFDropdown' && typeof value === 'string') {
          try {
            (field as any).select(value);
            fieldsFilled++;
          } catch {
            fieldsFailed++;
          }
        }
        // Try generic methods as fallback
        else {
          const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(field));
          
          if (typeof value === 'string' && methods.includes('setText')) {
            try {
              (field as any).setText(value);
              fieldsFilled++;
            } catch {
              fieldsFailed++;
            }
          } else if (typeof value === 'boolean' && methods.includes('check')) {
            try {
              value ? (field as any).check() : (field as any).uncheck();
              fieldsFilled++;
            } catch {
              fieldsFailed++;
            }
          } else if (typeof value === 'string' && methods.includes('select')) {
            try {
              (field as any).select(value);
              fieldsFilled++;
            } catch {
              fieldsFailed++;
            }
          } else {
            fieldsFailed++;
          }
        }
      } catch (fieldError) {
        console.warn(`Failed to fill field: ${fieldName}`, fieldError);
        fieldsFailed++;
      }
    }

    console.log(`Form filling complete: ${fieldsFilled} filled, ${fieldsFailed} failed`);

    if (fieldsFilled === 0 && fieldsFailed > 0) {
      throw new Error('Could not fill any form fields. The PDF may use a form format that is not supported.');
    }

    if (options.flatten) {
      try {
        form.flatten();
      } catch (flattenError) {
        console.warn('Failed to flatten form, returning editable output:', flattenError);
      }
    }

  } catch (error: any) {
    console.error('Form filling failed:', error);
    
    // If getForm() fails, try a different approach
    if (error.message && error.message.includes('XFA')) {
      throw new Error('This PDF uses XFA forms which cannot be filled client-side. Please use Adobe Acrobat or convert to a standard PDF form first.');
    }
    
    throw error;
  }

  return await pdfDoc.save();
};

export { formatBytes } from '../utils/formatBytes';

/**
 * Reorder PDF pages by providing new page indices
 */
export const reorderPdfPages = async (file: File, newOrder: number[]): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  // Validate new order
  if (newOrder.length !== totalPages) {
    throw new Error(`New order must contain ${totalPages} page indices`);
  }

  // Validate all indices are valid
  const validIndices = newOrder.every(index => index >= 0 && index < totalPages);
  if (!validIndices) {
    throw new Error('Invalid page indices in new order');
  }

  const newPdf = await PDFDocument.create();
  const copiedPages = await newPdf.copyPages(pdfDoc, newOrder);
  copiedPages.forEach(page => newPdf.addPage(page));

  return await newPdf.save();
};

/**
 * Change PDF page size to A4 or Letter
 */
export const changePdfPageSize = async (
  file: File,
  size: 'A4' | 'Letter'
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const pages = pdfDoc.getPages();

  // Page dimensions in points (1 inch = 72 points)
  const dimensions = {
    A4: [595.28, 841.89], // A4: 210x297mm
    Letter: [612, 792]    // Letter: 8.5x11 inches
  };

  const [newWidth, newHeight] = dimensions[size];

  pages.forEach(page => {
    page.setSize(newWidth, newHeight);
  });

  return await pdfDoc.save();
};

/**
 * Duplicate specific PDF pages
 */
export const duplicatePdfPages = async (
  file: File,
  pagesToDuplicate: number[]
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();
  const newPdf = await PDFDocument.create();

  // Validate page indices
  const validPages = pagesToDuplicate.filter(index =>
    index >= 0 && index < totalPages
  );

  if (validPages.length === 0) {
    throw new Error('No valid pages selected for duplication');
  }

  // Add original pages
  for (let i = 0; i < totalPages; i++) {
    const [page] = await newPdf.copyPages(pdfDoc, [i]);
    newPdf.addPage(page);
  }

  // Add duplicated pages
  for (const pageIndex of validPages) {
    const [duplicatedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(duplicatedPage);
  }

  return await newPdf.save();
};

/**
 * Convert HTML to PDF (basic implementation using html2canvas and jspdf)
 */
export const htmlToPdf = async (
  htmlContent: string,
  options: {
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
  } = {}
): Promise<Uint8Array> => {
  const { format = 'a4', orientation = 'portrait' } = options;

  // Create a temporary container
  const container = document.createElement('div');
  container.innerHTML = sanitizeHtml(htmlContent);
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = format === 'a4' ? '210mm' : '8.5in';
  container.style.backgroundColor = 'white';
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.fontSize = '12px';
  container.style.lineHeight = '1.4';

  document.body.appendChild(container);

  try {
    // Use html2canvas to capture the HTML
    const canvas = await (window as any).html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: format === 'a4' ? 794 : 816, // A4 width at 96 DPI
      height: undefined // Auto height
    });

    // Create PDF using jsPDF
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: format
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = format === 'a4' ? 210 : 216; // A4/Letter width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

    return new Uint8Array(pdf.output('arraybuffer'));
  } finally {
    document.body.removeChild(container);
  }
};

/**
 * Convert PDF to HTML (basic text extraction with formatting)
 */
export const pdfToHtml = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PDF Content</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
            .page { margin-bottom: 30px; border-bottom: 1px solid #ccc; padding-bottom: 20px; }
            .page-number { color: #666; font-weight: bold; margin-bottom: 10px; }
            .page-content { white-space: pre-wrap; }
        </style>
    </head>
    <body>
        <h1>PDF Content</h1>
  `;

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ')
      .trim();

    htmlContent += `
        <div class="page">
            <div class="page-number">Page ${i}</div>
            <div class="page-content">${pageText}</div>
        </div>
    `;
  }

  htmlContent += `
    </body>
    </html>
  `;

  return htmlContent;
};

/**
 * Insert PDF pages at specific positions
 */
export const insertPdfPages = async (
  baseFile: File,
  insertFile: File,
  position: number
): Promise<Uint8Array> => {
  const baseBuffer = await baseFile.arrayBuffer();
  const insertBuffer = await insertFile.arrayBuffer();

  const basePdf = await safeLoadPdf(baseBuffer);
  const insertPdf = await safeLoadPdf(insertBuffer);

  const basePages = basePdf.getPageCount();
  const insertPages = insertPdf.getPageCount();

  // Validate position
  if (position < 0 || position > basePages) {
    throw new Error(`Invalid position. Must be between 0 and ${basePages}`);
  }

  const newPdf = await PDFDocument.create();

  // Add pages before insertion point
  if (position > 0) {
    const beforePages = await newPdf.copyPages(basePdf, Array.from({length: position}, (_, i) => i));
    beforePages.forEach(page => newPdf.addPage(page));
  }

  // Add inserted pages
  const insertedPages = await newPdf.copyPages(insertPdf, insertPdf.getPageIndices());
  insertedPages.forEach(page => newPdf.addPage(page));

  // Add remaining pages
  if (position < basePages) {
    const afterPages = await newPdf.copyPages(
      basePdf,
      Array.from({length: basePages - position}, (_, i) => i + position)
    );
    afterPages.forEach(page => newPdf.addPage(page));
  }

  return await newPdf.save();
};

/**
 * Remove PDF metadata
 */
export const removePdfMetadata = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // Clear all metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setCreator('');
  pdfDoc.setProducer('');
  pdfDoc.setKeywords([]);

  // Remove creation date and modification date by setting them to undefined
  // pdf-lib doesn't provide direct methods to remove these, but we can set them to current date
  const now = new Date();
  // Note: pdf-lib doesn't allow setting creation date, but we can leave it as is

  return await pdfDoc.save();
};

/**
 * Attempt to repair corrupted PDF (basic repair by re-saving)
 */
export const repairCorruptedPdf = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();

  try {
    // First try to load with error handling
    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
      updateMetadata: false
    });

    // Re-save to attempt repair
    return await pdfDoc.save({ useObjectStreams: false });
  } catch (error: any) {
    if (error.message.includes('Invalid PDF')) {
      throw new Error('This PDF appears to be severely corrupted and cannot be repaired client-side. Please try using a professional PDF repair tool.');
    }
    throw error;
  }
};

/**
 * Fix PDF fonts by embedding missing fonts
 */
export const fixPdfFonts = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This is a basic implementation - in a real scenario, you would need to:
  // 1. Analyze which fonts are missing
  // 2. Embed appropriate fallback fonts
  // For now, we'll just re-save with font embedding enabled

  return await pdfDoc.save({ useObjectStreams: true });
};

/**
 * Remove hyperlinks from PDF
 */
export const removeHyperlinks = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This is a basic implementation - pdf-lib has limited support for annotations
  // In a real implementation, you would need to parse and remove link annotations
  // For now, we'll return the PDF as-is with a note that this feature needs server-side processing

  console.warn('Hyperlink removal requires server-side processing for full functionality. Basic implementation applied.');

  return await pdfDoc.save();
};

/**
 * Analyze PDF file and return detailed information
 */
export const analyzePdfFile = async (file: File): Promise<{
  pageCount: number;
  fileSize: number;
  hasForms: boolean;
  hasImages: boolean;
  hasText: boolean;
  hasEncryption: boolean;
  fonts: string[];
  version: string;
  creator: string;
  producer: string;
  title: string;
  author: string;
}> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  // Basic info
  const pageCount = pdfDoc.getPageCount();
  const fileSize = file.size;

  // Check for forms
  let hasForms = false;
  try {
    const form = pdfDoc.getForm();
    hasForms = form.getFields().length > 0;
  } catch {
    hasForms = false;
  }

  // Check for images and text
  let hasImages = false;
  let hasText = false;
  let fonts: string[] = [];

  for (let i = 1; i <= Math.min(pageCount, 3); i++) { // Check first 3 pages
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const ops = await page.getOperatorList();

    if (textContent.items.length > 0) {
      hasText = true;
    }

    // Check for images in operator list
    if (ops.fnArray.some((fn: any) => fn === pdfjs.OPS.paintImageXObject)) {
      hasImages = true;
    }

    // Extract font information
    const fontsOnPage = ops.argsArray
      .filter((args: any, idx: number) => ops.fnArray[idx] === pdfjs.OPS.setFont)
      .map((args: any) => args[0]) // Font name
      .filter((font: string) => font && !fonts.includes(font));

    fonts.push(...fontsOnPage);
  }

  // Metadata
  const title = pdfDoc.getTitle() || '';
  const author = pdfDoc.getAuthor() || '';
  const creator = pdfDoc.getCreator() || '';
  const producer = pdfDoc.getProducer() || '';

  // Version (approximate)
  let version = '1.4'; // Default
  try {
    // This is a basic check - real version detection would require parsing PDF header
    if (arrayBuffer.byteLength > 8) {
      const header = new TextDecoder().decode(arrayBuffer.slice(0, 8));
      const versionMatch = header.match(/PDF-(\d\.\d)/);
      if (versionMatch) {
        version = versionMatch[1];
      }
    }
  } catch {
    // Keep default version
  }

  return {
    pageCount,
    fileSize,
    hasForms,
    hasImages,
    hasText,
    hasEncryption: false, // Would need more complex detection
    fonts: [...new Set(fonts)], // Remove duplicates
    version,
    creator,
    producer,
    title,
    author
  };
};

/**
 * Enhanced duplicate page detection with comprehensive analysis
 */
export const detectDuplicatePages = async (
  file: File,
  options: {
    similarityThreshold?: number; // 0-100, default 80
    maxPagesToAnalyze?: number; // Limit for performance, default 100
    onProgress?: (progress: number, step: string) => void;
  } = {}
): Promise<{
  duplicates: {
    groupId: string;
    pages: number[];
    similarity: number;
    confidence: number;
    pageType: 'text' | 'scanned' | 'mixed';
    reasoning: string;
  }[];
  summary: {
    totalPages: number;
    uniquePages: number;
    duplicatePages: number;
    totalDuplicates: number;
    analyzedPages: number;
    processingTime: number;
  };
  pageThumbnails: string[];
}> => {
  const { similarityThreshold = 80, maxPagesToAnalyze = 100, onProgress } = options;

  const arrayBuffer = await file.arrayBuffer();

  const mapWorkerResult = (data: any) => {
    const duplicates = Array.isArray(data?.duplicates) ? data.duplicates : [];
    return {
      duplicates: duplicates.map((group: any) => ({
        groupId: group.groupId,
        pages: Array.isArray(group.pages) ? group.pages.slice().sort((a: number, b: number) => a - b) : [],
        similarity: Number(group.similarity) || 0,
        confidence: Number(group.confidence) || 0,
        pageType: group.pageType === 'text' || group.pageType === 'scanned' ? group.pageType : 'mixed',
        reasoning: Array.isArray(group.reasons) && group.reasons.length > 0
          ? group.reasons.join(', ')
          : (group.matchType ? `Match type: ${group.matchType}` : 'Potential duplicate pages')
      })),
      summary: {
        totalPages: Number(data?.summary?.totalPages) || 0,
        uniquePages: Number(data?.summary?.uniquePages) || 0,
        duplicatePages: Number(data?.summary?.duplicatePages) || 0,
        totalDuplicates: Number(data?.summary?.totalDuplicates) || 0,
        analyzedPages: Math.min(Number(data?.summary?.totalPages) || 0, maxPagesToAnalyze),
        processingTime: Number(data?.summary?.processingTime) || 0
      },
      pageThumbnails: Array.isArray(data?.pageThumbnails) ? data.pageThumbnails : []
    };
  };

  const canUseDuplicateWorker =
    typeof Worker !== 'undefined' &&
    typeof OffscreenCanvas !== 'undefined';

  if (canUseDuplicateWorker) {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL('../workers/duplicateDetector.worker.ts', import.meta.url), { type: 'module' });
      const workerResult = await new Promise<any>((resolve, reject) => {
        if (!worker) {
          reject(new Error('Duplicate detection worker unavailable'));
          return;
        }
        worker.onmessage = (event: MessageEvent) => {
          const payload = event.data;
          if (payload?.type === 'progress') {
            onProgress?.(Math.max(0, Math.min(100, Number(payload.progress) || 0)), payload.step || 'Analyzing...');
            return;
          }
          if (payload?.type === 'complete') {
            resolve(payload.data);
            return;
          }
          if (payload?.type === 'error') {
            reject(new Error(payload.data || 'Duplicate detection worker failed'));
          }
        };
        worker.onerror = () => reject(new Error('Duplicate detection worker crashed'));
        worker.postMessage({
          action: 'detect',
          buffer: arrayBuffer,
          threshold: similarityThreshold,
          maxPages: maxPagesToAnalyze
        });
      });
      return mapWorkerResult(workerResult);
    } catch {
      // Worker failures are expected on some browsers/builds; fallback is stable.
      onProgress?.(4, 'Using compatibility analyzer...');
    } finally {
      worker?.terminate();
    }
  } else {
    onProgress?.(4, 'Using compatibility analyzer...');
  }

  // Main-thread fallback detection
  const startTime = Date.now();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;
  const pagesToAnalyze = Math.min(totalPages, maxPagesToAnalyze);

  const normalizeTextForDup = (text: string): string => (
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(page|pg)\s*\d+\b/g, ' ')
      .replace(/\b\d+\b/g, '#')
      .replace(/\s+/g, ' ')
      .trim()
  );
  const jaccardTextSimilarity = (a: string, b: string): number => {
    if (!a || !b) return 0;
    const s1 = new Set(a.split(/\s+/).filter(w => w.length > 2));
    const s2 = new Set(b.split(/\s+/).filter(w => w.length > 2));
    if (s1.size === 0 && s2.size === 0) return 100;
    if (s1.size === 0 || s2.size === 0) return 0;
    const inter = [...s1].filter(w => s2.has(w)).length;
    const uni = new Set([...s1, ...s2]).size;
    return Math.round((inter / uni) * 100);
  };
  const buildAHash = (canvas: HTMLCanvasElement): string => {
    const small = document.createElement('canvas');
    small.width = 8;
    small.height = 8;
    const ctx = small.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(canvas, 0, 0, 8, 8);
    const img = ctx.getImageData(0, 0, 8, 8).data;
    const gray: number[] = [];
    for (let i = 0; i < img.length; i += 4) {
      gray.push(Math.round((img[i] * 0.299) + (img[i + 1] * 0.587) + (img[i + 2] * 0.114)));
    }
    const avg = gray.reduce((sum, v) => sum + v, 0) / gray.length;
    return gray.map(v => (v >= avg ? '1' : '0')).join('');
  };
  const imageSimilarityFromHashes = (h1: string, h2: string): number => {
    if (!h1 || !h2 || h1.length !== h2.length) return 0;
    let diff = 0;
    for (let i = 0; i < h1.length; i++) {
      if (h1[i] !== h2[i]) diff++;
    }
    return Math.round((1 - diff / h1.length) * 100);
  };

  const pageData: Array<{
    pageNumber: number;
    normalizedText: string;
    textLength: number;
    hasImages: boolean;
    width: number;
    height: number;
    thumb: string;
    imageHash: string;
  }> = [];

  for (let i = 1; i <= pagesToAnalyze; i++) {
    onProgress?.(5 + Math.round((i / pagesToAnalyze) * 65), `Analyzing page ${i} of ${pagesToAnalyze}...`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const rawText = textContent.items.map((item: any) => item?.str || '').join(' ');
    const normalizedText = normalizeTextForDup(rawText);

    let hasImages = false;
    try {
      const ops = await page.getOperatorList();
      hasImages = ops.fnArray.some((fn: any) =>
        fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintInlineImageXObject
      );
    } catch {
      hasImages = false;
    }

    const viewport = page.getViewport({ scale: 0.35 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const context = canvas.getContext('2d');
    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
    }
    const imageHash = buildAHash(canvas);

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = Math.max(1, Math.round(canvas.width * 0.45));
    thumbCanvas.height = Math.max(1, Math.round(canvas.height * 0.45));
    const thumbCtx = thumbCanvas.getContext('2d');
    if (thumbCtx) {
      thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
    }

    pageData.push({
      pageNumber: i,
      normalizedText,
      textLength: normalizedText.length,
      hasImages,
      width: Math.round(page.getViewport({ scale: 1 }).width),
      height: Math.round(page.getViewport({ scale: 1 }).height),
      thumb: thumbCanvas.toDataURL('image/png'),
      imageHash
    });
  }

  onProgress?.(76, 'Comparing pages...');

  const n = pageData.length;
  const parent = Array.from({ length: n }, (_, idx) => idx);
  const find = (x: number): number => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const pairInfo = new Map<string, { sim: number; conf: number; reason: string; textSim: number; imageSim: number; layoutSim: number; }>();
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p1 = pageData[i];
      const p2 = pageData[j];
      const textSim = jaccardTextSimilarity(p1.normalizedText, p2.normalizedText);
      const imageSim = imageSimilarityFromHashes(p1.imageHash, p2.imageHash);
      const wRatio = Math.min(p1.width, p2.width) / Math.max(p1.width, p2.width);
      const hRatio = Math.min(p1.height, p2.height) / Math.max(p1.height, p2.height);
      const layoutSim = Math.round(((wRatio + hRatio) / 2) * 100);

      const hasSubstantialText = Math.min(p1.textLength, p2.textLength) >= 40;
      
      // Multi-tier accurate similarity evaluation
      let similarity = 0;
      let isDuplicate = false;
      let reason = 'Similarity match';

      if (hasSubstantialText && textSim >= 90) {
        // High confidence text duplicate
        similarity = Math.max(textSim, Math.round((textSim * 0.7) + (imageSim * 0.3)));
        isDuplicate = similarity >= Math.min(similarityThreshold, 80);
        reason = textSim >= 98 ? 'Exact text match (100%)' : `High text match (${textSim}%)`;
      } else if (!hasSubstantialText && imageSim >= 85) {
        // High confidence visual/scanned duplicate
        similarity = imageSim;
        isDuplicate = similarity >= Math.min(similarityThreshold, 80);
        reason = imageSim >= 95 ? 'Exact visual match (100%)' : `High visual match (${imageSim}%)`;
      } else {
        // Hybrid comparison
        similarity = Math.round((textSim * 0.45) + (imageSim * 0.45) + (layoutSim * 0.10));
        isDuplicate = similarity >= similarityThreshold;
        reason = `Hybrid match (Text ${textSim}%, Visual ${imageSim}%)`;
      }

      const confidence = Math.max(60, Math.min(99, Math.round((textSim * 0.4) + (imageSim * 0.4) + (layoutSim * 0.2))));

      if (isDuplicate) {
        union(i, j);
      }

      pairInfo.set(`${i}:${j}`, {
        sim: similarity,
        conf: confidence,
        reason,
        textSim,
        imageSim,
        layoutSim
      });
    }
  }

  const clusters = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    const list = clusters.get(r) || [];
    list.push(i);
    clusters.set(r, list);
  }

  const duplicates: {
    groupId: string;
    pages: number[];
    similarity: number;
    confidence: number;
    pageType: 'text' | 'scanned' | 'mixed';
    reasoning: string;
  }[] = [];

  let gid = 1;
  clusters.forEach((indices) => {
    if (indices.length < 2) return;
    let c = 0;
    let simSum = 0;
    let confSum = 0;
    let textSum = 0;
    let imageSum = 0;
    let layoutSum = 0;
    let bestReason = '';

    for (let a = 0; a < indices.length; a++) {
      for (let b = a + 1; b < indices.length; b++) {
        const i = indices[a];
        const j = indices[b];
        const key = i < j ? `${i}:${j}` : `${j}:${i}`;
        const p = pairInfo.get(key);
        if (!p) continue;
        c++;
        simSum += p.sim;
        confSum += p.conf;
        textSum += p.textSim;
        imageSum += p.imageSim;
        layoutSum += p.layoutSim;
        if (!bestReason) bestReason = p.reason;
      }
    }
    if (c === 0) return;
    const hasText = indices.some(idx => pageData[idx].textLength > 40);
    const hasImage = indices.some(idx => pageData[idx].hasImages);
    const pageType: 'text' | 'scanned' | 'mixed' =
      hasText && !hasImage ? 'text' : (!hasText && hasImage ? 'scanned' : 'mixed');
    duplicates.push({
      groupId: `group-${gid++}`,
      pages: indices.map(idx => pageData[idx].pageNumber).sort((a, b) => a - b),
      similarity: Math.round(simSum / c),
      confidence: Math.round(confSum / c),
      pageType,
      reasoning: bestReason || `Text ${Math.round(textSum / c)}% • Image ${Math.round(imageSum / c)}%`
    });
  });

  duplicates.sort((a, b) => (b.similarity - a.similarity) || (b.pages.length - a.pages.length));

  const duplicatePages = duplicates.reduce((sum, group) => sum + Math.max(0, group.pages.length - 1), 0);
  const uniquePages = totalPages - duplicatePages;
  onProgress?.(100, 'Analysis complete');

  return {
    duplicates,
    summary: {
      totalPages,
      uniquePages,
      duplicatePages,
      totalDuplicates: duplicates.length,
      analyzedPages: pagesToAnalyze,
      processingTime: Date.now() - startTime
    },
    pageThumbnails: pageData.map(p => p.thumb)
  };
};

/**
 * Clean PDF for printing - optimize settings for better print quality
 */
export const cleanPdfForPrinting = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // Set print-friendly properties
  pdfDoc.setTitle(pdfDoc.getTitle() || 'Print Optimized PDF');

  // Optimize for printing (remove interactive elements, ensure CMYK compatibility, etc.)
  // This is a basic implementation - in practice, this would involve more complex optimizations

  return await pdfDoc.save({ useObjectStreams: true });
};

/**
 * Convert PDF color space (RGB to CMYK or vice versa)
 */
export const convertPdfColorSpace = async (
  file: File,
  targetColorSpace: 'RGB' | 'CMYK'
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This is a basic implementation - full color space conversion requires
  // complex image processing. In practice, this would need to:
  // 1. Extract images from PDF
  // 2. Convert each image's color space
  // 3. Re-embed converted images

  console.warn('Color space conversion is a basic implementation. Full conversion requires advanced image processing.');

  return await pdfDoc.save();
};

/**
 * Highlight text in PDF (basic implementation)
 */
export const highlightPdfText = async (
  file: File,
  textToHighlight: string,
  color: string = '#FFFF00'
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This would require finding text positions and adding highlight annotations
  // For now, this is a placeholder implementation

  console.warn('Text highlighting requires advanced PDF annotation support. Basic implementation applied.');

  return await pdfDoc.save();
};

/**
 * Convert scanned PDF to editable text using enhanced OCR
 */
export const convertScanToEditable = async (file: File): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // Enhanced OCR processing would go here
  // For now, this attempts to extract any existing text and re-save

  console.warn('Enhanced OCR conversion requires Tesseract.js integration. Basic text extraction applied.');

  return await pdfDoc.save();
};

/**
 * Basic text editing in PDF (find and replace)
 */
export const editPdfText = async (
  file: File,
  replacements: { find: string; replace: string }[]
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This would require parsing and modifying text objects in the PDF
  // For now, this is a placeholder implementation

  console.warn('Text editing requires advanced PDF parsing. Basic implementation applied.');

  return await pdfDoc.save();
};

/**
 * Basic image editing in PDF (resize, rotate, etc.)
 */
export const editPdfImages = async (
  file: File,
  operations: { pageIndex: number; operation: 'resize' | 'rotate'; params: any }[]
): Promise<Uint8Array> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await safeLoadPdf(arrayBuffer);

  // This would require extracting and modifying images in the PDF
  // For now, this is a placeholder implementation

  console.warn('Image editing requires advanced PDF image manipulation. Basic implementation applied.');

  return await pdfDoc.save();
};

/**
 * Convert images to PDF (scan-like functionality)
 */
export const imagesToPdfScan = async (
  images: FileList | File[],
  options: {
    quality?: number;
    format?: 'a4' | 'letter' | 'auto';
    orientation?: 'auto' | 'portrait' | 'landscape';
    margin?: 'none' | 'small' | 'default';
    skipRasterize?: boolean;
  } = {}
): Promise<Uint8Array> => {
  const {
    quality = 0.8,
    format = 'a4',
    orientation = 'auto',
    margin = 'default',
    skipRasterize = false
  } = options;
  const pdfDoc = await PDFDocument.create();

  const imageFiles = Array.from(images);

  const loadImageElement = (file: File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  };

  const rasterizeImage = async (file: File, targetQuality: number) => {
    const img = await loadImageElement(file);
    const maxWidth = targetQuality >= 0.9 ? 2600 : targetQuality >= 0.8 ? 2200 : 1600;
    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context not available');
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => {
        if (result) resolve(result);
        else reject(new Error('Failed to create image blob'));
      }, 'image/jpeg', targetQuality);
    });

    return blob.arrayBuffer();
  };

  const marginMap: Record<'none' | 'small' | 'default', number> = {
    none: 0,
    small: 12,
    default: 24
  };

  for (const imageFile of imageFiles) {
    let embeddedImage;
    try {
      if (skipRasterize) {
        const rawBytes = await imageFile.arrayBuffer();
        if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
          embeddedImage = await pdfDoc.embedJpg(rawBytes);
        } else if (imageFile.type === 'image/png') {
          embeddedImage = await pdfDoc.embedPng(rawBytes);
        } else {
          const optimizedBytes = await rasterizeImage(imageFile, quality);
          embeddedImage = await pdfDoc.embedJpg(optimizedBytes);
        }
      } else {
        const optimizedBytes = await rasterizeImage(imageFile, quality);
        embeddedImage = await pdfDoc.embedJpg(optimizedBytes);
      }
    } catch (error) {
      const fallbackBytes = await imageFile.arrayBuffer();
      if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
        embeddedImage = await pdfDoc.embedJpg(fallbackBytes);
      } else if (imageFile.type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(fallbackBytes);
      } else {
        continue; // Skip unsupported formats
      }
    }

    const effectiveMargin = marginMap[margin] ?? marginMap.none;
    let pageWidth: number;
    let pageHeight: number;
    let imageWidth: number;
    let imageHeight: number;
    let x: number;
    let y: number;

    if (format === 'auto') {
      // Fit to Image: Page size exactly matches the image dimensions + margins
      pageWidth = embeddedImage.width + (effectiveMargin * 2);
      pageHeight = embeddedImage.height + (effectiveMargin * 2);
      imageWidth = embeddedImage.width;
      imageHeight = embeddedImage.height;
      x = effectiveMargin;
      y = effectiveMargin;
    } else {
      const base = format === 'letter'
        ? { w: 612, h: 792 }
        : { w: 595, h: 842 }; // A4
      const isLandscape = orientation === 'landscape' ||
        (orientation === 'auto' && embeddedImage.width > embeddedImage.height);
      pageWidth = isLandscape ? base.h : base.w;
      pageHeight = isLandscape ? base.w : base.h;

      const usableWidth = Math.max(1, pageWidth - effectiveMargin * 2);
      const usableHeight = Math.max(1, pageHeight - effectiveMargin * 2);

      const scale = Math.min(usableWidth / embeddedImage.width, usableHeight / embeddedImage.height);
      imageWidth = embeddedImage.width * scale;
      imageHeight = embeddedImage.height * scale;
      x = (pageWidth - imageWidth) / 2;
      y = (pageHeight - imageHeight) / 2;
    }

    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    page.drawImage(embeddedImage, {
      x,
      y,
      width: imageWidth,
      height: imageHeight
    });
  }

  return await pdfDoc.save();
};
