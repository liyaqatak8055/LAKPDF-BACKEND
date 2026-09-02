// LLM-based PDF document analyzer using backend AI (/api/ask)
// This module handles AI-powered structured data extraction from PDF text

import { API_BASE_URL } from "./apiBase";

const AI_FALLBACK_URL = `${API_BASE_URL}/ask`;
const USE_AI = true;
const DEFAULT_MODEL = import.meta.env.VITE_AI_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const RESUME_STRUCTURED_CONFIDENCE_THRESHOLD = Math.max(
    0,
    Math.min(100, Number(import.meta.env.VITE_RESUME_STRUCTURED_MIN_CONFIDENCE || 68))
);

// LLM extraction schema interfaces
interface LegacyLLMExtractionResult {
    document_type: string;
    title: string;
    summary: string;
    key_details: {
        date: string | null;
        source: string | null;
        reference_number: string | null;
    };
    important_points: string[];
    tables: Array<{
        table_title: string;
        rows: Array<Record<string, string>>;
    }>;
    notes: string;
    confidenceScore: number;
}

interface NewTemplateExtractionResult {
    document_type: string;
    confidence: 'Low' | 'Medium' | 'High' | string;
    confidenceScore?: number;
    category?: string;
    extracted_fields: Record<string, unknown>;
    field_confidence?: Record<string, string>;
    summary: string;
    missing_or_unclear_fields: string[];
    validation?: {
        valid_fields: number;
        total_fields: number;
        invalid_fields: string[];
        missing_fields: string[];
        ocr_quality_weight: number;
        extraction_score?: number;
        classification_confidence?: number;
        overall_score?: number;
    };
}

type StrictDocumentType = 'TRAIN_TICKET' | 'APPLICATION_FORM' | 'GENERIC';

interface StrictDocumentExtractionResult {
    document_type: StrictDocumentType;
    extracted_data: StructuredSummaryJson;
    summary: null;
    key_points: null;
    confidenceScore?: number;
}

interface StructuredSummaryJson {
    document_type: string;
    title: string;
    summary?: string;
    fields: Record<string, string | null>;
    field_confidence?: Record<string, string>;
    sections?: Array<{
        id: string;
        title: string;
        fields: Array<{
            key: string;
            label: string;
            value: string | null;
            confidence?: string;
            source?: string;
        }>;
    }>;
    validation?: {
        completeness: number;
        missing_fields: string[];
        warnings: string[];
    };
}

type ApplicationFieldKey =
    | 'Applicant Name'
    | 'Registration Number'
    | 'Date of Birth'
    | 'Gender'
    | 'Category'
    | "Father's Name"
    | 'Contact'
    | 'Present Address'
    | '10th Board'
    | '12th Board'
    | 'Payment Status';

const APPLICATION_FIELD_ORDER: ApplicationFieldKey[] = [
    'Applicant Name',
    'Registration Number',
    'Date of Birth',
    'Gender',
    'Category',
    "Father's Name",
    'Contact',
    'Present Address',
    '10th Board',
    '12th Board',
    'Payment Status'
];

type ApplicationFields = Record<ApplicationFieldKey, string | null>;

type TrainTicketStatus = 'WAITLISTED' | 'CONFIRMED' | 'CANCELLED';

interface TrainTicketJson {
    ticketType: 'TRAIN';
    status: TrainTicketStatus | null;
    pnr: string | null;
    transactionId?: string | null;
    waitingListType?: string | null;
    train: {
        number: string | null;
        name: string | null;
        class: string | null;
    };
    journey: {
        from: string | null;
        to: string | null;
        departureTime: string | null;
        arrivalTime: string | null;
        date: string | null;
        distanceKm: number | null;
        quota?: string | null;
        coach?: string | null;
        bookingDate?: string | null;
        bookingType?: string | null;
    };
    passengers: Array<{
        name: string | null;
        age: number | null;
        gender: string | null;
        bookingStatus: string | null;
        currentStatus: string | null;
    }>;
    pricing: {
        currency: 'INR';
        totalFare: number | null;
        baseFare?: number | null;
        gst: number | null;
        gstAmount?: number | null;
        invoiceNumber: string | null;
        convenienceFee?: string | null;
    };
    warnings: string[];
}

type LLMExtractionResult = LegacyLLMExtractionResult | TrainTicketJson | StrictDocumentExtractionResult | NewTemplateExtractionResult;

const BASE_SYSTEM_PROMPT = `You are a professional document restructuring engine.

Your role is to UNDERSTAND documents fully and REBUILD them into clean, structured, professional summaries — NOT to copy-paste or dump raw text.

Core Responsibilities:
1. Read and understand the entire document before generating output.
2. Detect all key themes, sections, and document type automatically.
3. Restructure content into clean, logical sections with headings and bullet points.
4. Remove all repetition — each fact appears only once.
5. Convert walls of text into structured bullet points with bold labels.
6. Group related information under descriptive section headings.
7. Highlight and preserve important values: durations, dates, amounts, IDs, reference numbers, goals, timelines.
8. Maintain the original meaning without distortion, hallucination, or omission.
9. Never copy raw text verbatim — always paraphrase and restructure.
10. Make every output visually clean, professional, and scannable.

Document Type Detection (auto-detect from content):
- Train Ticket / Flight Booking → Journey, Passengers, Booking, Payment, Warnings
- Resume / CV → Profile Summary, Experience, Education, Skills, Achievements
- Invoice / Receipt → Billing, Items, Amounts, Payment Details
- Application Form → Applicant Info, Details, Status, Requirements
- Contract / Agreement → Parties, Terms, Duration, Key Clauses, Obligations
- Medical Report → Patient Info, Diagnosis, Treatment, Medications, Follow-up
- Bank Statement → Account Info, Period, Transaction Summary, Balances
- Project Plan / Curriculum → Goals, Schedule, Milestones, Deliverables
- Generic Document → auto-detect sections from content structure

Strict Anti-Hallucination Rules:
- Do NOT invent or guess missing data.
- If a value is unclear due to OCR, write "Not clearly detected".
- Preserve all dates, numbers, IDs, and monetary amounts exactly as written.
- Only correct obvious OCR typos (clear letter substitution errors).
- Never add information not present in the source text.

Output Requirements:
- Output must be valid JSON only. No text or markdown outside the JSON object.
- The "summary" field must contain structured markdown with ## headings and - **Label**: value bullets.
- Maximum 5-7 sections. Each section maximum 5-6 bullets.
- First line of "summary" must be a 1-2 sentence TL;DR overview (no heading).`;

const getSystemPrompt = () => BASE_SYSTEM_PROMPT;

const USER_PROMPT_TEMPLATE = `You are a professional document restructuring engine.

Your task is NOT just to summarize — you must FULLY UNDERSTAND the document and REBUILD its content in a clean, structured format.

Document text to analyze:
-----------------------
{{EXTRACTED_TEXT}}
-----------------------

STRICT RESTRUCTURING RULES:
1. Understand the full document — read and comprehend everything before responding.
2. Detect all key themes, sections, and topics present in the document.
3. Rebuild the content in a clean, structured format — do NOT dump raw text.
4. Remove ALL repetition — each fact appears only once.
5. Convert long paragraphs into logical bullet points under clear headings.
6. Group related information together under descriptive section headings.
7. Highlight important values like duration, goals, timelines, amounts, dates, and reference numbers using **Bold** labels.
8. Maintain the original meaning — do not distort, omit key facts, or add invented info.
9. Avoid copying raw text — paraphrase and structure intelligently.
10. Make the output visually clean, scannable, and structured.

REQUIRED OUTPUT FORMAT for the "summary" field — clean markdown:
- Start with a 1-2 sentence TL;DR overview (no heading, no bullet).
- Then use ## Section Headings for each logical group.
- Under each heading, use bullet points:  - **Label**: value
- Highlight important values (numbers, dates, amounts, durations, IDs) using **bold**.
- Maximum 5-7 sections. Each section maximum 5-6 bullets.
- Do NOT write walls of plain text. Do NOT copy-paste raw document lines.

EXAMPLE of correct output for a project plan:
  This document outlines a 90-day full-stack development curriculum with 12 structured modules.

  ## Key Details
  - **Duration**: 90 days (3 months)
  - **Start Date**: January 2025
  - **Total Modules**: 12
  - **Goal**: Build production-ready full-stack applications

  ## Monthly Schedule
  - **Month 1**: Frontend fundamentals — HTML, CSS, JavaScript
  - **Month 2**: React, component architecture, state management
  - **Month 3**: Backend APIs, databases, and cloud deployment

  ## Important Milestones
  - **Week 4**: First project submission deadline
  - **Week 8**: Mid-course assessment
  - **Week 12**: Final capstone project demo

DETECT DOCUMENT TYPE and apply domain-specific sections:
- Train/Flight Ticket → Journey, Passengers, Booking, Payment, Warnings
- Resume/CV → Profile, Experience, Education, Skills, Achievements
- Invoice/Receipt → Billing Info, Items, Amounts, Payment Details
- Application Form → Applicant, Details, Status, Documents Required
- Contract/Agreement → Parties, Terms, Duration, Key Clauses
- Medical Report → Patient, Diagnosis, Treatment, Follow-up
- Bank Statement → Account, Period, Transactions, Summary
- Generic Document → auto-detect logical sections from content

Return structured JSON in this exact format (no extra text outside JSON):
{
  "document_type": "detected type here",
  "confidence": "High|Medium|Low",
  "extracted_fields": {
    "key field name": "value",
    "another field": "value"
  },
  "summary": "Full structured markdown summary following the rules above",
  "missing_or_unclear_fields": ["field1", "field2"]
}`;

const getUserPrompt = (pdfText: string): string => {
    return USER_PROMPT_TEMPLATE.replace('{{EXTRACTED_TEXT}}', pdfText);
};

const BROKEN_WORD_FIXES: Array<[RegExp, string]> = [
    [/\bRegistrat\s+ion\b/gi, 'Registration'],
    [/\bNumbe\s+r\b/gi, 'Number'],
    [/\bApplicat\s+ion\b/gi, 'Application'],
    [/\bPresent\s*&\s*Permanent\b/gi, 'Present & Permanent'],
    [/\bFather['’]?\s*\/\s*Mother['’]?\s*\/?\s*S?\s*spouse\b/gi, "Father's/Mother's/Spouse"],
];

const applyBrokenWordFixes = (text: string): string => {
    let fixed = text;
    BROKEN_WORD_FIXES.forEach(([pattern, replacement]) => {
        fixed = fixed.replace(pattern, replacement);
    });
    return fixed;
};

const normalizeDedupKey = (line: string): string =>
    line
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const cleanDocumentTextForLLM = (text: string, maxChars = 30000): string => {
    if (!text) return '';
    let cleaned = applyBrokenWordFixes(String(text))
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    const seen = new Set<string>();
    const dedupedLines = cleaned
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => {
            const key = normalizeDedupKey(line);
            if (!key) return false;
            if (key.length >= 18 && seen.has(key)) return false;
            seen.add(key);
            return true;
        });

    cleaned = dedupedLines.join('\n');

    const sentenceSeen = new Set<string>();
    const sentenceMatches = cleaned.match(/[^.!?\n]+[.!?]?/g) || [];
    const dedupedSentences: string[] = [];
    sentenceMatches.forEach((sentence) => {
        const normalizedSentence = normalizeDedupKey(sentence);
        if (!normalizedSentence || normalizedSentence.length < 14) {
            if (sentence.trim()) dedupedSentences.push(sentence.trim());
            return;
        }
        if (sentenceSeen.has(normalizedSentence)) return;
        sentenceSeen.add(normalizedSentence);
        dedupedSentences.push(sentence.trim());
    });

    cleaned = dedupedSentences.join(' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, maxChars);
};

