import { pdfjs } from './pdfService';
import { sanitizeHtml } from './htmlSanitizer';
// @ts-ignore
import * as docxModule from 'docx';
const docx: any = (docxModule as any).default || docxModule;
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell } = docx;
// @ts-ignore
import PptxGenJS from 'pptxgenjs';
// @ts-ignore
import mammoth from 'mammoth';
// @ts-ignore
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2canvas from 'html2canvas';
// @ts-ignore
import * as TesseractModule from 'tesseract.js';
const Tesseract: any = (TesseractModule as any).default || TesseractModule;
import JSZip from 'jszip';

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

export const convertPdfToWord = async (
  file: File,
  options: {
    method: 'auto' | 'text' | 'ocr';
    ocrLanguage?: 'eng' | 'hin' | 'eng+hin';
  } = { method: 'auto' }
): Promise<Blob> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const documentChildren: (Paragraph | Table)[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];

    if (items.length > 0) {
      const structuredLines = buildStructuredLinesFromTextItems(items);
      let tableBuffer: string[][] = [];

      const flushTableBuffer = () => {
        if (tableBuffer.length >= 2) {
          const normalized = normalizeTableRows(tableBuffer);
          if (normalized.length >= 2) {
            documentChildren.push(createProfessionalTable(normalized));
          } else {
            tableBuffer.forEach((row) => {
              documentChildren.push(createBodyParagraph(row.join(' | '), 'normalPara'));
            });
          }
        } else if (tableBuffer.length === 1) {
          documentChildren.push(createBodyParagraph(tableBuffer[0].join(' | '), 'normalPara'));
        }
        tableBuffer = [];
      };

      structuredLines.forEach((line, lineIndex) => {
        const isTableLine = shouldTreatAsTableLine(line.cells);
        if (isTableLine) {
          tableBuffer.push(line.cells);
          return;
        }

        flushTableBuffer();

        const isHeading = line.isBold || line.fontSize > 14 || detectHeadingFromText(line.lineText);
        const headingLevel = isHeading ? (line.fontSize >= 20 ? 1 : line.fontSize >= 16 ? 2 : 3) : 0;

        if (headingLevel === 1 || headingLevel === 2 || headingLevel === 3) {
          documentChildren.push(createProfessionalHeading(line.lineText, headingLevel));
        } else {
          documentChildren.push(new Paragraph({
            children: [
              new TextRun({
                text: line.lineText,
                size: safeInt(Math.max(16, line.fontSize * 2), 24),
                bold: Boolean(line.isBold),
                color: '000000',
              })
            ],
            spacing: {
              after: lineIndex === structuredLines.length - 1 ? 240 : 120,
              line: 276,
            },
          }));
        }
      });

      flushTableBuffer();
    }

    // Add page separator if not the last page
    if (pageNum < pdf.numPages) {
      documentChildren.push(
        new Paragraph({
          children: [new TextRun({
            text: `--- Page ${pageNum + 1} ---`,
            size: 20,
            bold: true,
            color: "888888"
          })],
          spacing: { after: 300, before: 300 },
          alignment: "center" as any,
        })
      );
    }
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 inch in twips
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
      children: documentChildren.length > 0 ? documentChildren : [
        new Paragraph({
          children: [new TextRun({ text: 'No content extracted', size: 24 })]
        })
      ],
    }],
  });

  return await Packer.toBlob(doc);
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
  console.log('Starting accurate PDF to Word conversion for:', file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF loaded, pages:', pdf.numPages);

    const documentChildren: (Paragraph | Table)[] = [];
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

        const worker = await Tesseract.createWorker(language);
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
              // Process OCR lines with better accuracy
              result.data.lines.forEach((line: any) => {
                if (line.text && line.text.trim()) {
                  const cleanedLine = cleanOcrTextAdvanced(line.text, preset, language);
                  const isHeading = detectHeadingFromText(cleanedLine);

                  const textRun = new TextRun({
                    text: cleanedLine.trim(),
                    size: safeInt(isHeading ? 28 : 24, 24),
                    bold: Boolean(isHeading),
                    color: '000000',
                  });

                  const paragraph = new Paragraph({
                    children: [textRun],
                    spacing: {
                      after: safeInt(120, 120),
                      line: safeInt(276, 276),
                    },
                  });

                  documentChildren.push(paragraph);
                }
              });
            } else if (result.data.text) {
              // Fallback: process OCR text as paragraphs
              const lines = result.data.text
                .split('\n')
                .map((line) => cleanOcrTextAdvanced(line, preset, language))
                .filter(line => line.trim());

              lines.forEach((line) => {
                if (line.trim()) {
                  const isHeading = detectHeadingFromText(line);

                  const textRun = new TextRun({
                    text: line.trim(),
                    size: safeInt(isHeading ? 28 : 24, 24),
                    bold: Boolean(isHeading),
                    color: '000000',
                  });

                  const paragraph = new Paragraph({
                    children: [textRun],
                    spacing: {
                      after: safeInt(120, 120),
                      line: safeInt(276, 276),
                    },
                  });

                  documentChildren.push(paragraph);
                }
              });
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
      styles: {
        paragraphStyles: [{
          id: 'normalPara',
          name: 'Normal Para',
          run: {
            size: safeInt(24, 24),
            font: 'Arial',
          },
          paragraph: {
            spacing: {
              line: safeInt(276, 276),
              after: safeInt(200, 200),
            },
          },
        }],
      },
    });

    console.log(`Document created with ${documentChildren.length} elements`);
    const blob = await Packer.toBlob(doc);
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

    return await Packer.toBlob(errorDoc);
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
function processExtractedText(rawText: string): (Paragraph | Table)[] {
  const lines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const elements: (Paragraph | Table)[] = [];

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
function createBodyParagraph(text: string, styleId: string = 'normalPara'): Paragraph {
  // Ensure text is valid
  const safeText = (text || '').trim();
  if (!safeText) return new Paragraph({ children: [] });

  return new Paragraph({
    children: [new TextRun({
      text: safeText,
      size: 24, // 12pt - consistent body text
      color: '000000', // Always black for body text
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
function createProfessionalHeading(text: string, level: 1 | 2 | 3): Paragraph {
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
function createProfessionalListItem(text: string, type: 'bullet' | 'number', level: number): Paragraph {
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
function createProfessionalTable(data: string[][]): Table {
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

  // Create header row
  const headerRow = new TableRow({
    children: cleanData[0].map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({
          text: cell || '',
          bold: true,
          size: 24, // 12pt
          color: '000000',
        })],
      })],
      margins: {
        top: 120,    // 0.08 inch
        bottom: 120,
        left: 120,
        right: 120,
      },
    })),
  });

  // Create data rows
  const dataRows = cleanData.slice(1).map(row =>
    new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text: cell || '',
            size: 24, // 12pt
            color: '000000',
          })],
        })],
        margins: {
          top: 120,
          bottom: 120,
          left: 120,
          right: 120,
        },
      })),
    })
  );

  return new Table({
    rows: [headerRow, ...dataRows],
    width: {
      size: 100,
      type: 'percentage' as any, // 100% width
    },
    // borders: {
    //   top: { style: 'single' as any, size: 1, color: '000000' },
    //   bottom: { style: 'single' as any, size: 1, color: '000000' },
    //   left: { style: 'single' as any, size: 1, color: '000000' },
    //   right: { style: 'single' as any, size: 1, color: '000000' },
    //   insideHorizontal: { style: 'single' as any, size: 1, color: '000000' },
    //   insideVertical: { style: 'single' as any, size: 1, color: '000000' },
    // },
  });
}

