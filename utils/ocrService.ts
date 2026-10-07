import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import { jsPDF } from 'jspdf';

// Configure PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export interface OCRProgress {
    progress: number;
    message: string;
    currentPage?: number;
    totalPages?: number;
}

export type OCRProgressCallback = (progress: OCRProgress) => void;

import { preprocessCanvasForOcr } from './ocrPostProcess';

export interface OCROptions {
    language?: string;
    deskew?: boolean;
    denoise?: boolean;
}

/**
 * Process a PDF or image file with OCR and return a new searchable PDF
 * @param file - The PDF or image file to process
 * @param onProgress - Callback for progress updates
 * @param options - Optional OCR processing parameters (language, deskew, denoise)
 * @returns Promise<File> - New PDF file with searchable text
 */
export async function processFileWithOCR(
    file: File,
    onProgress: OCRProgressCallback,
    options?: OCROptions
): Promise<File> {
    const lang = options?.language || 'eng+hin';
    onProgress({ progress: 0, message: `Initializing OCR engine (${lang})...` });

    // Create Tesseract worker
    const worker = await Tesseract.createWorker(lang, 1, {
        logger: (m: any) => {
            if (m.status === 'recognizing text') {
                // Don't update progress here, we'll do it per page
            } else if (m.status === 'loading tesseract core') {
                onProgress({ progress: 5, message: 'Loading OCR Core...' });
            } else if (m.status === 'initializing api') {
                onProgress({ progress: 10, message: 'Initializing API...' });
            }
        }
    });

    try {
        // Configure Tesseract for better accuracy
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });

        onProgress({ progress: 15, message: 'Processing document...' });

        // Create new PDF for output
        const outputPdf = new jsPDF();
        let isFirstPage = true;

        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
            // Load PDF
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;

            // Process each page
            for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
                const pageProgress = 15 + ((pageNum - 1) / totalPages) * 70; // 15% to 85%
                onProgress({
                    progress: Math.round(pageProgress),
                    message: `Scanning page ${pageNum} of ${totalPages}...`,
                    currentPage: pageNum,
                    totalPages
                });

                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 2.5 });

                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

                    // Apply pre-processing (deskew, denoise)
                    let processedCanvas = canvas;
                    if (options?.deskew || options?.denoise) {
                        processedCanvas = preprocessCanvasForOcr(canvas, {
                            deskew: options.deskew,
                            denoise: options.denoise,
                            contrastBoost: 1.25,
                        });
                    }

                    const blob = await new Promise<Blob | null>(resolve =>
                        processedCanvas.toBlob(resolve, 'image/png')
                    );

                    if (blob) {
                        const { data: { text } } = await worker.recognize(blob);

                        if (!isFirstPage) {
                            outputPdf.addPage();
                        }
                        isFirstPage = false;

                        const pdfWidth = outputPdf.internal.pageSize.getWidth();
                        const pdfHeight = outputPdf.internal.pageSize.getHeight();

                        const imageData = processedCanvas.toDataURL('image/jpeg', 0.85);
                        outputPdf.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

                        if (text && text.trim()) {
                            outputPdf.setTextColor(255, 255, 255);
                            outputPdf.setFontSize(2);
                            const lines = text.split('\n').filter(line => line.trim());
                            const margin = 5;
                            const lineHeight = 3;
                            let y = margin;
                            lines.forEach(line => {
                                if (y < pdfHeight - margin) {
                                    outputPdf.text(line.substring(0, 120), margin, y);
                                    y += lineHeight;
                                }
                            });
                        }
                    }
                }
            }
        } else {
            // Direct image upload
            onProgress({ progress: 30, message: 'Processing image...' });
            const img = new Image();
            img.src = URL.createObjectURL(file);
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(img.src);

                let processedCanvas = canvas;
                if (options?.deskew || options?.denoise) {
                    processedCanvas = preprocessCanvasForOcr(canvas, {
                        deskew: options.deskew,
                        denoise: options.denoise,
                        contrastBoost: 1.25,
                    });
                }

                const blob = await new Promise<Blob | null>(resolve =>
                    processedCanvas.toBlob(resolve, 'image/png')
                );

                if (blob) {
                    onProgress({ progress: 60, message: 'Recognizing text...' });
                    const { data: { text } } = await worker.recognize(blob);

                    const pdfWidth = outputPdf.internal.pageSize.getWidth();
                    const pdfHeight = outputPdf.internal.pageSize.getHeight();

                    const imageData = processedCanvas.toDataURL('image/jpeg', 0.85);
                    outputPdf.addImage(imageData, 'JPEG', 0, 0, pdfWidth, pdfHeight);

                    if (text && text.trim()) {
                        outputPdf.setTextColor(255, 255, 255);
                        outputPdf.setFontSize(2);
                        const lines = text.split('\n').filter(line => line.trim());
                        let y = 10;
                        lines.forEach(line => {
                            if (y < pdfHeight - 10) {
                                outputPdf.text(line.substring(0, 120), 10, y);
                                y += 4;
                            }
                        });
                    }
                }
            }
        }

        onProgress({ progress: 95, message: 'Finalizing Searchable PDF...' });
        const pdfBlob = outputPdf.output('blob');
        const originalName = file.name.replace(/\.[^/.]+$/, '');
        const newFile = new File(
            [pdfBlob],
            `${originalName}_searchable.pdf`,
            { type: 'application/pdf' }
        );

        onProgress({ progress: 100, message: 'OCR Complete!' });
        return newFile;
    } finally {
        await worker.terminate();
    }
}

