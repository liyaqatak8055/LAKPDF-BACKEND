import * as pdfjsLib from 'pdfjs-dist';
import { aiService } from './aiService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

export interface ExtractedPage {
    pageNumber: number;
    text: string;
    wordCount: number;
}

export interface ExtractedPdfText {
    fullText: string;
    pages: ExtractedPage[];
    totalPages: number;
    totalWords: number;
    metadata?: {
        title?: string;
        author?: string;
        subject?: string;
        keywords?: string;
    };
}

/**
 * Extract text from PDF file with page-by-page breakdown
 */
export async function extractTextFromPDF(file: File): Promise<ExtractedPdfText> {
    const arrayBuffer = await file.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0,
    });

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    // Extract metadata
    let metadata = {};
    try {
        const pdfMetadata = await pdf.getMetadata();
        if (pdfMetadata?.info) {
            const info = pdfMetadata.info as any;
            metadata = {
                title: info.Title || '',
                author: info.Author || '',
                subject: info.Subject || '',
                keywords: info.Keywords || '',
            };
        }
    } catch (error) {
        console.warn('Could not extract metadata:', error);
    }

    // Extract text from all pages
    const pages: ExtractedPage[] = [];
    let fullText = '';
    let totalWords = 0;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map((item: any) => item.str || '')
            .join(' ')
            .trim();

        const wordCount = pageText.split(/\s+/).filter(w => w.length > 0).length;

        pages.push({
            pageNumber: pageNum,
            text: pageText,
            wordCount,
        });

        fullText += pageText + '\n\n';
        totalWords += wordCount;

        // Cleanup page
        page.cleanup();
    }

    // Cleanup PDF
    pdf.cleanup();
    pdf.destroy();

    return {
        fullText: fullText.trim(),
        pages,
        totalPages,
        totalWords,
        metadata,
    };
}

/**
 * Split text into chunks for processing
 */
export function splitIntoChunks(text: string, maxChunkSize: number = 3000): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let currentSize = 0;

    for (const word of words) {
        if (currentSize + word.length > maxChunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.join(' '));
            currentChunk = [word];
            currentSize = word.length;
        } else {
            currentChunk.push(word);
            currentSize += word.length + 1; // +1 for space
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk.join(' '));
    }

    return chunks;
}

/**
 * Detect language of text (simple heuristic)
 */
export function detectLanguage(text: string): 'en' | 'hi' | 'mixed' {
    // Simple detection based on Devanagari script
    const hindiChars = text.match(/[\u0900-\u097F]/g);
    const totalChars = text.replace(/\s/g, '').length;

    if (!hindiChars) return 'en';

    const hindiRatio = hindiChars.length / totalChars;

    if (hindiRatio > 0.5) return 'hi';
    if (hindiRatio > 0.1) return 'mixed';
    return 'en';
}

/**
 * Universal text extractor for PDF, Word documents (.docx/.doc), Images (JPG/PNG/WEBP), and text files.
 */
