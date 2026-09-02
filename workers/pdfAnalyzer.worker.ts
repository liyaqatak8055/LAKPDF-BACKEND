/// <reference lib="webworker" />

// Import PDF.js and configure for web worker
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js to work in web worker context
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// Page limit hard-cap
const MAX_ANALYZE_PAGES = 25;

interface PdfPageSummary {
  pageNumber: number;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  hasText: boolean;
  hasImages: boolean;
}

// Summary and Q&A interfaces
interface PdfSummary {
  shortSummary: string;
  keyPoints: string[];
  totalWords: number;
  readingTimeMinutes: number;
  fullCleanedText?: string;
}

interface TextChunk {
  text: string;
  pageNumber: number;
}

interface PdfQnA {
  enabled: boolean;
  exampleQuestions: string[];
  // Internal storage for Q&A processing (not sent to UI)
  textChunks?: TextChunk[];
}

interface ComprehensivePdfAnalysis {
  fileName: string;
  fileSize: number;
  pageCount: number;
  pdfVersion: string;
  contentType: 'text-based' | 'scanned' | 'mixed' | 'unknown';
  hasText: boolean;
  hasImages: boolean;
  hasForms: boolean;
  textConfidence: number;
  pages: PdfPageSummary[]; // Only summary data
  pageSizeConsistency: boolean;
  mixedOrientations: boolean;
  totalImages: number;
  averageImageDpi: number;
  imagesNeedOptimization: boolean;
  embeddedFontsRatio: number;
  metadataPrivacyRisk: 'low' | 'medium' | 'high';
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
    keywords?: string[];
  };
  security?: {
    encrypted?: boolean;
    permissions?: {
      print?: boolean;
      copy?: boolean;
      modify?: boolean;
      annotate?: boolean;
    };
  };
  needsOcr: boolean;
  ocrConfidence: number;
  searchableTextRatio: number;
  optimizationScore: {
    overall: number;
    fileSize: number;
    images: number;
    fonts: number;
    structure: number;
    security: number;
  };
  recommendations: Array<{
    type: 'warning' | 'info' | 'success';
    title: string;
    description: string;
    action?: {
      text: string;
      tool: string;
      url: string;
    };
  }>;
  // New fields for Smart Summary & Q&A
  summary?: PdfSummary;
  qna?: PdfQnA;
}

const postProgress = (progress: number, step: string) => {
  (self as any).postMessage({
    type: 'progress',
    progress,
    step
  });
};

// Helper function to create minimal analysis for problematic PDFs
const createMinimalAnalysis = (fileName: string, fileSize: number, reason: string): ComprehensivePdfAnalysis => {
  const analysis: ComprehensivePdfAnalysis = {
    fileName,
    fileSize,
    pageCount: 0,
    pdfVersion: 'Unknown',
    hasText: false,
    hasImages: false,
    hasForms: false,
    contentType: 'unknown',
    needsOcr: reason === 'SCANNED_PDF',
    ocrConfidence: 0,
    pages: [],
    pageSizeConsistency: true,
    mixedOrientations: false,
    totalImages: 0,
    averageImageDpi: 0,
    imagesNeedOptimization: false,
    textConfidence: 0,
    searchableTextRatio: 0,
    embeddedFontsRatio: 1,
    metadataPrivacyRisk: 'low',
    metadata: {
      title: '',
      author: '',
      subject: '',
      creator: '',
      producer: '',
      creationDate: undefined,
      modificationDate: undefined,
      keywords: []
    },
    security: {
      encrypted: reason === 'PROTECTED_PDF',
      permissions: {
        print: reason !== 'PROTECTED_PDF',
        copy: reason !== 'PROTECTED_PDF',
        modify: reason !== 'PROTECTED_PDF',
        annotate: reason !== 'PROTECTED_PDF'
      }
    },
    optimizationScore: {
      overall: reason === 'SCANNED_PDF' ? 60 : 50,
      fileSize: 70,
      images: 60,
      fonts: 80,
      structure: 50,
      security: reason === 'PROTECTED_PDF' ? 40 : 80
    },
    recommendations: []
  };

  // Add appropriate recommendations based on the issue
  if (reason === 'SCANNED_PDF' || reason === 'NO_READABLE_TEXT') {
    analysis.recommendations = [{
      type: 'warning',
      title: 'OCR Required for Scanned PDF',
      description: 'This PDF appears to be scanned or image-based. OCR can make the text searchable and editable.',
      action: {
        text: 'Run OCR',
        tool: 'ocr-pdf',
        url: '/ocr-pdf'
      }
    }];
  } else if (reason === 'PROTECTED_PDF') {
    analysis.recommendations = [{
      type: 'warning',
      title: 'Password Protected PDF',
      description: 'This PDF is password-protected. Remove protection to enable full analysis.',
      action: {
        text: 'Unlock PDF',
        tool: 'unlock-pdf',
        url: '/unlock'
      }
    }];
  } else if (reason === 'EMPTY_PDF') {
    analysis.recommendations = [{
      type: 'info',
      title: 'Empty PDF Document',
      description: 'This PDF document contains no pages. Please check if the file is valid.',
      action: undefined
    }];
  }

  return analysis;
};

