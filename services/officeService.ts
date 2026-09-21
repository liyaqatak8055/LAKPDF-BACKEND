import { sanitizeHtml } from './htmlSanitizer';
type DocxElement = any;

// ─── Lazy library singletons ────────────────────────────────────────────────
// Heavy libraries load ONLY when their first function is called.
// This removes ~2.4 MB from the initial bundle and all intermediate route loads.

// --- pdfjs (via pdfService, lazy) ---
let _pdfjs: any = null;
const ensurePdfjs = async () => {
  if (_pdfjs) return _pdfjs;
  const { pdfjs } = await import('./pdfService');
  _pdfjs = pdfjs;
  return _pdfjs;
};

// --- docx ---
let Document: any, Packer: any, Paragraph: any, TextRun: any,
    Table: any, TableRow: any, TableCell: any, PageBreak: any,
    BorderStyle: any, WidthType: any, ImageRun: any, AlignmentType: any, UnderlineType: any,
    VerticalAlign: any;
const ensureDocx = async () => {
  if (Document) return;
  // @ts-ignore
  const m = await import('docx');
  const docx: any = (m as any).default || m;
  ({
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    PageBreak, BorderStyle, WidthType, ImageRun, AlignmentType, UnderlineType,
    VerticalAlign
  } = docx);
};

// --- pptxgenjs ---
let _PptxGenJS: any = null;
const ensurePptx = async () => {
  if (_PptxGenJS) return _PptxGenJS;
  // @ts-ignore
  const m = await import('pptxgenjs');
  _PptxGenJS = (m as any).default || m;
  return _PptxGenJS;
};

// --- mammoth ---
let _mammoth: any = null;
const ensureMammoth = async () => {
  if (_mammoth) return _mammoth;
  // @ts-ignore
  const m = await import('mammoth');
  _mammoth = (m as any).default || m;
  return _mammoth;
};

// --- docx-preview ---
let _docxPreview: any = null;
const ensureDocxPreview = async () => {
  if (_docxPreview) return _docxPreview;
  // @ts-ignore
  const m = await import('docx-preview');
  _docxPreview = (m as any).default || m;
  return _docxPreview;
};

// --- jspdf ---
let _jsPDF: any = null;
const ensureJsPdf = async () => {
  if (_jsPDF) return _jsPDF;
  // @ts-ignore
  const m = await import('jspdf');
  _jsPDF = (m as any).jsPDF || (m as any).default?.jsPDF || (m as any).default;
  return _jsPDF;
};

// --- html2canvas ---
let _html2canvas: any = null;
const ensureHtml2canvas = async () => {
  if (_html2canvas) return _html2canvas;
  // @ts-ignore
  const m = await import('html2canvas');
  _html2canvas = (m as any).default || m;
  return _html2canvas;
};

// --- tesseract.js ---
let _Tesseract: any = null;
const ensureTesseract = async () => {
  if (_Tesseract) return _Tesseract;
  // @ts-ignore
  const m = await import('tesseract.js');
  _Tesseract = (m as any).default || m;
  return _Tesseract;
};

// --- jszip ---
let _JSZip: any = null;
const ensureJsZip = async () => {
  if (_JSZip) return _JSZip;
  const m = await import('jszip');
  _JSZip = (m as any).default || m;
  return _JSZip;
};


// Utility function to convert RGB to hex color
function rgbToHex(r: number, g: number, b: number): string {
  return ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0').toUpperCase();
}

/**
 * Force numeric values to safe integers (MANDATORY)
 */
function safeInt(value: any, fallback: number): number {
  if (value === null || value === undefined) return fallback;
  const n = parseInt(value);
  return Number.isInteger(n) && !isNaN(n) && isFinite(n) ? n : fallback;
}

/**
 * FINAL GUARANTEED NaN-FREE DOCX TEMPLATE
 * Isme NaN possible hi nahi - sab fixed values
 */
function createGuaranteedNaNFreeDocx(text: string, isHeading: boolean = false): Document {
  // Clean and validate text
  const safeText = (text || '').trim();
  if (!safeText) {
    // Return minimal valid document for empty content
    return new Document({
      sections: [{
        properties: {
          page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } }
        },
        children: [new Paragraph({
          children: [new TextRun({ text: 'No content', size: 24, color: '000000' })]
        })]
      }]
    });
  }

  // ✅ GUARANTEED NaN-FREE VALUES
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          // Fixed Word default margins (no NaN possible)
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
        },
      },
      children: [new Paragraph({
        children: [new TextRun({
          text: safeText,
          // Fixed safe values - no variables that could be NaN
          size: isHeading ? 32 : 24,  // 16pt or 12pt - always valid
          bold: isHeading,             // Boolean - always valid
          color: '000000',             // Fixed string - always valid
        })],
        spacing: {
          line: 276,  // Fixed value - always valid
        }
      })]
    }],
  });

  return doc;
}

/**
 * Clean OCR text by fixing common recognition errors
 */
function cleanOcrText(text: string): string {
  return text
    // Fix arrows that OCR often misreads
    .replace(/\s*=>\s*/g, " : ")
    .replace(/\s*->\s*/g, " : ")
    .replace(/\s*=>\s*/g, " : ")
    // Remove excessive line breaks
    .replace(/\n{3,}/g, '\n\n')
    // Fix common OCR character errors
    .replace(/lI/g, 'll')  // Common l/I confusion
    .replace(/II/g, 'll')  // Double I to ll
    .replace(/0O/g, 'OO')  // Zero/O confusion (keep as is for now)
    .replace(/OO/g, 'OO')  // O/O confusion
    // Clean up spacing
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFC');
}

function preprocessCanvasForOcr(source: HTMLCanvasElement): HTMLCanvasElement {
  return preprocessCanvasForOcrWithConfig(source, { contrastBoost: 1.35, thresholdOffset: 0, binarize: true });
}

function preprocessCanvasForOcrWithConfig(
  source: HTMLCanvasElement,
  config: { contrastBoost: number; thresholdOffset: number; binarize: boolean }
): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  if (!ctx) return source;

  ctx.drawImage(source, 0, 0);
  const imageData = ctx.getImageData(0, 0, out.width, out.height);
  const data = imageData.data;

  let totalLuminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    totalLuminance += lum;
  }
  const mean = totalLuminance / (data.length / 4);
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const contrast = (lum - 128) * config.contrastBoost + 128;
    if (config.binarize) {
      const threshold = Math.max(95, Math.min(200, mean + config.thresholdOffset));
      const bin = contrast > threshold ? 255 : 0;
      data[i] = bin;
      data[i + 1] = bin;
      data[i + 2] = bin;
    } else {
      const v = Math.max(0, Math.min(255, Math.round(contrast)));
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    }
    data[i + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
  return out;
}

function applyOcrDomainCorrections(
  text: string,
  preset: 'general' | 'ticket' | 'invoice' | 'form' = 'general',
  language: 'eng' | 'hin' | 'eng+hin' = 'eng'
): string {
  if (!text) return text;
  const isHindiPrimary = language === 'hin';
  const common: Array<[RegExp, string]> = [
    [/\s{2,}/g, ' '],
    [/[\[\]{}]{2,}/g, ''],
    [/\s+([,.:;!?])/g, '$1'],
    [/([0-9])\s+([0-9])/g, '$1$2'],
  ];
  const ticketAndInvoice: Array<[RegExp, string]> = [
    [/\bIRCTC\b/gi, 'IRCTC'],
    [/\bPNR\b/gi, 'PNR'],
    [/\bANVT\b/gi, 'ANVT'],
    [/\bSLEE[P8]ER\b/gi, 'SLEEPER'],
    [/\bCLA[5S]{1,2}\b/gi, 'CLASS'],
    [/\bTRM\b/gi, 'TRM'],
    [/\bWL\/?(\d+)/gi, 'WL/$1'],
    [/\bSL\/?(\d+)/gi, 'SL/$1'],
    [/\bGEN[EF]RAL\b/gi, 'GENERAL'],
    [/\bPASSENGER\s+DETAILS\b/gi, 'Passenger Details'],
    [/\bBOOKED\s+FROM\b/gi, 'Booked From'],
    [/\bBOARDING\s+AT\b/gi, 'Boarding At'],
    [/\bBOOKING\s+DATE\b/gi, 'Booking Date'],
    [/\bPAYMENT\s+DETAILS\b/gi, 'Payment Details'],
    [/\bTRAIN\s+NO\.?\/?NAM[E3]\b/gi, 'Train No./Name'],
    [/₹\s*([0-9]),([0-9]{3})/g, '₹ $1,$2'],
  ];
  const formSpecific: Array<[RegExp, string]> = [
    [/\bDOB\b/gi, 'DOB'],
    [/\bAADHAR\b/gi, 'AADHAR'],
    [/\bADDRESS\b/gi, 'Address'],
  ];

  const replacements = [
    ...common,
    ...(!isHindiPrimary && (preset === 'ticket' || preset === 'invoice') ? ticketAndInvoice : []),
    ...(preset === 'form' ? formSpecific : [])
  ];

  let normalized = text;
  replacements.forEach(([pattern, value]) => {
    normalized = normalized.replace(pattern, value);
  });
  return normalized.trim();
}

function cleanOcrTextAdvanced(
  text: string,
  preset: 'general' | 'ticket' | 'invoice' | 'form' = 'general',
  language: 'eng' | 'hin' | 'eng+hin' = 'eng'
): string {
  const cleaned = cleanOcrText(text)
    .replace(/[¦|]{2,}/g, '|')
    .replace(/([A-Za-z])\s*-\s*([A-Za-z])/g, '$1$2');
  return applyOcrDomainCorrections(cleaned, preset, language);
}

export interface PdfScriptProfile {
  hasHindiScript: boolean;
  suspectedLegacyFont: boolean;
  forceOcr: boolean;
  recommendedLanguage: 'eng' | 'hin' | 'eng+hin';
  readabilityScore: number;
  reason: string;
}

function calculateHindiReadabilityScore(text: string): number {
  const sample = (text || '').trim();
  if (!sample) return 0;

  const devanagariChars = (sample.match(/[\u0900-\u097F]/g) || []).length;
  const latinChars = (sample.match(/[A-Za-z]/g) || []).length;
  const symbols = (sample.match(/[^A-Za-z0-9\u0900-\u097F\s.,:;!?()/\-]/g) || []).length;
  const tokens = sample.split(/\s+/).filter(Boolean);
  const devTokens = tokens.filter((t) => /[\u0900-\u097F]/.test(t));
  const cleanDevTokens = devTokens.filter((t) => /^[\u0900-\u097F]+$/.test(t));

  const scriptPurity = devanagariChars / Math.max(1, devanagariChars + latinChars + symbols);
  const tokenPurity = cleanDevTokens.length / Math.max(1, devTokens.length);
  const symbolPenalty = Math.min(1, symbols / Math.max(1, sample.length * 0.25));

  const base = (scriptPurity * 0.55) + (tokenPurity * 0.45);
  return Math.max(0, Math.min(1, base - symbolPenalty * 0.35));
}

// --- PDF Type Detection ---

export const detectPdfType = async (file: File): Promise<'text' | 'scanned'> => {
  const pdfjs = await ensurePdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  // Sample first page to check for text content
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();

  // If we have substantial text content, it's likely a text-based PDF
  const textItems = textContent.items.filter((item: any) =>
    item.str && item.str.trim().length > 0
  );

  // If more than 10 text items or significant text length, consider it text-based
  const totalTextLength = textItems.reduce((sum: number, item: any) =>
    sum + item.str.length, 0
  );

  if (textItems.length > 10 || totalTextLength > 200) {
    return 'text';
  }

  // For PDFs with very little text, check if they contain images
  // This is a heuristic - scanned PDFs usually have images but minimal text
  return 'scanned';
};

