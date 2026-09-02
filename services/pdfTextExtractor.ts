import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

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