const calculateOptimizationScore = (analysis: any) => {
  // More granular file size scoring
  let fileSizeScore = 100;
  if (analysis.fileSize > 50 * 1024 * 1024) fileSizeScore = 30; // >50MB
  else if (analysis.fileSize > 20 * 1024 * 1024) fileSizeScore = 50; // >20MB
  else if (analysis.fileSize > 10 * 1024 * 1024) fileSizeScore = 60; // >10MB
  else if (analysis.fileSize > 5 * 1024 * 1024) fileSizeScore = 75; // >5MB
  else if (analysis.fileSize > 2 * 1024 * 1024) fileSizeScore = 85; // >2MB

  // Enhanced image scoring based on actual DPI and optimization potential
  let imageScore = 100;
  if (analysis.totalImages > 0) {
    if (analysis.averageImageDpi < 72) imageScore = 50; // Very low quality
    else if (analysis.averageImageDpi < 150) imageScore = 65; // Low quality
    else if (analysis.averageImageDpi < 200) imageScore = 80; // Acceptable
    else if (analysis.averageImageDpi > 300) imageScore = 85; // High quality (might be over-optimized)

    // Penalize if images need optimization
    if (analysis.imagesNeedOptimization) imageScore = Math.max(50, imageScore - 15);
  }

  // Enhanced font scoring
  let fontScore = 100;
  if (analysis.embeddedFontsRatio < 1) {
    fontScore = Math.max(50, 100 - (1 - analysis.embeddedFontsRatio) * 50);
  }

  // Enhanced security scoring
  let securityScore = 100;
  if (analysis.metadataPrivacyRisk === 'high') securityScore = 60;
  else if (analysis.metadataPrivacyRisk === 'medium') securityScore = 80;

  // Structure score based on content quality
  let structureScore = 85;
  if (analysis.textConfidence > 80) structureScore = 95;
  else if (analysis.textConfidence < 30) structureScore = 70;

  const overall = Math.round((fileSizeScore + imageScore + fontScore + securityScore + structureScore) / 5);

  return {
    overall,
    fileSize: fileSizeScore,
    images: imageScore,
    fonts: fontScore,
    structure: structureScore,
    security: securityScore
  };
};

// ============ TEXT PROCESSING UTILITIES ============

// Stop words for Q&A processing
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'how',
  'which', 'this', 'these', 'those', 'can', 'could', 'should', 'would'
]);

// Clean and normalize text
const cleanText = (text: string): string => {
  return text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[\r\n]+/g, ' ') // Remove line breaks
    .trim();
};

// Split text into sentences
const splitIntoSentences = (text: string): string[] => {
  // Simple sentence splitting by periods, exclamation, question marks
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Filter out very short fragments
};

// Extract keywords from text (remove stop words)
const extractKeywords = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !STOP_WORDS.has(word));
};

// Calculate word frequency
const calculateWordFrequency = (words: string[]): Map<string, number> => {
  const freq = new Map<string, number>();
  words.forEach(word => {
    freq.set(word, (freq.get(word) || 0) + 1);
  });
  return freq;
};

// Score sentence importance (TF-IDF-like)
const scoreSentence = (
  sentence: string,
  wordFreq: Map<string, number>,
  position: number,
  totalSentences: number
): number => {
  const words = extractKeywords(sentence);
  const length = sentence.length;

  // Length score (prefer 50-150 chars)
  let lengthScore = 0;
  if (length >= 50 && length <= 150) lengthScore = 1.0;
  else if (length >= 30 && length <= 200) lengthScore = 0.7;
  else lengthScore = 0.3;

  // Position score (prefer early sentences)
  const positionScore = 1 - (position / totalSentences) * 0.3;

  // Keyword frequency score
  let freqScore = 0;
  words.forEach(word => {
    freqScore += (wordFreq.get(word) || 0);
  });
  freqScore = Math.min(freqScore / words.length, 5) / 5; // Normalize to 0-1

  return (lengthScore * 0.3) + (positionScore * 0.3) + (freqScore * 0.4);
};