export const detectPdfScriptProfile = async (file: File): Promise<PdfScriptProfile> => {
  const pdfjs = await ensurePdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pagesToCheck = Math.min(3, pdf.numPages);
  let mergedText = '';
  const fontHints = new Set<string>();

  for (let i = 1; i <= pagesToCheck; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    mergedText += ` ${items.map((item) => item?.str || '').join(' ')}`.slice(0, 8000);
    const styles = (textContent as any).styles || {};
    Object.entries(styles).forEach(([fontKey, style]: [string, any]) => {
      const family = String(style?.fontFamily || '');
      fontHints.add(`${fontKey} ${family}`.toLowerCase());
    });
  }

  const hasHindiScript = /[\u0900-\u097F]/.test(mergedText);
  const readabilityScore = hasHindiScript ? calculateHindiReadabilityScore(mergedText) : 0;
  const legacyFontMatch = Array.from(fontHints).some((name) =>
    /(kruti|krutidev|devlys|chanakya|shree|k010|k020|legacy)/i.test(name)
  );
  const legacyTokenMatch = /\b(vk|dks|gS|esa|fd|izfr|vkbZ|;g)\b/i.test(mergedText);
  const suspiciousGlyphRatio = (() => {
    const suspectChars = mergedText.match(/[{}[\]|~`^_]/g)?.length || 0;
    const letters = mergedText.match(/[A-Za-z\u0900-\u097F]/g)?.length || 1;
    return suspectChars / letters;
  })();
  const suspectedLegacyFont = legacyFontMatch || (!hasHindiScript && legacyTokenMatch) || suspiciousGlyphRatio > 0.18;

  if (hasHindiScript) {
    const shouldForceOcr = readabilityScore < 0.6 || suspectedLegacyFont;
    return {
      hasHindiScript: true,
      suspectedLegacyFont,
      forceOcr: shouldForceOcr,
      recommendedLanguage: 'hin',
      readabilityScore,
      reason: shouldForceOcr
        ? `Hindi detected but readability low (${readabilityScore.toFixed(2)}). Forcing OCR with Hindi traineddata.`
        : `Hindi detected with readability ${readabilityScore.toFixed(2)}.`
    };
  }

  if (suspectedLegacyFont) {
    return {
      hasHindiScript: false,
      suspectedLegacyFont: true,
      forceOcr: true,
      recommendedLanguage: 'eng+hin',
      readabilityScore: 0,
      reason: 'Legacy non-Unicode font pattern detected. Forcing OCR mode.'
    };
  }

  return {
    hasHindiScript: false,
    suspectedLegacyFont: false,
    forceOcr: false,
    recommendedLanguage: 'eng',
    readabilityScore: 1,
    reason: 'No Hindi/non-Unicode pattern detected.'
  };
};

// --- PDF to Office Converters ---

// Helper: Convert raw PDF.js image object to PNG bytes
async function convertPdfImageToPng(imgObj: any): Promise<Uint8Array | null> {
  if (!imgObj) return null;
  const w = imgObj.width;
  const h = imgObj.height;
  if (!w || !h || w <= 0 || h <= 0) return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (typeof HTMLImageElement !== 'undefined' && imgObj instanceof HTMLImageElement) {
      ctx.drawImage(imgObj, 0, 0);
    } else if (typeof HTMLCanvasElement !== 'undefined' && imgObj instanceof HTMLCanvasElement) {
      ctx.drawImage(imgObj, 0, 0);
    } else if (typeof ImageBitmap !== 'undefined' && imgObj instanceof ImageBitmap) {
      ctx.drawImage(imgObj, 0, 0);
    } else if (imgObj.bitmap && typeof ctx.drawImage === 'function') {
      ctx.drawImage(imgObj.bitmap, 0, 0);
    } else if (imgObj.data) {
      const imgDataArr = imgObj.data;
      const imgData = ctx.createImageData(w, h);
      const smaskArr = imgObj.smask?.data;

      if (imgDataArr.length === w * h * 4) {
        imgData.data.set(imgDataArr);
        if (smaskArr && smaskArr.length >= w * h) {
          for (let i = 0; i < w * h; i++) {
            imgData.data[i * 4 + 3] = smaskArr[i];
          }
        }
      } else if (imgDataArr.length === w * h * 3) {
        let src = 0;
        let dst = 0;
        for (let i = 0; i < w * h; i++) {
          imgData.data[dst] = imgDataArr[src];
          imgData.data[dst + 1] = imgDataArr[src + 1];
          imgData.data[dst + 2] = imgDataArr[src + 2];
          imgData.data[dst + 3] = (smaskArr && smaskArr[i] !== undefined) ? smaskArr[i] : 255;
          src += 3;
          dst += 4;
        }
      } else if (imgDataArr.length === w * h) {
        let dst = 0;
        for (let i = 0; i < w * h; i++) {
          const v = imgDataArr[i];
          imgData.data[dst] = v;
          imgData.data[dst + 1] = v;
          imgData.data[dst + 2] = v;
          imgData.data[dst + 3] = (smaskArr && smaskArr[i] !== undefined) ? smaskArr[i] : 255;
          dst += 4;
        }
      } else {
        return null;
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      return null;
    }

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return null;
    const buffer = await blob.arrayBuffer();
    return new Uint8Array(buffer);
  } catch (err) {
    console.warn('convertPdfImageToPng failed:', err);
    return null;
  }
}

interface ExtractedPdfImage {
  bytes: Uint8Array;
  x: number;
  y: number; // in PDF points from top of page
  width: number;
  height: number;
}

// Helper: Extract all embedded raster images (logos, stamps, signatures) from PDF page
async function extractImagesFromPdfPage(
  page: any,
  pageWidth: number,
  pageHeight: number,
  pdfjs: any
): Promise<ExtractedPdfImage[]> {
  const extracted: ExtractedPdfImage[] = [];
  try {
    const operatorList = await page.getOperatorList();
    const fnArray = operatorList.fnArray || [];
    const argsArray = operatorList.argsArray || [];

    const OPS = pdfjs?.OPS || (typeof window !== 'undefined' && (window as any).pdfjsLib?.OPS) || {};
    const opSave = OPS.save ?? 10;
    const opRestore = OPS.restore ?? 11;
    const opTransform = OPS.transform ?? 12;
    const opPaintImage = OPS.paintImageXObject ?? 85;
    const opPaintInline = OPS.paintInlineImageXObject ?? 86;
    const opPaintMask = OPS.paintImageMaskXObject ?? 83;

    const matrixStack: number[][] = [];
    let currentMatrix = [1, 0, 0, 1, 0, 0];

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      if (fn === opSave) {
        matrixStack.push([...currentMatrix]);
      } else if (fn === opRestore) {
        if (matrixStack.length > 0) {
          currentMatrix = matrixStack.pop()!;
        }
      } else if (fn === opTransform && Array.isArray(args) && args.length >= 6) {
        const [a1, b1, c1, d1, e1, f1] = currentMatrix;
        const [a2, b2, c2, d2, e2, f2] = args;
        currentMatrix = [
          a1 * a2 + c1 * b2,
          b1 * a2 + d1 * b2,
          a1 * c2 + c1 * d2,
          b1 * c2 + d1 * d2,
          a1 * e2 + c1 * f2 + e1,
          b1 * e2 + d1 * f2 + f1,
        ];
      } else if (fn === opPaintImage || fn === opPaintInline || fn === opPaintMask) {
        const objId = args ? args[0] : null;
        if (!objId || typeof objId !== 'string') continue;

        const scaleX = Math.abs(currentMatrix[0]) || 1;
        const scaleY = Math.abs(currentMatrix[3]) || 1;
        const x = currentMatrix[4] || 0;
        const yBottom = currentMatrix[5] || 0;
        const yTop = pageHeight - yBottom - scaleY;

        // Skip full-page background scanned images (they are not logos or stamps!)
        if (scaleX >= pageWidth * 0.70 && scaleY >= pageHeight * 0.70) {
          continue;
        }

        const imgObj = await new Promise<any>((resolve) => {
          try {
            const pool = (objId.startsWith('g_') && page.commonObjs) ? page.commonObjs : page.objs;
            if (pool) {
              if (typeof pool.has === 'function' && pool.has(objId)) {
                resolve(pool.get(objId));
              } else {
                let resolved = false;
                pool.get(objId, (obj: any) => {
                  if (!resolved) {
                    resolved = true;
                    resolve(obj);
                  }
                });
                setTimeout(() => {
                  if (!resolved) {
                    resolved = true;
                    resolve(null);
                  }
                }, 1200);
              }
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });

        if (imgObj) {
          const pngBytes = await convertPdfImageToPng(imgObj);
          if (pngBytes && pngBytes.length > 0) {
            extracted.push({
              bytes: pngBytes,
              x: Math.max(0, x),
              y: Math.max(0, yTop),
              width: Math.max(10, Math.min(pageWidth, scaleX)),
              height: Math.max(10, Math.min(pageHeight, scaleY)),
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('extractImagesFromPdfPage failed:', err);
  }

  return extracted.sort((a, b) => a.y - b.y);
}

// Check if canvas has non-white graphic content (e.g. stamp, signature, logo)
function hasGraphicContent(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  width: number,
  height: number,
  scale: number = 2.0
): boolean {
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const sx = Math.max(0, Math.round(x * scale));
    const sy = Math.max(0, Math.round(y * scale));
    const sw = Math.min(canvas.width - sx, Math.round(width * scale));
    const sh = Math.min(canvas.height - sy, Math.round(height * scale));
    if (sw <= 0 || sh <= 0) return false;

    const imgData = ctx.getImageData(sx, sy, sw, sh);
    const data = imgData.data;
    let nonWhitePixels = 0;
    for (let i = 0; i < data.length; i += 16) {
      const a = data[i + 3];
      if (a > 30) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (r < 235 || g < 235 || b < 235) {
          nonWhitePixels++;
          if (nonWhitePixels > 20) return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Helper: Crop a region from a rendered canvas to PNG bytes
async function cropCanvasToPng(
  sourceCanvas: HTMLCanvasElement,
  x: number, // in PDF points (scale 1.0)
  y: number, // in PDF points from top (scale 1.0)
  width: number,
  height: number,
  scale: number = 2.0
): Promise<Uint8Array | null> {
  try {
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = Math.max(1, Math.round(width * scale));
    cropCanvas.height = Math.max(1, Math.round(height * scale));
    const cropCtx = cropCanvas.getContext('2d');
    if (!cropCtx) return null;

    cropCtx.drawImage(
      sourceCanvas,
      Math.round(x * scale),
      Math.round(y * scale),
      Math.round(width * scale),
      Math.round(height * scale),
      0,
      0,
      cropCanvas.width,
      cropCanvas.height
    );

    const blob = await new Promise<Blob | null>((resolve) => {
      cropCanvas.toBlob(resolve, 'image/png');
    });
    if (!blob) return null;
    const buf = await blob.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    console.warn('cropCanvasToPng failed:', err);
    return null;
  }
}

// --- PDF to Office Converters ---

export const convertPdfToWord = async (
  file: File,
  options: {
    method?: 'auto' | 'text' | 'ocr';
    ocrLanguage?: 'eng' | 'hin' | 'eng+hin';
    preserveLayout?: boolean;
    onProgress?: (current: number, total: number, msg?: string) => void;
  } = { method: 'auto' }
): Promise<Blob> => {
  await ensureDocx();
  const pdfjs = await ensurePdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const documentChildren: DocxElement[] = [];

  const noBorder = { style: BorderStyle?.NONE || 'none', size: 0, color: 'auto' };

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    if (options.onProgress) {
      options.onProgress(pageNum, pdf.numPages, `Analyzing layout & images on page ${pageNum} of ${pdf.numPages}...`);
    }

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });
    const pageWidth = viewport.width || 595;
    const pageHeight = viewport.height || 842;

    // Render high-resolution page canvas for pristine logo & stamp cropping
    const scale = 2.0;
    const pageCanvas = document.createElement('canvas');
    const pageViewport = page.getViewport({ scale });
    pageCanvas.width = pageViewport.width;
    pageCanvas.height = pageViewport.height;
    const pageCtx = pageCanvas.getContext('2d');
    if (pageCtx) {
      pageCtx.fillStyle = '#FFFFFF';
      pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      await page.render({ canvasContext: pageCtx, viewport: pageViewport }).promise;
    }

    // 1. Extract embedded raster images (logos, company stamps, digital signatures)
    const images = await extractImagesFromPdfPage(page, pageWidth, pageHeight, pdfjs);

    // 2. Extract digital text items
    const textContent = await page.getTextContent({ normalizeWhitespace: true });
    const rawItems = (textContent.items || []).filter(
      (it: any) => it && typeof it.str === 'string' && it.str.length > 0
    );
    const hasDigitalText = rawItems.some((it: any) => it.str.trim().length > 0);

    if (hasDigitalText) {
      // Map text items into page coordinates (Y measured from top of page)
      const textItems = rawItems.map((it: any) => {
        const transform = it.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4] || 0;
        const yBottom = transform[5] || 0;
        const height = Math.abs(it.height || transform[3] || 12);
        const width = it.width || Math.max(1, it.str.length * height * 0.52);
        const yFromTop = pageHeight - yBottom;
        const fontName = String(it.fontName || '').toLowerCase();
        const isBold = /bold|black|heavy|medium|b800|b900|semibold|demi/i.test(fontName) || (height >= 14 && it.str.length > 3);
        const isItalic = /italic|oblique/i.test(fontName);

        return {
          str: it.str,
          x: Math.max(0, x),
          y: Math.max(0, yFromTop),
          width,
          height,
          fontSize: Math.round(height),
          isBold,
          isItalic,
          fontName,
        };
      });

      // Pre-calculate header threshold and signoff/signer boundaries for accurate item classification
      const titleCandidate = textItems.find((it) =>
        /^(TO\s+WHOM\s+IT\s+MAY\s+CONCERN|CERTIFICATE|EXPERIENCE\s+CERTIFICATE|APPOINTMENT\s+LETTER|RELIEVING\s+LETTER|MEMORANDUM|INVOICE)$/i.test(it.str.trim())
      );
      const headerThresholdY = titleCandidate ? titleCandidate.y - 8 : pageHeight * 0.28;

      const signoffItem = textItems.find((it) =>
        /^For\s+|^Sincerely|^Yours\s+faithfully|^Authorized\s+Signatory/i.test(it.str.trim())
      );
      const signoffY = signoffItem ? signoffItem.y : -1;
      const signerItem = textItems.find(
        (it) => signoffY !== -1 && it.y > signoffY + 120 && /^[A-Z][a-z]+\s+[A-Z][a-z]+/i.test(it.str.trim())
      );
      const signerY = signerItem ? signerItem.y : (signoffY !== -1 ? signoffY + 220 : -1);

      // Filter logos vs stamps
      const isValidLogoImage = (img: ExtractedPdfImage) =>
        img.width >= 50 && img.height >= 20 && (img.width * img.height) >= 1500;

      const topImages = images.filter((img) => img.y < pageHeight * 0.35 && isValidLogoImage(img));
      const bottomImages = images.filter((img) => img.y >= pageHeight * 0.48);

      const filteredItems = textItems.filter((it: any) => {
        const clean = it.str.trim();
        if (!clean) return false;

        // 1. Drop duplicate 'PROJECTS' in header (it's already part of the ESSAR PROJECTS logo crop)
        if (clean.toUpperCase() === 'PROJECTS' && it.x > pageWidth * 0.45 && it.y < headerThresholdY) {
          return false;
        }

        // 2. Drop OCR noise artifacts between signoff line and signer line (inside stamp region)
        if (signoffY !== -1 && signerY !== -1 && it.y > signoffY + 15 && it.y < signerY - 10) {
          return false;
        }

        return true;
      });

      // Group items into horizontal line buckets
      type LineBucket = {
        avgY: number;
        height: number;
        items: typeof filteredItems;
      };
      const lineBuckets: LineBucket[] = [];
      const sortedItems = [...filteredItems].sort((a, b) => a.y - b.y);

      sortedItems.forEach((item) => {
        const tolerance = Math.max(4.0, item.height * 0.50);
        const bucket = lineBuckets.find((b) => Math.abs(b.avgY - item.y) <= tolerance);
        if (bucket) {
          bucket.items.push(item);
          bucket.avgY = bucket.items.reduce((s, it) => s + it.y, 0) / bucket.items.length;
          bucket.height = Math.max(bucket.height, item.height);
        } else {
          lineBuckets.push({
            avgY: item.y,
            height: item.height,
            items: [item],
          });
        }
      });

      lineBuckets.sort((a, b) => a.avgY - b.avgY);
      lineBuckets.forEach((b) => b.items.sort((a, b) => a.x - b.x));

      // --- SECTION 1: HEADER & TWO-COLUMN METADATA ---
      const headerBuckets = lineBuckets.filter((b) => b.avgY <= headerThresholdY);
      const remainingBuckets = lineBuckets.filter((b) => b.avgY > headerThresholdY);

      const hasLeftCol = headerBuckets.some((b) => b.items.some((it) => it.x < pageWidth * 0.45));
      const hasRightCol = headerBuckets.some((b) => b.items.some((it) => it.x >= pageWidth * 0.45));
      const isTwoColumnHeader = hasLeftCol && hasRightCol && headerBuckets.length >= 2;

      if (isTwoColumnHeader) {
        const leftParagraphs: any[] = [];
        const rightParagraphs: any[] = [];

        // Top right logo
        const topRightLogo = topImages.find((img) => img.x >= pageWidth * 0.40);
        const topLeftLogo = topImages.find((img) => img.x < pageWidth * 0.40 && isValidLogoImage(img));

        if (topLeftLogo && ImageRun) {
          const w = Math.min(200, Math.round(topLeftLogo.width));
          const h = Math.min(75, Math.round(topLeftLogo.height));
          leftParagraphs.push(
            new Paragraph({
              children: [new ImageRun({ data: topLeftLogo.bytes, transformation: { width: w, height: h } })],
              spacing: { after: 100 },
            })
          );
        }

        if (topRightLogo && ImageRun) {
          let logoBytes = topRightLogo.bytes;
          let w = Math.min(220, Math.round(topRightLogo.width));
          let h = Math.min(80, Math.round(topRightLogo.height));

          if (pageCanvas) {
            const cropX = Math.max(0, topRightLogo.x - 8);
            const cropY = Math.max(0, topRightLogo.y - 8);
            const cropW = Math.min(pageWidth - cropX, topRightLogo.width + 16);
            const cropH = Math.min(pageHeight - cropY, topRightLogo.height + 36);
            const crop = await cropCanvasToPng(pageCanvas, cropX, cropY, cropW, cropH, scale);
            if (crop && crop.length > 0) {
              logoBytes = crop;
              w = Math.min(240, Math.round(cropW));
              h = Math.min(95, Math.round(cropH));
            }
          }

          rightParagraphs.push(
            new Paragraph({
              alignment: AlignmentType?.RIGHT || 'right',
              children: [new ImageRun({ data: logoBytes, transformation: { width: w, height: h } })],
              spacing: { after: 100 },
            })
          );
        }

        headerBuckets.forEach((bucket) => {
          const leftItems = bucket.items.filter((it) => it.x < pageWidth * 0.45);
          const rightItems = bucket.items.filter((it) => it.x >= pageWidth * 0.45);

          if (leftItems.length > 0) {
            const runs = leftItems.map((it, idx) => {
              const sp = idx > 0 ? ' ' : '';
              return new TextRun({
                text: `${sp}${it.str.trim()}`,
                bold: it.isBold,
                size: 20, // 10pt
                font: 'Calibri',
                color: '1F2937',
              });
            });
            leftParagraphs.push(new Paragraph({ children: runs, spacing: { after: 40, line: 240 } }));
          }

          if (rightItems.length > 0) {
            const runs = rightItems.map((it, idx) => {
              const sp = idx > 0 ? ' ' : '';
              return new TextRun({
                text: `${sp}${it.str.trim()}`,
                bold: it.isBold,
                size: 19, // 9.5pt
                font: 'Calibri',
                color: '374151',
              });
            });
            rightParagraphs.push(
              new Paragraph({
                alignment: AlignmentType?.RIGHT || 'right',
                children: runs,
                spacing: { after: 30, line: 230 },
              })
            );
          }
        });

        // Add borderless 2-column header table with bottom vertical alignment on left cell
        documentChildren.push(
          new Table({
            width: { size: 100, type: WidthType?.PERCENTAGE || 'pct' },
            borders: {
              top: noBorder,
              bottom: noBorder,
              left: noBorder,
              right: noBorder,
              insideHorizontal: noBorder,
              insideVertical: noBorder,
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 48, type: WidthType?.PERCENTAGE || 'pct' },
                    verticalAlign: VerticalAlign?.BOTTOM || 'bottom',
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                    children: leftParagraphs.length > 0 ? leftParagraphs : [new Paragraph({ children: [new TextRun({ text: '' })] })],
                  }),
                  new TableCell({
                    width: { size: 52, type: WidthType?.PERCENTAGE || 'pct' },
                    borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder },
                    children: rightParagraphs.length > 0 ? rightParagraphs : [new Paragraph({ children: [new TextRun({ text: '' })] })],
                  }),
                ],
              }),
            ],
          })
        );

        // Gap after header
        documentChildren.push(new Paragraph({ spacing: { after: 220 }, children: [new TextRun({ text: '' })] }));
      } else {
        // If single top logo exists
        if (topImages.length > 0 && ImageRun) {
          topImages.forEach((logo) => {
            const isRight = logo.x > pageWidth * 0.45;
            const w = Math.min(220, Math.round(logo.width));
            const h = Math.min(80, Math.round(logo.height));
            documentChildren.push(
              new Paragraph({
                alignment: isRight ? (AlignmentType?.RIGHT || 'right') : (AlignmentType?.LEFT || 'left'),
                children: [new ImageRun({ data: logo.bytes, transformation: { width: w, height: h } })],
                spacing: { after: 140 },
              })
            );
          });
        }
      }

      // --- SECTION 2: BODY LINES, TITLES, PARAGRAPHS & TABLES ---
      const linesToProcess = isTwoColumnHeader ? remainingBuckets : lineBuckets;

      // Table row collector
      let tableBuffer: string[][] = [];
      const flushTableBuffer = () => {
        if (tableBuffer.length >= 2) {
          const normalized = normalizeTableRows(tableBuffer);
          if (normalized.length >= 2) {
            documentChildren.push(createProfessionalTable(normalized));
          } else {
            tableBuffer.forEach((row) => {
              documentChildren.push(createBodyParagraph(row.join('    '), 'normalPara'));
            });
          }
        } else if (tableBuffer.length === 1) {
          documentChildren.push(createBodyParagraph(tableBuffer[0].join('    '), 'normalPara'));
        }
        tableBuffer = [];
      };

      // Flowing paragraph collector
      let bodyRunBuffer: any[] = [];
      const flushBodyParagraph = (align: string = 'left') => {
        if (bodyRunBuffer.length > 0) {
          documentChildren.push(
            new Paragraph({
              alignment: align === 'center' ? (AlignmentType?.CENTER || 'center') : (AlignmentType?.LEFT || 'left'),
              children: [...bodyRunBuffer],
              spacing: { after: 160, line: 276 },
            })
          );
          bodyRunBuffer = [];
        }
      };

      // Identify signoff starting point (e.g. "For Essar Projects", "Sincerely", "Regards")
      let insideSignoffSection = false;

      for (let bIdx = 0; bIdx < linesToProcess.length; bIdx++) {
        const bucket = linesToProcess[bIdx];
        const lineText = bucket.items.map((it) => it.str).join(' ').trim();
        if (!lineText) continue;

        // Only treat as table line if items have genuine multi-column horizontal spacing (> 35pt gap)
        let isRealTableLine = false;
        const cells = bucket.items.map((it) => it.str.trim()).filter(Boolean);
        if (bucket.items.length >= 2) {
          let colGaps = 0;
          for (let i = 1; i < bucket.items.length; i++) {
            const gap = bucket.items[i].x - (bucket.items[i - 1].x + bucket.items[i - 1].width);
            if (gap > 35) colGaps++;
          }
          if (colGaps >= 1 && shouldTreatAsTableLine(cells)) {
            isRealTableLine = true;
          }
        }

        if (isRealTableLine) {
          flushBodyParagraph();
          tableBuffer.push(cells);
          continue;
        }
        flushTableBuffer();

        // 1. Centered Document Title detection (ONLY exact match or short centered non-sentence heading)
        const minX = Math.min(...bucket.items.map((it) => it.x));
        const maxX = Math.max(...bucket.items.map((it) => it.x + it.width));
        const lineCenter = (minX + maxX) / 2;
        const isCenteredLine = Math.abs(lineCenter - pageWidth / 2) < pageWidth * 0.16;

        const trimmedLine = lineText.trim();
        const isExactTitle = /^(TO\s+WHOM\s+IT\s+MAY\s+CONCERN|CERTIFICATE|EXPERIENCE\s+CERTIFICATE|APPOINTMENT\s+LETTER|RELIEVING\s+LETTER|MEMORANDUM|INVOICE)$/i.test(trimmedLine);
        const isCenteredHeading =
          isCenteredLine &&
          trimmedLine.length < 40 &&
          (bucket.height >= 14 || bucket.items.every((it) => it.isBold)) &&
          !/[.,;!?]$/.test(trimmedLine);

        if (isExactTitle || isCenteredHeading) {
          flushBodyParagraph();
          documentChildren.push(
            new Paragraph({
              alignment: AlignmentType?.CENTER || 'center',
              spacing: { before: 260, after: 220 },
              children: [
                new TextRun({
                  text: trimmedLine,
                  bold: true,
                  size: 24, // 12pt
                  font: 'Calibri',
                  underline: { type: UnderlineType?.SINGLE || 'single' },
                  color: '111827',
                }),
              ],
            })
          );
          continue;
        }

        // 2. Signoff detection (e.g. "For Essar Projects", "Sincerely", "Yours faithfully")
        if (/^For\s+|^Sincerely|^Yours\s+faithfully|^Authorized\s+Signatory|^With\s+regards|^Regards/i.test(lineText)) {
          flushBodyParagraph();
          insideSignoffSection = true;
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: lineText,
                  bold: true,
                  size: 22,
                  font: 'Calibri',
                  color: '111827',
                }),
              ],
              spacing: { before: 200, after: 60 },
            })
          );

          // Embed high-res intact composite stamp + signature from pageCanvas
          if (pageCanvas && ImageRun) {
            const cropX = 60;
            const cropY = bucket.avgY + bucket.height + 2;
            const nextBucket = linesToProcess[bIdx + 1];
            const cropH = nextBucket ? Math.max(60, nextBucket.avgY - cropY - 18) : 145;
            const cropW = Math.min(160, pageWidth * 0.45);

            if (hasGraphicContent(pageCanvas, cropX, cropY, cropW, cropH, scale)) {
              const compositeBytes = await cropCanvasToPng(pageCanvas, cropX, cropY, cropW, cropH, scale);
              if (compositeBytes && compositeBytes.length > 0) {
                const w = Math.min(160, Math.round(cropW));
                const h = Math.min(145, Math.round(cropH));
                documentChildren.push(
                  new Paragraph({
                    children: [
                      new ImageRun({
                        data: compositeBytes,
                        transformation: { width: w, height: h },
                      }),
                    ],
                    spacing: { before: 60, after: 60 },
                  })
                );
              }
            }
          }
          continue;
        }

        // 3. Post-signoff lines (e.g. "Suresh Jain", "Hr Manager")
        if (insideSignoffSection) {
          documentChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: lineText,
                  bold: true,
                  size: 22,
                  font: 'Calibri',
                  color: '1F2937',
                }),
              ],
              spacing: { after: 30, line: 240 },
            })
          );
          continue;
        }

        // 4. Standard body line formatting with inline bold preserved and sub-pixel letter merging
        bucket.items.forEach((it, itIdx) => {
          const prevItem = itIdx > 0 ? bucket.items[itIdx - 1] : null;
          let needSpace = false;
          if (prevItem) {
            const gap = it.x - (prevItem.x + prevItem.width);
            needSpace = gap > 2.5;
          } else if (bodyRunBuffer.length > 0) {
            needSpace = true;
          }

          const sp = needSpace ? ' ' : '';
          bodyRunBuffer.push(
            new TextRun({
              text: `${sp}${it.str.trim()}`,
              bold: it.isBold,
              italics: it.isItalic,
              size: Math.max(20, Math.min(26, it.fontSize * 2)),
              font: 'Calibri',
              color: '1F2937',
            })
          );
        });

        // Determine paragraph break: line ends with punctuation or large vertical gap to next line
        const endsWithPunc = /[.!?:;]$/.test(lineText.trim());
        const nextBucket = linesToProcess[bIdx + 1];
        const lineGap = nextBucket ? (nextBucket.avgY - bucket.avgY) : 999;
        const isParagraphBreak = lineGap > 22 || (endsWithPunc && lineGap > 18);

        if (isParagraphBreak) {
          flushBodyParagraph();
        }
      }

      flushTableBuffer();
      flushBodyParagraph();

      // If bottom images were not placed in signoff section, append composite crop
      if (!insideSignoffSection && bottomImages.length > 0 && pageCanvas && ImageRun) {
        const minX = Math.min(...bottomImages.map((img) => img.x));
        const maxX = Math.max(...bottomImages.map((img) => img.x + img.width));
        const minY = Math.min(...bottomImages.map((img) => img.y));
        const maxY = Math.max(...bottomImages.map((img) => img.y + img.height));

        const cropX = Math.max(0, minX - 10);
        const cropY = Math.max(0, minY - 10);
        const cropW = Math.min(pageWidth - cropX, (maxX - minX) + 20);
        const cropH = Math.min(pageHeight - cropY, (maxY - minY) + 20);

        const compositeBytes = await cropCanvasToPng(pageCanvas, cropX, cropY, cropW, cropH, scale);
        if (compositeBytes && compositeBytes.length > 0) {
          const w = Math.min(240, Math.round(cropW));
          const h = Math.min(140, Math.round(cropH));
          documentChildren.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: compositeBytes,
                  transformation: { width: w, height: h },
                }),
              ],
              spacing: { before: 120, after: 120 },
            })
          );
        }
      }
    } else {
      // Scanned document or image-only page: accurate OCR fallback
      try {
        if (options.onProgress) {
          options.onProgress(pageNum, pdf.numPages, `Running accurate OCR on scanned page ${pageNum}...`);
        }
        const tesseract = await ensureTesseract();
        const worker = await tesseract.createWorker('eng');
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width * 2);
        canvas.height = Math.round(viewport.height * 2);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: ctx, viewport: page.getViewport({ scale: 2.0 }) }).promise;
          const imgBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (imgBlob) {
            const result = await worker.recognize(imgBlob);
            const lines = result?.data?.lines || [];
            lines.forEach((l: any) => {
              const txt = (l.text || '').trim();
              if (txt) {
                const isHeading = detectHeadingFromText(txt);
                if (isHeading) {
                  documentChildren.push(createProfessionalHeading(txt, 2));
                } else {
                  documentChildren.push(
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: txt,
                          size: 22,
                          font: 'Calibri',
                          color: '1F2937',
                        }),
                      ],
                      spacing: { after: 120, line: 276 },
                    })
                  );
                }
              }
            });
          }
        }
        await worker.terminate();
      } catch (ocrErr) {
        console.warn(`OCR fallback skipped on page ${pageNum}:`, ocrErr);
      }
    }

    // Add clean native Word page break between pages
    if (pageNum < pdf.numPages && PageBreak) {
      documentChildren.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }
  }

  const doc = new Document({
    title: file.name.replace(/\.pdf$/i, ''),
    creator: 'LAK PDF',
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 22, color: '1F2937' },
        },
      },
      paragraphStyles: [
        {
          id: 'normalPara',
          name: 'Normal Para',
          run: { font: 'Calibri', size: 22 },
          paragraph: { spacing: { line: 276, after: 140 } },
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1080,    // 0.75 inch in twips
              right: 1080,
              bottom: 1080,
              left: 1080,
            },
          },
        },
        children:
          documentChildren.length > 0
            ? documentChildren
            : [
                new Paragraph({
                  children: [new TextRun({ text: 'Document converted successfully.', size: 22, font: 'Calibri' })],
                }),
              ],
      },
    ],
  });

  const rawBlob = await Packer.toBlob(doc);
  return new Blob([rawBlob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
};

// Accurate PDF to Word conversion with proper text structure preservation
export const convertPdfToWordOCR = async (
  file: File,
  language: 'eng' | 'hin' | 'eng+hin' = 'eng',
  options: {
    preserveLayout?: boolean;
    pages?: number[]; // 1-based page numbers
    onProgress?: (current: number, total: number) => void;
    forceOcr?: boolean;
    ocrStrength?: 'fast' | 'balanced' | 'accurate';
    preset?: 'general' | 'ticket' | 'invoice' | 'form';
    includeReviewSection?: boolean;
  } = {}
): Promise<Blob> => {
  await ensureDocx();
  const pdfjs = await ensurePdfjs();
  console.log('Starting accurate PDF to Word conversion for:', file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    const documentChildren: DocxElement[] = [];
    const preserveLayout = options.preserveLayout ?? true;
    const forceOcr = options.forceOcr ?? false;
    const ocrStrength = options.ocrStrength ?? 'balanced';
    const preset = options.preset ?? 'general';
    const includeReviewSection = options.includeReviewSection ?? true;
    const lowConfidenceTokens: Array<{ page: number; text: string; confidence: number }> = [];
    const selectedPages = (() => {
      if (!options.pages || options.pages.length === 0) {
        return Array.from({ length: pdf.numPages }, (_, index) => index + 1);
      }
      const normalized = Array.from(
        new Set(
          options.pages
            .map((n) => Math.floor(n))
            .filter((n) => Number.isFinite(n) && n >= 1 && n <= pdf.numPages)
        )
      );
      return normalized.sort((a, b) => a - b);
    })();
    if (selectedPages.length === 0) {
      throw new Error('No valid pages selected.');
    }

    // Process each page with accurate text structure preservation
    for (let index = 0; index < selectedPages.length; index++) {
      const pageNum = selectedPages[index];
      console.log(`Processing page ${index + 1}/${selectedPages.length} for accurate conversion`);

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const textItems = textContent.items as any[];

      if (!forceOcr && textItems.length > 0) {
        const structuredLines = buildStructuredLinesFromTextItems(textItems);
        let tableRowsBuffer: string[][] = [];
        let consecutiveTableLines = 0;

        const flushTable = () => {
          if (!preserveLayout || tableRowsBuffer.length === 0) {
            tableRowsBuffer = [];
            consecutiveTableLines = 0;
            return;
          }
          const normalizedRows = normalizeTableRows(tableRowsBuffer);
          if (normalizedRows.length >= 3) {
            documentChildren.push(createProfessionalTable(normalizedRows));
          } else {
            normalizedRows.forEach((row) => {
              documentChildren.push(createBodyParagraph(row.join(' | '), 'normalPara'));
            });
          }
          tableRowsBuffer = [];
          consecutiveTableLines = 0;
        };

        structuredLines.forEach((line) => {
          const cleanedCells = line.cells.map((cell) => cleanText(cell)).filter(Boolean);
          const treatAsTableLine = preserveLayout && shouldTreatAsTableLine(cleanedCells);
          if (treatAsTableLine) {
            consecutiveTableLines += 1;
            tableRowsBuffer.push(cleanedCells);
            return;
          }

          if (consecutiveTableLines > 0 && consecutiveTableLines < 3) {
            tableRowsBuffer.forEach((row) => {
              documentChildren.push(createBodyParagraph(row.join(' | '), 'normalPara'));
            });
            tableRowsBuffer = [];
            consecutiveTableLines = 0;
          }

          flushTable();
          const lineText = cleanText(line.lineText);
          if (!lineText) return;

          const isHeading = detectHeadingFromText(lineText) ||
            (line.fontSize > 14 && lineText.length < 80 && lineText.split(' ').length <= 10);

          const textRun = new TextRun({
            text: lineText,
            size: safeInt(isHeading ? 28 : 24, 24),
            bold: Boolean(isHeading),
            color: '000000',
          });

          documentChildren.push(new Paragraph({
            children: [textRun],
            spacing: {
              after: safeInt(120, 120),
              line: safeInt(276, 276),
            },
          }));
        });

        flushTable();
      } else {
        // OCR fallback for image-based PDFs
        console.log('No text items found, using OCR for accurate extraction');

        const worker = await (await ensureTesseract()).createWorker(language);
        const scale = ocrStrength === 'fast' ? 2.2 : ocrStrength === 'accurate' ? 3.4 : 2.8;
        const isHindiMode = language === 'hin' || language === 'eng+hin';
        const preprocessConfig = ocrStrength === 'fast'
          ? { contrastBoost: 1.15, thresholdOffset: 8, binarize: !isHindiMode }
          : ocrStrength === 'accurate'
            ? { contrastBoost: isHindiMode ? 1.2 : 1.5, thresholdOffset: isHindiMode ? 0 : -6, binarize: !isHindiMode }
            : { contrastBoost: isHindiMode ? 1.18 : 1.35, thresholdOffset: isHindiMode ? 2 : 0, binarize: !isHindiMode };
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          context.fillStyle = '#FFFFFF';
          context.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: context, viewport }).promise;
          const processedCanvas = preprocessCanvasForOcrWithConfig(canvas, preprocessConfig);
          try {
            await (worker as any).setParameters({
              preserve_interword_spaces: '1',
              tessedit_pageseg_mode: isHindiMode ? '6' : (ocrStrength === 'accurate' ? '1' : '3'),
              user_defined_dpi: '300',
            });
          } catch (error) {
            // ignore parameter support issues
          }

          const blob = await new Promise<Blob | null>(resolve =>
            processedCanvas.toBlob(resolve, 'image/png', 1.0) // Highest quality
          );

          if (blob) {
            const result = await worker.recognize(blob);
            if (Array.isArray(result?.data?.words)) {
              const threshold = ocrStrength === 'accurate' ? 75 : ocrStrength === 'fast' ? 62 : 68;
              result.data.words.forEach((word: any) => {
                const raw = String(word?.text || '').trim();
                const confidence = Number(word?.confidence ?? 0);
                if (!raw || raw.length < 2) return;
                if (!Number.isFinite(confidence) || confidence >= threshold) return;
                if (!/[A-Za-z0-9]/.test(raw)) return;
                lowConfidenceTokens.push({ page: pageNum, text: raw, confidence });
              });
            }
            if (result.data.lines && result.data.lines.length > 0) {
              if (preserveLayout) {
                // ── LAYOUT PRESERVE: each OCR line = its own paragraph ──
                result.data.lines.forEach((line: any) => {
                  if (line.text && line.text.trim()) {
                    const cleanedLine = cleanOcrTextAdvanced(line.text, preset, language);
                    if (!cleanedLine.trim()) return;
                    const isHeading = detectHeadingFromText(cleanedLine);
                    if (isHeading) {
                      documentChildren.push(createProfessionalHeading(cleanedLine.trim(), 3));
                    } else {
                      documentChildren.push(new Paragraph({
                        children: [new TextRun({
                          text: cleanedLine.trim(),
                          size: safeInt(24, 24),
                          color: '000000',
                          font: 'Calibri',
                        })],
                        spacing: { after: safeInt(80, 80), line: safeInt(276, 276) },
                      }));
                    }
                  }
                });
              } else {
                // ── EDITABLE TEXT: smart-join OCR lines into flowing paragraphs ──
                const buf: string[] = [];
                const flushBuf = () => {
                  if (buf.length > 0) {
                    const merged = buf.join(' ').replace(/\s+/g, ' ').trim();
                    if (merged) documentChildren.push(createBodyParagraph(merged, 'normalPara'));
                    buf.length = 0;
                  }
                };
                result.data.lines.forEach((line: any) => {
                  if (!line.text || !line.text.trim()) return;
                  const cl = cleanOcrTextAdvanced(line.text, preset, language).trim();
                  if (!cl) return;
                  if (detectHeadingFromText(cl)) {
                    flushBuf();
                    documentChildren.push(createProfessionalHeading(cl, 3));
                    return;
                  }
                  const endsWithPunct = /[.!?:;]$/.test(cl);
                  buf.push(cl);
                  if (endsWithPunct || cl.length >= 60) flushBuf();
                });
                flushBuf();
              }
            } else if (result.data.text) {
              // Fallback: process OCR text as paragraphs
              const lines = result.data.text
                .split('\n')
                .map((line: string) => cleanOcrTextAdvanced(line, preset, language))
                .filter((line: string) => line.trim());

              if (preserveLayout) {
                lines.forEach((line: string) => {
                  if (line.trim()) {
                    const isHeading = detectHeadingFromText(line);
                    documentChildren.push(new Paragraph({
                      children: [new TextRun({
                        text: line.trim(),
                        size: safeInt(isHeading ? 28 : 24, 24),
                        bold: Boolean(isHeading),
                        color: '000000',
                        font: 'Calibri',
                      })],
                      spacing: { after: safeInt(80, 80), line: safeInt(276, 276) },
                    }));
                  }
                });
              } else {
                const buf2: string[] = [];
                const flushBuf2 = () => {
                  if (buf2.length > 0) {
                    const merged = buf2.join(' ').replace(/\s+/g, ' ').trim();
                    if (merged) documentChildren.push(createBodyParagraph(merged, 'normalPara'));
                    buf2.length = 0;
                  }
                };
                lines.forEach((line: string) => {
                  if (!line.trim()) { flushBuf2(); return; }
                  if (detectHeadingFromText(line)) {
                    flushBuf2();
                    documentChildren.push(createProfessionalHeading(line.trim(), 3));
                    return;
                  }
                  const endsWithPunct = /[.!?:;]$/.test(line.trim());
                  buf2.push(line.trim());
                  if (endsWithPunct || line.length >= 60) flushBuf2();
                });
                flushBuf2();
              }
            }

          }
        }

        await worker.terminate();
      }

      options.onProgress?.(index + 1, selectedPages.length);

      // Add page break between pages (except last page)
      if (index < selectedPages.length - 1) {
        documentChildren.push(
          new Paragraph({
            children: [new TextRun({
              text: '',
              break: 1, // Page break
            })],
          })
        );
      }
    }

    // Ensure we have content
    if (documentChildren.length === 0) {
      documentChildren.push(new Paragraph({
        children: [new TextRun({
          text: 'No readable content found in the PDF. The document may contain only images or may be corrupted.',
          size: safeInt(24, 24),
          color: '000000',
        })],
      }));
    }

    if (includeReviewSection && lowConfidenceTokens.length > 0) {
      const tokenMap = new Map<string, { text: string; confidence: number; page: number }>();
      lowConfidenceTokens.forEach((token) => {
        const key = `${token.page}:${token.text.toLowerCase()}`;
        const prev = tokenMap.get(key);
        if (!prev || token.confidence < prev.confidence) {
          tokenMap.set(key, token);
        }
      });
      const reviewTokens = Array.from(tokenMap.values())
        .sort((a, b) => a.confidence - b.confidence)
        .slice(0, 40);
      if (reviewTokens.length > 0) {
        documentChildren.push(new Paragraph({
          children: [new TextRun({ text: '', break: 1 })],
        }));
        documentChildren.push(createProfessionalHeading('Review Needed (Low OCR Confidence)', 3));
        reviewTokens.forEach((token) => {
          documentChildren.push(new Paragraph({
            children: [new TextRun({
              text: `Page ${token.page}: "${token.text}" (${Math.round(token.confidence)}%)`,
              size: 22,
              color: '8B0000',
            })],
            spacing: { after: 80, line: 260 },
          }));
        });
      }
    }

    // Create accurate Word document with proper structure
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: { font: 'Calibri', size: 24, color: '000000' },
          },
        },
        paragraphStyles: [{
          id: 'normalPara',
          name: 'Normal Para',
          run: {
            size: safeInt(24, 24),
            font: 'Calibri',
          },
          paragraph: {
            spacing: {
              line: safeInt(276, 276),
              after: safeInt(200, 200),
            },
          },
        }],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: safeInt(1440, 1440),    // Word default margins
              right: safeInt(1440, 1440),
              bottom: safeInt(1440, 1440),
              left: safeInt(1440, 1440),
            },
          },
        },
        children: documentChildren,
      }],
    });

    console.log(`Document created with ${documentChildren.length} elements`);
    const rawBlob = await Packer.toBlob(doc);
    const blob = new Blob([rawBlob], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    console.log('Accurate Word document created successfully');

    return blob;

  } catch (error) {
    console.error('Accurate conversion failed:', error);

    // Safe error document
    const errorDoc = new Document({
      sections: [{
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
          }
        },
        children: [new Paragraph({
          children: [new TextRun({
            text: `Error: ${error instanceof Error ? error.message : 'Unknown conversion error'}`,
            size: safeInt(24, 24),
            color: 'FF0000',
          })],
        })],
      }],
    });

    const errRaw = await Packer.toBlob(errorDoc);
    return new Blob([errRaw], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }
};

function buildStructuredLinesFromTextItems(textItems: any[]): Array<{ lineText: string; cells: string[]; fontSize: number; isBold?: boolean }> {
  if (!textItems || textItems.length === 0) return [];

  // Filter valid text items
  const validItems = textItems
    .filter((item) => item && typeof item.str === 'string' && item.str.trim().length > 0)
    .map((item) => {
      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x = transform[4] || 0;
      const y = transform[5] || 0;
      const height = Math.abs(item.height || transform[0] || 12);
      const width = item.width || Math.max(1, item.str.length * height * 0.55);
      const isBold = Boolean(
        (item.fontName && /bold|black|heavy|medium/i.test(item.fontName)) ||
        (item.str && item.str.length > 0 && height > 14)
      );
      return {
        str: item.str,
        x,
        y,
        width,
        height,
        isBold,
        fontName: item.fontName,
      };
    });

  if (validItems.length === 0) return [];

  // 1. Multi-column segmentation
  // Detect if text items naturally fall into distinct horizontal columns
  // (e.g. Left column: X in [0..300], Right column: X in [320..600])
  const sortedByX = [...validItems].sort((a, b) => a.x - b.x);
  const minX = sortedByX[0].x;
  const maxX = sortedByX[sortedByX.length - 1].x + sortedByX[sortedByX.length - 1].width;
  const pageWidthEstimate = Math.max(100, maxX - minX);

  // Group items into dynamic Y-buckets with tolerance
  type LineBucket = {
    avgY: number;
    height: number;
    items: typeof validItems;
  };
  const lineBuckets: LineBucket[] = [];

  // Sort items from top to bottom (higher Y is top in PDF)
  const itemsByY = [...validItems].sort((a, b) => b.y - a.y);

  itemsByY.forEach((item) => {
    // Find matching bucket where vertical difference is within 45% of line height
    const threshold = Math.max(3, item.height * 0.45);
    const bucket = lineBuckets.find((b) => Math.abs(b.avgY - item.y) <= threshold);

    if (bucket) {
      bucket.items.push(item);
      // Recalculate average Y weighted
      bucket.avgY = bucket.items.reduce((sum, it) => sum + it.y, 0) / bucket.items.length;
      bucket.height = Math.max(bucket.height, item.height);
    } else {
      lineBuckets.push({
        avgY: item.y,
        height: item.height,
        items: [item],
      });
    }
  });

  // Sort buckets top-to-bottom
  lineBuckets.sort((a, b) => b.avgY - a.avgY);

  const structuredLines: Array<{ lineText: string; cells: string[]; fontSize: number; isBold?: boolean }> = [];

  lineBuckets.forEach((bucket) => {
    // Sort items left-to-right
    bucket.items.sort((a, b) => a.x - b.x);

    const cells: string[] = [];
    let currentCell = '';
    let lastRight = -1;
    let maxFontSize = 12;
    let hasBold = false;

    bucket.items.forEach((item, index) => {
      const val = item.str.trim();
      if (!val) return;

      maxFontSize = Math.max(maxFontSize, item.height);
      if (item.isBold) hasBold = true;

      const gap = lastRight >= 0 ? item.x - lastRight : 0;
      const charWidthEst = Math.max(2, item.height * 0.25);
      const wordGapThreshold = Math.max(4, item.height * 0.45);
      const columnGapThreshold = Math.max(20, item.height * 1.6);

      if (index === 0) {
        currentCell = val;
      } else if (gap > columnGapThreshold) {
        // Distinct column or table cell
        if (currentCell) cells.push(currentCell);
        currentCell = val;
      } else {
        const space = gap > wordGapThreshold ? ' ' : '';
        currentCell = `${currentCell}${space}${val}`;
      }

      lastRight = item.x + item.width;
    });

    if (currentCell) cells.push(currentCell);

    const lineText = cells.join(' ').trim();
    if (lineText.length > 0) {
      structuredLines.push({
        lineText,
        cells,
        fontSize: safeInt(Math.round(maxFontSize), 12),
        isBold: hasBold,
      });
    }
  });

  return structuredLines;
}

function shouldTreatAsTableLine(cells: string[]): boolean {
  if (cells.length < 3) return false;
  const nonEmpty = cells.filter((cell) => cell.trim().length > 0);
  if (nonEmpty.length < 3) return false;
  // Reject noisy splits like single-character fragments
  const veryShort = nonEmpty.filter((cell) => cell.trim().length <= 1).length;
  if (veryShort > Math.floor(nonEmpty.length / 2)) return false;
  return true;
}

function normalizeTableRows(rows: string[][]): string[][] {
  if (rows.length < 2) return [];
  const counts = rows.map((row) => row.length).filter((count) => count >= 2);
  if (counts.length < 2) return [];

  const frequency = new Map<number, number>();
  counts.forEach((count) => frequency.set(count, (frequency.get(count) || 0) + 1));
  const targetCols = Array.from(frequency.entries()).sort((a, b) => b[1] - a[1])[0][0];
  if (targetCols < 2) return [];

  const normalized = rows
    .filter((row) => row.length >= 2)
    .map((row) => {
      const trimmed = row.map((cell) => cleanText(cell));
      if (trimmed.length === targetCols) return trimmed;
      if (trimmed.length > targetCols) {
        return [...trimmed.slice(0, targetCols - 1), trimmed.slice(targetCols - 1).join(' ')];
      }
      return [...trimmed, ...Array.from({ length: targetCols - trimmed.length }, () => '')];
    });

  return normalized.length >= 2 ? normalized : [];
}

// Professional document reconstruction from OCR text
function processExtractedText(rawText: string): DocxElement[] {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const elements: DocxElement[] = [];

  let currentParagraph = '';
  let inTable = false;
  let tableData: string[][] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line) continue;

    // Enhanced heading detection (don't rely on OCR font sizes)
    const headingLevel = detectHeadingFromText(line);
    if (headingLevel) {
      // Flush any pending paragraph
      if (currentParagraph.trim()) {
        elements.push(createBodyParagraph(cleanText(currentParagraph), 'normalPara'));
        currentParagraph = '';
      }

      elements.push(createProfessionalHeading(line, headingLevel));
      continue;
    }

    // Enhanced list detection
    const listInfo = detectListFromText(line);
    if (listInfo) {
      // Flush any pending paragraph
      if (currentParagraph.trim()) {
        elements.push(createBodyParagraph(cleanText(currentParagraph), 'normalPara'));
        currentParagraph = '';
      }

      elements.push(createProfessionalListItem(listInfo.text, listInfo.type, listInfo.level));
      continue;
    }

    // Table detection (basic)
    if (detectTableRow(line)) {
      if (!inTable) {
        // Flush any pending paragraph
        if (currentParagraph.trim()) {
          elements.push(createBodyParagraph(cleanText(currentParagraph), 'normalPara'));
          currentParagraph = '';
        }
        inTable = true;
        tableData = [];
      }

      const rowData = parseTableRow(line);
      if (rowData.length > 0) {
        tableData.push(rowData);
      }
      continue;
    } else if (inTable && tableData.length > 0) {
      // End of table
      if (tableData.length > 1) { // Need at least header + 1 data row
        elements.push(createProfessionalTable(tableData));
      } else {
        // Convert table data back to paragraphs if not enough rows
        tableData.forEach(row => {
          elements.push(createBodyParagraph(row.join(' | '), 'normalPara'));
        });
      }
      tableData = [];
      inTable = false;
    }

    // Regular paragraph text
    if (currentParagraph) {
      currentParagraph += ' ' + line;
    } else {
      currentParagraph = line;
    }

    // Check if we should flush the paragraph (sentence endings, etc.)
    if (shouldFlushParagraph(currentParagraph)) {
      elements.push(createBodyParagraph(cleanText(currentParagraph), 'normalPara'));
      currentParagraph = '';
    }
  }

  // Flush any remaining content
  if (currentParagraph.trim()) {
    elements.push(createBodyParagraph(cleanText(currentParagraph), 'normalPara'));
  }

  if (inTable && tableData.length > 1) {
    elements.push(createProfessionalTable(tableData));
  }

  return elements.length > 0 ? elements : [createBodyParagraph('No readable content found.', 'normalPara')];
}

// Helper functions for text processing
function detectHeading(text: string): 1 | 2 | 3 | null {
  const cleanText = text.trim();

  // Check for all caps (likely headings)
  if (cleanText === cleanText.toUpperCase() && cleanText.length > 10) {
    return 2;
  }

  // Check for title case with reasonable length
  if (/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(cleanText) && cleanText.length > 15) {
    return 1;
  }

  // Check for numbered sections
  if (/^(Chapter\s+\d+|Section\s+\d+|\d+\.|\d+\.\d+)/i.test(cleanText)) {
    return 2;
  }

  // Check for short bold-like text
  if (cleanText.length < 50 && !cleanText.includes('.') && cleanText.split(' ').length <= 8) {
    return 3;
  }

  return null;
}

function detectList(text: string): { text: string, type: 'bullet' | 'number', level: number } | null {
  // Bullet points
  const bulletMatch = text.match(/^[-•*]\s+(.+)/);
  if (bulletMatch) {
    return { text: bulletMatch[1], type: 'bullet', level: 0 };
  }

  // Numbered lists
  const numberMatch = text.match(/^(\d+)\.\s+(.+)/);
  if (numberMatch) {
    return { text: numberMatch[2], type: 'number', level: 0 };
  }

  return null;
}

function detectTableRow(text: string): boolean {
  // Simple heuristic: multiple separators or consistent spacing
  const separators = (text.match(/\|/g) || []).length;
  const tabs = (text.match(/\t/g) || []).length;
  const commas = (text.match(/,/g) || []).length;

  return separators >= 2 || tabs >= 2 || (commas >= 3 && text.length > 50);
}

function parseTableRow(text: string): string[] {
  // Try different separators
  if (text.includes('|')) {
    return text.split('|').map(cell => cell.trim());
  }
  if (text.includes('\t')) {
    return text.split('\t').map(cell => cell.trim());
  }
  if (text.includes(',')) {
    return text.split(',').map(cell => cell.trim());
  }

  // Fallback: split by multiple spaces
  return text.split(/\s{2,}/).map(cell => cell.trim());
}

function shouldFlushParagraph(text: string): boolean {
  // Flush on sentence endings
  return /\.$|\?$|\!$|: $/.test(text) && text.length > 100;
}

// Professional document reconstruction functions

/**
 * TEXT-PATTERN BASED HEADING DETECTION (NO FONT-SIZE)
 * For image PDFs where OCR font sizes don't exist
 */
function detectHeadingFromText(text: string): 1 | 2 | 3 | null {
  const cleanText = text.trim();
  if (!cleanText) return null;

  // ✅ FINAL HEADING DETECTION LOGIC
  const isHeading = (
    cleanText.length < 30 &&
    /^[A-Z][A-Za-z ]+$/.test(cleanText)
  );

  if (isHeading) {
    // Will detect: Address, Hobbies, About Me, Contact Information, Useful Link
    return 3; // All headings treated as level 3 for simplicity
  }

  return null;
}

/**
 * Create consistent body paragraph with safe defaults
 */
function createBodyParagraph(text: string, styleId: string = 'normalPara'): DocxElement {
  // Ensure text is valid
  const safeText = (text || '').trim();
  if (!safeText) return new Paragraph({ children: [] });

  return new Paragraph({
    children: [new TextRun({
      text: safeText,
      size: 24, // 12pt - consistent body text
      color: '000000', // Always black for body text
      font: 'Calibri',
    })],
    style: styleId,
    spacing: {
      after: 200, // Standard paragraph spacing
      line: 276, // 1.15 line spacing
    },
  });
}

/**
 * Create professional heading with predefined Word styles
 */
function createProfessionalHeading(text: string, level: 1 | 2 | 3): DocxElement {
  const safeText = (text || '').trim();
  if (!safeText) return new Paragraph({ children: [] });

  const headingConfig = {
    1: { size: 32, style: 'Heading1' }, // 16pt
    2: { size: 28, style: 'Heading2' }, // 14pt
    3: { size: 26, style: 'Heading3' }, // 13pt
  };

  const config = headingConfig[level];

  return new Paragraph({
    children: [new TextRun({
      text: safeText,
      size: config.size,
      bold: true,
      color: '000000',
      font: 'Calibri',
    })],
    style: config.style,
    spacing: {
      before: level === 1 ? 240 : level === 2 ? 200 : 160,
      after: level === 1 ? 120 : level === 2 ? 100 : 80,
    },
  });
}

/**
 * Enhanced list detection from text patterns
 */
function detectListFromText(text: string): { text: string, type: 'bullet' | 'number', level: number } | null {
  const cleanText = text.trim();
  if (!cleanText) return null;

  // Bullet points - multiple patterns
  const bulletPatterns = [
    /^[-•*◦▪▫]\s+(.+)/,  // Common bullet symbols
    /^•\s+(.+)/,           // Unicode bullet
    /^\*\s+(.+)/,          // Asterisk
    /^-\s+(.+)/,           // Dash
  ];

  for (const pattern of bulletPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return { text: match[1], type: 'bullet', level: 0 };
    }
  }

  // Numbered lists - multiple patterns
  const numberPatterns = [
    /^(\d+)[\.\)]\s+(.+)/,    // 1. or 1) pattern
    /^([A-Z])[\.\)]\s+(.+)/,  // A. or A) pattern
    /^([a-z])[\.\)]\s+(.+)/,  // a. or a) pattern
    /^([IVXLCDM]+)[\.\)]\s+(.+)/i, // Roman numerals
  ];

  for (const pattern of numberPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return { text: match[2], type: 'number', level: 0 };
    }
  }

  return null;
}

/**
 * Create professional list items using Word's list features (FIXED NaN ISSUE)
 */
function createProfessionalListItem(text: string, type: 'bullet' | 'number', level: number): DocxElement {
  const safeText = (text || '').trim();
  if (!safeText) return new Paragraph({ children: [] });

  // ✅ BULLET/LIST LEVEL NaN FIX - Use safeInt for level
  const safeLevel = safeInt(level, 0);

  // Create proper Word list item
  // Note: For simplicity, we're using formatted paragraphs
  // In a full implementation, you'd use docx's Numbering/Bullets features

  return new Paragraph({
    children: [new TextRun({
      text: safeText,
      size: 24, // 12pt body text
      color: '000000',
    })],
    bullet: type === 'bullet' ? { level: safeLevel } : undefined,
    numbering: type === 'number' ? { reference: 'default-numbering', level: safeLevel } : undefined,
    indent: {
      left: (safeLevel + 1) * 720, // 0.5 inch per level
      hanging: 360, // 0.25 inch hanging indent
    },
    spacing: {
      after: 120, // Small spacing between list items
    },
  });
}

/**
 * Create professional table with consistent formatting
 */
function createProfessionalTable(data: string[][]): DocxElement {
  if (!Array.isArray(data) || data.length < 2) {
    return new Table({ rows: [] });
  }

  // Validate and clean table data
  const cleanData = data.map(row =>
    Array.isArray(row) ? row.map(cell => (cell || '').toString().trim()) : []
  ).filter(row => row.length > 0);

  if (cleanData.length < 2) {
    return new Table({ rows: [] });
  }

  const borderCfg = BorderStyle ? {
    top: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    left: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    right: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
  } : undefined;

  // Create header row
  const headerRow = new TableRow({
    tableHeader: true,
    children: cleanData[0].map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: cell || '',
          bold: true,
          size: 22,
          color: '111827',
          font: 'Calibri',
        })],
      })],
      shading: { fill: 'F3F4F6' },
      margins: {
        top: 140,
        bottom: 140,
        left: 140,
        right: 140,
      },
    })),
  });

  // Create data rows
  const dataRows = cleanData.slice(1).map((row, rIdx) =>
    new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: cell || '',
            size: 21,
            color: '374151',
            font: 'Calibri',
          })],
        })],
        shading: rIdx % 2 === 1 ? { fill: 'F9FAFB' } : undefined,
        margins: {
          top: 120,
          bottom: 120,
          left: 140,
          right: 140,
        },
      })),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: WidthType ? WidthType.PERCENTAGE : ('percentage' as any),
    },
    borders: borderCfg,
  });
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Proper sentence spacing
    .trim()
    .normalize('NFC');
}

function createHeading(text: string, level: 1 | 2 | 3): DocxElement {
  const styleId = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';

  return new Paragraph({
    children: [new TextRun({
      text: cleanText(text),
      size: level === 1 ? 32 : level === 2 ? 28 : 26,
      bold: true,
    })],
    style: styleId,
  });
}

function createParagraph(text: string, styleId: string = 'normalPara'): DocxElement {
  return new Paragraph({
    children: [new TextRun({
      text: cleanText(text),
      size: 24, // 12pt
    })],
    style: styleId,
  });
}

function createListItem(text: string, type: 'bullet' | 'number', level: number): DocxElement {
  // For now, create a simple paragraph with bullet/number prefix
  const prefix = type === 'bullet' ? '• ' : `${level + 1}. `;

  return new Paragraph({
    children: [new TextRun({
      text: prefix + cleanText(text),
      size: 24,
    })],
    indent: { left: level * 720 }, // 0.5 inch per level
  });
}

function createTable(data: string[][]): DocxElement {
  if (data.length < 2) return new Table({ rows: [] });

  const headerRow = new TableRow({
    children: data[0].map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: cell,
          bold: true,
          size: 24,
        })],
      })],
    })),
  });

  const dataRows = data.slice(1).map(row =>
    new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: cell,
            size: 24,
          })],
        })],
      })),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: 'percentage' as any, // 100% width
    },
  });
}



export interface PdfToPowerPointOptions {
  layout?: 'standard' | 'wide';
  fit?: 'contain' | 'cover';
  scale?: number;
  imageFormat?: 'png' | 'jpeg';
  imageQuality?: number;
  backgroundColor?: string;
  pages?: number[]; // 1-based page numbers
  onProgress?: (current: number, total: number) => void;
}

export const convertPdfToPowerPoint = async (
  file: File,
  options: PdfToPowerPointOptions = {}
): Promise<Blob> => {
  const PptxGenJS = await ensurePptx();
  const pdfjs = await ensurePdfjs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const {
    layout = 'wide',
    fit = 'contain',
    scale = 2,
    imageFormat = 'jpeg',
    imageQuality = 0.9,
    backgroundColor = 'FFFFFF',
    onProgress
  } = options;

  const safeScale = Math.min(3, Math.max(1, scale));
  const safeQuality = Math.min(1, Math.max(0.5, imageQuality));
  const pageNumbers = (() => {
    if (!options.pages || options.pages.length === 0) {
      return Array.from({ length: pdf.numPages }, (_, idx) => idx + 1);
    }
    const valid = Array.from(new Set(options.pages
      .map((n) => Math.floor(n))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= pdf.numPages)));
    return valid.sort((a, b) => a - b);
  })();

  if (pageNumbers.length === 0) {
    throw new Error('No valid pages selected for conversion.');
  }

  const pres = new PptxGenJS();
  const standardLayoutName = 'CUSTOM_STANDARD_4_3';
  const wideLayoutName = 'CUSTOM_WIDE_16_9';
  pres.defineLayout({ name: standardLayoutName, width: 10, height: 7.5 });
  pres.defineLayout({ name: wideLayoutName, width: 13.333, height: 7.5 });
  pres.layout = layout === 'standard' ? standardLayoutName : wideLayoutName;
  const slide = layout === 'standard'
    ? { w: 10, h: 7.5 }
    : { w: 13.333, h: 7.5 };

  for (let i = 0; i < pageNumbers.length; i++) {
    const pageIndex = pageNumbers[i];
    const page = await pdf.getPage(pageIndex);
    const viewport = page.getViewport({ scale: safeScale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context not available');
    }

    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: context, viewport }).promise;

    const imgData = imageFormat === 'png'
      ? canvas.toDataURL('image/png')
      : canvas.toDataURL('image/jpeg', safeQuality);

    const imageRatio = canvas.width / canvas.height;
    const slideRatio = slide.w / slide.h;
    const byWidth = fit === 'contain' ? imageRatio >= slideRatio : imageRatio < slideRatio;

    const renderW = byWidth ? slide.w : slide.h * imageRatio;
    const renderH = byWidth ? slide.w / imageRatio : slide.h;
    const renderX = (slide.w - renderW) / 2;
    const renderY = (slide.h - renderH) / 2;

    const pptSlide = pres.addSlide();
    pptSlide.background = { color: backgroundColor };
    pptSlide.addImage({
      data: imgData,
      x: renderX,
      y: renderY,
      w: renderW,
      h: renderH
    });

    onProgress?.(i + 1, pageNumbers.length);
    page.cleanup();
  }

  return (await pres.write({ outputType: "blob" })) as Blob;
};

// --- Make PPT / Images to PowerPoint ---

export interface ImageToPptOptions {
  layout?: 'wide' | 'standard'; // wide = 16:9, standard = 4:3
  imagesPerSlide?: 1 | 2 | 4;
  backgroundColor?: string; // hex without #, e.g. 'FFFFFF', '1E293B'
  margin?: 'none' | 'small' | 'medium';
  includeTitles?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export interface ImageInputItem {
  dataUrl: string;
  name: string;
  width?: number;
  height?: number;
  rotation?: number;
  title?: string;
}

/**
 * Prepares an image (applies user rotation, gets natural dimensions and clean data URL)
 */
const preparePptxImage = (item: ImageInputItem): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const rot = (item.rotation || 0) % 360;
      const isSwapped = rot === 90 || rot === 270;
      const finalW = isSwapped ? img.naturalHeight : img.naturalWidth;
      const finalH = isSwapped ? img.naturalWidth : img.naturalHeight;

      if (rot === 0 && item.dataUrl.startsWith('data:image/')) {
        resolve({ dataUrl: item.dataUrl, width: finalW, height: finalH });
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, finalW);
      canvas.height = Math.max(1, finalH);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({ dataUrl: item.dataUrl, width: finalW, height: finalH });
        return;
      }

      ctx.save();
      ctx.translate(finalW / 2, finalH / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      const format = item.dataUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
      const outputDataUrl = canvas.toDataURL(format, 0.95);
      resolve({ dataUrl: outputDataUrl, width: finalW, height: finalH });
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${item.name}`));
    img.src = item.dataUrl;
  });
};