/**
 * Process a single PDF page with OCR
 * @param page - PDF.js page object
 * @param pageNumber - Page number for logging
 * @returns Promise<string> - Extracted text
 */
export async function processPdfPageWithOCR(
    page: any,
    pageNumber: number
): Promise<string> {
    const worker = await Tesseract.createWorker('eng');

    try {
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });

        const viewport = page.getViewport({ scale: 2.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Failed to get canvas context');
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const blob = await new Promise<Blob | null>(resolve =>
            canvas.toBlob(resolve, 'image/png')
        );

        if (!blob) {
            throw new Error('Failed to create image blob');
        }

        const { data: { text } } = await worker.recognize(blob);
        return text;

    } finally {
        await worker.terminate();
    }
}

/**
 * Extract text from a PDF using OCR (Tesseract.js)
 * @param file - PDF file to OCR
 * @param onProgress - Optional progress callback
 * @returns Promise<string> - Extracted OCR text
 */
export async function extractTextWithOCR(
    file: File,
    onProgress?: OCRProgressCallback
): Promise<string> {
    onProgress?.({ progress: 0, message: 'Initializing OCR engine...' });

    const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
            if (m.status === 'loading tesseract core') {
                onProgress?.({ progress: 5, message: 'Loading OCR Core...' });
            } else if (m.status === 'initializing api') {
                onProgress?.({ progress: 10, message: 'Initializing OCR API...' });
            }
        }
    });

    try {
        await worker.setParameters({
            tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        });

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        let fullText = '';

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const progress = 10 + Math.round((pageNum / totalPages) * 85);
            onProgress?.({
                progress,
                message: `OCR scanning page ${pageNum} of ${totalPages}...`,
                currentPage: pageNum,
                totalPages
            });

            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.5 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                continue;
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;

            const blob = await new Promise<Blob | null>(resolve =>
                canvas.toBlob(resolve, 'image/png')
            );

            if (!blob) {
                continue;
            }

            const { data: { text } } = await worker.recognize(blob);
            if (text && text.trim()) {
                fullText += `\n${text}`;
            }
        }

        onProgress?.({ progress: 100, message: 'OCR Complete!' });
        return fullText.trim();
    } finally {
        await worker.terminate();
    }
}