function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Multiple spaces to single
    .replace(/([.!?])\s*([A-Z])/g, '$1 $2')  // Proper sentence spacing
    .trim()
    .normalize('NFC');
}

function createHeading(text: string, level: 1 | 2 | 3): Paragraph {
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

function createParagraph(text: string, styleId: string = 'normalPara'): Paragraph {
  return new Paragraph({
    children: [new TextRun({
      text: cleanText(text),
      size: 24, // 12pt
    })],
    style: styleId,
  });
}

function createListItem(text: string, type: 'bullet' | 'number', level: number): Paragraph {
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

function createTable(data: string[][]): Table {
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

// --- Office to PDF Converters ---

/**
 * Clean broken Word icons, mojibake characters, and private use area glyphs
 */
const cleanWordHtmlAndMojibake = (html: string): string => {
  if (!html) return '';
  return html
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
 * Professional Word to PDF conversion with accurate formatting preservation
 */
export const convertWordToPdf = async (file: File): Promise<Blob> => {
  console.log('Starting high-fidelity Word to PDF conversion for:', file.name);

  try {
    const arrayBuffer = await file.arrayBuffer();

    // 1. Extract HTML structure using mammoth with image support
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

    // If DOM is available, render with high-DPI HTML2Canvas for 1:1 Word layout fidelity
    if (typeof document !== 'undefined') {
      const renderContainer = document.createElement('div');
      renderContainer.id = 'word-pdf-staging-container';
      renderContainer.style.position = 'fixed';
      renderContainer.style.left = '-9999px';
      renderContainer.style.top = '0';
      renderContainer.style.width = '800px'; // standard A4 display width
      renderContainer.style.minHeight = '1130px';
      renderContainer.style.padding = '48px 56px';
      renderContainer.style.boxSizing = 'border-box';
      renderContainer.style.backgroundColor = '#FFFFFF';
      renderContainer.style.color = '#0f172a';
      renderContainer.style.fontFamily = "'Inter', 'Calibri', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif";
      renderContainer.style.fontSize = '13.5px';
      renderContainer.style.lineHeight = '1.42';
      renderContainer.style.letterSpacing = 'normal';
      renderContainer.style.wordBreak = 'break-word';
      renderContainer.style.webkitFontSmoothing = 'antialiased';

      // Insert styles for headings, lists, tables, and links
      renderContainer.innerHTML = `
        <style>
          #word-pdf-staging-container h1 { font-size: 20px; font-weight: 800; color: #0f172a; margin: 12px 0 4px 0; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 3px; letter-spacing: -0.01em; }
          #word-pdf-staging-container h2 { font-size: 16px; font-weight: 700; color: #1e293b; margin: 10px 0 3px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 2px; }
          #word-pdf-staging-container h3 { font-size: 14px; font-weight: 700; color: #334155; margin: 8px 0 2px 0; }
          #word-pdf-staging-container p { margin: 0 0 6px 0; line-height: 1.45; color: #1e293b; }
          #word-pdf-staging-container strong, #word-pdf-staging-container b { font-weight: 700; color: #0f172a; }
          #word-pdf-staging-container ul, #word-pdf-staging-container ol { margin: 4px 0 8px 0; padding-left: 20px; }
          #word-pdf-staging-container li { margin-bottom: 3px; line-height: 1.4; color: #1e293b; }
          #word-pdf-staging-container table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12.5px; }
          #word-pdf-staging-container th, #word-pdf-staging-container td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; vertical-align: top; }
          #word-pdf-staging-container a { color: #2563eb; text-decoration: underline; word-break: break-all; }
          #word-pdf-staging-container img { max-width: 100%; height: auto; display: inline-block; margin: 4px 0; }
        </style>
        <div>${safeHtml}</div>
      `;

      document.body.appendChild(renderContainer);

      try {
        const canvas = await html2canvas(renderContainer, {
          scale: 3.0, // Ultra High-DPI 300 DPI print quality
          useCORS: true,
          logging: false,
          backgroundColor: '#FFFFFF',
          windowWidth: 800
        });

        const imgWidth = 210; // A4 mm
        const imgHeight = 297; // A4 mm
        const canvasPageHeight = Math.round(canvas.width * (297 / 210));
        const totalCanvasHeight = canvas.height;
        const rawPages = Math.max(1, Math.ceil(totalCanvasHeight / canvasPageHeight));

        const pdf = new jsPDF('p', 'mm', 'a4');
        let addedPages = 0;

        for (let page = 0; page < rawPages; page++) {
          const srcY = page * canvasPageHeight;
          const sliceHeight = Math.min(canvasPageHeight, totalCanvasHeight - srcY);

          if (sliceHeight <= 0) break;

          // Create slice canvas
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = canvasPageHeight;
          const sliceCtx = sliceCanvas.getContext('2d');

          if (sliceCtx) {
            sliceCtx.fillStyle = '#FFFFFF';
            sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            sliceCtx.drawImage(
              canvas,
              0, srcY, canvas.width, sliceHeight,
              0, 0, sliceCanvas.width, sliceHeight
            );

            // Check if page slice has actual content or is just trailing whitespace
            if (page > 0) {
              const pixelData = sliceCtx.getImageData(0, 0, sliceCanvas.width, Math.min(sliceHeight, sliceCanvas.height)).data;
              let hasContent = false;
              for (let i = 0; i < pixelData.length; i += 64) {
                // If any pixel is not pure white
                if (pixelData[i] < 248 || pixelData[i + 1] < 248 || pixelData[i + 2] < 248) {
                  hasContent = true;
                  break;
                }
              }
              if (!hasContent) continue; // Skip blank trailing page
            }

            const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.98);
            if (addedPages > 0) pdf.addPage();
            pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
            addedPages++;
          }
        }

        if (addedPages === 0) {
          // Fallback if all slices somehow skipped
          const sliceData = canvas.toDataURL('image/jpeg', 0.98);
          pdf.addImage(sliceData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        }

        return pdf.output('blob');
      } finally {
        if (renderContainer.parentNode) {
          renderContainer.parentNode.removeChild(renderContainer);
        }
      }
    }

    // Fallback if no DOM available
    const pdf = new jsPDF('p', 'mm', 'a4');
    const lines = pdf.splitTextToSize(cleanedHtml.replace(/<[^>]*>/g, ' '), 170);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    let y = 20;
    for (const line of lines) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 20, y);
      y += 6;
    }
    return pdf.output('blob');

  } catch (error) {
    console.error('Word to PDF conversion failed:', error);
    const pdf = new jsPDF('p', 'mm', 'a4');
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
  try {
    const arrayBuffer = await file.arrayBuffer();
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
    const pdf = new jsPDF({
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
        const numA = parseInt(a.match(/\d+/) || ['0'], 10);
        const numB = parseInt(b.match(/\d+/) || ['0'], 10);
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
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
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