/**
 * Converts user images into a professional, neatly adjusted PowerPoint (.pptx) presentation
 */
export const convertImagesToPowerPoint = async (
  items: ImageInputItem[],
  options: ImageToPptOptions = {}
): Promise<Blob> => {
  if (!items || items.length === 0) {
    throw new Error('Please select at least one image to convert to PowerPoint.');
  }

  const PptxGenJS = await ensurePptx();
  const pres = new PptxGenJS();

  const {
    layout = 'wide',
    imagesPerSlide = 1,
    backgroundColor = 'FFFFFF',
    margin = 'small',
    includeTitles = false,
    onProgress
  } = options;

  // Slide Layout setup
  const standardLayoutName = 'CUSTOM_STANDARD_4_3';
  const wideLayoutName = 'CUSTOM_WIDE_16_9';
  pres.defineLayout({ name: standardLayoutName, width: 10, height: 7.5 });
  pres.defineLayout({ name: wideLayoutName, width: 13.333, height: 7.5 });
  pres.layout = layout === 'standard' ? standardLayoutName : wideLayoutName;

  const slideW = layout === 'standard' ? 10 : 13.333;
  const slideH = 7.5;

  // Padding margin
  const pad = margin === 'none' ? 0.05 : margin === 'medium' ? 0.6 : 0.35;
  const titleH = includeTitles ? 0.65 : 0;
  const areaX = pad;
  const areaY = includeTitles ? pad + titleH + 0.1 : pad;
  const areaW = Math.max(1, slideW - 2 * pad);
  const areaH = Math.max(1, slideH - areaY - pad);

  // Title text color depending on background darkness
  const isDarkBg = ['1E293B', '0F172A', '000000', '18181B'].includes(backgroundColor.toUpperCase());
  const titleColor = isDarkBg ? 'F8FAFC' : '0F172A';

  // Process all images to get rotated dimensions and clean dataUrls
  const preparedImages = [];
  for (let i = 0; i < items.length; i++) {
    const prep = await preparePptxImage(items[i]);
    preparedImages.push({
      ...prep,
      name: items[i].name,
      title: items[i].title || items[i].name.replace(/\.[^/.]+$/, '')
    });
  }

  // Calculate slide chunks based on imagesPerSlide
  const chunks: typeof preparedImages[] = [];
  for (let i = 0; i < preparedImages.length; i += imagesPerSlide) {
    chunks.push(preparedImages.slice(i, i + imagesPerSlide));
  }

  // Build each slide
  for (let slideIdx = 0; slideIdx < chunks.length; slideIdx++) {
    const chunk = chunks[slideIdx];
    const pptSlide = pres.addSlide();
    pptSlide.background = { color: backgroundColor };

    // Slide title if enabled
    if (includeTitles) {
      const slideTitle = chunk.length === 1 ? chunk[0].title : `Slide ${slideIdx + 1}`;
      pptSlide.addText(slideTitle, {
        x: pad,
        y: pad,
        w: areaW,
        h: titleH,
        fontSize: 16,
        bold: true,
        align: 'center',
        color: titleColor,
      });
    }

    if (chunk.length === 1) {
      // 1 Image per slide - Centered Fit
      const img = chunk[0];
      const imgRatio = img.width / img.height;
      const boxRatio = areaW / areaH;

      let w = areaW;
      let h = areaH;
      if (imgRatio >= boxRatio) {
        w = areaW;
        h = areaW / imgRatio;
      } else {
        h = areaH;
        w = areaH * imgRatio;
      }

      const x = areaX + (areaW - w) / 2;
      const y = areaY + (areaH - h) / 2;

      pptSlide.addImage({
        data: img.dataUrl,
        x,
        y,
        w,
        h,
      });
    } else if (chunk.length === 2) {
      // 2 Images per slide - Side-by-Side Dual Fit
      const gap = 0.3;
      const boxW = (areaW - gap) / 2;
      const boxH = areaH;

      for (let c = 0; c < chunk.length; c++) {
        const img = chunk[c];
        const boxX = areaX + c * (boxW + gap);
        const imgRatio = img.width / img.height;
        const boxRatio = boxW / boxH;

        let w = boxW;
        let h = boxH;
        if (imgRatio >= boxRatio) {
          w = boxW;
          h = boxW / imgRatio;
        } else {
          h = boxH;
          w = boxH * imgRatio;
        }

        const x = boxX + (boxW - w) / 2;
        const y = areaY + (boxH - h) / 2;

        pptSlide.addImage({
          data: img.dataUrl,
          x,
          y,
          w,
          h,
        });
      }
    } else {
      // 3 or 4 Images per slide - 2x2 Grid Fit
      const gapX = 0.3;
      const gapY = 0.25;
      const boxW = (areaW - gapX) / 2;
      const boxH = (areaH - gapY) / 2;

      for (let c = 0; c < chunk.length; c++) {
        const img = chunk[c];
        const col = c % 2;
        const row = Math.floor(c / 2);
        const boxX = areaX + col * (boxW + gapX);
        const boxY = areaY + row * (boxH + gapY);

        const imgRatio = img.width / img.height;
        const boxRatio = boxW / boxH;

        let w = boxW;
        let h = boxH;
        if (imgRatio >= boxRatio) {
          w = boxW;
          h = boxW / imgRatio;
        } else {
          h = boxH;
          w = boxH * imgRatio;
        }

        const x = boxX + (boxW - w) / 2;
        const y = boxY + (boxH - h) / 2;

        pptSlide.addImage({
          data: img.dataUrl,
          x,
          y,
          w,
          h,
        });
      }
    }

    onProgress?.(slideIdx + 1, chunks.length);
  }

  return (await pres.write({ outputType: 'blob' })) as Blob;
};

