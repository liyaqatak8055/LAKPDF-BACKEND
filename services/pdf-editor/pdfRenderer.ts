// PDF Renderer Service - Lazy loaded pdfjs-dist wrapper
import type {
  PdfDocument,
  PdfPage,
  PdfViewport,
  PdfTextContent,
  PdfEditorConfig,
  PdfPerformanceMetrics
} from '../../types/pdfEditor';

class PdfRendererService {
  private pdfjs: any = null;
  private isInitialized = false;
  private config: PdfEditorConfig;

  constructor(config: PdfEditorConfig) {
    this.config = config;
  }

  /**
   * Initialize pdfjs-dist library with lazy loading
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamic import for lazy loading
      const pdfjsLib = await import('pdfjs-dist');
      const pdfjs = pdfjsLib as any;
      // Set worker source from local public asset to avoid CORS failures.
      pdfjs.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

      this.pdfjs = pdfjs;
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize PDF.js:', error);
      throw new Error('PDF renderer initialization failed');
    }
  }

  /**
   * Load PDF document from File
   */
  async loadDocument(file: File): Promise<PdfDocument> {
    await this.initialize();

    if (file.size > this.config.maxFileSize) {
      throw new Error(`File size exceeds maximum limit of ${this.config.maxFileSize / (1024 * 1024)}MB`);
    }

    const arrayBuffer = await file.arrayBuffer();

    try {
      const pdf = await this.pdfjs.getDocument({
        data: arrayBuffer,
        cMapUrl: `https://cdn.jsdelivr.net/npm/pdfjs-dist@${this.pdfjs.version || '5.4.624'}/cmaps/`,
        cMapPacked: true,
        enableXfa: false, // Disable XFA forms for better performance
        disableFontFace: false, // Enable font rendering
        isEvalSupported: false, // Security: disable eval
      }).promise;

      const totalPages = pdf.numPages;
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: this.config.defaultZoom });

      const document: PdfDocument = {
        id: `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        totalPages,
        currentPage: 1,
        zoom: this.config.defaultZoom,
        rotation: 0,
        viewport: {
          width: viewport.width,
          height: viewport.height,
          scale: this.config.defaultZoom,
          offsetX: 0,
          offsetY: 0
        },
        annotations: [],
        isDirty: false,
        lastModified: new Date()
      };

      return document;
    } catch (error: any) {
      console.error('Failed to load PDF document:', error);
      if (error.name === 'PasswordException') {
        throw new Error('This PDF is password protected. Please unlock it first.');
      } else if (error.name === 'InvalidPDFException') {
        throw new Error('Invalid PDF file. Please check the file format.');
      } else {
        throw new Error('Failed to load PDF document. Please try another file.');
      }
    }
  }

  /**
   * Render PDF page to canvas with performance monitoring
   */
  async renderPage(
    pdfDocument: any,
    pageNumber: number,
    scale: number,
    canvas: HTMLCanvasElement,
    onProgress?: (progress: number) => void
  ): Promise<PdfPerformanceMetrics> {
    const startTime = performance.now();

    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);

      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: false, // Disable WebGL for better compatibility
      };

      const renderTask = page.render(renderContext);

      // Progress callback
      if (onProgress) {
        renderTask.onProgress = (progress: any) => {
          onProgress(progress.percent || 0);
        };
      }

      await renderTask.promise;

      const endTime = performance.now();

      return {
        renderTime: endTime - startTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        canvasCount: 1,
        textLayerCount: 0,
        annotationCount: 0,
        lastGcTime: new Date()
      };
    } catch (error) {
      console.error('Failed to render PDF page:', error);
      throw new Error('Failed to render PDF page');
    }
  }

  /**
   * Extract text content from PDF page
   */
  async extractTextContent(pdfDocument: any, pageNumber: number): Promise<PdfTextContent[]> {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const viewport = page.getViewport({ scale: 1.0 });

      const textItems: PdfTextContent[] = textContent.items.map((item: any, index: number) => {
        // Transform PDF coordinates to viewport coordinates
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        const x = transform[4];
        const y = viewport.height - transform[5] - (item.height || 12);

        return {
          id: `text_${pageNumber}_${index}`,
          text: item.str,
          x,
          y,
          width: item.width || item.str.length * 8, // Estimate width
          height: item.height || 12,
          fontSize: item.height || 12,
          fontFamily: 'Arial', // Default fallback
          color: '#000000',
          isEditable: true,
          originalBounds: new DOMRect(x, y, item.width || item.str.length * 8, item.height || 12)
        };
      });

      return textItems;
    } catch (error) {
      console.error('Failed to extract text content:', error);
      return [];
    }
  }

  /**
   * Generate thumbnail for PDF page
   */
  async generateThumbnail(pdfDocument: any, pageNumber: number, size: number = 150): Promise<string> {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: size / Math.max(page.getViewport({ scale: 1 }).width, page.getViewport({ scale: 1 }).height) });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const context = canvas.getContext('2d');
      if (!context) return '';

      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      return '';
    }
  }

  /**
   * Get page information
   */
  async getPageInfo(pdfDocument: any, pageNumber: number): Promise<PdfPage> {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.0 });

    return {
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      scale: 1.0,
      rotation: 0,
      annotations: []
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    // Clear any cached data
    if (this.pdfjs) {
      // Force garbage collection hint
      if (typeof window !== 'undefined' && (window as any).gc) {
        (window as any).gc();
      }
    }
  }

  /**
   * Check if PDF.js is supported in current browser
   */
  isSupported(): boolean {
    return typeof window !== 'undefined' &&
           window.HTMLCanvasElement &&
           window.CanvasRenderingContext2D &&
           typeof Promise !== 'undefined';
  }
}

// Export singleton instance
export const pdfRenderer = new PdfRendererService({
  maxFileSize: 50 * 1024 * 1024, // 50MB
  supportedFormats: ['application/pdf'],
  defaultZoom: 1.0,
  maxZoom: 3.0,
  minZoom: 0.25,
  enableTextSelection: true,
  enableAnnotations: true,
  autoSaveInterval: 30000 // 30 seconds
});

export default pdfRenderer;