const normalizeOutputDocumentType = (value: string): string => {
    const lower = value.toLowerCase();
    if (lower.includes('support')) return 'support_ticket';
    if (lower.includes('application') || lower.includes('applicant') || lower.includes('registration')) return 'application_form';
    if (lower.includes('resume') || lower.includes('cv')) return 'resume';
    if (lower.includes('bank') && lower.includes('statement')) return 'bank_statement';
    if (lower.includes('medical')) return 'medical_report';
    if (lower.includes('report')) return 'report';
    if (lower.includes('form')) return 'form';
    if (lower.includes('agreement') || lower.includes('contract')) return 'agreement';
    if (lower.includes('invoice')) return 'invoice';
    if (lower.includes('receipt')) return 'receipt';
    if (lower.includes('flight')) return 'flight_ticket';
    if (lower.includes('train') || lower.includes('pnr') || lower.includes('ticket')) return 'train_ticket';
    return 'generic_document';
};

const detectDocumentTypeFromObject = (safe: Record<string, any>): string => {
    const haystack = JSON.stringify(safe).toLowerCase();
    if (haystack.includes('applicant_name') || haystack.includes('registration_number') || haystack.includes('application_status')) {
        return 'application_form';
    }
    if (haystack.includes('pnr') || haystack.includes('train no') || haystack.includes('train_number')) {
        return 'train_ticket';
    }
    return 'generic_document';
};

const normalizeDocumentType = (value: unknown): StrictDocumentType => {
    const raw = String(value || '').trim().toUpperCase();
    if (raw.includes('TRAIN')) return 'TRAIN_TICKET';
    if (raw.includes('APPLICATION') || raw.includes('FORM')) return 'APPLICATION_FORM';
    return 'GENERIC';
};

const normalizeTextValue = (value: string): string => {
    let cleaned = value.replace(/\s+/g, ' ').trim();
    cleaned = applyBrokenWordFixes(cleaned)
        .replace(/\bpasseng\s+er\b/gi, 'passenger');
    cleaned = cleaned.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
    return cleaned.replace(/\s+/g, ' ').trim();
};

const toDisplayLabel = (key: string): string => {
    const cleaned = key
        .replace(/[_\-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned
        .split(' ')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
};

const inferFieldConfidence = (key: string, value: string | null): 'High' | 'Medium' | 'Low' => {
    if (!value) return 'Low';
    const v = value.trim();
    if (!v) return 'Low';
    if (
        /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(v) ||
        /\b[A-Z0-9\-]{6,}\b/i.test(v) ||
        /\b(success|confirmed|paid)\b/i.test(v) ||
        /\b(₹|INR|USD|\$)\s*\d+/.test(v)
    ) {
        return 'High';
    }
    if (key.toLowerCase().includes('name') && v.length >= 3) return 'Medium';
    return 'Medium';
};

const sectionTitleForField = (key: string): string => {
    const k = key.toLowerCase();
    if (/(name|id|registration|reference|pnr|invoice|ticket|number)/.test(k)) return 'Identity';
    if (/(phone|mobile|email|contact)/.test(k)) return 'Contact';
    if (/(address|city|state|country|pin|zip|location)/.test(k)) return 'Address';
    if (/(payment|amount|price|fare|total|tax|currency|fee|due|balance)/.test(k)) return 'Financial';
    if (/(date|time|departure|arrival|schedule|journey|boarding)/.test(k)) return 'Schedule';
    if (/(education|board|class|school|college|degree|qualification)/.test(k)) return 'Education';
    return 'General';
};

const buildSectionsFromFields = (
    fields: Record<string, string | null>,
    fieldConfidence: Record<string, string>
): StructuredSummaryJson['sections'] => {
    const grouped = new Map<string, Array<{ key: string; value: string | null }>>();
    Object.entries(fields).forEach(([key, value]) => {
        const section = sectionTitleForField(key);
        const list = grouped.get(section) || [];
        list.push({ key, value });
        grouped.set(section, list);
    });

    return Array.from(grouped.entries()).map(([title, items]) => ({
        id: title.toLowerCase().replace(/\s+/g, '_'),
        title,
        fields: items.map((item) => ({
            key: item.key,
            label: toDisplayLabel(item.key),
            value: item.value,
            confidence: fieldConfidence[item.key] || inferFieldConfidence(item.key, item.value),
            source: 'ai'
        }))
    }));
};

const buildValidationFromFields = (
    fields: Record<string, string | null>,
    missingHints: string[] = []
): StructuredSummaryJson['validation'] => {
    const values = Object.values(fields);
    const present = values.filter((v) => Boolean(v && String(v).trim() !== '')).length;
    const total = Math.max(values.length, 1);
    const completeness = Math.round((present / total) * 100);
    const missing_fields = [
        ...Object.entries(fields)
            .filter(([, value]) => !value || String(value).trim() === '')
            .map(([key]) => toDisplayLabel(key)),
        ...missingHints
    ].filter(Boolean);
    return {
        completeness,
        missing_fields: Array.from(new Set(missing_fields)).slice(0, 20),
        warnings: completeness < 50 ? ['Low extraction completeness. Verify OCR quality and source document clarity.'] : []
    };
};

const flattenScalarFields = (value: unknown, prefix = '', out: Record<string, string | null> = {}): Record<string, string | null> => {
    if (value === null || value === undefined) return out;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        const key = prefix || 'value';
        const normalized = normalizeTextValue(String(value));
        if (normalized) out[key] = normalized;
        return out;
    }
    if (Array.isArray(value)) {
        value.forEach((entry, index) => flattenScalarFields(entry, `${prefix || 'item'}_${index + 1}`, out));
        return out;
    }
    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
            const normalizedKey = normalizeObjectKey(k);
            const nextPrefix = prefix ? `${prefix}_${normalizedKey}` : normalizedKey;
            flattenScalarFields(v, nextPrefix, out);
        });
    }
    return out;
};

const normalizeDateValue = (value: string): string => {
    const cleaned = normalizeTextValue(value);
    const match = cleaned.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (match) {
        const day = match[1].padStart(2, '0');
        const month = match[2].padStart(2, '0');
        const year = match[3].length === 2 ? `20${match[3]}` : match[3];
        return `${day}-${month}-${year}`;
    }

    const monthMap: Record<string, string> = {
        jan: '01', january: '01',
        feb: '02', february: '02',
        mar: '03', march: '03',
        apr: '04', april: '04',
        may: '05',
        jun: '06', june: '06',
        jul: '07', july: '07',
        aug: '08', august: '08',
        sep: '09', sept: '09', september: '09',
        oct: '10', october: '10',
        nov: '11', november: '11',
        dec: '12', december: '12'
    };
    const textual = cleaned.match(/\b(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s,]*(\d{2,4})\b/);
    if (!textual) return cleaned;
    const day = textual[1].padStart(2, '0');
    const month = monthMap[textual[2].toLowerCase()];
    const year = textual[3].length === 2 ? `20${textual[3]}` : textual[3];
    if (!month) return cleaned;
    return `${day}-${month}-${year}`;
};

const normalizePhoneDigits = (value: string): string => {
    return value.replace(/\D+/g, '');
};

const normalizeObjectKey = (key: string): string => {
    const normalized = normalizeTextValue(key).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return normalized || 'field';
};

const deepCleanJson = (value: any, keyHint = ''): any => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') {
        const normalized = normalizeTextValue(value);
        if (/(^|_)(mobile|phone|contact)(_|\b)/i.test(keyHint)) {
            return normalizePhoneDigits(normalized);
        }
        if (/(^|_)(date|dob|departure|arrival)(_|\b)/i.test(keyHint)) {
            return normalizeDateValue(normalized);
        }
        return normalized;
    }
    if (Array.isArray(value)) return value.map(item => deepCleanJson(item, keyHint));
    if (typeof value === 'object') {
        const result: Record<string, any> = {};
        Object.entries(value).forEach(([k, v]) => {
            const normalizedKey = normalizeObjectKey(k);
            result[normalizedKey] = deepCleanJson(v, normalizedKey);
        });
        return result;
    }
    return value;
};

const createNullFields = (): ApplicationFields => ({
    'Applicant Name': null,
    'Registration Number': null,
    'Date of Birth': null,
    'Gender': null,
    'Category': null,
    "Father's Name": null,
    'Contact': null,
    'Present Address': null,
    '10th Board': null,
    '12th Board': null,
    'Payment Status': null
});

const normalizeRegNo = (value: string): string | null => {
    const normalized = normalizeTextValue(value).replace(/[^A-Za-z0-9\-]/g, '');
    return normalized.length >= 5 ? normalized : null;
};

const normalizeNameValue = (value: string): string | null => {
    const normalized = normalizeTextValue(value).replace(/[^A-Za-z.\s]/g, '').trim();
    if (!normalized) return null;
    return normalized.length >= 2 ? normalized : null;
};

const normalizeGenderValue = (value: string): string | null => {
    const lower = normalizeTextValue(value).toLowerCase();
    if (lower.includes('female')) return 'Female';
    if (lower.includes('male')) return 'Male';
    if (lower.includes('other')) return 'Other';
    return null;
};

const normalizeContactValue = (raw: string): string | null => {
    const phoneMatch = raw.match(/(?:\+?91[-\s]?)?[0-9][0-9\s\-]{8,14}/);
    const phone = phoneMatch ? normalizePhoneDigits(phoneMatch[0]) : '';
    const email = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() || '';
    const contact = [phone, email].filter(Boolean).join(', ');
    return contact || null;
};

const normalizeBoardValue = (raw: string): string | null => {
    const normalized = normalizeTextValue(raw);
    if (!normalized) return null;
    const board = normalized.match(/\b(CBSE|ICSE|ISC|STATE BOARD|UP BOARD|BSEB|NIOS)\b/i)?.[0]?.toUpperCase();
    const year = normalized.match(/\b(19|20)\d{2}\b/)?.[0];
    const pct = normalized.match(/\b\d{1,2}(?:\.\d{1,2})?\s*%/)?.[0]?.replace(/\s+/g, '');
    const parts = [board, year, pct].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : normalized;
};

const normalizePaymentStatusValue = (raw: string): string | null => {
    const normalized = normalizeTextValue(raw);
    const lower = normalized.toLowerCase();
    let status = '';
    if (lower.includes('success') || lower.includes('paid') || lower.includes('paymentsuccess')) status = 'Success';
    else if (lower.includes('pending') || lower.includes('process')) status = 'Pending';
    else if (lower.includes('fail') || lower.includes('cancel')) status = 'Failed';

    const amountMatch = normalized.match(/(?:₹|INR\.?\s*)\s*([0-9]+(?:\.[0-9]{1,2})?)/i) || normalized.match(/\bamount\b[:\s-]*([0-9]+(?:\.[0-9]{1,2})?)/i);
    const amount = amountMatch?.[1] ? `Amount: ₹${amountMatch[1]}` : '';
    const txnMatch = normalized.match(/(?:txn|transaction)\s*(?:id|no|number)?[:\s-]*([A-Za-z0-9\-]{6,})/i);
    const txn = txnMatch?.[1] ? `Transaction ID: ${txnMatch[1]}` : '';
    const parts = [status, amount, txn].filter(Boolean);
    if (parts.length > 0) return parts.join(', ');
    return normalized || null;
};

const sanitizeField = (field: ApplicationFieldKey, value: string | null): string | null => {
    if (!value) return null;
    const normalized = normalizeTextValue(value);
    if (!normalized) return null;
    switch (field) {
        case 'Applicant Name':
        case "Father's Name":
            return normalizeNameValue(normalized);
        case 'Registration Number':
            return normalizeRegNo(normalized);
        case 'Date of Birth':
            return normalizeDateValue(normalized);
        case 'Gender':
            return normalizeGenderValue(normalized);
        case 'Contact':
            return normalizeContactValue(normalized);
        case '10th Board':
        case '12th Board':
            return normalizeBoardValue(normalized);
        case 'Payment Status':
            return normalizePaymentStatusValue(normalized);
        default:
            return normalized || null;
    }
};

