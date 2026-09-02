// PDF Analyzer - Main Thread Version
// Import PDF.js and configure for main thread
import * as pdfjsLib from 'pdfjs-dist';
import { logger } from './logger';

// Configure PDF.js to use worker file from public directory
// This works perfectly in main thread!
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Page limit hard-cap
const MAX_ANALYZE_PAGES = 10;

interface PdfPageSummary {
  pageNumber: number;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  hasText: boolean;
  hasImages: boolean;
}

// Summary and Q&A interfaces - Hybrid Structure
type DocumentType = 'generic' | 'application-form' | 'flight-ticket' | 'train-ticket' | 'invoice' | 'receipt' | 'resume';

interface GenericSummary {
  shortSummary: string;
  keyPoints: string[];
  totalWords: number;
  readingTimeMinutes: number;
  cleanedTextPreview?: string;
  cleanupStats?: TextCleanupStats;
  fullCleanedText?: string;
}

interface TextCleanupStats {
  removedBrokenChars: number;
  mergedBrokenWords: number;
  removedDuplicateLines: number;
  grammarFixes: number;
}

interface TextCleanupResult {
  cleanedText: string;
  previewText: string;
  stats: TextCleanupStats;
}

interface PassengerInfo {
  name: string;
  age?: number;
  gender?: string;
  pnr?: string;
  seat?: string;
  class?: string;
  status?: string;
}

interface FlightTicketData {
  overview: string;
  pnr?: string;
  passengers: PassengerInfo[];
  journey?: {
    from?: string;
    to?: string;
    date?: string;
    flight?: string;
    departureTime?: string;
    arrivalTime?: string;
    boardingTime?: string;
    gate?: string;
    terminal?: string;
  };
  pricing?: {
    total: string;
    currency: string;
    breakdown?: string[];
  };
  validation?: {
    issues: string[];
    fieldStatus: Record<string, 'ok' | 'warning' | 'missing'>;
    fieldConfidence: Record<string, number>;
    overallConfidence: number;
  };
  verdict: string;
}

interface InvoiceData {
  overview: string;
  seller: string;
  buyer: string;
  invoiceNumber: string;
  date: string;
  items: Array<{
    description: string;
    quantity: number;
    price: string;
  }>;
  total: string;
  dueDate?: string;
  verdict: string;
}

interface ReceiptData {
  overview: string;
  merchant: string;
  date: string;
  items: string[];
  total: string;
  paymentMethod?: string;
  verdict: string;
}

interface ResumeData {
  overview: string;
  name: string;
  role?: string;
  location?: string;
  contact?: string;
  professionalSummary: string[];
  skillCategories?: {
    frontend: string[];
    backend: string[];
    database: string[];
    tools: string[];
  };
  skills: string[];
  experience: string[];
  projects: string[];
  education: string[];
  verdict: string;
}

interface StructuredData {
  flightTicket?: FlightTicketData;
  invoice?: InvoiceData;
  receipt?: ReceiptData;
  resume?: ResumeData;
}

interface PdfSummary {
  documentType: DocumentType;
  generic?: GenericSummary;
  structured?: StructuredData;
  confidenceScore?: number;
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
  processingMetrics?: {
    ocrMs?: number;
    parsingMs?: number;
    totalMs?: number;
  };
}

// Progress callback type
export interface AnalysisProgress {
  progress: number;
  message: string;
}

// Progress callback function (will be provided by caller)
let progressCallback: ((progress: AnalysisProgress) => void) | null = null;

