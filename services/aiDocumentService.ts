/**
 * Centralized AI Service
 * Uses backend /api/ask (OpenRouter-backed) for document analysis
 */

import { API_BASE_URL } from "../utils/apiBase";

const AI_API_URL = `${API_BASE_URL}/ask`;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Response cache to avoid duplicate API calls
const responseCache = new Map<string, any>();

export interface AIOptions {
    temperature?: number;
    maxTokens?: number;
    format?: 'bullet' | 'detailed' | 'executive';
    enableCache?: boolean;
}

export interface AIResponse {
    text: string;
    cached: boolean;
}

export interface SmartDocumentSummary {
    document_type: string;
    overview: string;
    key_sections: Array<{
        heading: string;
        summary: string;
    }>;
    important_dates: string[];
    important_numbers: string[];
    conclusion: string;
    // Specific fields for tickets/invoices to satisfy the bridge
    pnr?: string;
    passengers?: Array<{ name: string; age?: string; gender?: string; seat?: string; currentStatus?: string }>;
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
    pricing?: { totalFare?: string | number; currency?: string };
    train?: { name?: string; number?: string };
}

/**
 * AI Service Class
 * Provides robust API interaction with retry logic, caching, and error handling
 */
class AIDocumentService {
    constructor() {
        // API key is now server-side only.
    }

    /**
     * Check if API key is configured
     */
    isConfigured(): boolean {
        return true;
    }