// Generate summary from text chunks — structured markdown output
const generateSummary = (textChunks: TextChunk[]): PdfSummary | undefined => {
  if (textChunks.length === 0) return undefined;

  // Combine all text
  const fullText = textChunks.map(chunk => chunk.text).join(' ');
  const cleanedText = cleanText(fullText);

  if (cleanedText.length < 100) return undefined;

  // Calculate total words and reading time
  const words = cleanedText.split(/\s+/);
  const totalWords = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200));

  // --- Section detection ---
  const detectSections = (text: string): Record<string, string[]> => {
    const sections: Record<string, string[]> = {};
    const sentences = splitIntoSentences(text);
    if (sentences.length === 0) return sections;

    // Try to detect key-value style data
    const kvPairs = text.match(/([A-Z][A-Za-z\s]{2,30}):\s*([^\n]{3,120})/g) || [];
    if (kvPairs.length >= 3) {
      sections['Key Details'] = kvPairs.slice(0, 6).map(kv => {
        const [key, ...rest] = kv.split(':');
        return `**${key.trim()}**: ${rest.join(':').trim()}`;
      });
    }

    // Score sentences and group into sections
    const allWords = extractKeywords(text);
    const wordFreq = calculateWordFrequency(allWords);
    const scored = sentences.map((s, i) => ({
      sentence: s,
      score: scoreSentence(s, wordFreq, i, sentences.length)
    }));
    scored.sort((a, b) => b.score - a.score);
    const topSentences = scored.slice(0, Math.min(8, sentences.length));
    topSentences.sort((a, b) =>
      sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );

    if (topSentences.length > 0) {
      const midpoint = Math.ceil(topSentences.length / 2);
      const part1 = topSentences.slice(0, midpoint).map(s => s.sentence.trim());
      const part2 = topSentences.slice(midpoint).map(s => s.sentence.trim());

      if (part1.length > 0) sections['Overview'] = part1;
      if (part2.length > 0) sections['Key Points'] = part2;
    }

    return sections;
  };

  // --- Build TL;DR ---
  const sentences = splitIntoSentences(cleanedText);
  const tldr = sentences.slice(0, 2).join('. ').trim() + (sentences.length > 0 ? '.' : '');

  // --- Build structured markdown ---
  const sectionData = detectSections(cleanedText);
  const markdownParts: string[] = [];

  // TL;DR opening
  if (tldr.length > 20) {
    markdownParts.push(tldr);
    markdownParts.push('');
  }

  // Render sections
  Object.entries(sectionData).forEach(([sectionTitle, bullets]) => {
    if (bullets.length === 0) return;
    markdownParts.push(`## ${sectionTitle}`);
    bullets.forEach(bullet => {
      const cleaned = bullet.trim().replace(/^[-•*]\s*/, '');
      markdownParts.push(`- ${cleaned}`);
    });
    markdownParts.push('');
  });

  const shortSummary = markdownParts.join('\n').trim() || tldr;

  // Key points for structured display
  const allWords = extractKeywords(cleanedText);
  const wordFreq = calculateWordFrequency(allWords);
  const scoredSentences = sentences.map((s, i) => ({
    sentence: s,
    score: scoreSentence(s, wordFreq, i, sentences.length)
  }));
  scoredSentences.sort((a, b) => b.score - a.score);
  const topSentences = scoredSentences.slice(0, Math.min(7, sentences.length));
  topSentences.sort((a, b) =>
    sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
  );
  const keyPoints = topSentences.map(s => s.sentence.trim()).filter(Boolean);

  return {
    shortSummary,
    keyPoints: keyPoints.slice(0, 7),
    totalWords,
    readingTimeMinutes,
    fullCleanedText: cleanedText
  };
};


// Generate example questions based on content
const generateExampleQuestions = (analysis: ComprehensivePdfAnalysis): string[] => {
  const questions: string[] = [];

  // Always include basic questions
  questions.push('What is this document about?');

  if (analysis.pageCount > 1) {
    questions.push(`What is covered in the ${analysis.pageCount} pages?`);
  }

  // Content-specific questions
  if (analysis.metadata?.title) {
    questions.push('What is the main topic discussed?');
  }

  if (analysis.metadata?.author) {
    questions.push('Who created this document?');
  }

  if (analysis.hasImages) {
    questions.push('What visual content is included?');
  }

  // Add generic useful questions
  questions.push('What are the key points?');
  questions.push('What is the purpose of this document?');

  return questions.slice(0, 5); // Max 5 example questions
};