export async function extractTextFromAnyDocument(
    file: File,
    onStatus?: (status: string) => void
): Promise<ExtractedPdfText> {
    const fileName = (file.name || '').toLowerCase();
    const fileType = (file.type || '').toLowerCase();

    // 1. Text files (.txt, .md, .csv, .json, text/*)
    if (fileName.endsWith('.txt') || fileName.endsWith('.md') || fileName.endsWith('.csv') || fileName.endsWith('.json') || fileType.startsWith('text/')) {
        onStatus?.('Reading text file...');
        const text = await file.text();
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        return {
            fullText: text.trim(),
            pages: [{ pageNumber: 1, text: text.trim(), wordCount: words }],
            totalPages: 1,
            totalWords: words,
            metadata: { title: file.name },
        };
    }

    // 2. Word Documents (.docx, .doc)
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileType.includes('wordprocessingml') || fileType.includes('msword')) {
        onStatus?.('Reading Word document...');
        try {
            const mammothMod = await import('mammoth');
            const mammoth = (mammothMod as any).default || mammothMod;
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            const rawText = String(result?.value || '').trim();
            if (rawText) {
                const words = rawText.split(/\s+/).filter(w => w.length > 0).length;
                return {
                    fullText: rawText,
                    pages: [{ pageNumber: 1, text: rawText, wordCount: words }],
                    totalPages: 1,
                    totalWords: words,
                    metadata: { title: file.name },
                };
            }
        } catch (docxErr) {
            console.warn('Mammoth extraction failed, falling back:', docxErr);
        }
    }

    // 3. Images (.png, .jpg, .jpeg, .webp)
    if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || fileName.endsWith('.webp') || fileType.startsWith('image/')) {
        onStatus?.('Extracting text and details using AI Vision OCR...');
        try {
            const dataUrl = await fileToDataUrl(file);
            const visionText = await aiService.extractTextWithVision([dataUrl], file.name);
            if (visionText && visionText.trim().length > 15) {
                const words = visionText.split(/\s+/).filter(w => w.length > 0).length;
                return {
                    fullText: visionText.trim(),
                    pages: [{ pageNumber: 1, text: visionText.trim(), wordCount: words }],
                    totalPages: 1,
                    totalWords: words,
                    metadata: { title: file.name },
                };
            }
        } catch (visionErr) {
            console.warn('AI Vision OCR failed, falling back to local Tesseract OCR:', visionErr);
        }

        onStatus?.('Extracting text from image using local OCR...');
        const tesseractMod = await import('tesseract.js');
        const Tesseract = (tesseractMod as any).default || tesseractMod;
        const result = await Tesseract.recognize(file, 'eng', {
            logger: (m: any) => {
                if (m.status === 'recognizing text') {
                    onStatus?.(`Recognizing text: ${Math.round((m.progress || 0) * 100)}%`);
                }
            }
        });
        const ocrText = String(result?.data?.text || '').trim();
        const words = ocrText.split(/\s+/).filter(w => w.length > 0).length;
        return {
            fullText: ocrText,
            pages: [{ pageNumber: 1, text: ocrText, wordCount: words }],
            totalPages: 1,
            totalWords: words,
            metadata: { title: file.name },
        };
    }

    // 4. Default: PDF Document
    onStatus?.('Extracting text from PDF...');
    try {
        const pdfData = await extractTextFromPDF(file);
        // If digital PDF with rich selectable text (> 50 chars), use it directly
        if (pdfData.fullText && pdfData.fullText.trim().length > 50) {
            return pdfData;
        }

        // Scanned PDF detected: Render pages and extract with high-precision AI Vision
        onStatus?.('Scanned PDF detected. Rendering pages for AI Vision OCR...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, verbosity: 0 }).promise;
        const totalPdfPages = pdf.numPages;
        const maxPages = Math.min(totalPdfPages, 5);
        const pageImages: string[] = [];

        for (let i = 1; i <= maxPages; i++) {
            onStatus?.(`Preparing page ${i} of ${maxPages} for AI Vision OCR...`);
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                await (page.render as any)({ canvas, canvasContext: ctx, viewport }).promise;
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                pageImages.push(imgData);
            }
            page.cleanup();
        }
        pdf.cleanup();
        pdf.destroy();

        if (pageImages.length > 0) {
            onStatus?.('Extracting exact text & address using AI Vision OCR...');
            try {
                const visionText = await aiService.extractTextWithVision(pageImages, file.name);
                if (visionText && visionText.trim().length > 15) {
                    const words = visionText.split(/\s+/).filter(w => w.length > 0).length;
                    return {
                        fullText: visionText.trim(),
                        pages: [{ pageNumber: 1, text: visionText.trim(), wordCount: words }],
                        totalPages: totalPdfPages,
                        totalWords: words,
                        metadata: pdfData.metadata,
                    };
                }
            } catch (visionErr) {
                console.warn('AI Vision OCR failed on scanned PDF, falling back to local Tesseract:', visionErr);
            }
        }

        // Scanned PDF fallback to local Tesseract if Vision is unavailable (uses already-rendered pageImages)
        onStatus?.('Running local fallback OCR on pages...');
        const tesseractMod = await import('tesseract.js');
        const Tesseract = (tesseractMod as any).default || tesseractMod;
        let fullOcrText = '';
        const pages: ExtractedPage[] = [];

        for (let i = 0; i < pageImages.length; i++) {
            onStatus?.(`Running OCR on page ${i + 1} of ${pageImages.length}...`);
            try {
                const result = await Tesseract.recognize(pageImages[i], 'eng');
                const pageText = String(result?.data?.text || '').trim();
                const wordCount = pageText.split(/\s+/).filter(w => w.length > 0).length;
                pages.push({ pageNumber: i + 1, text: pageText, wordCount });
                fullOcrText += pageText + '\n\n';
            } catch (pageOcrErr) {
                console.warn(`Local OCR error on page ${i + 1}:`, pageOcrErr);
            }
        }

        const words = fullOcrText.split(/\s+/).filter(w => w.length > 0).length;
        return {
            fullText: fullOcrText.trim(),
            pages,
            totalPages: totalPdfPages,
            totalWords: words,
            metadata: pdfData.metadata,
        };
    } catch (err: any) {
        throw new Error(err?.message || 'Failed to extract text from document');
    }
}