// --- Office to PDF Converters ---

/**
 * Clean broken Word icons, mojibake characters, and private use area glyphs
 */
const cleanWordHtmlAndMojibake = (html: string): string => {
  if (!html) return '';
  return html
    // Remove browser print header/footer stamps often embedded in web-saved docs
    .replace(/<p[^>]*>\s*(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s+)?about:blank(?:\s+\d+\/\d+)?\s*<\/p>/gi, '')
    .replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s+about:blank\b/gi, '')
    .replace(/\babout:blank(?:\s+\d+\/\d+)?\b/gi, '')
    // Replace broken wingdings/contact icon mojibake with clean unicode icons
    .replace(/Ø=ÜÞ/g, ' 📞 ')
    .replace(/Ø=Üç/g, ' ✉ ')
    .replace(/Ø=Üí/g, ' 📍 ')
    .replace(/Ø=Ý/g, ' 🔗 ')
    .replace(/Ø=Ü[a-zA-Z0-9]/g, ' ')
    .replace(/Ø=[a-zA-Z0-9]/g, ' ')
    // Replace Private Use Area characters
    .replace(/[\uE000-\uF8FF]/g, '')
    .replace(/[\uF000-\uFFFF]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Fix broken separated letters (e.g., "L E Y A Q U A T" -> "LEYAQUAT" when artificially split)
    .replace(/(?<=\b[A-Za-z])\s+(?=[A-Za-z]\b)/g, (match, offset, str) => {
      // Only collapse if it's a sequence of 4+ single letters separated by single space
      const slice = str.slice(Math.max(0, offset - 6), Math.min(str.length, offset + 8));
      return /\b[A-Z]\s+[A-Z]\s+[A-Z]\s+[A-Z]\b/.test(slice) ? '' : match;
    });
};