const generateRecommendations = (analysis: ComprehensivePdfAnalysis) => {
  const recommendations = [];

  if (analysis.fileSize > 10 * 1024 * 1024) {
    recommendations.push({
      type: 'warning',
      title: 'Large File Size Detected',
      description: 'Your PDF file is quite large. Compressing it can reduce file size significantly.',
      action: { text: 'Compress PDF', tool: 'compress', url: '/compress' }
    });
  }

  if (analysis.imagesNeedOptimization) {
    recommendations.push({
      type: 'info',
      title: 'Low Resolution Images',
      description: 'Images may need optimization for better quality and smaller file size.',
      action: { text: 'Optimize Images', tool: 'compress-img', url: '/compress-img' }
    });
  }

  if (analysis.needsOcr) {
    recommendations.push({
      type: 'warning',
      title: 'OCR Required',
      description: 'This appears to be a scanned PDF. OCR can make the text searchable.',
      action: { text: 'Run OCR', tool: 'ocr-pdf', url: '/ocr-pdf' }
    });
  }

  if (analysis.metadataPrivacyRisk === 'high') {
    recommendations.push({
      type: 'warning',
      title: 'Privacy Risk Detected',
      description: 'PDF metadata contains sensitive information. Consider removing it.',
      action: { text: 'Remove Metadata', tool: 'remove-metadata', url: '/remove-metadata' }
    });
  }

  return recommendations;
};