const hasApplicationNoise = (value: string): boolean => {
    const lower = value.toLowerCase();
    const noiseSignals = [
        'personal details',
        'application status',
        'photo registration',
        'father/mother',
        'present & permanent address'
    ];
    return noiseSignals.some((signal) => lower.includes(signal));
};

const scoreApplicationFieldQuality = (field: ApplicationFieldKey, value: string | null): number => {
    if (!value) return 0;
    const normalized = normalizeTextValue(value);
    if (!normalized) return 0;

    let score = 0.45;
    if (hasApplicationNoise(normalized)) score -= 0.2;

    switch (field) {
        case 'Applicant Name':
        case "Father's Name":
            if (/^[A-Za-z.\s]{3,80}$/.test(normalized)) score += 0.35;
            if (normalized.split(/\s+/).length >= 2) score += 0.1;
            break;
        case 'Registration Number':
            if (/^[A-Za-z0-9\-]{5,30}$/.test(normalized)) score += 0.45;
            break;
        case 'Date of Birth':
            if (/\b\d{2}-\d{2}-\d{4}\b/.test(normalized)) score += 0.45;
            else if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(normalized)) score += 0.35;
            break;
        case 'Gender':
            if (/^(male|female|other)$/i.test(normalized)) score += 0.5;
            break;
        case 'Category':
            if (/^[A-Za-z\s]{3,40}$/.test(normalized)) score += 0.35;
            break;
        case 'Contact':
            if (/\b\d{10}\b/.test(normalized.replace(/\D/g, ''))) score += 0.25;
            if (/@/.test(normalized)) score += 0.25;
            break;
        case 'Present Address':
            if (normalized.length >= 12) score += 0.25;
            if (/[0-9]/.test(normalized)) score += 0.1;
            if (/,/.test(normalized)) score += 0.1;
            break;
        case '10th Board':
        case '12th Board':
            if (/\b(CBSE|ICSE|ISC|STATE BOARD|UP BOARD|BSEB|NIOS)\b/i.test(normalized)) score += 0.2;
            if (/\b(19|20)\d{2}\b/.test(normalized)) score += 0.15;
            if (/\b\d{1,2}(?:\.\d{1,2})?%/.test(normalized)) score += 0.15;
            break;
        case 'Payment Status':
            if (/\b(success|pending|failed)\b/i.test(normalized)) score += 0.2;
            if (/\bamount\b|₹|inr/i.test(normalized)) score += 0.15;
            if (/\btransaction id\b|\btxn\b/i.test(normalized)) score += 0.15;
            break;
        default:
            break;
    }

    return Math.max(0, Math.min(1, Number(score.toFixed(2))));
};

const extractRegexFieldsFromText = (text: string): ApplicationFields => {
    const fields = createNullFields();
    const clean = text
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\bPaymentSuccess\b/gi, 'Payment Success')
        .trim();

    if (!clean) return fields;

    const pick = (patterns: RegExp[]): string | null => {
        for (const pattern of patterns) {
            const matched = clean.match(pattern)?.[1]?.trim();
            if (matched) return matched;
        }
        return null;
    };

    fields['Applicant Name'] = pick([
        /(?:Applicant|Candidate)\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80}?)(?=\s+(?:Application\s*Status|Payment|Date\s*of\s*Birth|Gender|Category|Father|Mobile|Email|Address)\b|$)/i
    ]);
    fields['Registration Number'] = pick([
        /Photo\s*Registration\s*(?:Number|No\.?)\s*[:\-]?\s*(?:[A-Za-z]\s*)?([A-Za-z0-9\-]{5,30})/i,
        /Registration\s*(?:Number|No\.?)\s*[:\-]?\s*([A-Za-z0-9\-]{4,30})/i,
        /\bReg(?:istration)?\s*No\.?\s*[:\-]?\s*([A-Za-z0-9\-]{4,30})/i
    ]);
    fields['Date of Birth'] = pick([
        /Date\s*of\s*Birth\s*[:\-]?\s*([A-Za-z0-9\/\-\s,]{6,30})/i,
        /\bDOB\s*[:\-]?\s*([A-Za-z0-9\/\-\s,]{6,30})/i
    ]);
    fields['Gender'] = pick([/\bGender\s*[:\-]?\s*(Male|Female|Other)\b/i]);
    fields['Category'] = pick([/\bCategory\s*[:\-]?\s*([A-Za-z ]{3,40})\b/i]);
    fields["Father's Name"] = pick([
        /Father(?:'s)?\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80})/i,
        /Father['’]?\s*\/\s*Mother['’]?\s*\/?\s*(?:S\/)?\s*spouse\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80})/i,
        /Father['’]?\s*\/\s*Mother['’]?\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80})/i,
        /Mother['’]?\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80})/i,
        /Guardian\s*Name\s*[:\-]?\s*([A-Za-z .]{2,80})/i
    ]);
    const phone = pick([/(?:Contact|Mobile\s*No\.?)\s*[:\-]?\s*([0-9+\-\s]{8,16})/i]);
    const email = pick([/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,})/i]);
    fields['Contact'] = [phone, email].filter(Boolean).join(', ') || null;
    fields['Present Address'] = pick([
        /(?:Present\s*&\s*Permanent\s*Address|Present\s*Address|Address)\s*[:\-]?\s*([A-Za-z0-9,\- ]{10,320}?)(?=\s+(?:10th|12th|Payment|Transaction|Mobile|Email|Academic|$))/i
    ]);

    if (!fields['Present Address']) {
        const line1 = pick([/Address\s*Line\s*1\s*[:\-]?\s*([A-Za-z0-9,\- ]{2,80})/i]);
        const line2 = pick([/Address\s*Line\s*2\s*[:\-]?\s*([A-Za-z0-9,\- ]{2,80})/i]);
        const city = pick([/City\s*Name\s*[:\-]?\s*([A-Za-z ]{2,60})/i]);
        const district = pick([/District\s*[:\-]?\s*([A-Za-z ]{2,60})/i]);
        const state = pick([/State\s*[:\-]?\s*([A-Za-z ]{2,60})/i]);
        const pincode = pick([/Pincode\s*[:\-]?\s*([0-9]{6})/i]);
        const combined = [line1, line2, city, district, state, pincode].filter(Boolean).join(', ');
        fields['Present Address'] = combined || null;
    }
    fields['10th Board'] = pick([
        /(?:10(?:th)?\s*Board(?:\s*Details)?|X\/10th)\s*[:\-]?\s*([A-Za-z0-9,%(). \-]{3,180})/i,
        /10(?:th)?\s*[:\-]?\s*([A-Za-z0-9,%(). \-]{3,180})/i
    ]);
    fields['12th Board'] = pick([
        /(?:12(?:th)?\s*Board(?:\s*Details)?|XII\/12th)\s*[:\-]?\s*([A-Za-z0-9,%(). \-]{3,180})/i,
        /12(?:th)?\s*[:\-]?\s*([A-Za-z0-9,%(). \-]{3,180})/i
    ]);
    const paymentLine = pick([/Payment\s*Status\s*[:\-]?\s*([A-Za-z0-9,₹. \-]{3,160})/i]);
    const amount = pick([/(?:Amount|Fees?)\s*[:\-]?\s*(₹?\s*[0-9]+(?:\.[0-9]{1,2})?)/i]);
    const txn = pick([/(?:Txn|Transaction)\s*(?:ID|No|Number)?\s*[:\-]?\s*([A-Za-z0-9\-]{6,})/i]);
    fields['Payment Status'] = [paymentLine, amount ? `Amount: ${amount.replace(/\s+/g, '')}` : null, txn ? `Transaction ID: ${txn}` : null]
        .filter(Boolean)
        .join(', ') || null;

    if (!fields['Payment Status'] && /\b(payment\s*success|successfully\s*paid|payment\s*done)\b/i.test(clean)) {
        fields['Payment Status'] = 'Success';
    }

    const sanitized = createNullFields();
    APPLICATION_FIELD_ORDER.forEach((field) => {
        sanitized[field] = sanitizeField(field, fields[field]);
    });

    const looksLikeRollOnly = (value: string | null): boolean => Boolean(value && /roll\s*no\.?/i.test(value) && !/(cbse|icse|board|%|\b20\d{2}\b)/i.test(value));
    if (looksLikeRollOnly(sanitized['10th Board'])) sanitized['10th Board'] = null;
    if (looksLikeRollOnly(sanitized['12th Board'])) sanitized['12th Board'] = null;

    return sanitized;
};

const mergeApplicationFields = (llmFields: ApplicationFields, regexFields: ApplicationFields): {
    fields: ApplicationFields;
    confidenceScore: number;
} => {
    const merged = createNullFields();
    let weightedHits = 0;
    APPLICATION_FIELD_ORDER.forEach((field) => {
        const llmValue = sanitizeField(field, llmFields[field]);
        const regexValue = sanitizeField(field, regexFields[field]);

        const llmScore = scoreApplicationFieldQuality(field, llmValue);
        const regexScore = scoreApplicationFieldQuality(field, regexValue);

        if (!llmValue && !regexValue) {
            merged[field] = null;
            return;
        }

        const preferRegex = regexScore >= (llmScore + 0.12);
        const chosenSource = preferRegex ? 'regex' : 'llm';
        const chosenValue = chosenSource === 'regex' ? regexValue : llmValue;
        const chosenScore = chosenSource === 'regex' ? regexScore : llmScore;

        if (chosenValue) {
            merged[field] = chosenValue;
            weightedHits += chosenScore * (chosenSource === 'llm' ? 1 : 0.95);
            return;
        }

        const fallbackValue = chosenSource === 'regex' ? llmValue : regexValue;
        const fallbackScore = chosenSource === 'regex' ? llmScore : regexScore;
        merged[field] = fallbackValue || null;
        weightedHits += fallbackScore * 0.8;
    });
    const rawScore = weightedHits / APPLICATION_FIELD_ORDER.length;
    return {
        fields: merged,
        confidenceScore: Math.max(30, Math.min(99, Math.round(rawScore * 100)))
    };
};

const hasApplicationEvidence = (text: string): boolean => {
    const source = normalizeTextValue(text).toLowerCase();
    const signals = [
        /applicant\s*name/,
        /registration\s*(number|no)/,
        /date\s*of\s*birth|\bdob\b/,
        /father|guardian/,
        /present\s*(?:&\s*permanent\s*)?address/,
        /payment\s*status/,
        /10th|12th/
    ];
    let score = 0;
    signals.forEach((pattern) => {
        if (pattern.test(source)) score += 1;
    });
    return score >= 2;
};