/**
 * Remove browser print stamps (e.g. "about:blank", "15/05/2026, 14:45 about:blank") from rendered DOM
 */
const cleanBrowserPrintStampsFromDom = (root: HTMLElement) => {
  const elements = root.querySelectorAll('p, div, span, header, footer, td');
  elements.forEach((el) => {
    const text = (el.textContent || '').trim();
    if (
      /^(?:\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s+)?about:blank(?:\s+\d+\/\d+)?$/i.test(text) ||
      /^about:blank$/i.test(text) ||
      /^about:blank\s+\d+\/\d+$/i.test(text)
    ) {
      el.remove();
    }
  });
};

/**
 * Scans upward from idealBreakY to find a clean horizontal row of whitespace
 * (gap between lines/paragraphs/table rows) so text is never sliced in half.
 */
const findCleanPageBreak = (
  ctx: CanvasRenderingContext2D,
  width: number,
  startY: number,
  idealBreakY: number,
  maxLookback: number
): number => {
  const searchStart = Math.min(idealBreakY, ctx.canvas.height - 1);
  const searchEnd = Math.max(startY + 40, idealBreakY - maxLookback);
  const scanHeight = searchStart - searchEnd + 1;
  if (scanHeight <= 0) return idealBreakY;

  const imgData = ctx.getImageData(0, searchEnd, width, scanHeight);
  const data = imgData.data;

  let bestY = idealBreakY;
  let minDarkCount = Infinity;

  // Scan backwards from idealBreakY towards searchEnd to find whitespace between lines
  for (let y = searchStart; y >= searchEnd; y--) {
    const rowOffset = (y - searchEnd) * width * 4;
    let darkPixels = 0;

    for (let x = 0; x < width; x += 4) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (a > 30 && (r < 240 || g < 240 || b < 240)) {
        darkPixels++;
      }
    }

    if (darkPixels === 0) {
      return y;
    }

    if (darkPixels < minDarkCount) {
      minDarkCount = darkPixels;
      bestY = y;
    }
  }

  return minDarkCount <= 4 ? bestY : idealBreakY;
};