const analyzePdfFile = async (buffer: ArrayBuffer, fileName: string, fileSize: number, maxPages: number): Promise<ComprehensivePdfAnalysis> => {
  console.log(`[PDFAnalyzer] Starting analysis for ${fileName}, size: ${fileSize} bytes`);

  let pdf: any = null;
  let pages: any[] = [];
  let isScannedPdf = false;
  let isProtectedPdf = false;
  let hasProcessingErrors = false;
  let contentType: 'text-based' | 'scanned' | 'mixed' | 'unknown' = 'unknown';

  // Comprehensive error handling - catch ALL errors and return structured responses
  try {
    // First, validate basic file properties
    if (!buffer || buffer.byteLength === 0) {
      console.log('[PDFAnalyzer] Empty or invalid buffer');
      return createMinimalAnalysis(fileName, fileSize, 'NO_READABLE_TEXT');
    }

    if (buffer.byteLength < 100) {
      console.log('[PDFAnalyzer] File too small');
      return createMinimalAnalysis(fileName, fileSize, 'NO_READABLE_TEXT');
    }

    // Check PDF header
    try {
      const header = new Uint8Array(buffer.slice(0, 8));
      const headerString = String.fromCharCode(...header);
      if (!headerString.startsWith('%PDF-')) {
        console.log('[PDFAnalyzer] Invalid PDF header:', headerString);
        return createMinimalAnalysis(fileName, fileSize, 'NO_READABLE_TEXT');
      }
    } catch (headerError) {
      console.log('[PDFAnalyzer] Error checking PDF header:', headerError);
      return createMinimalAnalysis(fileName, fileSize, 'NO_READABLE_TEXT');
    }

    postProgress(5, 'Initializing PDF analysis...');
    console.log('PDF header valid, attempting to load...');

    // Enhanced PDF loading with multiple fallback strategies
    try {
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        verbosity: 0,
        disableFontFace: true,
        disableRange: false,
        disableStream: false,
        disableAutoFetch: false,
        // Enhanced error handling
        password: '',
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      pdf = await loadingTask.promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
    } catch (error: any) {
      console.error('Failed to load PDF with PDF.js:', error);

      // Handle different error types gracefully
      if (error.name === 'PasswordException' || error.message?.includes('password') || error.message?.includes('encrypted')) {
        console.log('PDF is password-protected');
        isProtectedPdf = true;
        contentType = 'unknown';
        return createMinimalAnalysis(fileName, fileSize, 'PROTECTED_PDF');
      }

      if (error.name === 'InvalidPDFException' ||
        error.message?.includes('Invalid') ||
        error.message?.includes('corrupted') ||
        error.message?.includes('damaged')) {
        console.log('PDF appears to be invalid or corrupted');
        contentType = 'unknown';
        return createMinimalAnalysis(fileName, fileSize, 'CORRUPTED_PDF');
      }

      // For any other PDF.js loading errors, treat as potentially scanned or problematic PDF
      console.warn('PDF.js loading failed, treating as scanned/problematic PDF:', error.message);
      isScannedPdf = true;
      contentType = 'scanned';

      // Return minimal analysis for scanned/problematic PDFs
      return createMinimalAnalysis(fileName, fileSize, 'NO_READABLE_TEXT');
    }

    const totalPages = Math.min(pdf.numPages, maxPages);
    console.log(`Analyzing ${totalPages} pages (max: ${maxPages})`);

    const analysis: ComprehensivePdfAnalysis = {
      fileName,
      fileSize,
      pageCount: pdf.numPages,
      pdfVersion: '1.4',

      // Content flags
      hasText: false,
      hasImages: false,
      hasForms: false,
      contentType: 'text-based', // default
      needsOcr: false,
      ocrConfidence: 0,

      // Page & image info
      pages: [],
      pageSizeConsistency: true,
      mixedOrientations: false,
      totalImages: 0,
      averageImageDpi: 0,
      imagesNeedOptimization: false,

      // Text quality
      textConfidence: 0,
      searchableTextRatio: 0,

      // Fonts & metadata
      embeddedFontsRatio: 1,
      metadataPrivacyRisk: 'low',
      metadata: {
        title: '',
        author: '',
        subject: '',
        creator: '',
        producer: '',
        creationDate: undefined,
        modificationDate: undefined,
        keywords: []
      },

      // Final outputs
      optimizationScore: {
        overall: 0,
        fileSize: 0,
        images: 0,
        fonts: 0,
        structure: 0,
        security: 0
      },
      recommendations: []
    };

    postProgress(10, 'Analyzing document metadata...');

    // Get document metadata
    try {
      const metadata = await pdf.getMetadata();
      if (metadata?.info) {
        const info = metadata.info as any;
        analysis.metadata = {
          title: info.Title || info.title,
          author: info.Author || info.author,
          subject: info.Subject || info.subject,
          creator: info.Creator || info.creator,
          producer: info.Producer || info.producer,
          creationDate: info.CreationDate || info.ModDate,
          keywords: info.Keywords ? String(info.Keywords).split(',').map((k: string) => k.trim()) : []
        };
      }
    } catch (error) {
      console.warn('Could not extract metadata:', error);
    }

    // Analyze pages (limited to maxPages)
    let textPages = 0;
    let imagePages = 0;
    let pagesWithErrors = 0;
    let pageImageDpiSum = 0;
    let pageImageCount = 0;

    // 🔹 NEW: Text extraction for summary and Q&A
    const textChunks: TextChunk[] = [];
    let totalExtractedText = '';

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const progress = 15 + (pageNum / totalPages) * 75; // Progress from 15% to 90%
      postProgress(progress, `Analyzing page ${pageNum} of ${totalPages}...`);

      let page: any = null;
      try {
        page = await pdf.getPage(pageNum);
        pages.push(page); // Keep reference for cleanup

        const viewport = page.getViewport({ scale: 1.0 });

        // Only store summary data
        const pageSummary: PdfPageSummary = {
          pageNumber: pageNum,
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
          orientation: viewport.width > viewport.height ? 'landscape' : 'portrait',
          hasText: false,
          hasImages: false
        };

        // Check for text - with enhanced error handling and quality analysis
        let pageHasText = false;
        let pageTextQuality = 0;
        let pageText = '';

        try {
          const textContent = await page.getTextContent();
          if (textContent && textContent.items) {
            pageText = textContent.items
              .map((item: any) => item.str || '')
              .join(' ')
              .trim();

            pageHasText = pageText.length > 0;

            // Calculate text quality based on content
            if (pageHasText) {
              // Count actual words (not just characters)
              const words = pageText.split(/\s+/).filter(w => w.length > 0);
              const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1);

              // Quality indicators:
              // - More than 10 words suggests real content
              // - Average word length between 3-10 suggests natural text
              // - Presence of common words suggests readable content
              if (words.length > 10 && avgWordLength >= 3 && avgWordLength <= 10) {
                pageTextQuality = 100;
              } else if (words.length > 5) {
                pageTextQuality = 70;
              } else if (words.length > 0) {
                pageTextQuality = 40;
              }

              console.log(`Page ${pageNum} text: ${words.length} words, avg length: ${avgWordLength.toFixed(1)}, quality: ${pageTextQuality}`);

              // 🔹 NEW: Store text for summary/Q&A (chunked for memory efficiency)
              if (pageText.length > 0) {
                // Split into chunks of ~500 chars to manage memory
                const chunkSize = 500;
                for (let i = 0; i < pageText.length; i += chunkSize) {
                  const chunk = pageText.substring(i, i + chunkSize);
                  textChunks.push({
                    text: chunk,
                    pageNumber: pageNum
                  });
                }
                totalExtractedText += pageText + ' ';
              }
            }

            if (pageHasText) {
              textPages++;
              analysis.hasText = true;
            }
          }
        } catch (textError) {
          console.warn(`Text extraction failed for page ${pageNum}, treating as image-only:`, textError);
          // Don't increment error counter for text extraction failures - this is normal for scanned PDFs
        }

        pageSummary.hasText = pageHasText;

        // Check for images - with enhanced DPI calculation
        let pageHasImages = false;
        try {
          const operatorList = await page.getOperatorList();
          let imageCount = 0;

          if (operatorList?.fnArray && operatorList?.argsArray) {
            for (let i = 0; i < operatorList.fnArray.length; i++) {
              const fn = operatorList.fnArray[i];
              if (fn === pdfjsLib.OPS.paintImageXObject || fn === pdfjsLib.OPS.paintInlineImageXObject) {
                imageCount++;

                // Try to calculate actual DPI from transform matrix
                // The transform matrix gives us the scaling applied to the image
                try {
                  const args = operatorList.argsArray[i];
                  if (args && args.length > 0) {
                    // Estimate DPI based on viewport and image placement
                    // Standard PDF resolution is 72 DPI
                    // If image is scaled down, DPI is higher; scaled up, DPI is lower
                    const estimatedDpi = 150; // Conservative estimate for now
                    pageImageDpiSum += estimatedDpi;
                    pageImageCount++;
                  }
                } catch (dpiError) {
                  // Fallback to default DPI
                  pageImageDpiSum += 72;
                  pageImageCount++;
                }
              }
            }
          }

          pageHasImages = imageCount > 0;
          if (pageHasImages) {
            imagePages++;
            analysis.hasImages = true;
            analysis.totalImages += imageCount;
          }
        } catch (imageError) {
          console.warn(`Image analysis failed for page ${pageNum}:`, imageError);
          // This might indicate a corrupted page, but don't fail the whole analysis
        }

        pageSummary.hasImages = pageHasImages;
        analysis.pages.push(pageSummary);

      } catch (pageError) {
        console.warn(`Error processing page ${pageNum}:`, pageError);
        pagesWithErrors++;

        // Add basic page info even for failed pages
        analysis.pages.push({
          pageNumber: pageNum,
          width: 595,
          height: 842,
          orientation: 'portrait',
          hasText: false,
          hasImages: false
        });

        // If too many pages are failing, this might be a corrupted PDF
        if (pagesWithErrors > totalPages * 0.5) {
          console.warn('Too many pages failing - PDF might be corrupted');
          hasProcessingErrors = true;
        }
      }
    }

    postProgress(95, 'Finalizing analysis...');

    // Calculate content analysis with enhanced logic
    const textRatio = textPages / totalPages;
    const imageRatio = imagePages / totalPages;

    console.log(`Analysis summary: textPages=${textPages}, imagePages=${imagePages}, totalPages=${totalPages}, textRatio=${textRatio.toFixed(2)}, imageRatio=${imageRatio.toFixed(2)}`);

    // Determine content type with enhanced logic
    if (isScannedPdf || textRatio === 0) {
      console.log('Detected scanned PDF (no text found)');
      analysis.contentType = 'scanned';
      analysis.needsOcr = true;
      analysis.ocrConfidence = 0; // No text found, OCR definitely needed
    } else if (textRatio >= 0.9 && imageRatio < 0.3) {
      // Mostly text with few images
      analysis.contentType = 'text-based';
      analysis.needsOcr = false;
      analysis.ocrConfidence = 95;
    } else if (textRatio >= 0.7) {
      // Good amount of text
      analysis.contentType = 'text-based';
      analysis.needsOcr = false;
      analysis.ocrConfidence = 85;
    } else if (imageRatio >= 0.9 && textRatio < 0.2) {
      // Mostly images with little text - likely scanned
      analysis.contentType = 'scanned';
      analysis.needsOcr = true;
      analysis.ocrConfidence = textRatio > 0 ? 50 : 0;
    } else if (imageRatio >= 0.5) {
      // Significant images - mixed content
      analysis.contentType = 'mixed';
      analysis.needsOcr = textRatio < 0.4; // Suggest OCR if less than 40% text
      analysis.ocrConfidence = Math.round(textRatio * 100);
    } else {
      // Balanced content
      analysis.contentType = 'mixed';
      analysis.needsOcr = textRatio < 0.3;
      analysis.ocrConfidence = Math.round(textRatio * 100);
    }

    analysis.searchableTextRatio = textRatio;
    analysis.textConfidence = Math.round(textRatio * 100);

    // Enhanced image analysis with better DPI calculation
    if (pageImageCount > 0) {
      analysis.averageImageDpi = Math.round(pageImageDpiSum / pageImageCount);
    } else if (analysis.totalImages > 0) {
      // Fallback: estimate based on file size and image count
      const avgImageSize = analysis.fileSize / analysis.totalImages;
      if (avgImageSize > 100000) analysis.averageImageDpi = 200; // Large images likely high DPI
      else if (avgImageSize > 50000) analysis.averageImageDpi = 150;
      else if (avgImageSize > 20000) analysis.averageImageDpi = 100;
      else analysis.averageImageDpi = 72; // Small images likely low DPI
    } else {
      analysis.averageImageDpi = 0;
    }

    analysis.imagesNeedOptimization = analysis.totalImages > 0 &&
      (analysis.averageImageDpi < 150 || analysis.averageImageDpi > 300);

    // Page consistency
    if (analysis.pages.length > 1) {
      const firstPage = analysis.pages[0];
      analysis.pageSizeConsistency = analysis.pages.every(page =>
        Math.abs(page.width - firstPage.width) < 10 && Math.abs(page.height - firstPage.height) < 10
      );
      analysis.mixedOrientations = analysis.pages.some(page => page.orientation !== firstPage.orientation);
    } else {
      analysis.pageSizeConsistency = true;
      analysis.mixedOrientations = false;
    }

    // Enhanced privacy risk assessment
    const hasPersonalInfo = !!(
      analysis.metadata?.author ||
      analysis.metadata?.title ||
      (analysis.metadata?.keywords?.length)
    );

    const hasDetailedMetadata = !!(
      analysis.metadata?.creator ||
      analysis.metadata?.producer ||
      analysis.metadata?.creationDate
    );

    // High risk: personal info + detailed metadata
    // Medium risk: either personal info or detailed metadata
    // Low risk: minimal metadata
    if (hasPersonalInfo && hasDetailedMetadata) {
      analysis.metadataPrivacyRisk = 'high';
    } else if (hasPersonalInfo || hasDetailedMetadata) {
      analysis.metadataPrivacyRisk = 'medium';
    } else {
      analysis.metadataPrivacyRisk = 'low';
    }

    // Calculate final scores & recommendations
    analysis.optimizationScore = calculateOptimizationScore(analysis);
    analysis.recommendations = generateRecommendations(analysis);

    // 🔹 NEW: Generate summary and Q&A data
    postProgress(92, 'Generating smart summary...');

    if (textChunks.length > 0 && analysis.contentType !== 'scanned') {
      try {
        // PRIMARY: Try LLM extraction first
        console.log('[Smart Summary] PRIMARY: Attempting LLM extraction...');

        // Combine all text for LLM
        const fullText = textChunks.map(chunk => chunk.text).join(' ');

        let llmSuccess = false;

        try {
          // Import LLM extractor dynamically
          const { extractWithLLM, mapLLMResultToSummary } = await import('../utils/llmExtractor');

          const llmResult = await extractWithLLM(fullText);

          // Use LLM result if confidence is decent
          if (llmResult) {
            // Map the LLM result to the summary structure
            const mappedResult = mapLLMResultToSummary(llmResult);

            if (mappedResult && mappedResult.confidenceScore > 50) {
              console.log('[Smart Summary] PRIMARY extraction successful (LLM)');
              console.log('[Smart Summary] Document type:', mappedResult.documentType);
              console.log('[Smart Summary] Confidence:', mappedResult.confidenceScore);

              // Build summary from Gemini result
              analysis.summary = {
                shortSummary: mappedResult.generic.shortSummary || `Document analysis complete`,
                keyPoints: mappedResult.generic.keyPoints || [],
                totalWords: mappedResult.generic.totalWords || 0,
                readingTimeMinutes: mappedResult.generic.readingTimeMinutes || 1
              };

              llmSuccess = true;
            } else {
              console.log('[Smart Summary] LLM confidence too low (', mappedResult?.confidenceScore, '), falling back...');
            }
          } else {
            console.log('[Smart Summary] LLM returned null, falling back...');
          }
        } catch (llmError) {
          console.warn('[Smart Summary] LLM extraction failed, falling back to generic:', llmError);
        }

        // FALLBACK: Generate generic summary if LLM extraction fails
        if (!llmSuccess) {
          console.log('[Smart Summary] FALLBACK: Using generic summary extraction');
          analysis.summary = generateSummary(textChunks);
        }

        postProgress(96, 'Preparing Q&A capabilities...');

        // Set up Q&A
        analysis.qna = {
          enabled: true,
          exampleQuestions: generateExampleQuestions(analysis),
          textChunks: textChunks // Keep for Q&A processing
        };

        console.log('[PDFAnalyzer] Summary generated:', analysis.summary);
        console.log('[PDFAnalyzer] Q&A enabled with', textChunks.length, 'text chunks');
      } catch (summaryError) {
        console.warn('[PDFAnalyzer] Failed to generate summary:', summaryError);
        // Graceful degradation - continue without summary
        analysis.summary = undefined;
        analysis.qna = {
          enabled: false,
          exampleQuestions: []
        };
      }
    } else {
      // No text available for summary/Q&A
      analysis.summary = undefined;
      analysis.qna = {
        enabled: false,
        exampleQuestions: []
      };
      console.log('[PDFAnalyzer] Summary/Q&A disabled - insufficient text content');
    }

    postProgress(100, 'Analysis completed successfully');

    // Return the analysis object instead of posting message here
    return analysis;

  } finally {
    // Proper cleanup - very important for web worker
    try {
      // Cleanup individual pages
      pages.forEach(page => {
        if (page && page.cleanup) {
          page.cleanup();
        }
      });
      pages = [];

      // Cleanup PDF document
      if (pdf) {
        if (pdf.cleanup) pdf.cleanup();
        if (pdf.destroy) pdf.destroy();
      }
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
  }
};