const toStructuredSummaryJson = (raw: any, sourceText = ''): StructuredSummaryJson & { confidenceScore?: number } => {
    const safe = deepCleanJson(raw || {}) as Record<string, any>;
    const read = (...paths: string[]): string | null => {
        for (const path of paths) {
            const value = path.split('.').reduce<any>((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), safe);
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                return String(value).trim();
            }
        }
        return null;
    };

    const readJoined = (parts: Array<string | null>, separator = ', '): string | null => {
        const nonEmpty = parts.filter((value): value is string => Boolean(value && value.trim() !== ''));
        return nonEmpty.length > 0 ? nonEmpty.join(separator) : null;
    };

    const normalizeFieldValue = (value: unknown): string | null => {
        if (value === null || value === undefined) return null;
        const str = String(value).trim();
        return str ? str : null;
    };

    const normalizedDocType = normalizeOutputDocumentType(
        read('document_type', 'documentType', 'type') || detectDocumentTypeFromObject(safe)
    );

    const existingFields = safe.fields && typeof safe.fields === 'object' ? (safe.fields as Record<string, unknown>) : null;
    const readField = (...keys: string[]): string | null => {
        if (!existingFields) return null;
        for (const key of keys) {
            const value = existingFields[key];
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                return String(value).trim();
            }
        }
        return null;
    };

    const llmFields: ApplicationFields = {
        'Applicant Name': readField('Applicant Name', 'applicant_name', 'candidate_name') ?? read('applicant_name', 'applicant.name', 'name', 'fields.applicant_name', 'fields.candidate_name'),
        'Registration Number': readField('Registration Number', 'registration_number', 'registration_no', 'photo_registration_number') ?? read('registration_number', 'registration_no', 'application_no', 'reg_no', 'registrationnumber', 'fields.registration_number', 'fields.photo_registration_number'),
        'Date of Birth': readField('Date of Birth', 'date_of_birth', 'dob') ?? read('date_of_birth', 'dob', 'fields.date_of_birth', 'fields.dob'),
        'Gender': readField('Gender', 'gender', 'sex') ?? read('gender', 'sex', 'fields.gender'),
        'Category': readField('Category', 'category', 'caste_category') ?? read('category', 'caste_category', 'fields.category'),
        "Father's Name": readField("Father's Name", 'father_name', 'fathers_name', 'guardian_name', 'father_mother_name') ?? read('father_name', 'parent_name', 'guardian_name', 'fathers_name', 'fields.father_name', 'fields.guardian_name'),
        'Contact': readField('Contact', 'contact', 'contact_number', 'mobile') ?? readJoined([
            read('contact_number', 'mobile', 'phone', 'contact', 'fields.contact', 'fields.contact_number', 'fields.mobile'),
            read('email', 'fields.email')
        ]),
        'Present Address': readField('Present Address', 'present_address', 'address', 'present_permanent_address') ?? read('present_address', 'address', 'full_address', 'fields.present_address', 'fields.address', 'fields.present_permanent_address'),
        '10th Board': readField('10th Board', '10th_board', '10th_board_details') ?? readJoined([
            read('class_10_board', 'education.class_10.board', 'class_10.board', 'education.10th.board', 'fields.class_10_board', 'fields.10th_board'),
            read('class_10_year', 'education.class_10.year', 'class_10.year', 'education.10th.year', 'fields.class_10_year'),
            read('class_10_percentage', 'education.class_10.percentage', 'class_10.percentage', 'education.10th.percentage', 'fields.class_10_percentage')
        ], ' - '),
        '12th Board': readField('12th Board', '12th_board', '12th_board_details') ?? readJoined([
            read('class_12_board', 'education.class_12.board', 'class_12.board', 'education.12th.board', 'fields.class_12_board', 'fields.12th_board'),
            read('class_12_year', 'education.class_12.year', 'class_12.year', 'education.12th.year', 'fields.class_12_year'),
            read('class_12_percentage', 'education.class_12.percentage', 'class_12.percentage', 'education.12th.percentage', 'fields.class_12_percentage')
        ], ' - '),
        'Payment Status': readField('Payment Status', 'payment_status') ?? readJoined([
            read('payment_status', 'payment.status', 'fields.payment_status'),
            read('payment_amount', 'payment.amount', 'amount', 'fields.payment_amount'),
            read('transaction_id', 'payment.transaction_id', 'fields.transaction_id')
        ], ' - ')
    };

    const isApplicationDocument = normalizedDocType === 'application_form' || hasApplicationEvidence(sourceText);

    if (isApplicationDocument) {
        const regexFields = extractRegexFieldsFromText(sourceText);
        const merged = mergeApplicationFields(llmFields, regexFields);
        const field_confidence: Record<string, string> = {};
        Object.entries(merged.fields).forEach(([key, value]) => {
            field_confidence[key] = inferFieldConfidence(key, value);
        });
        return {
            document_type: 'application_form',
            title: read('title') || 'Application Summary',
            summary: read('summary') || undefined,
            fields: merged.fields,
            field_confidence,
            sections: buildSectionsFromFields(merged.fields, field_confidence),
            validation: buildValidationFromFields(merged.fields),
            confidenceScore: merged.confidenceScore
        };
    }

    const rawFieldSources = [
        (safe.extracted_fields && typeof safe.extracted_fields === 'object') ? safe.extracted_fields : null,
        existingFields && typeof existingFields === 'object' ? existingFields : null,
        (safe.key_details && typeof safe.key_details === 'object') ? safe.key_details : null
    ].filter(Boolean);

    const genericFields: Record<string, string | null> = {};
    rawFieldSources.forEach((src) => {
        const flattened = flattenScalarFields(src);
        Object.entries(flattened).forEach(([key, value]) => {
            if (!value || genericFields[key]) return;
            if (['confidence', 'confidencescore', 'document_type', 'title', 'summary'].includes(key.toLowerCase())) return;
            genericFields[key] = value;
        });
    });

    if (Object.keys(genericFields).length === 0) {
        const fallbackSummary = read('summary');
        if (fallbackSummary) {
            genericFields['summary_note'] = fallbackSummary.slice(0, 200);
        }
    }

    const missingHints = safeStringArray(safe.missing_or_unclear_fields);
    const field_confidence: Record<string, string> = {};
    Object.entries(genericFields).forEach(([key, value]) => {
        const explicit = safe.field_confidence && typeof safe.field_confidence === 'object'
            ? safeString((safe.field_confidence as Record<string, unknown>)[key])
            : '';
        field_confidence[key] = explicit || inferFieldConfidence(key, value);
    });

    return {
        document_type: normalizedDocType,
        title: read('title') || 'Document Summary',
        summary: read('summary') || undefined,
        fields: genericFields,
        field_confidence,
        sections: buildSectionsFromFields(genericFields, field_confidence),
        validation: buildValidationFromFields(genericFields, missingHints),
        confidenceScore: typeof raw?.confidenceScore === 'number' ? raw.confidenceScore : undefined
    };
};

const toStrictDocumentResult = (raw: any, sourceText = ''): StrictDocumentExtractionResult => {
    const structured = toStructuredSummaryJson(raw, sourceText);
    const documentType = normalizeDocumentType(structured.document_type);

    return {
        document_type: documentType,
        extracted_data: structured,
        summary: null,
        key_points: null,
        confidenceScore: typeof raw?.confidenceScore === 'number'
            ? raw.confidenceScore
            : structured.confidenceScore
    };
};

const safeString = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const safeStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
        .map((entry) => safeString(entry))
        .filter((entry) => entry.length > 0);
};

const normalizeToLegacySummaryResult = (raw: any): LegacyLLMExtractionResult => {
    const isNewTemplateShape = Boolean(
        raw &&
        typeof raw === 'object' &&
        (
            raw.extracted_fields !== undefined ||
            raw.missing_or_unclear_fields !== undefined ||
            raw.confidence !== undefined
        )
    );

    if (isNewTemplateShape) {
        const docType = normalizeOutputDocumentType(safeString(raw?.document_type || raw?.type || 'generic_document'));
        const extractedFields = raw?.extracted_fields && typeof raw.extracted_fields === 'object'
            ? raw.extracted_fields as Record<string, unknown>
            : {};
        const missingOrUnclear = safeStringArray(raw?.missing_or_unclear_fields);
        const summaryText = safeString(raw?.summary);

        const fieldPoints = Object.entries(extractedFields)
            .map(([key, value]) => {
                const keyLabel = key.replace(/_/g, ' ').trim();
                const val = safeString(value);
                if (!val) return null;
                return `${keyLabel}: ${val}`;
            })
            .filter((line): line is string => Boolean(line));

        const confidenceRaw = safeString(raw?.confidence).toLowerCase();
        const confidenceScore =
            confidenceRaw === 'high' ? 90 :
                confidenceRaw === 'medium' ? 75 :
                    confidenceRaw === 'low' ? 55 :
                        (typeof raw?.confidenceScore === 'number' ? raw.confidenceScore : 80);

        const keyDetailsDate = safeString(
            extractedFields['date'] ??
            extractedFields['invoice_date'] ??
            extractedFields['journey_date'] ??
            extractedFields['travel_date']
        ) || null;
        const keyDetailsSource = safeString(
            extractedFields['source'] ??
            extractedFields['issuer'] ??
            extractedFields['merchant'] ??
            extractedFields['seller']
        ) || null;
        const keyDetailsReference = safeString(
            extractedFields['reference_number'] ??
            extractedFields['invoice_number'] ??
            extractedFields['pnr'] ??
            extractedFields['booking_id'] ??
            extractedFields['transaction_id'] ??
            extractedFields['id']
        ) || null;

        return {
            document_type: docType,
            title: safeString(raw?.title) || 'Document Summary',
            summary: summaryText || 'No clear summary could be generated from the document text.',
            key_details: {
                date: keyDetailsDate,
                source: keyDetailsSource,
                reference_number: keyDetailsReference
            },
            important_points: [
                ...(fieldPoints.length > 0 ? fieldPoints : ['No structured fields were clearly extracted.']),
                ...(missingOrUnclear.length > 0 ? [`Unclear fields: ${missingOrUnclear.join(' | ')}`] : [])
            ],
            tables: [],
            notes: missingOrUnclear.length > 0
                ? `Missing/Unclear Fields: ${missingOrUnclear.join(', ')}`
                : '',
            confidenceScore
        };
    }

    const docType = normalizeOutputDocumentType(safeString(raw?.document_type || raw?.summary_format?.document_type || raw?.type));
    const summaryFormat = raw?.summary_format && typeof raw.summary_format === 'object' ? raw.summary_format : {};

    const mainPurpose = safeString(summaryFormat.main_purpose || raw?.summary);
    const keyDetails = safeStringArray(summaryFormat.key_details);
    const datesPeople = safeStringArray(summaryFormat.important_dates_people);
    const actionItems = safeStringArray(summaryFormat.action_items_outcome);
    const supportTicket = summaryFormat.support_ticket && typeof summaryFormat.support_ticket === 'object'
        ? summaryFormat.support_ticket
        : null;

    const supportIssue = safeStringArray(supportTicket?.issue_description);
    const supportRootCause = safeString(supportTicket?.root_cause) || null;
    const supportResolution = safeStringArray(supportTicket?.resolution_steps);
    const supportStatus = safeString(supportTicket?.current_status) || null;

    const summaryLines: string[] = [
        `1. Document Type: ${safeString(summaryFormat.document_type) || docType.replace(/_/g, ' ') || 'generic document'}`,
        `2. Main Purpose: ${mainPurpose || 'Not explicitly stated in the document.'}`,
        '3. Key Details:',
        ...(keyDetails.length > 0 ? keyDetails.map((item) => `- ${item}`) : ['- Not explicitly mentioned.']),
        '4. Important Dates / People:',
        ...(datesPeople.length > 0 ? datesPeople.map((item) => `- ${item}`) : ['- Not explicitly mentioned.']),
        '5. Action Items / Outcome:',
        ...(actionItems.length > 0 ? actionItems.map((item) => `- ${item}`) : ['- Not explicitly mentioned.'])
    ];

    const notesLines: string[] = [];
    if (docType === 'support_ticket') {
        summaryLines.push('If support ticket:');
        summaryLines.push('- Issue Description:');
        summaryLines.push(...(supportIssue.length > 0 ? supportIssue.map((item) => `  - ${item}`) : ['  - Not explicitly mentioned.']));
        summaryLines.push('- Root Cause (if mentioned):');
        summaryLines.push(`  - ${supportRootCause || 'Not explicitly mentioned.'}`);
        summaryLines.push('- Resolution Steps:');
        summaryLines.push(...(supportResolution.length > 0 ? supportResolution.map((item) => `  - ${item}`) : ['  - Not explicitly mentioned.']));
        summaryLines.push('- Current Status:');
        summaryLines.push(`  - ${supportStatus || 'Not explicitly mentioned.'}`);

        if (supportIssue.length > 0) notesLines.push(`Issue Description: ${supportIssue.join(' | ')}`);
        if (supportRootCause) notesLines.push(`Root Cause: ${supportRootCause}`);
        if (supportResolution.length > 0) notesLines.push(`Resolution Steps: ${supportResolution.join(' | ')}`);
        if (supportStatus) notesLines.push(`Current Status: ${supportStatus}`);
    }

    if (datesPeople.length > 0) notesLines.push(`Important Dates/People: ${datesPeople.join(' | ')}`);
    if (actionItems.length > 0) notesLines.push(`Actions/Outcome: ${actionItems.join(' | ')}`);

    const rawKeyDetails = raw?.key_details && typeof raw.key_details === 'object' ? raw.key_details : {};
    const importantPoints = [
        ...(mainPurpose ? [`Main Purpose: ${mainPurpose}`] : []),
        ...keyDetails.map((item) => `Key Detail: ${item}`),
        ...datesPeople.map((item) => `Date/Person: ${item}`),
        ...actionItems.map((item) => `Action/Outcome: ${item}`)
    ];

    return {
        document_type: docType,
        title: safeString(raw?.title) || 'Document Summary',
        summary: summaryLines.join('\n'),
        key_details: {
            date: safeString(rawKeyDetails.date) || null,
            source: safeString(rawKeyDetails.source) || null,
            reference_number: safeString(rawKeyDetails.reference_number) || null
        },
        important_points: importantPoints.length > 0 ? importantPoints : ['No key details found in document text.'],
        tables: Array.isArray(raw?.tables) ? raw.tables : [],
        notes: notesLines.join('\n') || safeString(raw?.notes) || '',
        confidenceScore: typeof raw?.confidenceScore === 'number' ? raw.confidenceScore : 80
    };
};