/**
 * Paginates a high-resolution canvas into A4 PDF pages with smart whitespace-aware slicing
 */
const paginateCanvasToPdf = (
  canvas: HTMLCanvasElement,
  pdf: any,
  addedPagesCount: number
): number => {
  const imgWidth = 210; // A4 mm
  const imgHeight = 297; // A4 mm
  const canvasPageHeight = Math.round(canvas.width * (297 / 210));
  const totalHeight = canvas.height;
  let currentY = 0;
  let pagesAdded = addedPagesCount;

  while (currentY < totalHeight) {
    const remainingHeight = totalHeight - currentY;

    // If remaining content fits comfortably on this page (within 18% tolerance to never create a blank 5-line page)
    if (remainingHeight <= canvasPageHeight * 1.18) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = canvasPageHeight;
      const sliceCtx = sliceCanvas.getContext('2d');
      if (sliceCtx) {
        sliceCtx.fillStyle = '#FFFFFF';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0, currentY, canvas.width, remainingHeight,
          0, 0, sliceCanvas.width, remainingHeight
        );

        // Check if page has actual content
        if (pagesAdded > 0) {
          const pixelData = sliceCtx.getImageData(0, 0, sliceCanvas.width, sliceCanvas.height).data;
          let hasContent = false;
          for (let i = 0; i < pixelData.length; i += 64) {
            if (pixelData[i] < 245 || pixelData[i + 1] < 245 || pixelData[i + 2] < 245) {
              hasContent = true;
              break;
            }
          }
          if (!hasContent) break;
        }

        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
        if (pagesAdded > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        pagesAdded++;
      }
      break;
    }

    // Target break point: find clean whitespace line
    const idealBreakY = currentY + canvasPageHeight;
    const fullCtx = canvas.getContext('2d');
    const cleanCutY = fullCtx
      ? findCleanPageBreak(fullCtx, canvas.width, currentY, idealBreakY, Math.round(canvasPageHeight * 0.18))
      : idealBreakY;

    const remainingAfterCut = totalHeight - cleanCutY;
    // If what would be left for the next page is just 4-5 lines (less than 150px),
    // do NOT create an almost-empty page; scale the full remaining height onto this page!
    if (remainingAfterCut < 150) {
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = canvasPageHeight;
      const sliceCtx = sliceCanvas.getContext('2d');
      if (sliceCtx) {
        sliceCtx.fillStyle = '#FFFFFF';
        sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        sliceCtx.drawImage(
          canvas,
          0, currentY, canvas.width, totalHeight - currentY,
          0, 0, sliceCanvas.width, canvasPageHeight
        );
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
        if (pagesAdded > 0) pdf.addPage();
        pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        pagesAdded++;
      }
      break;
    }

    const sliceHeight = cleanCutY - currentY;
    if (sliceHeight <= 20) {
      break;
    }

    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = canvasPageHeight;
    const sliceCtx = sliceCanvas.getContext('2d');
    if (sliceCtx) {
      sliceCtx.fillStyle = '#FFFFFF';
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(
        canvas,
        0, currentY, canvas.width, sliceHeight,
        0, 0, sliceCanvas.width, sliceHeight
      );

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
      if (pagesAdded > 0) pdf.addPage();
      pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pagesAdded++;
    }

    currentY = cleanCutY;
  }

  return pagesAdded;
};