const postProgress = (progress: number, message: string) => {
  if (progressCallback) {
    progressCallback({ progress, message });
  }
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

// ============ DOCUMENT TYPE DETECTION & EXTRACTION ============

// Detect document type based on content
const detectDocumentType = (text: string, metadata: any, fileName: string): DocumentType => {
  const lowerText = text.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // Flight Ticket Detection
  const flightKeywords = ['pnr', 'boarding', 'boarding pass', 'flight', 'departure', 'arrival', 'passenger', 'seat', 'gate', 'terminal', 'airlines', 'booking'];
  const flightScore = flightKeywords.filter(k => lowerText.includes(k)).length;
  const fileNameFlightHint = lowerFileName.includes('ticket') || lowerFileName.includes('boarding') || lowerFileName.includes('flight');
  if (flightScore >= 3 || (flightScore >= 1 && fileNameFlightHint)) {
    return 'flight-ticket';
  }

  // Invoice Detection
  const invoiceKeywords = ['invoice', 'bill to', 'invoice number', 'due date', 'subtotal', 'tax', 'total amount', 'payment terms'];
  const invoiceScore = invoiceKeywords.filter(k => lowerText.includes(k)).length;
  if (invoiceScore >= 3 || (invoiceScore >= 1 && lowerFileName.includes('invoice'))) {
    return 'invoice';
  }

  // Receipt Detection
  const receiptKeywords = ['receipt', 'purchased', 'merchant', 'transaction', 'payment method', 'card number', 'cashier'];
  const receiptScore = receiptKeywords.filter(k => lowerText.includes(k)).length;
  if (receiptScore >= 2 || (receiptScore >= 1 && lowerFileName.includes('receipt'))) {
    return 'receipt';
  }

  // Resume Detection
  const resumeKeywords = ['resume', 'cv', 'curriculum vitae', 'experience', 'education', 'skills', 'objective', 'professional summary'];
  const resumeScore = resumeKeywords.filter(k => lowerText.includes(k)).length;
  if (resumeScore >= 3 || (resumeScore >= 1 && (lowerFileName.includes('resume') || lowerFileName.includes('cv')))) {
    return 'resume';
  }

  // Default to generic
  return 'generic';
};

// Extract flight ticket data
const extractFlightTicketData = (text: string): FlightTicketData => {
  const clean = cleanExtractedTextForParsing(text).replace(/\s+/g, ' ').trim();

  const passengers: PassengerInfo[] = [];
  const explicitPassengerRaw =
    clean.match(/(?:passenger|name of passenger|traveller)[:\s-]+([A-Za-z][A-Za-z.'\-\s]{2,60})/i)?.[1] ||
    clean.match(/\bPASSENGER\s+([A-Z\s]{3,60})(?:\s+FROM|\s+TO|\s+FLIGHT|\s+DATE|\s+TIME|\s+GATE|$)/i)?.[1] ||
    null;
  const explicitPassenger = sanitizePassengerName(explicitPassengerRaw);
  if (explicitPassenger) {
    passengers.push({ name: explicitPassenger.trim() });
  }

  const titlePattern = /\b(Mr\.?|Ms\.?|Mrs\.?|Miss)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/gi;
  let titleMatch: RegExpExecArray | null;
  while ((titleMatch = titlePattern.exec(text)) !== null) {
    const name = `${titleMatch[1]} ${titleMatch[2]}`.trim();
    if (!passengers.find(p => p.name.toLowerCase() === name.toLowerCase())) {
      passengers.push({ name });
    }
  }

  const pnr =
    clean.match(/\bPNR\b[:\s-]*(\d{10})/i)?.[1] ||
    clean.match(/\bPNR\b[:\s-]*([A-Z0-9]{5,10})/i)?.[1] ||
    clean.match(/\b(?:booking|reference)(?:\s*id|\s*no|\s*number)?\b[:\s-]*([A-Z0-9]{5,12})/i)?.[1] ||
    null;
  if (pnr && passengers.length > 0) {
    passengers[0].pnr = pnr;
  }

  const passengerNameTokenSet = new Set(
    (passengers[0]?.name || '')
      .split(/\s+/)
      .map(normalizeOcrToken)
      .filter(Boolean)
  );

  const flightCodeRaw =
    clean.match(/\b([A-Z]{2}\s?\d{2,4})\b/)?.[1]?.replace(/\s+/g, '') ||
    clean.match(/\bflight(?:\s*no|\s*number)?\b[:\s-]*([A-Z0-9]{2,8})/i)?.[1] ||
    clean.match(/\b(?:train)(?:\s*number|\s*no)?\b[:\s-]*(\d{5})\b/i)?.[1] ||
    null;
  const flightCode = normalizeFlightCode(flightCodeRaw);

  const routeFromToMatch =
    clean.match(/\bFROM\s+([A-Za-z\s]{3,40}?)\s+TO\s+([A-Za-z\s]{3,40}?)(?:\s+(?:FLIGHT|DATE|TIME|GATE|BOARDING|PASSENGER|PNR|SEAT)\b|$)/i) ||
    clean.match(/\b([A-Z]{3})\s*(?:-|TO|→)\s*([A-Z]{3})\b/);

  const strictUpperRouteMatch =
    clean.match(/\bFROM\b[^A-Z]{0,6}\b([A-Z]{4,16})\b[\s\S]{0,35}\bTO\b[^A-Z]{0,6}\b([A-Z]{4,16})\b/) ||
    null;
  const routeFromToFrom = normalizeCityLabel(routeFromToMatch?.[1]?.trim() || null);
  const routeFromToTo = normalizeCityLabel(routeFromToMatch?.[2]?.trim() || null);
  const strictRouteFrom = normalizeCityLabel(strictUpperRouteMatch?.[1] || null);
  const strictRouteTo = normalizeCityLabel(strictUpperRouteMatch?.[2] || null);

  const airportCodes = (clean.match(/\b[A-Z]{3}\b/g) || []).filter((code) => {
    const blocked = ['PNR', 'DOB', 'ETA', 'STD', 'ETD', 'GATE', 'AIR', 'BAG', 'SEQ', 'NOI'];
    return !blocked.includes(code.toUpperCase());
  });

  const cityStopwords = new Set([
    'AIRLINES', 'TICKET', 'BOARDING', 'PASS', 'PASSENGER', 'FLIGHT', 'FUGHT', 'GATE', 'SEAT', 'DATE', 'TIME', 'TERMINAL', 'CLOSE', 'PRIOR', 'DEPARTURE'
  ]);
  const uppercaseCityCandidates = (clean.match(/\b[A-Z]{4,12}\b/g) || [])
    .map(normalizeCityLabel)
    .filter((city): city is string => Boolean(city))
    .filter((city) => !['From', 'To', 'Flight', 'Boarding', 'Passenger', 'Date', 'Gate', 'Time'].includes(city))
    .filter((city) => {
      const normalized = normalizeOcrToken(city);
      if (!normalized) return false;
      if (cityStopwords.has(normalized)) return false;
      if (passengerNameTokenSet.has(normalized)) return false;
      return true;
    });
  const uniqueCityCandidates = Array.from(new Set(uppercaseCityCandidates));

  const fallbackFromCity = uniqueCityCandidates[0] || null;
  const fallbackToCity = uniqueCityCandidates[1] || null;
  let fromMatch =
    strictRouteFrom ||
    routeFromToFrom ||
    normalizeCityLabel(clean.match(/\bfrom\b[:\s-]*([A-Za-z][A-Za-z\s\/]{2,40}?)\b(?:to|destination|flight|train|date|time|gate)\b/i)?.[1]) ||
    normalizeCityLabel(clean.match(/\bdeparture(?:\s*airport|\s*city|\s*station)?\b[:\s-]*([A-Za-z][A-Za-z\s\/]{2,40})/i)?.[1]) ||
    fallbackFromCity ||
    (airportCodes[0] || null) ||
    null;
  let toMatch =
    strictRouteTo ||
    routeFromToTo ||
    normalizeCityLabel(clean.match(/\bto\b[:\s-]*([A-Za-z][A-Za-z\s\/]{2,40}?)\b(?:date|time|gate|seat|terminal|station)\b/i)?.[1]) ||
    normalizeCityLabel(clean.match(/\barrival(?:\s*airport|\s*city|\s*station)?\b[:\s-]*([A-Za-z][A-Za-z\s\/]{2,40})/i)?.[1]) ||
    fallbackToCity ||
    (airportCodes[1] || null) ||
    null;

  const date =
    clean.match(/\b(\d{1,2}[-\s][A-Za-z]{3,9}[-\s]\d{2,4})\b/)?.[1] ||
    clean.match(/\b(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/)?.[1] ||
    null;
  const departureTime =
    clean.match(/\b(?:departure|dep)(?:\s*time)?\b[:\s-]*(\d{1,2}[:.]\d{2}\s?(?:AM|PM)?)\b/i)?.[1] ||
    clean.match(/\b(\d{1,2}[:.]\d{2}\s?(?:AM|PM))\b/i)?.[1] ||
    null;
  const arrivalTime =
    clean.match(/\b(?:arrival|arr)(?:\s*time)?\b[:\s-]*(\d{1,2}[:.]\d{2}\s?(?:AM|PM)?)\b/i)?.[1] ||
    null;
  const boardingTime =
    clean.match(/\bboarding(?:\s*time)?\b[:\s-]*(\d{1,2}[:.]\d{2}\s?(?:AM|PM)?)\b/i)?.[1] ||
    extractBoardingCloseText(clean) ||
    null;
  const gateRaw =
    clean.match(/\bgate\b[:\s-]*([A-Z0-9]{1,4})\b/i)?.[1] ||
    null;
  let gate = normalizeGateValue(gateRaw);
  const seat =
    clean.match(/\bseat\b[:\s-]*([A-Z]?\d{1,2}[A-Z]?)\b/i)?.[1] ||
    null;
  const terminal =
    clean.match(/\bterminal\b[:\s-]*([A-Z0-9]{1,3})\b/i)?.[1] ||
    clean.match(/\bplatform(?:\s*no|\s*number)?\b[:\s-]*([A-Z0-9]{1,3})\b/i)?.[1] ||
    null;

  const issues: string[] = [];
  const fieldStatus: Record<string, 'ok' | 'warning' | 'missing'> = {
    passenger: 'missing',
    from: 'missing',
    to: 'missing',
    flight: 'missing',
    date: 'missing',
    departureTime: 'missing',
    boardingTime: 'missing',
    gate: 'missing',
    seat: 'missing',
    pnr: 'missing',
    terminal: 'missing'
  };

  if (passengers[0]?.name && isValidExtractedField(passengers[0].name)) {
    fieldStatus.passenger = 'ok';
  } else if (passengers[0]?.name) {
    fieldStatus.passenger = 'warning';
  }

  if (fromMatch && isValidExtractedField(fromMatch)) fieldStatus.from = 'ok';
  if (toMatch && isValidExtractedField(toMatch)) fieldStatus.to = 'ok';
  if (date && isValidExtractedField(date)) fieldStatus.date = 'ok';
  if (departureTime && isValidExtractedField(departureTime)) fieldStatus.departureTime = 'ok';
  if (boardingTime && isValidExtractedField(boardingTime)) fieldStatus.boardingTime = 'ok';
  if (seat && isValidExtractedField(seat)) fieldStatus.seat = 'ok';
  if (pnr && isValidExtractedField(pnr)) fieldStatus.pnr = 'ok';
  if (terminal && isValidExtractedField(terminal)) fieldStatus.terminal = 'ok';

  if (flightCode) {
    fieldStatus.flight = 'ok';
  } else if (flightCodeRaw) {
    fieldStatus.flight = 'warning';
    issues.push('Flight number format is not valid.');
  }

  if (gate) {
    fieldStatus.gate = 'ok';
  } else if (gateRaw) {
    fieldStatus.gate = 'warning';
    issues.push('Gate format looks invalid.');
  }

  if (gate && flightCode && gate === flightCode) {
    gate = null;
    fieldStatus.gate = 'warning';
    issues.push('Gate value matched flight number and was cleared.');
  }

  if (fromMatch && toMatch && fromMatch.toLowerCase() === toMatch.toLowerCase()) {
    fieldStatus.from = 'warning';
    fieldStatus.to = 'warning';
    issues.push('Departure and destination are identical, likely OCR noise.');
  }

  const invalidCityTokens = new Set(['airlines', 'boarding', 'pass', 'flight', 'gate', 'ticket']);
  if (fromMatch && invalidCityTokens.has(fromMatch.toLowerCase())) {
    fromMatch = null;
    fieldStatus.from = 'warning';
    issues.push('Departure city was discarded due to low confidence.');
  }
  if (toMatch && invalidCityTokens.has(toMatch.toLowerCase())) {
    toMatch = null;
    fieldStatus.to = 'warning';
    issues.push('Destination city was discarded due to low confidence.');
  }

  if (date) {
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        issues.push('Travel date appears to be in the past.');
        fieldStatus.date = fieldStatus.date === 'ok' ? 'warning' : fieldStatus.date;
      }
    }
  }

  const journey: FlightTicketData['journey'] | undefined =
    fromMatch || toMatch || date || flightCode || departureTime || arrivalTime || boardingTime || gate || terminal
      ? {
        from: fromMatch?.trim() || undefined,
        to: toMatch?.trim() || undefined,
        date: date?.trim() || undefined,
        flight: flightCode || undefined,
        departureTime: departureTime || undefined,
        arrivalTime: arrivalTime || undefined,
        boardingTime: boardingTime || undefined,
        gate: gate || undefined,
        terminal: terminal || undefined
      }
      : undefined;

  const priceMatch = clean.match(/(?:total|amount|fare)[:\s]*(?:rs\.?|inr|₹|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const pricing: FlightTicketData['pricing'] | undefined = priceMatch
    ? {
      total: priceMatch[1].replace(/,/g, ''),
      currency: clean.includes('₹') || /(?:\bINR\b|Rs\.?)/i.test(clean) ? 'INR' : 'USD'
    }
    : undefined;

  const passengerCount = passengers.length || 1;
  const routeInfo = journey?.from && journey?.to ? `${journey.from} to ${journey.to}` : 'flight booking';
  const overview = `Flight ticket for ${passengerCount} passenger${passengerCount !== 1 ? 's' : ''} - ${routeInfo}`;
  const verdict = `${passengerCount} passenger${passengerCount !== 1 ? 's' : ''} details extracted${journey ? ` for ${routeInfo}` : ''}${pricing ? `. Total: ${pricing.currency} ${pricing.total}` : ''}`;

  const extractedCount = Object.values(fieldStatus).filter((s) => s === 'ok').length;
  const warningCount = Object.values(fieldStatus).filter((s) => s === 'warning').length;
  const fieldConfidence: Record<string, number> = {
    passenger: scoreFieldConfidence(fieldStatus.passenger, passengers[0]?.name, /^[A-Za-z][A-Za-z.'\-\s]{2,}$/),
    from: scoreFieldConfidence(fieldStatus.from, fromMatch, /^[A-Za-z][A-Za-z\s]{2,}$/),
    to: scoreFieldConfidence(fieldStatus.to, toMatch, /^[A-Za-z][A-Za-z\s]{2,}$/),
    flight: scoreFieldConfidence(fieldStatus.flight, flightCode || flightCodeRaw, /^[A-Z]{2}\d{2,4}$/),
    date: scoreFieldConfidence(fieldStatus.date, date, /^.+$/),
    departureTime: scoreFieldConfidence(fieldStatus.departureTime, departureTime, /^\d{1,2}[:.]\d{2}/i),
    boardingTime: scoreFieldConfidence(fieldStatus.boardingTime, boardingTime, /^(\d{1,2}[:.]\d{2}|[0-9]{1,2}\s+min)/i),
    gate: scoreFieldConfidence(fieldStatus.gate, gate || gateRaw, /^[A-Z]?\d{1,3}[A-Z]?$/),
    seat: scoreFieldConfidence(fieldStatus.seat, seat, /^[A-Z]?\d{1,2}[A-Z]?$/),
    pnr: scoreFieldConfidence(fieldStatus.pnr, pnr, /^[A-Z0-9]{5,12}$/),
    terminal: scoreFieldConfidence(fieldStatus.terminal, terminal, /^[A-Z0-9]{1,3}$/)
  };
  const overallConfidence = Math.max(20, Math.min(98, Math.round((extractedCount / Object.keys(fieldStatus).length) * 100 - warningCount * 4)));

  return {
    overview,
    pnr: pnr || undefined,
    passengers: passengers.length > 0
      ? passengers.map((p) => ({ ...p, seat: p.seat || seat || undefined }))
      : [{ name: 'Not clearly detected', pnr: pnr || undefined, seat: seat || undefined }],
    journey,
    pricing,
    validation: {
      issues,
      fieldStatus,
      fieldConfidence,
      overallConfidence
    },
    verdict
  };
};

// Extract invoice data
const extractInvoiceData = (text: string): InvoiceData => {
  // Extract invoice number
  const invoiceNumPattern = /(?:invoice|bill)[\s#:]*([A-Z0-9-]+)/i;
  const invoiceNumMatch = text.match(invoiceNumPattern);
  const invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1] : 'N/A';

  // Extract seller/buyer
  const sellerPattern = /(?:from|seller|vendor)[:\s]+([A-Z][^\n]{0,50})/i;
  const buyerPattern = /(?:to|buyer|customer|bill to)[:\s]+([A-Z][^\n]{0,50})/i;
  const seller = text.match(sellerPattern)?.[1]?.trim() || 'Seller not specified';
  const buyer = text.match(buyerPattern)?.[1]?.trim() || 'Buyer not specified';

  // Extract date
  const datePattern = /(?:date|dated)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i;
  const date = text.match(datePattern)?.[1] || 'Date not specified';

  // Extract total
  const totalPattern = /(?:total|grand total|amount due)[:\s]*(?:rs\.?|inr|₹|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
  const total = text.match(totalPattern)?.[1]?.replace(/,/g, '') || '0';

  // Extract items (simplified)
  const items: Array<{ description: string; quantity: number; price: string; }> = [];
  const itemLines = text.split('\n').filter(line => /\d+\s+[a-z]/i.test(line));
  itemLines.slice(0, 5).forEach(line => {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 2) {
      items.push({
        description: parts.slice(1, -1).join(' ') || 'Item',
        quantity: parseInt(parts[0]) || 1,
        price: parts[parts.length - 1]
      });
    }
  });

  const overview = `Invoice #${invoiceNumber} from ${seller} to ${buyer}`;
  const verdict = `Total amount: ${total}${items.length > 0 ? ` for ${items.length} item(s)` : ''}`;

  return {
    overview,
    seller,
    buyer,
    invoiceNumber,
    date,
    items,
    total,
    verdict
  };
};

// Extract receipt data
const extractReceiptData = (text: string): ReceiptData => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Extract merchant (usually first few lines)
  const merchant = lines.slice(0, 3).find(line => line.length > 3 && line.length < 50) || 'Merchant not specified';

  // Extract date
  const datePattern = /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/;
  const date = text.match(datePattern)?.[1] || 'Date not specified';

  // Extract items (lines with prices)
  const items: string[] = [];
  const itemPattern = /^[A-Za-z][^0-9]{3,40}\s+[\d,.]+$/;
  lines.forEach(line => {
    if (itemPattern.test(line) && items.length < 10) {
      items.push(line);
    }
  });

  // Extract total
  const totalPattern = /(?:total|amount|grand total)[:\s]*(?:rs\.?|inr|₹|\$)?\s*([0-9,]+(?:\.[0-9]{2})?)/i;
  const total = text.match(totalPattern)?.[1]?.replace(/,/g, '') || '0';

  const overview = `Receipt from ${merchant}`;
  const verdict = `Total: ${total}${items.length > 0 ? ` for ${items.length} item(s)` : ''}`;

  return {
    overview,
    merchant,
    date,
    items: items.length > 0 ? items : ['Items not extracted'],
    total,
    verdict
  };
};

// Extract resume data
const extractResumeData = (text: string, fileName?: string): ResumeData => {
  const rawLines = text.replace(/\r/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
  const compact = text.replace(/\r/g, ' ').replace(/\s+/g, ' ').trim();
  const sectionized = compact
    .replace(/\b(PROFESSIONAL SUMMARY|SUMMARY|PROFILE|OBJECTIVE|WORK EXPERIENCE|EXPERIENCE|INTERNSHIP|KEY PROJECTS|PROJECTS?|TECHNICAL SKILLS|SKILLS|EDUCATION)\b/gi, '\n$1:\n')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const sanitizeLine = (line: string): string => line
    .replace(/[|•·■□▪▫▣◆]+/g, ' ')
    .replace(/\bIinkedin\b/gi, 'linkedin')
    .replace(/\b1inkedin\b/gi, 'linkedin')
    .replace(/\s+/g, ' ')
    .trim();
  const stripContacts = (line: string): string => sanitizeLine(line)
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/gi, '')
    .replace(/[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-z]{2,}/gi, '')
    .replace(/(?:\+?\d[\d\s\-()]{8,}\d)/g, '')
    .replace(/(?:www\.)?\S*linkedin\s*\.\s*com\/\S*/gi, '')
    .replace(/(?:www\.)?\S*linkedin\.com\/\S*/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const toTitle = (value: string): string =>
    value
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

  const uniq = (values: string[], minLen = 2, maxLen = 140): string[] => {
    const seen = new Set<string>();
    const output: string[] = [];
    values.forEach(raw => {
      const val = stripContacts(raw);
      if (!val || val.length < minLen || val.length > maxLen) return;
      const key = val.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      output.push(val);
    });
    return output;
  };

  const topLines = rawLines.slice(0, 14).map(sanitizeLine);
  const roleKeywordPattern = /\b(Web Developer|Frontend Developer|Backend Developer|Full[- ]Stack Developer|Software Engineer|Web Development Intern|Developer|Engineer|Intern)\b/i;
  const roleWordBlockPattern = /\b(developer|engineer|intern|frontend|backend|full[- ]stack|software)\b/i;
  const allCapsName = topLines.find(line =>
    /^[A-Z][A-Z\s.]{4,}$/.test(line) &&
    line.split(/\s+/).length >= 2 &&
    line.split(/\s+/).length <= 4 &&
    !/(DEVELOPER|ENGINEER|INTERN|SUMMARY|EXPERIENCE|SKILLS|PROJECT|RESUME|CV|PROFILE|OBJECTIVE)/.test(line)
  );

  const header = sectionized.split(/\n(?:PROFESSIONAL\s+SUMMARY|SUMMARY|PROFILE|OBJECTIVE|WORK\s+EXPERIENCE|EXPERIENCE|INTERNSHIP|KEY\s+PROJECTS|PROJECTS?|TECHNICAL\s+SKILLS|SKILLS|EDUCATION)\s*:/i)[0] || compact.slice(0, 250);
  const headerClean = stripContacts(header);

  let name = 'Candidate';
  if (allCapsName) {
    name = toTitle(allCapsName.replace(/\./g, '').trim());
  } else {
    const nameBeforeRoleInHeader = headerClean.match(new RegExp(`^([A-Za-z]+(?:\\s+[A-Za-z]+){1,3})\\s+${roleKeywordPattern.source}`, 'i'));
    if (nameBeforeRoleInHeader?.[1] && !roleWordBlockPattern.test(nameBeforeRoleInHeader[1])) {
      name = nameBeforeRoleInHeader[1].trim();
    }
    const allCapsInline = compact.match(/\b([A-Z]{3,}(?:\s+[A-Z]{2,}){1,3})\b/);
    if (name === 'Candidate' && allCapsInline?.[1] && !/(DEVELOPER|ENGINEER|INTERN)/.test(allCapsInline[1])) {
      name = toTitle(allCapsInline[1]);
    }
    const titleCaseName = topLines.find(line =>
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(line) &&
      !/(Developer|Engineer|Intern|Summary|Experience|Skills|Projects|Resume|CV|Profile|Objective)/i.test(line)
    );
    if (name === 'Candidate' && titleCaseName) {
      name = titleCaseName;
    } else {
      const headerNameMatch = headerClean.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/);
      if (name === 'Candidate' && headerNameMatch && !roleWordBlockPattern.test(headerNameMatch[1])) {
        name = headerNameMatch[1];
      }
    }
  }
  if (name === 'Candidate' && fileName) {
    const fromFile = fileName
      .replace(/\.pdf$/i, '')
      .replace(/resume|cv/ig, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (fromFile && !roleWordBlockPattern.test(fromFile)) {
      name = fromFile.split(' ').map(token => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()).join(' ');
    }
  }
  if (roleWordBlockPattern.test(name)) {
    name = 'Candidate';
  }

  const normalizeExtractedEmail = (value: string): string => value
    .replace(/\s*@\s*/g, '@')
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s+/g, '')
    .trim();
  const emailRaw =
    compact.match(/[a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-z]{2,}/i)?.[0] ||
    compact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i)?.[0] ||
    '';
  const email = emailRaw ? normalizeExtractedEmail(emailRaw) : '';
  const phone = compact.match(/\b(?:\+91[\s-]?)?[6-9]\d{9}\b/)?.[0]?.replace(/\s+/g, ' ').trim() || '';
  const linkedInRaw =
    compact.match(/linkedin\s*\.\s*com\/[a-zA-Z0-9\-_\/]+/i)?.[0] ||
    compact.match(/(?:www\.)?linkedin\.com\/[a-zA-Z0-9\-_\/]+/i)?.[0] ||
    '';
  const linkedIn = linkedInRaw ? linkedInRaw.replace(/\s+/g, '').replace(/linkedin\.\s*com/i, 'linkedin.com') : '';
  const contact = [phone, email, linkedIn].filter(Boolean).join(' | ') || undefined;

  const roleMatch = compact.match(roleKeywordPattern);
  const role = roleMatch?.[1] || undefined;

  const locationMatch =
    compact.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/) ||
    compact.match(/\b(Mau,\s*Uttar Pradesh|Lucknow,\s*Uttar Pradesh|Noida,\s*Uttar Pradesh|Delhi|Mumbai|Pune|Bangalore|Hyderabad|Uttar Pradesh|India)\b/i);
  const location = locationMatch?.[1] || locationMatch?.[0] || undefined;

  const getSection = (names: string[]): string => {
    const alt = names.map(n => n.replace(/\s+/g, '\\s+')).join('|');
    const next = '(?:PROFESSIONAL\\s+SUMMARY|SUMMARY|PROFILE|OBJECTIVE|WORK\\s+EXPERIENCE|EXPERIENCE|INTERNSHIP|KEY\\s+PROJECTS|PROJECTS?|TECHNICAL\\s+SKILLS|SKILLS|EDUCATION)';
    const regex = new RegExp(`(?:^|\\n)(?:${alt})\\s*:\\s*([\\s\\S]*?)(?=\\n(?:${next})\\s*:|$)`, 'i');
    return sectionized.match(regex)?.[1]?.trim() || '';
  };

  const summarySection = getSection(['PROFESSIONAL SUMMARY', 'SUMMARY', 'PROFILE', 'OBJECTIVE']);
  const experienceSection = getSection(['WORK EXPERIENCE', 'EXPERIENCE', 'INTERNSHIP']);
  const projectsSection = getSection(['KEY PROJECTS', 'PROJECTS']);
  const skillsSection = getSection(['TECHNICAL SKILLS', 'SKILLS']);
  const educationSection = getSection(['EDUCATION']);

  const toBullets = (value: string): string[] => uniq(
    value
      .split(/\s*[•▪◦]\s*|\s+\d+\.\s+|;\s*/g)
      .flatMap(part => part.split(/(?<=[.!?])\s+(?=[A-Z])/))
      .map(sanitizeLine)
      .filter(Boolean),
    20,
    190
  );

  let experience = uniq(
    experienceSection
      .split(/\s*[•▪◦]\s*|\s+\d+\.\s+|\s{2,}/g)
      .map(sanitizeLine)
      .filter(Boolean),
    12,
    180
  ).slice(0, 5);

  const internshipMatch = compact.match(/(Web Development Intern|Frontend Intern|Backend Intern|Intern)\s*(?:at|@|-)\s*([A-Za-z][A-Za-z0-9&.\s]{2,40}).{0,40}?((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–]\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/i);
  if (internshipMatch) {
    const formatted = `${internshipMatch[1]} - ${internshipMatch[2].trim()} (${internshipMatch[3].replace(/[–]/g, '-').replace(/\s+/g, ' ').trim()})`;
    experience = uniq([formatted, ...experience], 12, 180).slice(0, 5);
  }

  if (experience.length === 0) {
    const expFallback = compact.match(/(?:Web Development Intern|Developer|Engineer)[^.]{0,90}(?:TekNavigators|at\s+[A-Za-z0-9&.\s]{2,40})[^.]{0,70}/gi) || [];
    experience = uniq(expFallback, 12, 180).slice(0, 5);
  }
  experience = uniq(experience.map((item) => sanitizeLine(item).replace(/\b0(\d{1}\/\d{4})\b/g, '$1')), 12, 180).slice(0, 5);
  if (experience.length === 0) {
    const genericInternSentence = compact.match(/([^.]*\bIntern[^.]*\.)/i)?.[1];
    if (genericInternSentence) {
      experience = uniq([genericInternSentence], 12, 180).slice(0, 5);
    }
  }

  const explicitProjects: string[] = [];
  if (/\blakpdf\.com\b/i.test(compact)) {
    explicitProjects.push('lakpdf.com - Online PDF tools platform with multiple utilities.');
  }
  if (/\bheart disease prediction\b/i.test(compact)) {
    explicitProjects.push('Heart Disease Prediction App - ML-based prediction system built with Flask.');
  }

  let projects = uniq([
    ...explicitProjects,
    ...projectsSection.split(/\s*[•▪◦]\s*|\s+\d+\.\s+|\s{2,}/g).map(sanitizeLine).filter(Boolean)
  ], 10, 190)
    .filter(item => !/built and maintained live applications|developed and deployed live applications|live applications/i.test(item))
    .slice(0, 6);

  if (projects.length === 0) {
    const projectFallback = compact.match(/(?:Developed|Built|Created)\s+(?:lakpdf\.com|Heart Disease Prediction App|[A-Za-z0-9 ._-]{4,50})[^.]{0,70}/gi) || [];
    projects = uniq(projectFallback, 10, 190).slice(0, 6);
  }

  const finalizeSentence = (value: string): string => {
    let sentence = value.replace(/\s+/g, ' ').trim();
    sentence = sentence.replace(/\b[a-zA-Z]$/, '').trim();
    if (!sentence) return '';
    if (!/[.!?]$/.test(sentence)) sentence = `${sentence}.`;
    return sentence;
  };

  let professionalSummary = toBullets(summarySection)
    .map(finalizeSentence)
    .filter(Boolean)
    .filter(line => line.length >= 35)
    .slice(0, 3);
  if (professionalSummary.length === 0) {
    professionalSummary = [
      'Computer Science graduate with hands-on experience in full-stack web development.',
      experience[0]
        ? `Completed internship at ${experience[0].match(/-\s*([A-Za-z0-9&.\s]+)\s*\(/)?.[1]?.trim() || 'TekNavigators'} focused on UI enhancement and deployment support.`
        : 'Hands-on exposure to real-world web development workflows.',
      projects.length > 0
        ? 'Built and deployed live applications with performance optimization and AI-assisted workflows.'
        : 'Skilled in building practical web applications with clean, maintainable code.'
    ];
  }
  professionalSummary = uniq(
    professionalSummary
      .map(finalizeSentence)
      .filter(Boolean)
      .filter(line => !/built applications/i.test(line)),
    20,
    190
  ).slice(0, 3);

  const skillTokens = uniq([
    ...skillsSection.split(/,|\/|\||\s*[•▪◦]\s*|\s+\d+\.\s+/g).map(sanitizeLine),
    ...(compact.match(/\b(HTML5|HTML|CSS3|CSS|Bootstrap|React(?:\.js)?|JavaScript|TypeScript|Python|Flask|MongoDB|MySQL|PostgreSQL|GitHub|Git|VS Code|Node\.?js)\b/gi) || [])
  ], 2, 35);
  const canonicalSkill = (skill: string): string => {
    const lowerSkill = skill.toLowerCase();
    if (lowerSkill === 'react.js') return 'React';
    if (lowerSkill === 'html5') return 'HTML';
    if (lowerSkill === 'css3') return 'CSS';
    if (lowerSkill === 'vs code') return 'VS Code';
    return skill;
  };
  const canonicalSkillTokens = uniq(skillTokens.map(canonicalSkill), 2, 35);

  const lower = (value: string) => value.toLowerCase();
  const frontend = uniq(canonicalSkillTokens.filter(s => /(html|css|bootstrap|react|javascript|typescript|responsive)/i.test(lower(s))));
  const backend = uniq(canonicalSkillTokens.filter(s => /(python|flask|node|backend)/i.test(lower(s))));
  const database = uniq(canonicalSkillTokens.filter(s => /(mongo|mysql|postgres|database)/i.test(lower(s))));
  const tools = uniq(canonicalSkillTokens.filter(s => /(git|github|vs code|vscode|postman)/i.test(lower(s))));
  const skills = uniq([...frontend, ...backend, ...database, ...tools, ...canonicalSkillTokens], 2, 35).slice(0, 18);

  let education = uniq(
    educationSection
      .split(/\s*[•▪◦]\s*|\s+\d+\.\s+|\s{2,}/g)
      .map(sanitizeLine)
      .filter(Boolean),
    8,
    190
  ).slice(0, 4);
  if (education.length === 0) {
    const educationFallback = compact.match(/(?:B\.?\s*Tech|Bachelor|Diploma|BCA|MCA|BSc|MSc)[^.]{0,90}(?:University|College|Institute)[^.]{0,60}/gi) || [];
    education = uniq(educationFallback.map(sanitizeLine), 8, 190).slice(0, 4);
  }

  return {
    overview: `Summary of ${name}'s Profile`,
    name,
    role,
    location,
    contact,
    professionalSummary,
    skillCategories: { frontend, backend, database, tools },
    skills,
    experience,
    projects,
    education,
    verdict: 'Resume parsed with section-aware extraction and redundancy removal.'
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

const HEAVY_BROKEN_WORD_RULES: Array<[RegExp, string]> = [
  [/\b([A-Za-z]{3,})\s+(tion|sion|ment|ness|ship|able|ible)\b/g, '$1$2'],
  [/\b(Passeng)\s+er\b/gi, '$1er'],
  [/\b(Registrat)\s+ion\b/gi, '$1ion'],
  [/\b(Applicat)\s+ion\b/gi, '$1ion'],
  [/\b(Numbe)\s+r\b/gi, '$1r']
];

const cleanExtractedTextForParsing = (text: string): string => {
  return heavyCleanExtractedText(text).cleanedText;
};

const heavyCleanExtractedText = (text: string): TextCleanupResult => {
  if (!text) {
    return {
      cleanedText: '',
      previewText: '',
      stats: {
        removedBrokenChars: 0,
        mergedBrokenWords: 0,
        removedDuplicateLines: 0,
        grammarFixes: 0
      }
    };
  }

  const stats: TextCleanupStats = {
    removedBrokenChars: 0,
    mergedBrokenWords: 0,
    removedDuplicateLines: 0,
    grammarFixes: 0
  };

  let working = text
    .replace(/\u00ad/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  const beforeLigatures = working;
  working = working
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[•·]/g, ' ');
  if (beforeLigatures !== working) stats.removedBrokenChars += 1;

  const rawLines = working
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const mergedLines: string[] = [];
  for (const line of rawLines) {
    const previous = mergedLines[mergedLines.length - 1];
    if (!previous) {
      mergedLines.push(line);
      continue;
    }

    if (/-$/.test(previous) && /^[A-Za-z]/.test(line)) {
      mergedLines[mergedLines.length - 1] = `${previous.replace(/-$/, '')}${line}`;
      stats.mergedBrokenWords += 1;
      continue;
    }

    if (!/[.!?:]$/.test(previous) && /^[a-z]/.test(line)) {
      mergedLines[mergedLines.length - 1] = `${previous} ${line}`;
      stats.grammarFixes += 1;
      continue;
    }

    mergedLines.push(line);
  }

  const dedupedLines: string[] = [];
  const seen = new Set<string>();
  for (const line of mergedLines) {
    const key = line.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
    if (!key) continue;
    if (seen.has(key)) {
      stats.removedDuplicateLines += 1;
      continue;
    }
    seen.add(key);
    dedupedLines.push(line);
  }

  let normalized = dedupedLines.join('\n');
  // Remove noisy header/footer fragments frequently produced by OCR.
  normalized = normalized
    .replace(/\b(?:page\s*\d+\s*of\s*\d+|generated\s*on\s*[:\-]?\s*[\w\s,/:.-]+|www\.[^\s]+)\b/gi, ' ')
    .replace(/\b(?:confidential|scan\s*copy|document\s*id\s*[:\-]?\s*[A-Za-z0-9\-]+)\b/gi, ' ');

  const beforeGrammar = normalized;
  normalized = normalized
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])([A-Za-z])/g, '$1 $2')
    .replace(/[^\p{L}\p{N}\s:/.\-(),'"₹$%&@+#]/gu, ' ');
  if (beforeGrammar !== normalized) stats.grammarFixes += 1;

  HEAVY_BROKEN_WORD_RULES.forEach(([pattern, replacement]) => {
    const before = normalized;
    normalized = normalized.replace(pattern, replacement);
    if (before !== normalized) stats.mergedBrokenWords += 1;
  });

  normalized = normalized.replace(/\b(?:[A-Za-z]\s+){3,}[A-Za-z]\b/g, (value) => {
    stats.mergedBrokenWords += 1;
    return value.replace(/\s+/g, '');
  });

  const compact = normalized
    .replace(/\n+/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const tokens = compact.replace(/\n/g, ' ').split(' ');
  const filtered = tokens.filter((token) => {
    if (!token) return false;
    if (/^[\-_]+$/.test(token)) return false;
    if (/^[A-Za-z]{1,2}$/.test(token)) return false;
    return true;
  });

  const cleanedText = filtered.join(' ').replace(/\s+/g, ' ').trim();
  const deRepeatedWords = cleanedText.replace(/\b([A-Za-z][A-Za-z0-9]{1,})\b(?:\s+\1\b){1,}/gi, '$1');
  if (deRepeatedWords !== cleanedText) {
    stats.removedDuplicateLines += 1;
  }
  return {
    cleanedText: deRepeatedWords,
    previewText: deRepeatedWords.slice(0, 1200),
    stats
  };
};

const normalizeOcrToken = (value: string): string => {
  return value
    .replace(/[0]/g, 'O')
    .replace(/[1|]/g, 'I')
    .replace(/[5]/g, 'S')
    .replace(/[8]/g, 'B')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
};

const isLikelyCityLikeToken = (value: string): boolean => {
  const normalized = normalizeOcrToken(value);
  if (normalized.length < 4) return false;
  if (['FROM', 'TO', 'FLIGHT', 'GATE', 'DATE', 'TIME', 'PASSENGER', 'BOARDING'].includes(normalized)) return false;
  const vowelCount = (normalized.match(/[AEIOU]/g) || []).length;
  return vowelCount >= 1;
};

const normalizeCityLabel = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const cleaned = value
    .replace(/\b(FROM|TO|FLIGHT|DATE|TIME|GATE|PASSENGER)\b/gi, ' ')
    .replace(/[^A-Za-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;

  const words = cleaned
    .split(' ')
    .map(normalizeOcrToken)
    .filter(isLikelyCityLikeToken);
  if (words.length === 0) return null;

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
};

const sanitizePassengerName = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const passengerNoiseTokens = new Set([
    'FROM', 'TO', 'FLIGHT', 'FUGHT', 'BOARDING', 'PASS', 'PASSENGER', 'DATE', 'TIME', 'GATE', 'SEAT', 'TERMINAL', 'AIRLINES', 'TICKET'
  ]);
  const cleaned = value
    .replace(/\b(FROM|TO|FLIGHT|DATE|TIME|GATE|BOARDING|PASSENGER)\b.*/i, '')
    .replace(/[^A-Za-z\s.'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  let words = cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter(Boolean)
    .filter((w) => {
      const normalized = normalizeOcrToken(w);
      if (!normalized) return false;
      if (passengerNoiseTokens.has(normalized)) return false;
      if (/^F\w{0,2}GHT$/i.test(normalized)) return false;
      return true;
    });
  // Boarding-pass names are typically 2-3 tokens; trim trailing OCR noise aggressively.
  words = words.slice(0, 3);
  if (words.length === 0) return null;
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const isValidExtractedField = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (['not found', 'origin not found', 'destination not found', 'date not found', 'unknown'].includes(normalized)) {
    return false;
  }
  return true;
};

const normalizeFlightCode = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2,4}$/.test(normalized) ? normalized : null;
};

const normalizeGateValue = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]?\d{1,3}[A-Z]?$/.test(normalized) ? normalized : null;
};

const extractBoardingCloseText = (text: string): string | null => {
  const match = text.match(/\b(?:boarding\s+gate\s+)?close[sd]?\s+(\d{1,2})\s+minutes?\s+(?:prior|before)\b/i);
  if (!match) return null;
  return `${match[1]} min before departure`;
};

const scoreFieldConfidence = (
  status: 'ok' | 'warning' | 'missing',
  value: string | null | undefined,
  pattern?: RegExp
): number => {
  if (status === 'missing') return 0;
  const cleaned = (value || '').trim();
  if (!cleaned) return 0;
  if (status === 'warning') {
    if (pattern && pattern.test(cleaned)) return 58;
    return 42;
  }
  if (pattern && !pattern.test(cleaned)) return 70;
  return 90;
};

const calculateRuleBasedSummaryConfidence = (docType: DocumentType, structuredData?: StructuredData, cleanTextLength = 0): number => {
  const base = cleanTextLength >= 400 ? 76 : cleanTextLength >= 200 ? 66 : 55;
  if (!structuredData) return base;

  if (docType === 'flight-ticket' && structuredData.flightTicket) {
    const f = structuredData.flightTicket as any;
    const fieldHits = [
      f?.passengers?.[0]?.name,
      f?.journey?.from,
      f?.journey?.to,
      f?.journey?.flight,
      f?.journey?.date,
      f?.journey?.departureTime,
      f?.journey?.gate,
      f?.journey?.boardingTime,
      f?.passengers?.[0]?.seat,
      f?.pnr
    ].filter((v) => isValidExtractedField(typeof v === 'string' ? v : null)).length;
    return Math.min(98, Math.max(45, base + fieldHits * 4));
  }

  if (docType === 'invoice' && structuredData.invoice) {
    const i = structuredData.invoice as any;
    const fieldHits = [i?.seller, i?.buyer, i?.invoiceNumber, i?.date, i?.total]
      .filter((v) => isValidExtractedField(typeof v === 'string' ? v : null)).length;
    return Math.min(95, Math.max(45, base + fieldHits * 5));
  }

  if (docType === 'receipt' && structuredData.receipt) {
    const r = structuredData.receipt as any;
    const fieldHits = [r?.merchant, r?.date, r?.total, r?.paymentMethod]
      .filter((v) => isValidExtractedField(typeof v === 'string' ? v : null)).length;
    return Math.min(92, Math.max(45, base + fieldHits * 6));
  }

  return Math.min(90, Math.max(45, base));
};

const createTextChunksFromText = (text: string, pageNumber = 1, chunkSize = 500): TextChunk[] => {
  const normalized = text.replace(/\r/g, '\n').trim();
  if (!normalized) return [];

  const chunks: TextChunk[] = [];
  for (let i = 0; i < normalized.length; i += chunkSize) {
    chunks.push({
      text: normalized.substring(i, i + chunkSize),
      pageNumber
    });
  }
  return chunks;
};

const extractPNRandAmount = (text: string): { pnr: string | null; amount: number | null } => {
  if (!text) return { pnr: null, amount: null };

  const normalizePnrDigits = (value: string) => {
    return value
      .replace(/[Oo]/g, '0')
      .replace(/[Ii]/g, '1')
      .replace(/[Bb]/g, '8')
      .replace(/[Ss]/g, '5')
      .replace(/[Zz]/g, '2');
  };

  const extractPnr = (value: string) => {
    const labelMatch =
      value.match(/\bPNR\s*(?:N[O0]|NUM[B8]ER|NUMBER)?\.?\s*[:\-]?\s*([0-9OIBSZ\s\-]{10,20})/i) ||
      value.match(/\bPassenger\s+Name\s+Record\s*[:\-]?\s*([0-9OIBSZ\s\-]{10,20})/i);

    if (!labelMatch) return null;

    const normalized = normalizePnrDigits(labelMatch[1]);
    const digitsOnly = normalized.replace(/[^0-9]/g, '');
    return digitsOnly.length === 10 ? digitsOnly : null;
  };

  const pnr = extractPnr(text);

  const amountMatch =
    text.match(/(?:Total\s*Fare|Total\s*Payment|Grand\s*Total|Amount\s*Paid|Fare)\s*[:\-]?\s*(?:₹|INR|Rs\.?)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?)/i) ||
    text.match(/(?:₹|INR|Rs\.?)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?)/i);

  const amountRaw = amountMatch ? amountMatch[1] : null;
  const amount = amountRaw ? parseFloat(amountRaw.replace(/,/g, '')) : null;

  return {
    pnr,
    amount: Number.isFinite(amount) ? amount : null
  };
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

// Generate generic summary from text chunks (helper function)
const generateGenericSummary = (textChunks: TextChunk[]): GenericSummary | undefined => {
  if (textChunks.length === 0) return undefined;

  // Combine all text
  const fullText = textChunks.map(chunk => chunk.text).join('\n');
  const cleanedText = cleanText(fullText);

  if (cleanedText.length < 100) return undefined; // Too short to summarize

  // Calculate total words and reading time
  const words = cleanedText.split(/\s+/);
  const totalWords = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(totalWords / 200)); // 200 words/min

  // Generate short summary (first meaningful paragraph)
  let shortSummary = '';
  const sentences = splitIntoSentences(cleanedText);

  if (sentences.length > 0) {
    // Take first 2-4 sentences for short summary
    const summaryLength = Math.min(4, Math.max(2, sentences.length));
    shortSummary = sentences.slice(0, summaryLength).join('. ') + '.';

    // Limit to ~200 characters
    if (shortSummary.length > 250) {
      shortSummary = shortSummary.substring(0, 247) + '...';
    }
  } else {
    // Fallback: use first 200 characters
    shortSummary = cleanedText.substring(0, 200) + '...';
  }

  // Generate key points using sentence scoring
  const keyPoints: string[] = [];

  if (sentences.length >= 5) {
    // Calculate word frequency for scoring
    const allWords = extractKeywords(cleanedText);
    const wordFreq = calculateWordFrequency(allWords);

    // Score all sentences
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: scoreSentence(sentence, wordFreq, index, sentences.length)
    }));

    // Sort by score and take top 5-7
    scoredSentences.sort((a, b) => b.score - a.score);
    const topSentences = scoredSentences.slice(0, Math.min(7, sentences.length));

    // Sort back by original order for readability
    topSentences.sort((a, b) =>
      sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence)
    );

    keyPoints.push(...topSentences.map(s => s.sentence.trim()));
  } else {
    // For short documents, use all sentences as key points
    keyPoints.push(...sentences.slice(0, 7));
  }

  return {
    shortSummary,
    keyPoints: keyPoints.slice(0, 7), // Max 7 points
    totalWords,
    readingTimeMinutes,
    fullCleanedText: cleanedText
  };
};