const isWeakFieldValue = (value: string): boolean => {
    const v = value.trim().toLowerCase();
    return (
        v === '' ||
        v === 'n/a' ||
        v === 'na' ||
        v === 'none' ||
        v === 'null' ||
        v === 'undefined' ||
        v === 'not available' ||
        v === 'not found' ||
        v === 'not clearly detected'
    );
};

const sanitizeExtractedFields = (value: unknown): Record<string, string> => {
    if (!value || typeof value !== 'object') return {};
    const output: Record<string, string> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, raw]) => {
        const normalizedKey = key.replace(/_/g, ' ').trim();
        if (!normalizedKey) return;
        const normalizedValue = safeString(raw).replace(/\s+/g, ' ').trim();
        if (!normalizedValue || isWeakFieldValue(normalizedValue)) return;
        output[normalizedKey] = normalizedValue;
    });
    return output;
};

const isNewTemplateResult = (raw: any): raw is NewTemplateExtractionResult => {
    return Boolean(raw && typeof raw === 'object' && (raw.extracted_fields || raw.missing_or_unclear_fields || raw.confidence));
};

const getFieldIgnoreCase = (fields: Record<string, unknown>, aliases: string[]): string | null => {
    const normalizedMap = new Map<string, unknown>();
    Object.entries(fields).forEach(([k, v]) => {
        normalizedMap.set(k.toLowerCase().replace(/[_\s-]+/g, ''), v);
    });
    for (const alias of aliases) {
        const key = alias.toLowerCase().replace(/[_\s-]+/g, '');
        const value = normalizedMap.get(key);
        const asString = safeString(value);
        if (asString) return asString;
    }
    return null;
};

const normalizePassengerArray = (fields: Record<string, unknown>): Array<{ name: string; seat?: string; class?: string; }> => {
    const passengerCandidates: Array<{ name: string; seat?: string; class?: string; }> = [];
    const rawPassengers = fields['passengers'];

    if (Array.isArray(rawPassengers)) {
        rawPassengers.forEach((entry) => {
            if (entry && typeof entry === 'object') {
                const obj = entry as Record<string, unknown>;
                const name = safeString(obj.name || obj.passenger_name || obj.passenger);
                if (!name) return;
                passengerCandidates.push({
                    name,
                    seat: safeString(obj.seat) || undefined,
                    class: safeString(obj.class || obj.travel_class) || undefined
                });
            } else {
                const text = safeString(entry);
                if (text) passengerCandidates.push({ name: text });
            }
        });
    }

    if (passengerCandidates.length === 0) {
        const single = getFieldIgnoreCase(fields, ['passenger_names', 'passenger_name', 'passenger', 'traveller_name', 'traveler_name', 'name']);
        if (single) {
            single.split(/[,;/|]+/).map((n) => n.trim()).filter(Boolean).forEach((name) => {
                passengerCandidates.push({ name });
            });
        }
    }

    const seat = getFieldIgnoreCase(fields, ['seat', 'seat_number', 'seat_no']);
    const travelClass = getFieldIgnoreCase(fields, ['class', 'travel_class', 'booking_class']);
    if (passengerCandidates.length > 0 && (seat || travelClass)) {
        passengerCandidates[0] = {
            ...passengerCandidates[0],
            seat: passengerCandidates[0].seat || seat || undefined,
            class: passengerCandidates[0].class || travelClass || undefined
        };
    }

    return passengerCandidates;
};

const splitMultiValue = (value: string | null): string[] => {
    if (!value) return [];
    return value
        .split(/\s*\|\s*|(?:\r?\n)+|(?:\s*•\s*)|(?:\s*;\s*)/g)
        .map((item) => safeString(item))
        .filter(Boolean);
};

const buildResumeSkillCategories = (skills: string[]) => {
    const frontend: string[] = [];
    const backend: string[] = [];
    const database: string[] = [];
    const tools: string[] = [];
    const other: string[] = [];

    const seen = new Set<string>();
    skills.forEach((raw) => {
        const item = safeString(raw);
        if (!item) return;
        const key = item.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        if (/(react|html|css|bootstrap|tailwind|next\.?js|javascript|typescript|vue|angular)/i.test(item)) {
            frontend.push(item);
        } else if (/(node|express|python|flask|java|spring|php|laravel|django|api)/i.test(item)) {
            backend.push(item);
        } else if (/(sql|mysql|postgres|mongodb|redis|database)/i.test(item)) {
            database.push(item);
        } else if (/(git|github|vscode|docker|linux|jira|postman|figma|tool)/i.test(item)) {
            tools.push(item);
        } else {
            other.push(item);
        }
    });

    return { frontend, backend, database, tools, other };
};

const buildStructuredResumeFromRawFields = (
    rawFields: Record<string, unknown>,
    summary: string
): Record<string, unknown> => {
    const name = getFieldIgnoreCase(rawFields, ['full_name', 'name', 'candidate_name']);
    const role = getFieldIgnoreCase(rawFields, ['role', 'title', 'job_role', 'designation']);
    const email = getFieldIgnoreCase(rawFields, ['email', 'mail']);
    const phone = getFieldIgnoreCase(rawFields, ['phone', 'mobile', 'contact_number']);
    const location = getFieldIgnoreCase(rawFields, ['location', 'city', 'address']);
    const skills = splitMultiValue(getFieldIgnoreCase(rawFields, ['skills', 'technical_skills']));
    const experience = splitMultiValue(getFieldIgnoreCase(rawFields, ['experience', 'work_experience', 'internship']));
    const education = splitMultiValue(getFieldIgnoreCase(rawFields, ['education', 'academic', 'qualification']));
    const profileSummary = splitMultiValue(summary).slice(0, 4);
    const contactBundle = [phone, email].filter(Boolean).join(' | ') || null;
    const skillCategories = buildResumeSkillCategories(skills);

    return {
        resume: {
            overview: `Summary of ${name || 'Candidate Profile'}`,
            name: name || null,
            role: role || null,
            contact: contactBundle,
            location: location || null,
            professionalSummary: profileSummary,
            experience,
            projects: [],
            education,
            skills,
            skillCategories
        }
    };
};

const canRenderResumeStructuredCard = (
    rawFields: Record<string, unknown>,
    confidenceScore: number
): boolean => {
    if (confidenceScore < RESUME_STRUCTURED_CONFIDENCE_THRESHOLD) return false;
    const name = getFieldIgnoreCase(rawFields, ['full_name', 'name', 'candidate_name']);
    const role = getFieldIgnoreCase(rawFields, ['role', 'title', 'job_role', 'designation']);
    const email = getFieldIgnoreCase(rawFields, ['email', 'mail']);
    const phone = getFieldIgnoreCase(rawFields, ['phone', 'mobile', 'contact_number']);
    const skills = splitMultiValue(getFieldIgnoreCase(rawFields, ['skills', 'technical_skills']));
    const experience = splitMultiValue(getFieldIgnoreCase(rawFields, ['experience', 'work_experience', 'internship']));
    const education = splitMultiValue(getFieldIgnoreCase(rawFields, ['education', 'academic', 'qualification']));
    const coreCount = [name, role, email || phone].filter(Boolean).length;
    const listCount = [skills.length > 0, experience.length > 0, education.length > 0].filter(Boolean).length;
    return coreCount >= 2 && listCount >= 1;
};

const buildUniversalSchema = (params: {
    documentType: string;
    title?: string | null;
    summary?: string | null;
    rawFields?: Record<string, unknown>;
    missingOrUnclear?: string[];
    defaultConfidence?: string;
    explicitFieldConfidence?: Record<string, string>;
    explicitValidation?: {
        completeness?: number;
        missing_fields?: string[];
        warnings?: string[];
    };
}) => {
    const normalizedDocType = normalizeOutputDocumentType(params.documentType || 'generic_document');
    const flattened = flattenScalarFields(params.rawFields || {});
    const fields: Record<string, string | null> = {};
    Object.entries(flattened).forEach(([k, v]) => {
        if (!v) return;
        if (['document_type', 'title', 'summary', 'confidence'].includes(k)) return;
        fields[k] = normalizeTextValue(String(v));
    });

    const normalizedDefaultConfidence = (() => {
        const raw = safeString(params.defaultConfidence).toLowerCase();
        if (!raw) return '';
        if (raw === 'high' || raw === 'medium' || raw === 'low') {
            return raw.charAt(0).toUpperCase() + raw.slice(1);
        }
        const asNumber = Number(raw);
        if (!Number.isNaN(asNumber)) {
            return asNumber >= 80 ? 'High' : asNumber >= 55 ? 'Medium' : 'Low';
        }
        return '';
    })();

    const field_confidence: Record<string, string> = {};
    Object.entries(fields).forEach(([key, value]) => {
        const fallback = inferFieldConfidence(key, value);
        const explicit = params.explicitFieldConfidence?.[key];
        field_confidence[key] = explicit || normalizedDefaultConfidence || fallback;
    });

    const validation = params.explicitValidation || buildValidationFromFields(fields, params.missingOrUnclear || []);

    return {
        document_type: normalizedDocType,
        title: safeString(params.title) || 'Document Summary',
        summary: safeString(params.summary) || '',
        fields,
        field_confidence,
        sections: buildSectionsFromFields(fields, field_confidence),
        validation
    };
};

type ClassifiedCategory =
    | 'Invoice'
    | 'Resume'
    | 'CV'
    | 'Train Ticket'
    | 'Flight Ticket'
    | 'Bank Statement'
    | 'Agreement'
    | 'Medical Report'
    | 'Generic';

interface ResumeStrictExtraction {
    document_type: string;
    confidence: string;
    structured_data: {
        name: string | null;
        role: string | null;
        email: string | null;
        phone: string | null;
        location: string | null;
        skills: string[];
        experience: string[];
        education: string[];
    };
    summary: string;
}

const parseConfidenceToScore = (value: unknown): number => {
    const raw = safeString(value).toLowerCase();
    if (raw === 'high') return 90;
    if (raw === 'medium') return 70;
    if (raw === 'low') return 45;
    const n = Number(raw);
    if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
    return 65;
};