/**
 * Professional Word to PDF conversion with accurate formatting preservation
 */
export const convertWordToPdf = async (file: File): Promise<Blob> => {
  await ensureJsPdf();
  await ensureHtml2canvas();
  console.log('Starting high-fidelity Word to PDF conversion for:', file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = new _jsPDF('p', 'mm', 'a4');
    let addedPages = 0;

    if (typeof document !== 'undefined') {
      // ── STRATEGY 1: DOCX-PREVIEW (Primary OpenXML Layout Engine) ──
      // Parses native OpenXML docx styling, tables, column widths, font sizes, margins, alignments
      let docxRenderSuccess = false;
      const docxContainer = document.createElement('div');
      docxContainer.id = 'docx-preview-staging';
      docxContainer.style.position = 'fixed';
      docxContainer.style.left = '-9999px';
      docxContainer.style.top = '0';
      docxContainer.style.width = '794px'; // standard A4 96 DPI width
      docxContainer.style.backgroundColor = '#FFFFFF';
      docxContainer.style.color = '#0f172a';
      docxContainer.style.fontFamily = "'Inter', 'Calibri', 'Segoe UI', -apple-system, Roboto, sans-serif";
      (docxContainer.style as any).webkitFontSmoothing = 'antialiased';

      // Global style overrides for pristine clean printing
      const customStyle = document.createElement('style');
      customStyle.textContent = `
        #docx-preview-staging .docx-wrapper {
          background: transparent !important;
          padding: 0 !important;
        }
        #docx-preview-staging .docx-wrapper > section.docx {
          box-shadow: none !important;
          margin: 0 auto 0 auto !important;
          background: #FFFFFF !important;
          border: none !important;
          box-sizing: border-box !important;
        }
        #docx-preview-staging p {
          margin-top: 1px !important;
          margin-bottom: 2.5px !important;
          line-height: 1.25 !important;
        }
        #docx-preview-staging table {
          border-collapse: collapse !important;
          margin-top: 2px !important;
          margin-bottom: 3px !important;
        }
        #docx-preview-staging td, #docx-preview-staging th {
          vertical-align: middle !important;
          padding: 3px 6px !important;
          line-height: 1.2 !important;
        }
      `;
      docxContainer.appendChild(customStyle);
      document.body.appendChild(docxContainer);

      try {
        const docxPreview = await ensureDocxPreview();
        await docxPreview.renderAsync(arrayBuffer, docxContainer, docxContainer, {
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          ignoreLastRenderedPageBreak: false, // Respect Word's native page breaks
          renderHeaders: true,
          renderFooters: true,
        });

        cleanBrowserPrintStampsFromDom(docxContainer);

        const sections = Array.from(docxContainer.querySelectorAll('section.docx')) as HTMLElement[];
        if (sections.length > 0) {
          // When Word has multiple pages/sections, each section corresponds to EXACTLY 1 PDF page!
          if (sections.length > 1) {
            for (let i = 0; i < sections.length; i++) {
              const section = sections[i];
              const sectionCanvas = await _html2canvas(section, {
                scale: 2.5, // Crisp 240 DPI
                useCORS: true,
                logging: false,
                backgroundColor: '#FFFFFF',
                windowWidth: 794,
              });

              const canvasData = sectionCanvas.toDataURL('image/jpeg', 0.98);
              if (addedPages > 0) pdf.addPage();
              pdf.addImage(canvasData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
              addedPages++;
            }
          } else {
            // Exactly 1 section
            const section = sections[0];
            const sectionCanvas = await _html2canvas(section, {
              scale: 2.5,
              useCORS: true,
              logging: false,
              backgroundColor: '#FFFFFF',
              windowWidth: 794,
            });

            const canvasPageHeight = Math.round(sectionCanvas.width * (297 / 210));
            // If it fits on 1 page (allow 15% overflow tolerance to avoid 5-line spillover)
            if (sectionCanvas.height <= canvasPageHeight * 1.15) {
              const canvasData = sectionCanvas.toDataURL('image/jpeg', 0.98);
              pdf.addImage(canvasData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
              addedPages = 1;
            } else {
              addedPages = paginateCanvasToPdf(sectionCanvas, pdf, 0);
            }
          }
          docxRenderSuccess = addedPages > 0;
        }
      } catch (previewErr) {
        console.warn('docx-preview rendering failed, falling back to mammoth engine:', previewErr);
      } finally {
        if (docxContainer.parentNode) {
          docxContainer.parentNode.removeChild(docxContainer);
        }
      }

      if (docxRenderSuccess) {
        return pdf.output('blob');
      }

      // ── STRATEGY 2: MAMMOTH HTML WITH SMART PAGINATION (Fallback) ──
      await ensureMammoth();
      const mammoth = _mammoth;
      const htmlResult = await mammoth.convertToHtml(
        { arrayBuffer },
        {
          convertImage: mammoth.images.imgElement((image: any) => {
            return image.read("base64").then((imageBuffer: string) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`
              };
            });
          })
        }
      );

      const rawHtml = htmlResult.value || '';
      const cleanedHtml = cleanWordHtmlAndMojibake(rawHtml);
      const safeHtml = sanitizeHtml(cleanedHtml);

      const mammothContainer = document.createElement('div');
      mammothContainer.id = 'word-pdf-staging-container';
      mammothContainer.style.position = 'fixed';
      mammothContainer.style.left = '-9999px';
      mammothContainer.style.top = '0';
      mammothContainer.style.width = '794px'; // Exact A4 width (96 DPI)
      mammothContainer.style.minHeight = '1123px'; // Exact A4 height
      mammothContainer.style.padding = '44px 50px';
      mammothContainer.style.boxSizing = 'border-box';
      mammothContainer.style.backgroundColor = '#FFFFFF';
      mammothContainer.style.color = '#0f172a';
      mammothContainer.style.fontFamily = "'Inter', 'Calibri', 'Segoe UI', -apple-system, Roboto, sans-serif";
      mammothContainer.style.fontSize = '11.5px';
      mammothContainer.style.lineHeight = '1.32';
      (mammothContainer.style as any).webkitFontSmoothing = 'antialiased';

      mammothContainer.innerHTML = `
        <style>
          #word-pdf-staging-container h1 { font-size: 15px; font-weight: 700; color: #0f172a; margin: 8px 0 3px 0; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
          #word-pdf-staging-container h2 { font-size: 13.5px; font-weight: 700; color: #1e293b; margin: 6px 0 2px 0; }
          #word-pdf-staging-container h3 { font-size: 12px; font-weight: 600; color: #334155; margin: 5px 0 2px 0; }
          #word-pdf-staging-container p { margin: 0 0 4px 0; line-height: 1.35; color: #1e293b; }
          #word-pdf-staging-container strong, #word-pdf-staging-container b { font-weight: 700; color: #0f172a; }
          #word-pdf-staging-container ul, #word-pdf-staging-container ol { margin: 4px 0 6px 0; padding-left: 18px; }
          #word-pdf-staging-container li { margin-bottom: 2px; line-height: 1.32; color: #1e293b; }
          #word-pdf-staging-container table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10.5px; line-height: 1.25; }
          #word-pdf-staging-container th, #word-pdf-staging-container td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; vertical-align: middle; }
          #word-pdf-staging-container th { background-color: #f8fafc; font-weight: 600; }
          #word-pdf-staging-container a { color: #2563eb; text-decoration: underline; word-break: break-all; }
          #word-pdf-staging-container img { max-width: 100%; height: auto; display: inline-block; margin: 4px 0; }
        </style>
        <div>${safeHtml}</div>
      `;

      cleanBrowserPrintStampsFromDom(mammothContainer);
      document.body.appendChild(mammothContainer);

      try {
        const canvas = await _html2canvas(mammothContainer, {
          scale: 2.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF',
          windowWidth: 794,
        });

        const canvasPageHeight = Math.round(canvas.width * (297 / 210));
        if (canvas.height <= canvasPageHeight * 1.15) {
          const canvasData = canvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(canvasData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
          addedPages = 1;
        } else {
          addedPages = paginateCanvasToPdf(canvas, pdf, addedPages);
        }
      } finally {
        if (mammothContainer.parentNode) {
          mammothContainer.parentNode.removeChild(mammothContainer);
        }
      }

      if (addedPages > 0) {
        return pdf.output('blob');
      }
    }

    // Fallback if no DOM available
    await ensureMammoth();
    const htmlResult = await _mammoth.convertToHtml({ arrayBuffer });
    const cleanedHtml = cleanWordHtmlAndMojibake(htmlResult.value || '');
    const plainText = cleanedHtml.replace(/<[^>]*>/g, ' ');
    const lines = pdf.splitTextToSize(plainText, 170);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10.5);
    let y = 20;
    for (const line of lines) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += 5.5;
    }
    return pdf.output('blob');

  } catch (error) {
    console.error('Word to PDF conversion failed:', error);
    const pdf = new _jsPDF('p', 'mm', 'a4');
    pdf.setFontSize(14);
    pdf.text('Word to PDF Conversion Error', 20, 30);
    pdf.setFontSize(11);
    pdf.text('Error: ' + (error instanceof Error ? error.message : 'Unknown error'), 20, 45);
    return pdf.output('blob');
  }
};

/**
 * Extract structured content from Word HTML including tables
 */
function extractStructuredContent(container: HTMLElement): Array<{ type: string; text: string; tableData?: string[][] }> {
  const blocks: Array<{ type: string; text: string; tableData?: string[][] }> = [];

  // Find all paragraphs, headings, lists, and tables
  const elements = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, ul, ol, li, table');

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'table') {
      const rows: string[][] = [];
      const trList = element.querySelectorAll('tr');
      trList.forEach((tr) => {
        const cells: string[] = [];
        const tdList = tr.querySelectorAll('td, th');
        tdList.forEach((td) => {
          cells.push(td.textContent?.trim() || '');
        });
        if (cells.some((c) => c.length > 0)) {
          rows.push(cells);
        }
      });
      if (rows.length > 0) {
        blocks.push({ type: 'table', text: '', tableData: rows });
      }
      return;
    }

    const text = element.textContent?.trim() || '';
    if (!text) return;

    // Avoid duplicate inclusion if paragraph is inside table cell or list item
    if (element.closest('table') || (tagName === 'p' && element.closest('li'))) {
      return;
    }

    let blockType = 'paragraph';

    if (tagName === 'h1') blockType = 'heading1';
    else if (tagName === 'h2') blockType = 'heading2';
    else if (tagName === 'h3' || tagName === 'h4') blockType = 'heading3';
    else if (tagName === 'h5' || tagName === 'h6') blockType = 'heading4';
    else if (tagName === 'li') blockType = 'listitem';
    else if (tagName === 'p') {
      const style = element.getAttribute('style') || '';
      if (style.includes('font-weight: bold') || style.includes('font-weight:bold')) {
        const fontSize = style.match(/font-size:\s*(\d+)pt/) || style.match(/font-size:\s*(\d+)px/);
        if (fontSize) {
          const size = parseInt(fontSize[1]);
          if (size >= 16) blockType = 'heading1';
          else if (size >= 14) blockType = 'heading2';
          else if (size >= 12) blockType = 'heading3';
        } else {
          blockType = 'heading3';
        }
      }
    }

    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s*([A-Z])/g, '$1 $2')
      .trim();

    if (cleanText) {
      blocks.push({ type: blockType, text: cleanText });
    }
  });

  if (blocks.length === 0) {
    const rawText = container.textContent || '';
    const lines = rawText.split('\n').filter((l) => l.trim());
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (trimmed) {
        const type = detectWordHeading(trimmed) ? 'heading3' : 'paragraph';
        blocks.push({ type, text: trimmed });
      }
    });
  }

  return blocks.length > 0 ? blocks : [{ type: 'paragraph', text: 'No readable content found in the document.' }];
}

function detectWordHeading(text: string): boolean {
  const cleanText = text.trim();
  if (cleanText.length < 60 && cleanText.split(' ').length <= 8) {
    const isTitleCase = /^[A-Z][a-z]*(\s+[A-Z][a-z]*)*$/.test(cleanText);
    const isAllCaps = cleanText === cleanText.toUpperCase() && cleanText.length > 3;
    if (isTitleCase || isAllCaps) return true;
  }
  if (/^(Chapter\s+\d+|Section\s+\d+|\d+\.|\d+\.\d+)/i.test(cleanText)) {
    return true;
  }
  return false;
}



export const convertPowerPointToPdf = async (file: File): Promise<Blob> => {
  await ensureJsPdf();
  await ensureHtml2canvas();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const JSZip = _JSZip;
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. Detect presentation slide size (Widescreen 16:9 vs Standard 4:3)
    let isWidescreen = true;
    try {
      const presXml = await zip.file('ppt/presentation.xml')?.async('text');
      if (presXml) {
        const szMatch = presXml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
        if (szMatch) {
          const cx = parseInt(szMatch[1], 10);
          const cy = parseInt(szMatch[2], 10);
          isWidescreen = (cx / cy) > 1.45;
        }
      }
    } catch {
      isWidescreen = true;
    }

    // 2. Find all slide XML files
    const slideFiles = Object.keys(zip.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)![0], 10);
        const numB = parseInt(b.match(/\d+/)![0], 10);
        return numA - numB;
      });

    if (slideFiles.length === 0) {
      throw new Error('No slides found in the presentation file. Supported formats: .pptx');
    }

    // Setup PDF dimensions: Widescreen (16:9) or Standard (4:3)
    const pageWidth = isWidescreen ? 842 : 792;
    const pageHeight = isWidescreen ? 474 : 595;
    const pdf = new _jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: isWidescreen ? [pageWidth, pageHeight] : 'a4'
    });

    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);

    // Get all media images list for fallback mapping
    const allMediaFiles = Object.keys(zip.files)
      .filter((f) => /^ppt\/media\/.+\.(png|jpe?g|webp|gif|bmp)$/i.test(f))
      .sort((a, b) => {
        const matchA = a.match(/\d+/);
        const matchB = b.match(/\d+/);
        const numA = parseInt(matchA ? matchA[0] : '0', 10);
        const numB = parseInt(matchB ? matchB[0] : '0', 10);
        return numA - numB;
      });

    for (let i = 0; i < slideFiles.length; i++) {
      if (i > 0) {
        pdf.addPage([pageWidth, pageHeight], 'landscape');
      }

      const slidePath = slideFiles[i];
      const slideXml = await zip.files[slidePath].async('text');

      // Robust OpenXML relationship parsing (handles any attribute order)
      const relsPath = `ppt/slides/_rels/${slidePath.split('/').pop()}.rels`;
      const relsFile = zip.files[relsPath];
      let mediaImages: { [id: string]: string } = {};

      if (relsFile) {
        try {
          const relsXml = await relsFile.async('text');
          const relTagMatches = relsXml.matchAll(/<Relationship\b([^>]+)\/?>/gi);
          for (const match of relTagMatches) {
            const attrsStr = match[1];
            const idMatch = attrsStr.match(/\bId="([^"]+)"/i);
            const targetMatch = attrsStr.match(/\bTarget="([^"]+)"/i);
            const typeMatch = attrsStr.match(/\bType="([^"]+)"/i);

            if (idMatch && targetMatch) {
              const relId = idMatch[1];
              const target = targetMatch[1];
              const isImg = typeMatch
                ? typeMatch[1].toLowerCase().includes('image')
                : /\.(png|jpe?g|webp|gif|bmp)$/i.test(target);

              if (isImg) {
                let cleanTarget = target.replace(/^\.\.\//, 'ppt/');
                if (!cleanTarget.startsWith('ppt/')) cleanTarget = 'ppt/' + cleanTarget;

                const mediaFile = zip.files[cleanTarget] || zip.files[`ppt/media/${target.split('/').pop()}`];
                if (mediaFile) {
                  const base64 = await mediaFile.async('base64');
                  const ext = target.split('.').pop()?.toLowerCase() || 'png';
                  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
                  mediaImages[relId] = `data:${mime};base64,${base64}`;
                }
              }
            }
          }
        } catch (e) {
          console.warn('Relationship parsing warning:', e);
        }
      }

      // Fallback: If no relationship images mapped, map sequentially from media folder
      if (Object.keys(mediaImages).length === 0 && allMediaFiles.length > i) {
        const mediaFile = zip.files[allMediaFiles[i]];
        if (mediaFile) {
          const base64 = await mediaFile.async('base64');
          const ext = allMediaFiles[i].split('.').pop()?.toLowerCase() || 'png';
          const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
          mediaImages['fallback'] = `data:${mime};base64,${base64}`;
        }
      }

      // Extract slide title & bullet paragraphs
      const paragraphs: Array<{ text: string; isTitle: boolean }> = [];
      const pMatches = slideXml.match(/<a:p[\s\S]*?<\/a:p>/gi) || [];

      pMatches.forEach((pXml, pIdx) => {
        const textMatches = pXml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/gi) || [];
        const pText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, '').trim())
          .filter(Boolean)
          .join(' ');

        if (pText) {
          paragraphs.push({
            text: pText,
            isTitle: pIdx === 0 && pText.length < 80
          });
        }
      });

      const imageKeys = Object.keys(mediaImages);

      // SCENARIO 1: Full-slide image (converted from PDF, photo deck, or full slide graphics)
      if (imageKeys.length > 0 && (paragraphs.length === 0 || (paragraphs.length <= 2 && paragraphs[0].text.length < 25))) {
        const mainImg = mediaImages[imageKeys[0]];
        pdf.addImage(mainImg, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        continue;
      }

      // SCENARIO 2: Formatted text presentation slide
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Top slide color accent bar
      pdf.setFillColor(234, 88, 12);
      pdf.rect(0, 0, pageWidth, 4, 'F');

      let currentY = margin + 20;

      // Render side image if available
      if (imageKeys.length > 0) {
        try {
          const firstImg = mediaImages[imageKeys[0]];
          const imgW = Math.min(260, contentWidth * 0.4);
          const imgH = Math.min(pageHeight - (margin * 2) - 30, 260);
          pdf.addImage(firstImg, 'PNG', pageWidth - margin - imgW, currentY, imgW, imgH, undefined, 'FAST');
        } catch {
          // Graceful fallback
        }
      }

      const textColWidth = imageKeys.length > 0 ? contentWidth - 280 : contentWidth;

      if (paragraphs.length > 0) {
        paragraphs.forEach((p, idx) => {
          if (currentY > pageHeight - margin - 30) return;

          if (p.isTitle) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(22);
            pdf.setTextColor(15, 23, 42);
            const lines = pdf.splitTextToSize(p.text, textColWidth);
            pdf.text(lines, margin, currentY);
            currentY += (lines.length * 26) + 8;

            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(1);
            pdf.line(margin, currentY - 4, margin + Math.min(textColWidth, 400), currentY - 4);
            currentY += 12;
          } else {
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(13);
            pdf.setTextColor(51, 65, 85);
            const prefix = idx > 0 ? '•  ' : '';
            const lines = pdf.splitTextToSize(`${prefix}${p.text}`, textColWidth);
            pdf.text(lines, margin + (idx > 0 ? 10 : 0), currentY);
            currentY += (lines.length * 18) + 8;
          }
        });
      } else {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.setTextColor(148, 163, 184);
        pdf.text(`Slide ${i + 1}`, pageWidth / 2, pageHeight / 2, { align: 'center' });
      }

      // Slide Footer
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(file.name.replace(/\.[^/.]+$/, ''), margin, pageHeight - 16);
      pdf.text(`Slide ${i + 1} of ${slideFiles.length}`, pageWidth - margin, pageHeight - 16, { align: 'right' });
    }

    return pdf.output('blob');
  } catch (error) {
    console.error('PowerPoint to PDF conversion error:', error);
    const pdf = new _jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PowerPoint to PDF Error', 40, 50);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 40, 75);
    pdf.text(`Please verify the file is a valid .pptx PowerPoint file.`, 40, 95);
    return pdf.output('blob');
  }
};