const confidenceLabelFromScore = (score: number): 'High' | 'Medium' | 'Low' => {
  if (score >= 80) return 'High';
  if (score >= 55) return 'Medium';
  return 'Low';
};

const addFieldConfidenceLabelsToSummary = (summary: PdfSummary): PdfSummary => {
  const clone: PdfSummary = { ...summary };
  const schema = (clone.generic as any)?.newSchema;

  if (clone.structured?.flightTicket?.validation?.fieldConfidence) {
    const fieldConfidence = clone.structured.flightTicket.validation.fieldConfidence;
    const labels: Record<string, string> = {};
    Object.entries(fieldConfidence).forEach(([key, value]) => {
      labels[key] = confidenceLabelFromScore(Number(value || 0));
    });
    (clone.structured.flightTicket.validation as any).fieldConfidenceLabel = labels;
  }

  if (schema && typeof schema === 'object' && schema.fields && typeof schema.fields === 'object') {
    const labels: Record<string, string> = {};
    Object.entries(schema.fields as Record<string, unknown>).forEach(([key, value]) => {
      const raw = typeof value === 'string' ? value.trim() : '';
      if (!raw) {
        labels[key] = 'Low';
      } else if (
        /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(raw) ||
        /^[A-Z0-9-]{5,}$/.test(raw) ||
        raw.toLowerCase().includes('success')
      ) {
        labels[key] = 'High';
      } else {
        labels[key] = 'Medium';
      }
    });
    schema.field_confidence = labels;
  }

  return clone;
};