const CATEGORY_SCHEMAS: Record<ClassifiedCategory, string[]> = {
    'Train Ticket': ['Passenger Names', 'PNR', 'Train Name and Number', 'From', 'To', 'Class and Coach', 'Fare', 'Date of Journey', 'Booking Status'],
    'Flight Ticket': ['Passenger Names', 'PNR/Booking Reference', 'Flight Number', 'From', 'To', 'Date', 'Terminal', 'Gate', 'Seat', 'Total Fare'],
    'Resume': ['Full Name', 'Email', 'Phone', 'Skills', 'Experience', 'Education', 'Location'],
    'CV': ['Full Name', 'Email', 'Phone', 'Skills', 'Experience', 'Education', 'Location'],
    'Invoice': ['Invoice Number', 'Date', 'Seller', 'Buyer', 'Total Amount', 'Currency'],
    'Bank Statement': ['Account Holder', 'Account Number', 'Statement Period', 'Opening Balance', 'Closing Balance', 'Bank Name'],
    'Agreement': ['Agreement Type', 'Parties', 'Effective Date', 'End Date', 'Jurisdiction'],
    'Medical Report': ['Patient Name', 'Age', 'Gender', 'Report Date', 'Diagnosis', 'Doctor Name', 'Hospital'],
    'Generic': [
        'Title',
        'Document Purpose',
        'Duration',
        'Daily Commitment',
        'Goal',
        'Timeline',
        'Key Sections',
        'Action Items'
    ]
};

const CATEGORY_TO_DOC_TYPE: Record<ClassifiedCategory, string> = {
    'Train Ticket': 'train_ticket',
    'Flight Ticket': 'flight_ticket',
    'Resume': 'resume',
    'CV': 'resume',
    'Invoice': 'invoice',
    'Bank Statement': 'bank_statement',
    'Agreement': 'agreement',
    'Medical Report': 'medical_report',
    'Generic': 'generic_document'
};