    /**
     * Generate cache key from prompt
     */
    private getCacheKey(prompt: string): string {
        // Simple hash function for caching
        let hash = 0;
        for (let i = 0; i < prompt.length; i++) {
            const char = prompt.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `ai_${hash}`;
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Try to repair truncated JSON strings from AI
     */
    private tryRepairJson(jsonString: string): string {
        let text = jsonString.trim();
        if (!text) return '{}';

        // Basic clean up of markdown blocks if still present
        text = text.replace(/^```json\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();

        // If it starts with { and ends with }, it might be already valid
        try {
            JSON.parse(text);
            return text;
        } catch (e) {
            // Not valid, proceed to repair
        }

        // Fix unterminated strings first
        let inString = false;
        let escaped = false;

        for (let i = 0; i < text.length; i++) {
            if (text[i] === '\\' && !escaped) {
                escaped = true;
                continue;
            }
            if (text[i] === '"' && !escaped) {
                inString = !inString;
            }
            escaped = false;
        }

        if (inString) {
            text += '"';
        }

        // Close braces and brackets in the correct LIFO order using a stack
        const stack: string[] = [];
        escaped = false;
        inString = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            if (char === '\\' && !escaped) {
                escaped = true;
                continue;
            }
            if (char === '"' && !escaped) {
                inString = !inString;
                escaped = false;
                continue;
            }
            escaped = false;

            if (!inString) {
                if (char === '{' || char === '[') {
                    stack.push(char);
                } else if (char === '}') {
                    if (stack[stack.length - 1] === '{') stack.pop();
                } else if (char === ']') {
                    if (stack[stack.length - 1] === '[') stack.pop();
                }
            }
        }

        while (stack.length > 0) {
            const opener = stack.pop();
            if (opener === '{') text += '}';
            else if (opener === '[') text += ']';
        }

        return text;
    }

    /**
     * Regex-based JSON extractor as requested in checklist
     */
    private extractJsonObject(raw: string): string {
        try {
            // Find first { and last }
            const firstBrace = raw.indexOf('{');
            const lastBrace = raw.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                return raw.substring(firstBrace, lastBrace + 1);
            }
        } catch (e) { }
        return raw;
    }

    /**
     * Core API call with retry logic and exponential backoff
     */
    private async callAIAPI(
        prompt: string,
        options: AIOptions = {}
    ): Promise<AIResponse> {
        const {
            temperature = 0.1,
            maxTokens = 2048,
            enableCache = true
        } = options;

        // Check cache first
        if (enableCache) {
            const cacheKey = this.getCacheKey(prompt);
            const cached = responseCache.get(cacheKey);
            if (cached) {
                console.log('[AI Service] Returning cached response');
                return { text: cached, cached: true };
            }
        }

        const requestBody = {
            prompt,
            gptModel: import.meta.env.VITE_AI_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
            maxOutputTokens: maxTokens,
            temperature
        };

        let lastError: Error | null = null;

        // Retry loop with exponential backoff
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(AI_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`AI API error (${response.status}): ${errorText}`);
                }

                const data = await response.json();
                const text =
                    (typeof data?.text === 'string' && data.text) ||
                    data?.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    throw new Error('No content in AI response');
                }

                // Cache successful response
                if (enableCache) {
                    const cacheKey = this.getCacheKey(prompt);
                    responseCache.set(cacheKey, text);

                    // Limit cache size to prevent memory issues
                    if (responseCache.size > 50) {
                        const firstKey = responseCache.keys().next().value;
                        responseCache.delete(firstKey);
                    }
                }

                return { text, cached: false };

            } catch (error) {
                lastError = error as Error;
                console.warn(`[AI Service] Attempt ${attempt + 1}/${MAX_RETRIES} failed: ${lastError.message}`);

                // Don't retry on fatal errors that won't succeed anyway
                if (lastError.message.includes('401') || lastError.message.includes('403')) {
                    throw lastError;
                }

                // Exponential backoff: wait before retrying
                if (attempt < MAX_RETRIES - 1) {
                    const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
                    console.log(`[AI Service] Retrying in ${delay}ms...`);
                    await this.sleep(delay);
                }
            }
        }

        throw lastError || new Error('AI API call failed after retries');
    }

    /**
     * Analyze PDF content with structured extraction
     */
    async analyzePDF(
        text: string,
        options: AIOptions = {}
    ): Promise<any> {
        const { format = 'detailed' } = options;

        const formatInstructions = {
            bullet: 'Use concise bullet points for all sections',
            detailed: 'Provide detailed information with clear headings and bullet points',
            executive: 'Create an executive summary with key findings and actionable insights'
        };

        const prompt = `You are a professional PDF document analysis engine with ZERO TOLERANCE for hallucination.

🚨 CRITICAL - ANTI-HALLUCINATION RULES:
1. ONLY extract information that is EXPLICITLY present in the PDF text
2. If any field is not found → use null (NEVER guess, assume, or invent)
3. Format: ${formatInstructions[format as keyof typeof formatInstructions]}

OUTPUT FORMAT: Valid JSON only, no markdown.

PDF TEXT:
${text.substring(0, 30000)}

Return structured analysis with document type, summary, and extracted entities.`;

        const response = await this.callAIAPI(prompt, options);

        try {
            const cleanedText = response.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return JSON.parse(cleanedText);
        } catch (parseError) {
            console.error('[AI Service] JSON parse error:', parseError);
            throw new Error('Failed to parse Gemini response as JSON');
        }
    }

    /**
     * Rebuild the document as highly structured, section-based markdown
     */
    async generateMarkdownSummary(
        text: string,
        options: AIOptions = {}
    ): Promise<string> {
        const prompt = `You are an expert document parser. Your goal is to REBUILD the provided document text into a highly structured, professional Markdown document. Do not just blindly summarize it; logically group the extracted data into clear, readable sections.

🚨 CRITICAL RULES:
1. ZERO HALLUCINATION: Only use facts explicitly found in the text.
2. STRUCTURE: Use "## Section Title" for major groupings (e.g. "## Passenger Details", "## Transaction Info", "## Key Takeaways").
3. FORMATTING: Use "- **Label**: Value" bullet points under sections for key-value data. Use standard bullet points for lists.
4. CLEANUP: Ignore OCR noise, typos, or meaningless strings.
5. NO JSON: Return ONLY valid, clean Markdown text. Do not wrap in markdown code blocks. Start directly with the text or headers.

Document Text:
${text.substring(0, 30000)}

Please output the structured Markdown rebuild now:`;

        const response = await this.callAIAPI(prompt, {
            ...options,
            temperature: 0.2, // Slightly higher to allow good structuring, but low enough for factual extraction
            maxTokens: 4096,
            enableCache: true,
        });

        const cleanedResponse = response.text.replace(/^```markdown\n?/i, '').replace(/^```\n?/i, '').replace(/```$/i, '').trim();
        return cleanedResponse;
    }

    /**
     * Generate Smart Document Summary for the universal structured JSON format
     */
    async generateSmartDocumentSummary(
        text: string,
        documentType?: string,
        options: AIOptions = {}
    ): Promise<SmartDocumentSummary> {
        const docSpecificInstructions = {
            'train-ticket': `This is a Train Ticket/Reservation. Pay close attention to:
                - PNR (usually 10 digits)
                - Train Number and Name
                - Passenger Names, Seats, Berths, and Coach/Class (e.g. SL, 2A, 3A, CNF/B1/22)
                - Journey Date and Departure/Arrival times
                - Departure and Arrival Station names
                - Total Fare and Payment details
                - Platform number if mentioned`,
            'flight-ticket': `This is a Flight Ticket/Boarding Pass. Pay close attention to:
                - PNR/Booking Reference (6 chars)
                - Flight Number and Airline
                - Seat, Gate, and Terminal
                - Departure and Arrival cities/airports
                - Departure Date and boarding time`,
            'invoice': `This is an Invoice/Receipt. Extract:
                - Invoice Number
                - Seller/Company name
                - Total Amount due and Currency
                - Date of Invoice and Due Date
                - List of items or services`,
            'resume': `This is a Resume/CV. Focus on:
                - Candidate Name and Contact info
                - Education History
                - Work Experience (Roles/Companies)
                - Key Skills and Certifications`
        };

        const typeHint = documentType ? (docSpecificInstructions[documentType as keyof typeof docSpecificInstructions] || '') : '';

        const prompt = `You are a professional JSON data extraction engine.
Output a clean, user-facing summary in the style of tools like Smallpdf / iLovePDF:
- concise
- easy to scan
- no fluff
Output in EXACTLY the following JSON format.
${typeHint}

🚨 CRITICAL RULES:
1. ONLY extract information EXPLICITLY present in the text.
2. If important_dates or important_numbers are missing, return empty arrays [].
3. For "overview", write a short 1-2 sentence quick summary (max 45 words).
4. For "key_sections", extract 3-6 short bullet-like components with practical wording.
5. You MUST include ALL fields listed in the "EXPECTED JSON FORMAT" below in your output.
6. If a field is not found in the text, set its value to null. Do not omit the key.
7. For tickets, find PNR, Passenger Names, Train Number, and Journey details.
8. Return ONLY valid JSON. NO MARKDOWN. NO EXPLANATIONS.
9. Return raw JSON text only.

EXPECTED JSON FORMAT:
{
  "document_type": "string",
  "overview": "string",
  "key_sections": [{"heading": "string", "summary": "string"}],
  "important_dates": ["string"],
  "important_numbers": ["string"],
  "conclusion": "string",
  "pnr": "string or null",
  "passengers": [{"name": "string", "seat": "string or null", "currentStatus": "string or null"}],
  "journey": {
    "from": "string or null",
    "to": "string or null",
    "date": "string or null",
    "flight": "string or null",
    "departureTime": "string or null",
    "boardingTime": "string or null",
    "gate": "string or null",
    "terminal": "string or null"
  },
  "pricing": {
    "totalFare": "string or number or null",
    "currency": "string or null"
  }
}

DOCUMENT TEXT:
${text.substring(0, 30000)}`;

        console.log("[AI Service] Sending prompt to AI...");

        const response = await this.callAIAPI(prompt, {
            ...options,
            temperature: 0.1,
            maxTokens: 4096,
            enableCache: true,
        });

        try {
            const rawText = response.text;
            console.log("[AI Service] Raw smart summary text (first 200 chars):", rawText.substring(0, 200));

            const extractedJson = this.extractJsonObject(rawText);
            const repairedJson = this.tryRepairJson(extractedJson);

            return JSON.parse(repairedJson) as SmartDocumentSummary;
        } catch (error) {
            console.error('[AI Service] Smart Summary Parse error:', error, response.text);
            // Return a safe fallback instead of throwing
            return {
                document_type: documentType || 'Generic Document',
                overview: 'Failed to generate a complete visual summary. Please try again or use the Ask PDF feature.',
                key_sections: [{ heading: 'Notice', summary: 'The AI response was cut off or malformed.' }],
                important_dates: [],
                important_numbers: [],
                conclusion: 'Summary generation incomplete.'
            };
        }
    }

    /**
     * Answer questions about PDF content
     */
    async answerQuestion(
        context: string,
        question: string,
        options: AIOptions = {}
    ): Promise<string> {
        const prompt = `You are a helpful assistant that answers questions about documents.
Provide accurate, concise answers based only on the given context.

            Context:
${context.substring(0, 12000)}

        Question: ${question}

        Answer(be specific and cite page numbers if mentioned in context): `;

        const response = await this.callAIAPI(prompt, {
            ...options,
            temperature: 0.3,
            maxTokens: 500
        });

        return response.text.trim();
    }

    /**
     * Generate follow-up questions based on PDF content
     */
    async suggestQuestions(text: string): Promise<string[]> {
        const prompt = `Based on the following document, suggest 5 useful questions a reader might ask.
Return only a JSON array of strings.

            Document:
${text.substring(0, 5000)}

Return format: ["Question 1", "Question 2", ...]`;

        const response = await this.callAIAPI(prompt, {
            temperature: 0.5,
            maxTokens: 300
        });

        try {
            const questions = JSON.parse(response.text);
            return Array.isArray(questions) ? questions : [];
        } catch {
            return [];
        }
    }

    /**
     * Clear response cache
     */
    clearCache(): void {
        responseCache.clear();
        console.log('[AI Service] Cache cleared');
    }
}

// Export singleton instance
export const aiDocumentService = new AIDocumentService();