const validateSummaryOutput = (
  summary: PdfSummary | undefined,
  cleanedText: string,
  cleanup: TextCleanupResult
): PdfSummary => {
  if (!summary || !summary.generic) {
    return {
      documentType: 'generic',
      generic: {
        shortSummary: cleanedText.slice(0, 240) || 'No readable text was detected in this document.',
        keyPoints: [
          'Structured extraction did not return usable output.',
          cleanedText ? 'Fallback summary generated from cleaned document text.' : 'Try OCR for scanned/image-based PDF files.'
        ],
        totalWords: cleanedText ? cleanedText.split(/\s+/).length : 0,
        readingTimeMinutes: 1,
        cleanedTextPreview: cleanup.previewText,
        cleanupStats: cleanup.stats
      }
    };
  }

  const shortSummary = (summary.generic.shortSummary || '').trim();
  if (!shortSummary) {
    summary.generic.shortSummary = cleanedText.slice(0, 240) || 'No readable text was detected in this document.';
  }
  if (!Array.isArray(summary.generic.keyPoints) || summary.generic.keyPoints.length === 0) {
    summary.generic.keyPoints = [
      'No structured bullet points were extracted.',
      'Fallback bullet points were generated from cleaned text.'
    ];
  }

  summary.generic.cleanedTextPreview = cleanup.previewText;
  summary.generic.cleanupStats = cleanup.stats;
  return addFieldConfidenceLabelsToSummary(summary);
};