const callGeminiJson = async (
    prompt: string,
    options?: { temperature?: number; maxOutputTokens?: number; responseMimeType?: string }
): Promise<any | null> => {
    const maxOutputTokens = Math.min(1400, Math.max(64, Number(options?.maxOutputTokens || 900)));
    try {
        const response = await fetch(AI_FALLBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                userPrompt: prompt,
                requireJson: true,
                gptModel: DEFAULT_MODEL,
                maxOutputTokens
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        if (data?.json && typeof data.json === 'object') {
            return data.json;
        }
        const content = safeString(data?.text);
        if (!content) {
            console.warn('[LLM Extractor] Empty text response from AI');
            return null;
        }

        // Robust JSON extraction using regex (same logic as used in aiDocumentService)
        const findJson = (raw: string) => {
            try {
                const firstBrace = raw.indexOf('{');
                const lastBrace = raw.lastIndexOf('}');
                if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    return raw.substring(firstBrace, lastBrace + 1);
                }
            } catch (e) { }
            return raw;
        };

        const jsonCandidate = findJson(content).replace(/```json|```/g, '').trim();
        try {
            return JSON.parse(jsonCandidate);
        } catch (parseError) {
            console.error('[LLM Extractor] Failed to parse JSON. Raw content snippet:', content.substring(0, 200));
            // One last try: attempt to clean common AI artifacts
            try {
                const veryClean = jsonCandidate.replace(/\\n/g, '').replace(/\\"/g, '"');
                return JSON.parse(veryClean);
            } catch (e) {
                return null;
            }
        }
    } catch (error: any) {
        const message = typeof error?.message === 'string' ? error.message : 'AI JSON extraction failed';
        throw new Error(message);
    }
};

const callGeminiText = async (prompt: string): Promise<string> => {
    try {
        const response = await fetch(AI_FALLBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                gptModel: DEFAULT_MODEL,
                maxOutputTokens: 900
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API error: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        return safeString(data?.text);
    } catch (error: any) {
        const message = typeof error?.message === 'string' ? error.message : 'AI text extraction failed';
        throw new Error(message);
    }
};

const classifyDocumentCategory = async (text: string): Promise<{
    category: ClassifiedCategory;
    confidenceLabel: 'High' | 'Medium' | 'Low';
    confidenceScore: number;
}> => {
    const prompt = `You are a STRICT document classifier. Do NOT hallucinate.

Classify the document into ONLY one of these categories:
- Train Ticket
- Flight Ticket
- Resume
- CV
- Invoice
- Bank Statement
- Agreement
- Medical Report
- Generic

STRICT RULES:
- Only classify as "Train Ticket" if you can find EXPLICIT evidence such as: Train Number, PNR number (10 digits), Coach letter+number, Boarding Station, Destination Station all present.
- Only classify as "Flight Ticket" if you can find: Flight Number, PNR/Booking Ref, Departure/Arrival Airport, Passenger Name all present.
- Only classify as "Resume" or "CV" if there is a personal profile/contact section AND at least 2 of: Skills, Work Experience, Education, Projects.
- If ANY doubt exists about the category, return "Generic".
- Do NOT guess. Do NOT infer from partial keywords alone.
- If the document has mixed content or headers from multiple types, return "Generic".

Return JSON only:
{"document_type":"Train Ticket|Flight Ticket|Resume|CV|Invoice|Bank Statement|Agreement|Medical Report|Generic","confidence":"High|Medium|Low","reason":"one line reason"}

Document text:
${text.slice(0, 14000)}`;

    const parsed = await callGeminiJson(prompt, {
        temperature: 0,
        maxOutputTokens: 160,
        responseMimeType: 'application/json'
    });

    const rawDocType = safeString((parsed as any)?.document_type || parsed).replace(/["'`]/g, '').trim().toLowerCase();
    const rawConfidence = safeString((parsed as any)?.confidence).toLowerCase();
    const rawReason = safeString((parsed as any)?.reason);
    const category: ClassifiedCategory =
        rawDocType.includes('train') ? 'Train Ticket' :
            rawDocType.includes('flight') ? 'Flight Ticket' :
                rawDocType === 'cv' ? 'CV' :
                    rawDocType.includes('resume') ? 'Resume' :
                        rawDocType.includes('invoice') ? 'Invoice' :
                            rawDocType.includes('bank') ? 'Bank Statement' :
                                (rawDocType.includes('agreement') || rawDocType.includes('contract')) ? 'Agreement' :
                                    rawDocType.includes('medical') ? 'Medical Report' :
                                        'Generic';

    console.log(`[LLM Extractor] Classification: ${category} | Confidence: ${rawConfidence} | Reason: ${rawReason}`);

    const confidenceLabel: 'High' | 'Medium' | 'Low' =
        rawConfidence === 'high' ? 'High' :
            rawConfidence === 'low' ? 'Low' :
                'Medium';

    const confidenceScore =
        confidenceLabel === 'High' ? 90 :
            confidenceLabel === 'Medium' ? 70 : 45;

    return { category, confidenceLabel, confidenceScore };
};

const extractStrictStructuredProfile = async (text: string): Promise<ResumeStrictExtraction> => {
    const prompt = `You are a professional document analysis engine.

Your job:
1. Detect document type.
2. Extract structured data.
3. Generate professional summary.
4. Return STRICT VALID JSON ONLY.
5. Do not add explanations outside JSON.
6. If any field missing, return null.
7. Never break JSON format.

Analyze the document below.

Return strictly in this JSON format:
{
  "document_type": "",
  "confidence": "",
  "structured_data": {
    "name": "",
    "role": "",
    "email": "",
    "phone": "",
    "location": "",
    "skills": [],
    "experience": [],
    "education": []
  },
  "summary": ""
}

Rules:
- If document is Resume, fill all relevant fields.
- If not Resume, keep same JSON keys and set missing values to null / [].
- Do not return markdown.
- Do not explain anything.
- Output valid JSON only.

Document Text:
"""
${text.slice(0, 22000)}
"""`;

    const parsed = await callGeminiJson(prompt, {
        temperature: 0,
        maxOutputTokens: 1200,
        responseMimeType: 'application/json'
    });

    const asObject = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
    const data = (asObject.structured_data && typeof asObject.structured_data === 'object')
        ? asObject.structured_data as Record<string, unknown>
        : {};

    const normalizeList = (v: unknown): string[] => Array.isArray(v)
        ? v.map((x) => safeString(x)).filter(Boolean)
        : [];

    return {
        document_type: safeString(asObject.document_type) || 'generic_document',
        confidence: safeString(asObject.confidence) || 'Medium',
        structured_data: {
            name: safeString(data.name) || null,
            role: safeString(data.role) || null,
            email: safeString(data.email) || null,
            phone: safeString(data.phone) || null,
            location: safeString(data.location) || null,
            skills: normalizeList(data.skills),
            experience: normalizeList(data.experience),
            education: normalizeList(data.education),
        },
        summary: safeString(asObject.summary) || 'No clear summary generated.'
    };
};

const normalizeFieldKey = (key: string): string => key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const pickFieldValueFromObject = (obj: Record<string, unknown>, field: string): string | null => {
    const target = normalizeFieldKey(field);
    const entries = Object.entries(obj);
    for (const [k, v] of entries) {
        if (normalizeFieldKey(k) === target) {
            const val = safeString(v);
            return val || null;
        }
    }
    return null;
};

const extractFieldsBySchema = async (
    text: string,
    category: ClassifiedCategory,
    schema: string[]
): Promise<Record<string, string | null>> => {
    const schemaList = schema.map((field) => `- ${field}`).join('\n');
    const prompt = `Extract structured fields from this ${category} document.

Fields to extract:
${schemaList}

Rules:
1. Return valid JSON object only.
2. Keys must match field names exactly.
3. If a field is missing or unclear, set value to null.
4. Do not guess values.

Document text:
${text.slice(0, 18000)}
`;
    console.log(`[LLM Extractor] Extraction Prompt started for category: ${category}`);
    const parsed = await callGeminiJson(prompt, { temperature: 0, maxOutputTokens: 1200, responseMimeType: 'application/json' });

    if (!parsed) {
        console.warn(`[LLM Extractor] Extraction failed: AI returned null or malformed JSON for ${category}`);
    } else {
        console.log(`[LLM Extractor] Extraction successful. Parsed keys:`, Object.keys(parsed));
    }

    const source = (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
    const output: Record<string, string | null> = {};
    schema.forEach((field) => {
        output[field] = pickFieldValueFromObject(source, field);
    });
    return output;
};

const isValidDateLike = (value: string): boolean => {
    const v = value.trim();
    if (!v) return false;
    if (/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/.test(v)) return true;
    if (/\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/.test(v)) return true;
    return /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(v);
};

const validateFieldByName = (category: ClassifiedCategory, field: string, value: string | null): boolean => {
    if (!value || !value.trim()) return false;
    const v = value.trim();
    const fieldKey = normalizeFieldKey(field);

    if (fieldKey === 'pnr' || fieldKey.includes('booking_reference')) {
        const digits = v.replace(/\D+/g, '');
        if (category === 'Train Ticket') return digits.length >= 8 && digits.length <= 12; // PNR is usually 10, but let's be safe
        return v.replace(/\s+/g, '').length >= 5;
    }
    if (fieldKey.includes('train') && (fieldKey.includes('number') || fieldKey.includes('no'))) return /\b\d{4,6}\b/.test(v);
    if (fieldKey.includes('email')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    if (fieldKey.includes('phone')) return v.replace(/\D+/g, '').length >= 10;
    if (fieldKey.includes('date') || fieldKey.includes('period')) return isValidDateLike(v);
    if (fieldKey.includes('amount') || fieldKey === 'fare' || fieldKey.includes('balance')) {
        return /(₹|INR|USD|\$)/i.test(v) || /\d+(?:[.,]\d{1,2})?/.test(v);
    }
    return v.length >= 2;
};

const validateExtractedFields = (
    category: ClassifiedCategory,
    fields: Record<string, string | null>,
    ocrQuality = 80
) => {
    const normalizedOcrPercent = Math.max(0, Math.min(100, Math.round(ocrQuality)));
    const normalizedOcr = Number((normalizedOcrPercent / 100).toFixed(2));
    const field_confidence: Record<string, string> = {};
    const invalid_fields: string[] = [];
    const missing_fields: string[] = [];
    let valid_fields = 0;
    const total_fields = Object.keys(fields).length || 1;

    Object.entries(fields).forEach(([field, value]) => {
        const isMissing = !value || value.trim() === '';
        if (isMissing) {
            field_confidence[field] = 'Low';
            missing_fields.push(field);
            return;
        }
        const valid = validateFieldByName(category, field, value);
        if (valid) {
            field_confidence[field] = 'High';
            valid_fields += 1;
        } else {
            field_confidence[field] = 'Low';
            invalid_fields.push(field);
        }
    });

    const extractionScore = Math.round((valid_fields / total_fields) * 100);
    const confidenceScore = Math.round(extractionScore * normalizedOcr);
    const confidenceLabel = confidenceScore >= 80 ? 'High' : confidenceScore >= 55 ? 'Medium' : 'Low';

    return {
        confidenceScore,
        confidenceLabel,
        extractionScore,
        ocrQuality: normalizedOcrPercent,
        field_confidence,
        invalid_fields,
        missing_fields,
        valid_fields,
        total_fields,
        ocr_quality_weight: Number(normalizedOcr.toFixed(2))
    };
};

const generateSummaryFromValidatedData = async (
    category: ClassifiedCategory,
    fields: Record<string, string | null>,
    sourceText: string
): Promise<string> => {
    const compact = Object.entries(fields)
        .map(([k, v]) => `${k}: ${v || 'Not clearly detected'}`)
        .join('\n');
    const prompt = `You are a professional document restructuring engine.

Your task is NOT just to summarize.

You must:
1. Understand the full document.
2. Detect key themes and sections.
3. Rebuild the content in a clean, structured format.
4. Remove repetition.
5. Convert long paragraphs into logical bullet points.
6. Group related information.
7. Highlight important values like duration, goals, timelines.
8. Maintain original meaning.
9. Avoid copying raw text.
10. Make it visually clean and structured.

Output in clean markdown format with:
- Headings
- Bullet points
- Clear sections
- Concise explanation

Constraints:
- Use only information present in the document text and structured fields.
- If any key detail is unclear, mention "Not clearly detected".
- Keep output concise and professional.

Document category: ${category}

Structured fields:
${compact}

Document:
"""
${sourceText.slice(0, 22000)}
"""`;
    const text = await callGeminiText(prompt);
    return text || `${category} document summary generated from extracted fields.`;
};

/**
 * Extract structured data from PDF text using LLM
 */
export async function extractWithLLM(
    pdfText: string,
    options?: { ocrQuality?: number }
): Promise<LLMExtractionResult | null> {
    if (!USE_AI) {
        console.log('[LLM Extractor] AI extraction disabled, skipping LLM extraction');
        return null;
    }

    // --- FIX 2: Hard keyword validation before accepting category ---
    const validateCategoryByKeywords = (category: ClassifiedCategory, fullText: string): boolean => {
        const upper = fullText.toUpperCase();
        if (category === 'Train Ticket') {
            const indicators = ['PNR', 'COACH', 'SEAT', 'BOARDING', 'TRAIN NO', 'TRAIN NUMBER', 'IRCTC'];
            const hits = indicators.filter(k => upper.includes(k));
            console.log(`[LLM Extractor] Train Ticket keyword hits: ${hits.join(', ')} (${hits.length}/${indicators.length})`);
            return hits.length >= 2;
        }
        if (category === 'Flight Ticket') {
            const indicators = ['FLIGHT NO', 'FLIGHT NUMBER', 'DEPARTURE', 'BOARDING PASS', 'AIRLINE', 'GATE'];
            const hits = indicators.filter(k => upper.includes(k));
            return hits.length >= 2;
        }
        return true; // No keyword guard needed for other categories
    };

    try {
        const cleanedText = cleanDocumentTextForLLM(pdfText, 30000);
        if (!cleanedText) return null;

        // PASS 1: Document classification
        const classification = await classifyDocumentCategory(cleanedText);
        let category = classification.category;
        const schema = CATEGORY_SCHEMAS[category] || CATEGORY_SCHEMAS.Generic;

        // Guardrail: validate high-risk ticket categories with deterministic keyword checks
        if (!validateCategoryByKeywords(category, cleanedText)) {
            console.warn(`[LLM Extractor] Keyword guard rejected category ${category}. Falling back to Generic.`);
            category = 'Generic';
        }

        // PASS 2: Strict structured profile extraction (JSON-enforced)
        const strictProfile = await extractStrictStructuredProfile(cleanedText);
        const strictDocType = safeString(strictProfile.document_type).toLowerCase();
        const strictSaysResume = strictDocType.includes('resume') || strictDocType.includes('cv');
        if (strictSaysResume) {
            category = 'Resume';
        }

        let extracted: Record<string, string | null> = {};
        if (category === 'Resume' || category === 'CV') {
            extracted = {
                'Full Name': strictProfile.structured_data.name,
                'Role': strictProfile.structured_data.role,
                'Email': strictProfile.structured_data.email,
                'Phone': strictProfile.structured_data.phone,
                'Location': strictProfile.structured_data.location,
                'Skills': strictProfile.structured_data.skills.length > 0 ? strictProfile.structured_data.skills.join(' | ') : null,
                'Experience': strictProfile.structured_data.experience.length > 0 ? strictProfile.structured_data.experience.join(' | ') : null,
                'Education': strictProfile.structured_data.education.length > 0 ? strictProfile.structured_data.education.join(' | ') : null
            };
        } else {
            // Category-specific extraction for non-resume documents
            extracted = await extractFieldsBySchema(cleanedText, category, schema);
        }

        // --- FIX 3: Extraction count check (3-layer safety net) ---
        // If a ticket category was assigned but barely any fields are extracted, fall back to Generic
        const extractedCount = Object.values(extracted).filter(v => v !== null && v !== '').length;
        const totalFields = Object.keys(extracted).length || 1;
        const extractionRatio = extractedCount / totalFields;
        if ((category === 'Train Ticket' || category === 'Flight Ticket') && extractionRatio < 0.3) {
            console.warn(`[LLM Extractor] ⚠️ Extraction ratio too low (${extractedCount}/${totalFields}). Overriding to Generic.`);
            category = 'Generic';
            // Re-extract with generic schema
            const genericSchema = CATEGORY_SCHEMAS['Generic'];
            const genericExtracted = await extractFieldsBySchema(cleanedText, 'Generic', genericSchema);
            Object.assign(extracted, genericExtracted);
        }

        // PASS 2.5: Deterministic validation layer
        const validationResult = validateExtractedFields(
            category,
            extracted,
            typeof options?.ocrQuality === 'number' ? options.ocrQuality : 80
        );

        // Backend confidence engine:
        // overall = 0.4 * extraction_score + 0.3 * OCR_quality + 0.3 * classification_confidence
        const overallConfidenceScore = Math.round(
            (0.4 * validationResult.extractionScore) +
            (0.3 * validationResult.ocrQuality) +
            (0.3 * classification.confidenceScore)
        );
        // PASS 3: Summary from validated data (always run restructuring prompt)
        let summary = '';
        try {
            summary = await generateSummaryFromValidatedData(category, extracted, cleanedText);
        } catch {
            summary = (category === 'Resume' || category === 'CV')
                ? strictProfile.summary
                : `${category} document summary generated from extracted fields.`;
        }

        const strictConfidenceScore = parseConfidenceToScore(strictProfile.confidence);
        const finalConfidenceScore = strictSaysResume
            ? Math.max(overallConfidenceScore, strictConfidenceScore)
            : overallConfidenceScore;

        const finalConfidenceLabel: 'High' | 'Medium' | 'Low' =
            finalConfidenceScore >= 80 ? 'High' :
                finalConfidenceScore >= 55 ? 'Medium' : 'Low';

        const result: NewTemplateExtractionResult = {
            category,
            document_type: CATEGORY_TO_DOC_TYPE[category] || 'generic_document',
            confidence: finalConfidenceLabel,
            confidenceScore: finalConfidenceScore,
            extracted_fields: extracted,
            field_confidence: validationResult.field_confidence,
            summary,
            missing_or_unclear_fields: Array.from(new Set([
                ...validationResult.missing_fields,
                ...validationResult.invalid_fields
            ])),
            validation: {
                valid_fields: validationResult.valid_fields,
                total_fields: validationResult.total_fields,
                invalid_fields: validationResult.invalid_fields,
                missing_fields: validationResult.missing_fields,
                ocr_quality_weight: validationResult.ocr_quality_weight,
                extraction_score: validationResult.extractionScore,
                classification_confidence: classification.confidenceScore,
                overall_score: overallConfidenceScore
            }
        };

        console.log('[LLM Extractor] 3-pass extraction completed');
        console.log('[LLM Extractor] Category:', category);
        console.log('[LLM Extractor] Confidence:', result.confidenceScore);
        return result;
    } catch (error) {
        console.error('[LLM Extractor] 3-pass extraction failed, using legacy fallback:', error);
        try {
            // Legacy single-pass fallback
            const systemPrompt = getSystemPrompt();
            const userPrompt = getUserPrompt(pdfText.slice(0, 30000));
            const promptText = `${systemPrompt}\n\n${userPrompt}`;
            const parsedRaw = await callGeminiJson(promptText, {
                temperature: 0.4,
                maxOutputTokens: 1400,
                responseMimeType: 'application/json'
            });
            if ((parsedRaw as TrainTicketJson)?.ticketType === 'TRAIN') {
                return parsedRaw as TrainTicketJson;
            }
            if (isNewTemplateResult(parsedRaw)) {
                return parsedRaw as NewTemplateExtractionResult;
            }
            if (typeof parsedRaw === 'object' && parsedRaw !== null) {
                return normalizeToLegacySummaryResult(parsedRaw);
            }
            return toStrictDocumentResult(parsedRaw, pdfText);
        } catch (fallbackError) {
            console.error('[LLM Extractor] Legacy fallback failed:', fallbackError);
        }
        return null;
    }
}

export async function microExtractPassengerName(pdfText: string): Promise<string | null> {
    if (!USE_AI) return null;
    const snippet = applyBrokenWordFixes((pdfText || '').replace(/\s+/g, ' ').trim()).slice(0, 4000);
    if (!snippet) return null;

    const prompt = `Extract passenger name from this text.
Return only JSON: {"name":"string|null"}.
If not clearly present, return {"name": null}.
Text:
${snippet}`;

    try {
        const response = await fetch(AI_FALLBACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt,
                gptModel: DEFAULT_MODEL
            })
        });
        if (!response.ok) return null;
        const data = await response.json();
        const content = data?.text;
        if (!content) return null;
        const parsed = JSON.parse(String(content).replace(/```json|```/g, '').trim());
        const name = safeString(parsed?.name);
        return name || null;
    } catch {
        return null;
    }
}

/**
 * Map LLM extraction result to PdfSummary structure
 */
export function mapLLMResultToSummary(llmResult: LLMExtractionResult): any {
    if ((llmResult as TrainTicketJson)?.ticketType === 'TRAIN') {
        const ticketResult = llmResult as TrainTicketJson;
        const keyPoints: string[] = [];

        if (ticketResult.status) {
            keyPoints.push(`Status: ${ticketResult.status}`);
        }
        if (ticketResult.journey?.from && ticketResult.journey?.to) {
            keyPoints.push(`Route: ${ticketResult.journey.from} → ${ticketResult.journey.to}`);
        }
        if (ticketResult.journey?.date) {
            keyPoints.push(`Date: ${ticketResult.journey.date}`);
        }
        if (ticketResult.train?.number || ticketResult.train?.name) {
            keyPoints.push(`Train: ${[ticketResult.train?.name, ticketResult.train?.number].filter(Boolean).join(' ')}`);
        }
        if (ticketResult.passengers?.length) {
            keyPoints.push(`Passengers: ${ticketResult.passengers.length}`);
        }

        const shortSummary = ticketResult.journey?.from && ticketResult.journey?.to
            ? `Train ticket from ${ticketResult.journey.from} to ${ticketResult.journey.to}.`
            : 'Train ticket summary.';

        const generic = {
            shortSummary,
            keyPoints: keyPoints.length > 0 ? keyPoints : [shortSummary],
            totalWords: shortSummary.split(' ').length,
            readingTimeMinutes: 1
        };

        return {
            documentType: 'train-ticket',
            generic,
            structured: undefined,
            confidenceScore: 80,
            newSchema: ticketResult
        };
    }

    if (
        (llmResult as StrictDocumentExtractionResult)?.extracted_data &&
        (llmResult as StrictDocumentExtractionResult)?.summary === null
    ) {
        const strictResult = llmResult as StrictDocumentExtractionResult;
        const documentType = strictResult.document_type;
        const extractedData = strictResult.extracted_data;
        const keyPoints = objectToKeyPoints(extractedData);
        const shortSummary = `${extractedData.document_type || documentType} structured summary`;

        return {
            documentType: mapStrictToLegacyDocType(documentType),
            generic: {
                shortSummary,
                keyPoints,
                totalWords: shortSummary.split(' ').length,
                readingTimeMinutes: 1
            },
            structured: undefined,
            confidenceScore: strictResult.confidenceScore ?? 80,
            newSchema: extractedData
        };
    }

    if (isNewTemplateResult(llmResult)) {
        const safeDocType = mapToLegacyDocType(llmResult.document_type || 'generic_document');
        const cleanedFields = sanitizeExtractedFields(llmResult.extracted_fields);
        const rawFields = (llmResult.extracted_fields && typeof llmResult.extracted_fields === 'object')
            ? llmResult.extracted_fields as Record<string, unknown>
            : {};
        const missingFields = Array.isArray(llmResult.missing_or_unclear_fields)
            ? llmResult.missing_or_unclear_fields.map((x) => safeString(x)).filter(Boolean)
            : [];

        const keyPoints = [
            ...Object.entries(cleanedFields).slice(0, 7).map(([k, v]) => `${k}: ${v}`),
            ...(missingFields.length > 0 ? [`Missing/Unclear: ${missingFields.join(', ')}`] : [])
        ].slice(0, 7);

        const confidenceLabel = safeString(llmResult.confidence).toLowerCase();
        const confidenceScoreFromLabel =
            confidenceLabel === 'high' ? 90 :
                confidenceLabel === 'medium' ? 75 :
                    confidenceLabel === 'low' ? 55 : 80;
        const confidenceScore = typeof llmResult.confidenceScore === 'number'
            ? llmResult.confidenceScore
            : confidenceScoreFromLabel;

        let structured: any = undefined;
        if (safeDocType === 'flight-ticket' || safeDocType === 'train-ticket') {
            const passengers = normalizePassengerArray(rawFields);
            const from = getFieldIgnoreCase(rawFields, ['from', 'origin', 'source', 'departure_city', 'departure_airport', 'departure']);
            const to = getFieldIgnoreCase(rawFields, ['to', 'destination', 'arrival_city', 'arrival_airport', 'arrival']);
            const flight = getFieldIgnoreCase(rawFields, ['flight', 'flight_number', 'train', 'train_number', 'train_name_and_number']);
            const date = getFieldIgnoreCase(rawFields, ['date', 'travel_date', 'journey_date', 'departure_date', 'date_of_journey']);
            const departureTime = getFieldIgnoreCase(rawFields, ['departure_time', 'dep_time']);
            const boardingTime = getFieldIgnoreCase(rawFields, ['boarding_time']);
            const gate = getFieldIgnoreCase(rawFields, ['gate', 'platform']);
            const terminal = getFieldIgnoreCase(rawFields, ['terminal']);
            const pnr = getFieldIgnoreCase(rawFields, ['pnr', 'booking_id', 'reference_number', 'pnr_booking_reference']);
            const seat = getFieldIgnoreCase(rawFields, ['seat', 'seat_number', 'seat_no', 'class_and_coach']);
            const amount = getFieldIgnoreCase(rawFields, ['amount', 'total', 'total_amount', 'fare', 'total_fare']);
            const currency = getFieldIgnoreCase(rawFields, ['currency']) || (amount?.includes('₹') ? 'INR' : 'USD');

            structured = {
                flightTicket: {
                    overview: safeString(llmResult.summary) || (safeDocType === 'train-ticket' ? 'Train ticket summary' : 'Flight ticket summary'),
                    pnr: pnr || undefined,
                    passengers: passengers.length > 0
                        ? passengers
                        : [{ name: 'Not clearly detected', seat: seat || undefined }],
                    journey: (from || to || flight || date || departureTime || boardingTime || gate || terminal)
                        ? {
                            from: from || undefined,
                            to: to || undefined,
                            flight: flight || undefined,
                            date: date || undefined,
                            departureTime: departureTime || undefined,
                            boardingTime: boardingTime || undefined,
                            gate: gate || undefined,
                            terminal: terminal || undefined
                        }
                        : undefined,
                    pricing: amount
                        ? {
                            total: amount.replace(/[^\d.,]/g, '') || amount,
                            currency
                        }
                        : undefined,
                    verdict: safeString(llmResult.summary) || 'Details extracted from visible ticket content.'
                }
            };
        } else if (safeDocType === 'resume') {
            if (canRenderResumeStructuredCard(rawFields, confidenceScore)) {
                structured = buildStructuredResumeFromRawFields(
                    rawFields,
                    safeString(llmResult.summary) || 'Candidate profile summary.'
                );
            } else {
                keyPoints.unshift(
                    `Resume structured card skipped: confidence ${confidenceScore}% is below threshold ${RESUME_STRUCTURED_CONFIDENCE_THRESHOLD}% or fields are incomplete.`
                );
            }
        }

        return {
            documentType: safeDocType,
            generic: {
                shortSummary: safeString(llmResult.summary) || 'Brief summary generated from visible content.',
                keyPoints: keyPoints.length > 0 ? keyPoints : ['No clear structured fields detected from visible content.'],
                totalWords: safeString(llmResult.summary).split(/\s+/).filter(Boolean).length || 0,
                readingTimeMinutes: 1
            },
            structured,
            confidenceScore,
            newSchema: buildUniversalSchema({
                documentType: llmResult.document_type || 'generic_document',
                title: 'Document Summary',
                summary: safeString(llmResult.summary) || 'Brief summary generated from visible content.',
                rawFields,
                missingOrUnclear: missingFields,
                defaultConfidence: safeString(llmResult.confidence) || 'Medium',
                explicitFieldConfidence: llmResult.field_confidence,
                explicitValidation: llmResult.validation
                    ? {
                        completeness: llmResult.validation.total_fields > 0
                            ? Math.round((llmResult.validation.valid_fields / llmResult.validation.total_fields) * 100)
                            : 0,
                        missing_fields: [
                            ...(llmResult.validation.missing_fields || []),
                            ...(llmResult.validation.invalid_fields || [])
                        ],
                        warnings: (llmResult.validation.invalid_fields || []).length > 0
                            ? ['Some extracted fields failed deterministic validation.']
                            : []
                    }
                    : undefined
            })
        };
    }

    // Build generic summary from new schema
    const legacyResult = llmResult as LegacyLLMExtractionResult;
    const generic = {
        shortSummary: legacyResult.summary || `Document of type ${legacyResult.document_type}`,
        keyPoints: legacyResult.important_points && legacyResult.important_points.length > 0
            ? legacyResult.important_points
            : [legacyResult.summary || 'No summary available'],
        totalWords: legacyResult.summary ? legacyResult.summary.split(' ').length : 0,
        readingTimeMinutes: 1
    };

    // For backward compatibility, map to structured data if this is a ticket/invoice
    let structured: any = undefined;
    const docType = legacyResult.document_type.toLowerCase();

    if ((docType.includes('train') || docType.includes('flight')) && !docType.includes('support')) {
        // Map to ticket structure for existing UI
        structured = {
            flightTicket: {
                overview: legacyResult.title || 'Ticket',
                passengers: extractPassengersFromPoints(legacyResult.important_points),
                journey: extractJourneyFromSummary(legacyResult.summary),
                pricing: extractPricingFromPoints(legacyResult.important_points),
                pnr: legacyResult.key_details.reference_number,
                bookingId: legacyResult.key_details.reference_number,
                verdict: legacyResult.summary || 'Booking confirmed'
            }
        };
    }

    return {
        documentType: mapToLegacyDocType(legacyResult.document_type),
        generic,
        structured,
        confidenceScore: legacyResult.confidenceScore,
        // Store normalized schema for frontend display
        newSchema: buildUniversalSchema({
            documentType: legacyResult.document_type,
            title: legacyResult.title,
            summary: legacyResult.summary,
            rawFields: {
                ...(legacyResult.key_details || {}),
                important_points: legacyResult.important_points || [],
                notes: legacyResult.notes || ''
            },
            defaultConfidence: String(legacyResult.confidenceScore || 'Medium')
        })
    };
}

// Helper functions
function mapStrictToLegacyDocType(docType: StrictDocumentType): 'generic' | 'train-ticket' {
    if (docType === 'TRAIN_TICKET') return 'train-ticket';
    return 'generic';
}

function mapToLegacyDocType(docType: string): 'generic' | 'flight-ticket' | 'train-ticket' | 'invoice' | 'receipt' | 'resume' {
    const lower = docType.toLowerCase();
    if (lower.includes('support')) return 'generic';
    if (lower.includes('train')) return 'train-ticket';
    if (lower.includes('flight')) return 'flight-ticket';
    if (lower.includes('ticket')) return 'flight-ticket';
    if (lower.includes('invoice')) return 'invoice';
    if (lower.includes('receipt')) return 'receipt';
    if (lower.includes('resume') || lower.includes('cv')) return 'resume';
    return 'generic';
}

function objectToKeyPoints(value: any): string[] {
    const keyPoints: string[] = [];

    const visit = (node: any, path: string[] = []) => {
        if (keyPoints.length >= 7 || node === null || node === undefined) return;
        if (typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
            const key = path[path.length - 1] || 'field';
            keyPoints.push(`${key.replace(/_/g, ' ')}: ${String(node)}`);
            return;
        }
        if (Array.isArray(node)) {
            node.forEach((item, index) => visit(item, [...path, String(index + 1)]));
            return;
        }
        if (typeof node === 'object') {
            Object.entries(node).forEach(([k, v]) => visit(v, [...path, k]));
        }
    };

    visit(value);
    return keyPoints.length > 0 ? keyPoints : ['Structured data extracted'];
}

function extractPassengersFromPoints(points: string[]): any[] {
    const passengers: any[] = [];
    points.forEach(point => {
        if (point.toLowerCase().includes('passenger')) {
            passengers.push({ name: point.substring(0, 100) });
        }
    });
    return passengers.length > 0 ? passengers : [{ name: 'Details in summary' }];
}

function extractJourneyFromSummary(summary: string): any {
    // Simple pattern matching for journey info
    const fromMatch = summary.match(/from\s+([A-Za-z\s]+)\s+to/i);
    const toMatch = summary.match(/to\s+([A-Za-z\s]+)/i);

    if (fromMatch && toMatch) {
        return {
            from: fromMatch[1].trim(),
            to: toMatch[1].replace(/from/i, '').trim().split(/\s+on\s+/i)[0],
            date: extractDateFromSummary(summary)
        };
    }
    return undefined;
}

function extractDateFromSummary(summary: string): string | undefined {
    const dateMatch = summary.match(/on\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
    return dateMatch ? dateMatch[1] : undefined;
}

function extractPricingFromPoints(points: string[]): any {
    for (const point of points) {
        const priceMatch = point.match(/(₹|INR|USD|\$)\s*([0-9,]+)/i);
        if (priceMatch) {
            return {
                total: priceMatch[2].replace(/,/g, ''),
                currency: priceMatch[1].includes('₹') || priceMatch[1].includes('INR') ? 'INR' : 'USD'
            };
        }
    }
    return undefined;
}