// 🔹 NEW: Q&A Processing Function
const processQuestion = (question: string, textChunks: TextChunk[]): any => {
  if (!question || !textChunks || textChunks.length === 0) {
    return {
      answer: 'No answer found in the PDF.',
      confidence: 0,
      pageNumbers: [],
      relatedChunks: []
    };
  }

  // Extract keywords from question
  const keywords = extractKeywords(question);

  if (keywords.length === 0) {
    return {
      answer: 'Please ask a more specific question.',
      confidence: 0,
      pageNumbers: [],
      relatedChunks: []
    };
  }

  console.log('[Q&A] Processing question with keywords:', keywords);

  // Score each text chunk
  const scoredChunks = textChunks.map(chunk => {
    const chunkWords = extractKeywords(chunk.text);
    let matchCount = 0;
    let proximityBonus = 0;

    // Count keyword matches
    keywords.forEach(keyword => {
      if (chunkWords.includes(keyword)) {
        matchCount++;
      }
    });

    // Check for keyword proximity (keywords appearing close together)
    const chunkLower = chunk.text.toLowerCase();
    for (let i = 0; i < keywords.length - 1; i++) {
      const idx1 = chunkLower.indexOf(keywords[i]);
      const idx2 = chunkLower.indexOf(keywords[i + 1]);
      if (idx1 !== -1 && idx2 !== -1 && Math.abs(idx1 - idx2) < 100) {
        proximityBonus += 0.5;
      }
    }

    // Calculate score
    const matchScore = matchCount / keywords.length;
    const totalScore = matchScore + (proximityBonus * 0.2);

    return {
      chunk,
      score: totalScore,
      matchCount
    };
  });

  // Sort by score and get top results
  scoredChunks.sort((a, b) => b.score - a.score);
  const topChunks = scoredChunks.slice(0, 3).filter(sc => sc.matchCount > 0);

  if (topChunks.length === 0) {
    return {
      answer: 'No relevant information found in the PDF for this question.',
      confidence: 0,
      pageNumbers: [],
      relatedChunks: []
    };
  }

  // Calculate confidence
  const bestScore = topChunks[0].score;
  const confidence = Math.min(100, Math.round(bestScore * 100));

  // If confidence is too low, return "not found"
  if (confidence < 30) {
    return {
      answer: 'No confident answer found. The PDF may not contain information about this topic.',
      confidence,
      pageNumbers: [],
      relatedChunks: []
    };
  }

  // Build answer from top chunks
  const answerText = topChunks
    .map(sc => cleanText(sc.chunk.text))
    .join(' ... ');

  const pageNumbers = [...new Set(topChunks.map(sc => sc.chunk.pageNumber))];

  return {
    answer: answerText,
    confidence,
    pageNumbers,
    relatedChunks: topChunks.map(sc => ({
      text: sc.chunk.text.substring(0, 200) + '...',
      pageNumber: sc.chunk.pageNumber,
      score: sc.score
    }))
  };
};

self.onmessage = async (e: MessageEvent) => {
  const { buffer, fileName, fileSize, maxPages, action, question, textChunks } = e.data;

  if (action === 'analyze') {
    try {
      const result = await analyzePdfFile(buffer, fileName, fileSize, maxPages || MAX_ANALYZE_PAGES);

      // Before sending, remove textChunks from qna to reduce message size
      // (we'll keep them in worker memory for Q&A)
      const resultToSend = { ...result };
      if (resultToSend.qna?.textChunks) {
        // Store chunks reference but don't send to UI
        const chunks = resultToSend.qna.textChunks;
        delete resultToSend.qna.textChunks;

        // Store in a global variable for Q&A processing
        (self as any).__pdfTextChunks = chunks;
      }

      (self as any).postMessage({
        type: 'complete',
        data: resultToSend
      });
    } catch (error) {
      (self as any).postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (action === 'question') {
    // 🔹 NEW: Handle Q&A requests
    try {
      const chunks = (self as any).__pdfTextChunks || textChunks || [];
      const answer = processQuestion(question, chunks);

      (self as any).postMessage({
        type: 'answer',
        data: answer
      });
    } catch (error) {
      (self as any).postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Failed to process question'
      });
    }
  }
};

export { };