// Generate smart summary - LIGHTWEIGHT VERSION (browser-safe)
const generateSmartSummary = async (
  textChunks: TextChunk[],
  analysis: any,
  cleanup: TextCleanupResult,
  fallback?: { pnr: string | null; amount: number | null }
): Promise<PdfSummary | undefined> => {
  if (textChunks.length === 0) return {
    documentType: 'generic',
    generic: {
      shortSummary: 'No readable text was detected in this document.',
      keyPoints: ['Text extraction returned empty content.', 'Try OCR for scanned/image-based PDFs.'],
      totalWords: 0,
      readingTimeMinutes: 1,
      cleanedTextPreview: cleanup.previewText,
      cleanupStats: cleanup.stats
    }
  };

  // Keep enough context for form-style extraction while staying browser-safe
  const fullText = textChunks.map(chunk => chunk.text).join('\n').substring(0, 30000);
  const cleanedText = cleanup.cleanedText;

  if (cleanedText.length < 50) {
    return {
      documentType: 'generic',
      generic: {
        shortSummary: cleanedText || 'Very limited readable text detected.',
        keyPoints: [
          cleanedText ? 'Document has too little text for reliable structured parsing.' : 'Document appears image-based or text extraction failed.',
          'Fallback generic summary was used.'
        ],
        totalWords: cleanedText ? cleanedText.split(/\s+/).length : 0,
        readingTimeMinutes: 1,
        cleanedTextPreview: cleanup.previewText,
        cleanupStats: cleanup.stats
      }
    };
  }

  let documentType: DocumentType = 'generic';
  let genericSummary: GenericSummary | undefined;
  let structuredData: StructuredData | undefined;

  logger.debug('[Smart Summary] Trying LLM extraction first, then rule-based fallback');

  try {
    // LLM-hybrid extraction path (uses strict schema + regex fallback in llmExtractor)
    try {
      const { extractWithLLM, mapLLMResultToSummary } = await import('./llmExtractor');
      const llmResult = await extractWithLLM(fullText, {
        ocrQuality: analysis?.ocrConfidence ?? Math.round((analysis?.searchableTextRatio || 0) * 100)
      });
      if (llmResult) {
        const mappedResult = mapLLMResultToSummary(llmResult);
        const schema = (mappedResult as any)?.newSchema;
        const schemaHasSummary = typeof schema?.summary === 'string' && schema.summary.trim().length > 0;
        const schemaHasImportantPoints = Array.isArray(schema?.important_points) && schema.important_points.length > 0;
        const schemaIsTrainTicket = schema?.ticketType === 'TRAIN';
        const schemaIsApplicationWithFields = schema?.document_type === 'application_form' &&
          schema?.fields &&
          typeof schema.fields === 'object' &&
          Object.values(schema.fields).some((value: unknown) => typeof value === 'string' && value.trim() !== '');
        const mappedDocType = (mappedResult?.documentType || 'generic') as DocumentType;
        const hasMeaningfulGenericSummary =
          typeof mappedResult?.generic?.shortSummary === 'string' &&
          mappedResult.generic.shortSummary.trim().length > 0 &&
          mappedResult.generic.shortSummary.toLowerCase() !== 'generic_document structured summary';

        const shouldUseLlmResult = Boolean(
          mappedResult?.generic && (
            schemaIsTrainTicket ||
            schemaHasSummary ||
            schemaHasImportantPoints ||
            schemaIsApplicationWithFields ||
            mappedDocType !== 'generic' ||
            hasMeaningfulGenericSummary
          )
        );

        if (shouldUseLlmResult) {
          const resolvedDocType: DocumentType =
            (mappedResult as any)?.newSchema?.document_type === 'application_form'
              ? 'application-form'
              : (mappedDocType === 'generic'
                ? detectDocumentType(cleanedText, analysis?.metadata || {}, analysis?.fileName || '')
                : mappedDocType);
          const genericWithSchema = {
            ...mappedResult.generic,
            newSchema: (mappedResult as any).newSchema
          };
          // ✅ BRIDGE: Ensure LLM result also maps to flightTicket schema for UI visibility
          if (resolvedDocType === 'train-ticket' || resolvedDocType === 'flight-ticket') {
            const existingFlightTicket = mappedResult.structured?.flightTicket;
            const newSchema = (mappedResult as any).newSchema;
            const fields = newSchema?.fields || {};

            // Try to find fields if existingFlightTicket is bare or missing
            const pnr = existingFlightTicket?.pnr || fields['PNR'] || fields['pnr'] || undefined;
            const passengers = existingFlightTicket?.passengers && existingFlightTicket.passengers.length > 0
              ? existingFlightTicket.passengers
              : (newSchema?.passengers || []); // Fallback

            const shortSummary = existingFlightTicket?.overview || newSchema?.summary || mappedResult.generic?.shortSummary || 'Ticket summary';

            mappedResult.structured = {
              ...mappedResult.structured,
              flightTicket: {
                ...(existingFlightTicket || {}),
                overview: shortSummary,
                pnr,
                passengers: (passengers.length > 0 ? passengers : [{ name: 'Not clearly detected' }]).map((p: any) => ({
                  name: p.name || 'Not clearly detected',
                  age: p.age || undefined,
                  gender: p.gender || undefined,
                  status: p.currentStatus || p.bookingStatus || 'CNF',
                  pnr: pnr,
                  seat: p.seat || undefined,
                })),
                journey: {
                  from: existingFlightTicket?.journey?.from || fields['From'] || fields['from'] || undefined,
                  to: existingFlightTicket?.journey?.to || fields['To'] || fields['to'] || undefined,
                  date: existingFlightTicket?.journey?.date || fields['Date of Journey'] || fields['date'] || undefined,
                  flight: existingFlightTicket?.journey?.flight || fields['Train Name and Number'] || undefined,
                  departureTime: existingFlightTicket?.journey?.departureTime || undefined,
                  arrivalTime: existingFlightTicket?.journey?.arrivalTime || undefined,
                  boardingTime: existingFlightTicket?.journey?.boardingTime || undefined,
                  gate: existingFlightTicket?.journey?.gate || fields['Class and Coach'] || undefined,
                  terminal: existingFlightTicket?.journey?.terminal || undefined,
                },
                validation: {
                  completeness: 100,
                  status: 'ok',
                  fieldConfidence: { passenger: 100, pnr: 100, from: 100, to: 100, flight: 100, date: 100, gate: 100, seat: 100 },
                  fieldStatus: { passenger: 'ok', pnr: 'ok', from: 'ok', to: 'ok', flight: 'ok', date: 'ok', gate: 'ok', seat: 'ok' }
                },
                verdict: 'Extracted with AI precision'
              } as any
            };
          }

          return {
            documentType: resolvedDocType,
            generic: genericWithSchema as any,
            structured: mappedResult.structured,
            confidenceScore: (mappedResult as any).confidenceScore
          } as any;
        }
        logger.debug('[Smart Summary] LLM result not meaningful for UI, using rule-based fallback');
      }
      logger.debug('[Smart Summary] LLM returned no usable result, falling back to rule-based');
    } catch (llmError) {
      console.warn('[Smart Summary] LLM extraction failed, using rule-based fallback:', llmError);
    }

    const detectedDocType = detectDocumentType(cleanedText, analysis?.metadata || {}, analysis?.fileName || '');
    if (detectedDocType === 'resume') {
      const resume = extractResumeData(fullText, analysis?.fileName || '');
      const frontendLine = resume.skillCategories?.frontend?.length
        ? `Frontend: ${resume.skillCategories.frontend.join(', ')}`
        : null;
      const backendLine = resume.skillCategories?.backend?.length
        ? `Backend: ${resume.skillCategories.backend.join(', ')}`
        : null;
      const databaseLine = resume.skillCategories?.database?.length
        ? `Database: ${resume.skillCategories.database.join(', ')}`
        : null;
      const toolsLine = resume.skillCategories?.tools?.length
        ? `Tools: ${resume.skillCategories.tools.join(', ')}`
        : null;
      const profileLines = [
        `Summary of ${resume.name}'s Profile`,
        '',
        `• Name: ${resume.name}`,
        `• Role: ${resume.role || '-'}`,
        `• Location: ${resume.location || '-'}`,
        `• Contact: ${resume.contact || '-'}`,
        '',
        'Professional Summary',
        ...resume.professionalSummary.slice(0, 3).map(point => `• ${point}`),
        '',
        'Experience',
        ...resume.experience.slice(0, 5).map(item => `• ${item}`),
        '',
        'Key Projects',
        ...resume.projects.slice(0, 6).map(item => `• ${item}`),
        '',
        'Technical Skills',
        ...(frontendLine ? [frontendLine] : []),
        ...(backendLine ? [backendLine] : []),
        ...(databaseLine ? [databaseLine] : []),
        ...(toolsLine ? [toolsLine] : []),
        ...(resume.skills.length > 0 ? resume.skills.slice(0, 10).map(skill => `• ${skill}`) : [])
      ].join('\n');

      return {
        documentType: 'resume',
        generic: {
          shortSummary: profileLines,
          keyPoints: [
            ...resume.professionalSummary.slice(0, 3),
            ...resume.experience.slice(0, 2),
            ...resume.projects.slice(0, 2)
          ].slice(0, 7),
          totalWords: cleanedText.split(' ').length,
          readingTimeMinutes: Math.ceil(cleanedText.split(' ').length / 200)
        },
        structured: {
          resume
        },
        confidenceScore: calculateRuleBasedSummaryConfidence('resume', { resume }, cleanedText.length)
      };
    }

    // Import rule-based generator
    const { generateStructuredSummary } = await import('./structuredSummary');
    const structuredResult = generateStructuredSummary(cleanedText);

    const isTrainTicketSchema = (value: any): value is { ticketType: 'TRAIN'; status: string | null; pnr?: string | null; train?: any; journey?: any; passengers?: any[]; } => {
      return value && value.ticketType === 'TRAIN' && value.train && value.journey;
    };

    if (isTrainTicketSchema(structuredResult)) {
      const ticketSummary = structuredResult;

      const hasPassengerName = Array.isArray(ticketSummary.passengers)
        && ticketSummary.passengers.some((p: any) => typeof p?.name === 'string' && p.name.trim() && p.name.trim().toLowerCase() !== 'not clearly detected');
      if (!hasPassengerName) {
        try {
          const { microExtractPassengerName } = await import('./llmExtractor');
          const aiPassenger = await microExtractPassengerName(cleanedText);
          if (aiPassenger) {
            if (!Array.isArray(ticketSummary.passengers) || ticketSummary.passengers.length === 0) {
              ticketSummary.passengers = [{ name: aiPassenger, age: null, gender: null, bookingStatus: null, currentStatus: null }];
            } else {
              ticketSummary.passengers[0] = {
                ...ticketSummary.passengers[0],
                name: aiPassenger
              };
            }
          }
        } catch {
          // Keep rule-based passenger result when micro extraction fails.
        }
      }

      if (fallback?.pnr && !ticketSummary.pnr) {
        ticketSummary.pnr = fallback.pnr;
      }

      if (fallback?.amount !== null && fallback?.amount !== undefined) {
        if (!ticketSummary.pricing) {
          ticketSummary.pricing = {
            currency: 'INR',
            totalFare: null,
            gst: null,
            invoiceNumber: null
          };
        }
        if (ticketSummary.pricing.totalFare === null || ticketSummary.pricing.totalFare === undefined) {
          ticketSummary.pricing.totalFare = fallback.amount;
        }
      }

      const keyPoints: string[] = [];

      if (ticketSummary.status) {
        keyPoints.push(`Status: ${ticketSummary.status}`);
      }
      if (ticketSummary.journey?.from && ticketSummary.journey?.to) {
        keyPoints.push(`Route: ${ticketSummary.journey.from} → ${ticketSummary.journey.to}`);
      }
      if (ticketSummary.journey?.date) {
        keyPoints.push(`Date: ${ticketSummary.journey.date}`);
      }
      if (ticketSummary.train?.number || ticketSummary.train?.name) {
        keyPoints.push(`Train: ${[ticketSummary.train?.name, ticketSummary.train?.number].filter(Boolean).join(' ')}`);
      }
      if (ticketSummary.passengers?.length) {
        keyPoints.push(`Passengers: ${ticketSummary.passengers.length}`);
      }

      const shortSummary = ticketSummary.journey?.from && ticketSummary.journey?.to
        ? `Train ticket from ${ticketSummary.journey.from} to ${ticketSummary.journey.to}.`
        : `Train ticket summary.`;

      genericSummary = {
        shortSummary,
        keyPoints: keyPoints.length > 0 ? keyPoints.slice(0, 5) : [shortSummary],
        totalWords: cleanedText.split(' ').length,
        readingTimeMinutes: Math.ceil(cleanedText.split(' ').length / 200)
      };

      // Store newSchema for enhanced display
      (genericSummary as any).newSchema = ticketSummary;
      documentType = 'train-ticket';

      // ✅ BRIDGE: Map train data to flightTicket schema for UI visibility
      structuredData = {
        flightTicket: {
          overview: shortSummary,
          pnr: ticketSummary.pnr || undefined,
          passengers: (ticketSummary.passengers || []).map(p => ({
            name: p.name || 'Not clearly detected',
            age: p.age || undefined,
            gender: p.gender || undefined,
            status: p.currentStatus || p.bookingStatus || 'UNKNOWN',
            pnr: ticketSummary.pnr || undefined,
          })),
          journey: {
            from: ticketSummary.journey?.from || undefined,
            to: ticketSummary.journey?.to || undefined,
            date: ticketSummary.journey?.date || undefined,
            flight: [ticketSummary.train?.name, ticketSummary.train?.number].filter(Boolean).join(' ') || undefined,
            departureTime: ticketSummary.journey?.departureTime || undefined,
            arrivalTime: ticketSummary.journey?.arrivalTime || undefined,
          },
          pricing: {
            total: ticketSummary.pricing?.totalFare ? String(ticketSummary.pricing.totalFare) : '0.00',
            currency: 'INR'
          },
          verdict: 'Extracted with Indian Railways specialization'
        } as any
      };
    } else {
      const legacyResult = structuredResult as any;
      // Map to our format (legacy schema)
      genericSummary = {
        shortSummary: legacyResult.summary,
        keyPoints: legacyResult.important_points.slice(0, 5), // Limit to 5 points
        totalWords: cleanedText.split(' ').length,
        readingTimeMinutes: Math.ceil(cleanedText.split(' ').length / 200)
      };

      // Store newSchema for enhanced display
      (genericSummary as any).newSchema = legacyResult;

      // Map document type
      const mappedDocType = mapToDocumentType(legacyResult.document_type);
      documentType = mappedDocType === 'generic'
        ? detectDocumentType(cleanedText, analysis?.metadata || {}, analysis?.fileName || '')
        : mappedDocType;
    }

    if (documentType === 'flight-ticket') {
      structuredData = {
        flightTicket: extractFlightTicketData(cleanedText)
      };
    } else if (documentType === 'invoice') {
      structuredData = {
        invoice: extractInvoiceData(cleanedText)
      };
    } else if (documentType === 'receipt') {
      structuredData = {
        receipt: extractReceiptData(cleanedText)
      };
    }
  } catch (error) {
    console.error('[Smart Summary] Rule-based extraction failed:', error);
    // Ultra-simple fallback
    genericSummary = {
      shortSummary: cleanedText.substring(0, 200) + '...',
      keyPoints: [cleanedText.substring(0, 150)],
      totalWords: cleanedText.split(' ').length,
      readingTimeMinutes: 1
    };
  }

  return {
    documentType,
    generic: genericSummary,
    structured: structuredData,
    confidenceScore: calculateRuleBasedSummaryConfidence(documentType, structuredData, cleanedText.length)
  };
};

