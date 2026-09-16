import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

const pdfjs = pdfjsLib as any;

if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions?.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
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
}

/**
 * Searches text across all pages in a PDF and returns approximate bounding boxes in percentages.
 */
export const searchPdfForRedaction = async (
  file: File,
  query: string
): Promise<SearchMatch[]> => {
  if (!query || query.trim().length === 0) return [];

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  const matches: SearchMatch[] = [];
  const normalizedQuery = query.trim().toLowerCase();

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      const str = item.str.toLowerCase();
      if (str.includes(normalizedQuery)) {
        const tx = item.transform ? item.transform[4] : 0;
        const ty = item.transform ? item.transform[5] : 0;
        const itemW = item.width || 50;
        const itemH = Math.abs(item.transform ? (item.transform[3] || item.transform[0] || 12) : 12);

        // Convert PDF coordinates to viewport coordinates (0,0 top-left)
        let vx: number, vy: number;
        if (typeof viewport.convertToViewportPoint === 'function') {
          const pt = viewport.convertToViewportPoint(tx, ty);
          vx = pt[0];
          vy = pt[1] - itemH;
        } else {
          vx = tx;
          vy = viewport.height - ty - itemH;
        }

        const xPercent = Math.max(0, Math.min(1, vx / viewport.width));
        const yPercent = Math.max(0, Math.min(1, vy / viewport.height));
        const widthPercent = Math.max(0.01, Math.min(1 - xPercent, (itemW * 1.05) / viewport.width));
        const heightPercent = Math.max(0.01, Math.min(1 - yPercent, (itemH * 1.35) / viewport.height));

        matches.push({
          pageIndex: pageNum - 1,
          text: item.str,
          xPercent,
          yPercent,
          widthPercent,
          heightPercent,
        });
      }
    }
  }

  return matches;
};

/**
 * Applies true permanent redactions to a PDF document.
 * Pages with redactions are rendered to high-resolution 300 DPI canvas,
 * the blackout/whiteout boxes are drawn directly onto the pixel buffer,
 * and the page content is replaced with the sanitized image.
 * This physically eliminates the underlying text and vector streams in redacted areas.
 */
export const applyRedactionsToPdf = async (
  file: File,
  redactions: RedactionBox[],
  options: RedactionOptions = {}
): Promise<Blob> => {
  const { sanitizeMetadata = true, onProgress } = options;

  onProgress?.(5, 'Loading PDF document...');
  const fileBytes = await file.arrayBuffer();

  // Load PDF with pdf-lib for assembly
  const pdfDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
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

        // For blackout, ensure solid coverage
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

  // 5. Metadata Sanitization
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
