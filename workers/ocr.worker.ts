/**
 * OCR Web Worker
 * Runs Tesseract.js OCR processing in a separate thread
 * to prevent UI blocking
 */

import { createWorker, Worker as TesseractWorker } from 'tesseract.js';

let worker: TesseractWorker | null = null;

interface OCRRequest {
    type: 'init' | 'recognize' | 'terminate';
    imageData?: ImageData | string;
    language?: string;
}

interface OCRResponse {
    type: 'progress' | 'result' | 'error' | 'ready';
    progress?: number;
    text?: string;
    error?: string;
}

/**
 * Initialize Tesseract worker
 */
async function initWorker(language: string = 'eng'): Promise<void> {
    if (worker) {
        return; // Already initialized
    }

    try {
        worker = await createWorker(language, 1, {
            logger: (m) => {
                // Send progress updates to main thread
                if (m.status === 'recognizing text') {
                    self.postMessage({
                        type: 'progress',
                        progress: Math.round(m.progress * 100),
                    } as OCRResponse);
                }
            },
        });

        self.postMessage({
            type: 'ready',
        } as OCRResponse);
    } catch (error: any) {
        self.postMessage({
            type: 'error',
            error: error.message || 'Failed to initialize OCR worker',
        } as OCRResponse);
    }
}

/**
 * Recognize text from image
 */
async function recognizeText(
    imageData: ImageData | string
): Promise<void> {
    if (!worker) {
        self.postMessage({
            type: 'error',
            error: 'Worker not initialized',
        } as OCRResponse);
        return;
    }

    try {
        const {
            data: { text },
        } = await worker.recognize(imageData);

        self.postMessage({
            type: 'result',
            text: text,
        } as OCRResponse);
    } catch (error: any) {
        self.postMessage({
            type: 'error',
            error: error.message || 'OCR recognition failed',
        } as OCRResponse);
    }
}

/**
 * Terminate worker
 */
async function terminateWorker(): Promise<void> {
    if (worker) {
        await worker.terminate();
        worker = null;
    }
}

/**
 * Message handler
 */
self.onmessage = async (event: MessageEvent<OCRRequest>) => {
    const { type, imageData, language } = event.data;

    switch (type) {
        case 'init':
            await initWorker(language);
            break;

        case 'recognize':
            if (imageData) {
                await recognizeText(imageData);
            }
            break;

        case 'terminate':
            await terminateWorker();
            break;

        default:
            self.postMessage({
                type: 'error',
                error: 'Unknown message type',
            } as OCRResponse);
    }
};

// Export empty object for TypeScript
export { };