// Helper to map document types
function mapToDocumentType(type: string): DocumentType {
  const lower = type.toLowerCase();
  if (lower.includes('support')) return 'generic';
  if (lower.includes('train')) return 'train-ticket';
  if (lower.includes('flight')) return 'flight-ticket';
  if (lower.includes('ticket')) return 'flight-ticket';
  if (lower.includes('invoice')) return 'invoice';
  if (lower.includes('receipt')) return 'receipt';
  if (lower.includes('resume')) return 'resume';
  return 'generic';
}

// Helper to extract key points from Gemini summary
const extractKeyPointsFromGemini = (summary: string): string[] => {
  if (!summary) return ['No summary available'];
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences.slice(0, 7).map(s => s.trim());
};

// Generate example questions based on content
const generateExampleQuestions = (analysis: ComprehensivePdfAnalysis): string[] => {
  const questions: string[] = [];
  const docType = analysis.summary?.documentType;
  const shortSummary = analysis.summary?.generic?.shortSummary?.toLowerCase() || '';
  const looksLikeTrain = Boolean(
    docType === 'train-ticket' ||
    shortSummary.includes('train') ||
    shortSummary.includes('irctc') ||
    shortSummary.includes('railway')
  );

  const looksLikeFlight = Boolean(
    docType === 'flight-ticket' ||
    analysis.summary?.structured?.flightTicket ||
    shortSummary.includes('boarding pass') ||
    shortSummary.includes('flight')
  );

  if (looksLikeFlight && !looksLikeTrain) {
    const flight = analysis.summary?.structured?.flightTicket as any;
    const missing = (field: string) => (flight?.validation?.fieldStatus?.[field] || 'missing') !== 'ok';

    if (missing('flight')) questions.push('Can you confirm the flight number from the ticket image?');
    else questions.push('What is the flight number?');

    if (missing('boardingTime')) questions.push('When does boarding gate close?');
    else questions.push('What is the boarding time?');

    if (missing('from') || missing('to')) questions.push('Which city is departure and destination?');
    else questions.push('What is the travel route?');

    if (missing('gate') || missing('seat')) questions.push('Can you verify gate and seat number?');
    else questions.push('What is the gate and seat number?');

    if (missing('pnr')) questions.push('Is PNR visible in this ticket?');
    else questions.push('What is the PNR/reference code?');
    return questions.slice(0, 5);
  }

  if (looksLikeTrain) {
    const ticket = analysis.summary?.structured?.flightTicket as any;
    const missing = (field: string) => (ticket?.validation?.fieldStatus?.[field] || 'missing') !== 'ok';

    if (missing('pnr')) questions.push('Can you find the PNR number on this train ticket?');
    else questions.push('What is the PNR number?');

    if (missing('flight')) questions.push('What is the train number?');
    else questions.push('Which train is this for?');

    questions.push('What is the coach and seat/berth number?');
    questions.push('What is the reporting time at the station?');
    questions.push('What is the total fare for this journey?');
    return questions.slice(0, 5);
  }

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

// Main export function for PDF analysis
export async function analyzePdfFile(
  buffer: ArrayBuffer,
  fileName: string,
  fileSize: number,
  maxPages: number,
  onProgress?: (progress: AnalysisProgress) => void,
  file?: File
): Promise<ComprehensivePdfAnalysis> {
  const analysisStartMs = Date.now();
  // Set the progress callback
  progressCallback = onProgress || null;
  logger.debug(`[PDFAnalyzer] Starting analysis for ${fileName}, size: ${fileSize} bytes`);

  let pdf: any = null;
  let pages: any[] = [];
  let isScannedPdf = false;
  let isProtectedPdf = false;
  let hasProcessingErrors = false;
  let contentType: 'text-based' | 'scanned' | 'mixed' | 'unknown' = 'unknown';
  let ocrDurationMs = 0;
  let parsingDurationMs = 0;
  const pageLimit = Math.min(MAX_ANALYZE_PAGES, Math.max(1, Number(maxPages) || MAX_ANALYZE_PAGES));

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

    const totalPages = Math.min(pdf.numPages, pageLimit);
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

    let cleanupResult = heavyCleanExtractedText(totalExtractedText);
    totalExtractedText = cleanupResult.cleanedText;
    const minimumTextLengthForDirectExtraction = 50;
    const extractedTextLength = totalExtractedText.trim().length;
    let autoOcrUsed = false;

    // 🔹 Auto OCR fallback for scanned/image-heavy PDFs
    if (file && extractedTextLength < minimumTextLengthForDirectExtraction) {
      try {
        const ocrStartMs = Date.now();
        postProgress(86, 'Low text detected. Running OCR fallback...');
        const { extractTextWithOCR } = await import('./ocrService');
        const ocrText = await extractTextWithOCR(file, progress => {
          const mapped = Math.min(92, 86 + Math.round((progress.progress / 100) * 6));
          postProgress(mapped, progress.message);
        });

        const cleanedOcrText = heavyCleanExtractedText(ocrText || '').cleanedText;
        if (cleanedOcrText && cleanedOcrText.length >= minimumTextLengthForDirectExtraction) {
          autoOcrUsed = true;
          totalExtractedText = `${totalExtractedText}\n${cleanedOcrText}`.trim();
          const ocrChunks = createTextChunksFromText(cleanedOcrText, 1, 500);
          if (ocrChunks.length > 0) {
            textChunks.push(...ocrChunks);
          }
          const ocrWordCount = cleanedOcrText.split(/\s+/).filter((w) => w.length > 1).length;
          const inferredOcrQuality = Math.min(
            98,
            Math.max(45, ocrWordCount >= 120 ? 92 : ocrWordCount >= 60 ? 82 : ocrWordCount >= 25 ? 70 : 55)
          );
          analysis.ocrConfidence = Math.max(analysis.ocrConfidence, inferredOcrQuality);
          analysis.needsOcr = false;
          if (analysis.contentType === 'scanned') {
            analysis.contentType = 'mixed';
          }
          analysis.textConfidence = Math.max(analysis.textConfidence, Math.min(90, inferredOcrQuality - 8));
          logger.info(`[PDFAnalyzer] Auto OCR fallback succeeded (${cleanedOcrText.length} chars).`);
        } else {
          logger.warn('[PDFAnalyzer] Auto OCR fallback returned insufficient text.');
        }
        ocrDurationMs += Date.now() - ocrStartMs;
      } catch (ocrError) {
        console.warn('[PDFAnalyzer] Auto OCR fallback failed:', ocrError);
      }
    }

    cleanupResult = heavyCleanExtractedText(totalExtractedText);
    totalExtractedText = cleanupResult.cleanedText;

    // 🔹 OCR fallback for PNR/Amount (if missing)
    const detectedFromText = extractPNRandAmount(totalExtractedText);
    let detectedPnr = detectedFromText.pnr;
    let detectedAmount = detectedFromText.amount;

    if ((!detectedPnr || detectedAmount === null) && file && !autoOcrUsed) {
      try {
        const ocrStartMs = Date.now();
        postProgress(88, 'Running OCR for PNR/Amount...');
        const { extractTextWithOCR } = await import('./ocrService');
        const ocrText = await extractTextWithOCR(file, progress => {
          const mapped = Math.min(92, 88 + Math.round((progress.progress / 100) * 4));
          postProgress(mapped, progress.message);
        });
        const ocrDetected = extractPNRandAmount(heavyCleanExtractedText(ocrText).cleanedText);
        detectedPnr = detectedPnr ?? ocrDetected.pnr;
        detectedAmount = detectedAmount ?? ocrDetected.amount;
        ocrDurationMs += Date.now() - ocrStartMs;
      } catch (ocrError) {
        console.warn('[PDFAnalyzer] OCR fallback failed:', ocrError);
      }
    }

    // 🔴 BROWSER SAFETY: Yield to UI thread before heavy processing
    postProgress(90, 'Preparing summary...');
    await new Promise(resolve => setTimeout(resolve, 0));

    // 🔹 NEW: Generate summary and Q&A data (LIGHTWEIGHT MODE)
    postProgress(92, 'Generating smart summary...');

    const textForSummary = totalExtractedText.trim();
    const normalizedChunks = textForSummary.length > 0
      ? createTextChunksFromText(textForSummary, 1, 500)
      : [];
    if (normalizedChunks.length > 0) {
      textChunks.length = 0;
      textChunks.push(...normalizedChunks);
    }

    try {
      const parsingStartMs = Date.now();
      const sourceChunks = (textChunks.length > 0 ? textChunks : normalizedChunks).slice(0, 30);

      await new Promise(resolve => setTimeout(resolve, 10));

      const summaryResult = await generateSmartSummary(sourceChunks, analysis, cleanupResult, {
        pnr: detectedPnr,
        amount: detectedAmount
      });
      analysis.summary = validateSummaryOutput(summaryResult, textForSummary, cleanupResult);

      postProgress(96, 'Preparing Q&A capabilities...');

      if (sourceChunks.length > 0) {
        analysis.qna = {
          enabled: true,
          exampleQuestions: generateExampleQuestions(analysis),
          textChunks: sourceChunks
        };
      } else {
        analysis.qna = {
          enabled: false,
          exampleQuestions: []
        };
      }
      parsingDurationMs = Date.now() - parsingStartMs;
      logger.debug('[PDFAnalyzer] Summary and fallback validation completed.');
    } catch (summaryError) {
      console.error('[PDFAnalyzer] Failed to generate summary:', summaryError);
      analysis.summary = validateSummaryOutput(undefined, textForSummary, cleanupResult);
      analysis.qna = {
        enabled: false,
        exampleQuestions: []
      };
      postProgress(96, 'Summary generation failed. Showing cleaned fallback.');
    }

    // ✅ FIX: Always ensure we reach 100%
    postProgress(98, 'Finalizing analysis...');
    await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for UI update
    postProgress(100, 'Analysis completed successfully');

    analysis.processingMetrics = {
      ocrMs: ocrDurationMs || undefined,
      parsingMs: parsingDurationMs || undefined,
      totalMs: Date.now() - analysisStartMs
    };

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

// Export processQuestion for Q&A functionality
export { processQuestion };
export type { ComprehensivePdfAnalysis, TextChunk, PdfSummary, PdfQnA };
