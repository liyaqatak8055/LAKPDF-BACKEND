import { API_BASE_URL } from "../utils/apiBase";

const DEFAULT_MODEL = import.meta.env.VITE_AI_MODEL || 'nex-agi/nex-n2.5-mini:free';
const API_URL = `${API_BASE_URL}/ask`;

const STORAGE_CUSTOM_KEY = 'lakpdf_custom_ai_key';
const STORAGE_CUSTOM_MODEL = 'lakpdf_custom_ai_model';

export interface SummaryOptions {
  type: 'executive' | 'keypoints' | 'action_items' | 'tldr' | 'detailed';
  language?: 'en' | 'hi' | 'hinglish' | 'es' | 'fr' | 'de';
  length?: 'concise' | 'standard' | 'in_depth';
  maxTokens?: number;
}

export interface QuestionOptions {
  language?: 'en' | 'hi' | 'hinglish';
  includePageNumbers?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface MCQOption {
  label: string;
  text: string;
}

export interface MCQItem {
  id: number | string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E?: string;
    [key: string]: string | undefined;
  };
  optionsList?: MCQOption[];
  correctOption: 'A' | 'B' | 'C' | 'D' | 'E' | string;
  correctOptionId?: 'A' | 'B' | 'C' | 'D' | 'E' | string;
  correct_answer?: string;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard' | string;
  topic?: string;
  source_reference?: string;
}

export interface MCQPaper {
  title: string;
  source_file?: string;
  total_questions: number;
  totalQuestions?: number;
  requested_count?: number;
  language: string;
  difficulty: string;
  questions: MCQItem[];
  schoolName?: string;
  timeAllowedMinutes?: number;
  optionCount?: 4 | 5;
  subject?: string;
}

export interface MCQGenerationOptions {
  count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  topic?: string;
  language?: 'en' | 'hi' | 'hinglish';
  optionCount?: 4 | 5;
  documentTitle?: string;
  schoolName?: string;
}

export interface McqPdfExportOptions {
  schoolName?: string;
  studentHeader?: boolean;
  includeAnswerKey?: boolean;
  includeExplanations?: boolean;
  includeTopic?: boolean;
  answersOnly?: boolean;
  language?: string;
}

export interface CandidateProfile {
  name: string;
  target_role: string;
  experience_level: string;
  education: string[];
  skills: {
    programming_languages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
  };
  projects: {
    name: string;
    description: string;
    tech_stack: string[];
  }[];
  work_experience?: {
    role: string;
    company: string;
    duration: string;
    responsibilities: string[];
  }[];
  internships?: string[];
  certifications?: string[];
  achievements?: string[];
  resume_claims?: string[];
}

export interface ResumeAnalysisData {
  candidate: CandidateProfile;
  summary: {
    overview: string;
    strengths: string[];
    areas_to_prepare: string[];
  };
}

export interface PrepQuestionItem {
  id: string;
  question: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'advanced' | 'hard';
  priority: 'must_prepare' | 'important' | 'additional_practice';
  source: 'resume' | 'technical' | 'behavioral' | 'project' | 'scenario' | 'coding';
  why_ask: string;
  prepare: string[];
  sample_answer?: {
    answer: string;
    key_points: string[];
    common_mistakes?: string[];
    better_approach?: string;
    interview_tip?: string;
    is_general_guidance?: boolean;
  };
  follow_ups?: string[];
  project_name?: string;
  code_language?: string;
  evidenceType?: 'REPORTED' | 'COMMON' | 'ROLE-RELEVANT';
  subcategory?: string;
  whyImportant?: string;
  questionType?: string;
  sourceReport?: {
    type?: string;
    company?: string;
    date?: string;
    url?: string;
  } | null;
}

export interface ProjectDeepDive {
  project_name: string;
  overview: string;
  core_questions: {
    question: string;
    why_ask: string;
    prepare: string[];
  }[];
  follow_ups: string[];
}

export interface ReadinessScore {
  technical_coverage_pct: number;
  projects_coverage_pct: number;
  hr_coverage_pct: number;
  resume_based_pct: number;
  overall_pct: number;
}

export interface InterviewPrepKit {
  readiness: ReadinessScore;
  weak_areas: string[];
  questions: PrepQuestionItem[];
  project_deep_dives?: ProjectDeepDive[];
}

export interface InterviewQuestionItem {
  id: number | string;
  category: string;
  difficulty: string;
  question: string;
  evaluationCriteria?: string;
  idealAnswer?: string;
  why_ask?: string;
  prepare?: string[];
  starBreakdown?: {
    situation?: string;
    task?: string;
    action?: string;
    result?: string;
  };
}

export interface InterviewKit {
  candidateOverview?: string;
  keyStrengths?: string[];
  areasToScrutinize?: string[];
  questions: InterviewQuestionItem[];
}

export interface InterviewOptions {
  role?: string;
  experienceLevel?: 'fresher' | 'mid' | 'senior' | 'lead';
  categories?: ('technical' | 'behavioral' | 'situational' | 'resume')[];
  count?: number;
  language?: 'en' | 'hi' | 'hinglish';
}

export interface AnswerEvaluation {
  score: number; // 1-10
  verdict?: string;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  what_went_well?: string[];
  areas_to_improve?: string[];
  modelAnswerSnippet?: string;
  model_delivery?: string;
  follow_up_question?: string;
}

export interface StructuredSummaryItem {
  heading?: string;
  text?: string;
  topic?: string;
  detail?: string;
}

export interface StructuredSummaryData {
  title: string;
  document_type?: string;
  bullets: StructuredSummaryItem[];
  suggestedQuestions: string[];
  rawText?: string;
  formattedMarkdown: string;
}

export function parseStructuredSummaryText(
  rawText: string,
  fallbackFileName?: string
): StructuredSummaryData {
  const cleanRaw = (rawText || '').trim();
  const fallbackTitle = fallbackFileName
    ? `${fallbackFileName.replace(/\.[^/.]+$/, '')} Summary`
    : 'Document Summary';

  // 1. If text looks like JSON or contains JSON fields ("summary", "bullets", "heading", "topic", "text", "detail")
  const isJsonLike =
    cleanRaw.includes('"heading"') ||
    cleanRaw.includes('"topic"') ||
    cleanRaw.includes('"summary"') ||
    cleanRaw.includes('"bullets"') ||
    cleanRaw.includes('"document_type"') ||
    cleanRaw.startsWith('{') ||
    cleanRaw.startsWith('```');

  if (isJsonLike) {
    const stripped = cleanRaw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    let parsed: any = null;

    try {
      parsed = JSON.parse(stripped);
    } catch {
      // Robust partial / truncated JSON extractor using regex
      const titleMatch = stripped.match(/"title"\s*:\s*"([^"]+)"/);
      const title = titleMatch ? titleMatch[1].trim() : fallbackTitle;
      const docTypeMatch = stripped.match(/"document_type"\s*:\s*"([^"]+)"/);
      const document_type = docTypeMatch ? docTypeMatch[1].trim() : 'general';

      const bullets: StructuredSummaryItem[] = [];
      const bulletRegex = /\{\s*"(?:heading|topic)"\s*:\s*"([^"]+)"\s*,\s*"(?:text|detail)"\s*:\s*"([^"]+)"/g;
      let m;
      while ((m = bulletRegex.exec(stripped)) !== null) {
        bullets.push({
          heading: m[1].trim(),
          text: m[2].trim(),
          topic: m[1].trim(),
          detail: m[2].trim(),
        });
      }

      // Also support reversed order: "text" before "heading"
      if (bullets.length === 0) {
        const altBulletRegex = /\{\s*"(?:text|detail)"\s*:\s*"([^"]+)"\s*,\s*"(?:heading|topic)"\s*:\s*"([^"]+)"/g;
        while ((m = altBulletRegex.exec(stripped)) !== null) {
          bullets.push({
            heading: m[2].trim(),
            text: m[1].trim(),
            topic: m[2].trim(),
            detail: m[1].trim(),
          });
        }
      }

      const sqBlock = stripped.match(/"(?:suggested_questions|suggestedQuestions)"\s*:\s*\[([\s\S]*?)(\]|$)/);
      const suggestedQuestions: string[] = [];
      if (sqBlock) {
        const qMatches = sqBlock[1].match(/"([^"]+)"/g);
        if (qMatches) {
          qMatches.forEach((q) => {
            const clean = q.replace(/^"|"$/g, '').trim();
            if (clean) suggestedQuestions.push(clean);
          });
        }
      }

      if (bullets.length > 0) {
        parsed = {
          title,
          document_type,
          bullets,
          suggested_questions: suggestedQuestions,
        };
      }
    }

    if (
      parsed &&
      (parsed.title ||
        (Array.isArray(parsed.summary) && parsed.summary.length > 0) ||
        (Array.isArray(parsed.bullets) && parsed.bullets.length > 0))
    ) {
      const rawList = Array.isArray(parsed.summary)
        ? parsed.summary
        : Array.isArray(parsed.bullets)
        ? parsed.bullets
        : [];
      const bullets: StructuredSummaryItem[] = rawList
        .map((b: any) => {
          const heading = String(b?.heading || b?.topic || '').trim();
          const text = String(b?.text || b?.detail || '').trim();
          return {
            heading,
            text,
            topic: heading,
            detail: text,
          };
        })
        .filter((b: StructuredSummaryItem) => b.heading || b.text);

      const rawQuestions = Array.isArray(parsed.suggested_questions)
        ? parsed.suggested_questions
        : Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions
        : [];
      const questions: string[] = rawQuestions.map((q: any) => String(q).trim()).filter(Boolean);
      const title = String(parsed.title || fallbackTitle).trim();
      const document_type = String(parsed.document_type || 'general').trim();

      const finalQuestions =
        questions.length > 0
          ? questions
          : [
              'What are the key conclusions and outcomes?',
              'What are the important dates and deadlines mentioned?',
              'What are the specific numerical details or fees involved?',
            ];

      const formattedMarkdown =
        `${title}\n\n` +
        bullets.map((b) => `• ${b.heading ? `**${b.heading}**: ` : ''}${b.text}`).join('\n') +
        `\n\n### Suggested questions:\n` +
        finalQuestions.map((q) => `- ${q}`).join('\n');

      return {
        title,
        document_type,
        bullets,
        suggestedQuestions: finalQuestions,
        rawText: cleanRaw,
        formattedMarkdown,
      };
    }
  }

  // 2. Normalize text: If it has inline bullet separators like " - **" on a single line,
  // split them into newlines so each bullet is parsed individually
  let normalized = cleanRaw;
  normalized = normalized.replace(/([^\n])\s*([–—\-•])\s*\*\*/g, '$1\n- **');

  const lines = normalized.split(/\r?\n/);
  let title = '';
  const bullets: StructuredSummaryItem[] = [];
  const suggestedQuestions: string[] = [];
  let inQuestions = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // NEVER parse raw JSON syntax characters as bullets!
    if (
      /^[{}\[\],]+$/.test(line) ||
      line.startsWith('"title":') ||
      line.startsWith('"document_type":') ||
      line.startsWith('"summary":') ||
      line.startsWith('"bullets":') ||
      line.startsWith('"suggested_questions":') ||
      line.startsWith('"suggestedQuestions":') ||
      line.startsWith('```')
    ) {
      continue;
    }

    // Check for suggested questions header
    if (line.toLowerCase().includes('suggested question')) {
      inQuestions = true;
      continue;
    }

    if (inQuestions) {
      if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•') || /^\d+[\.\)]\s*/.test(line)) {
        const q = line.replace(/^[-*•]\s*|^\d+[\.\)]\s*/, '').replace(/\*+/g, '').trim();
        if (q) suggestedQuestions.push(q);
      }
      continue;
    }

    // Check for title:
    // Starts with ## or # or ends with "Summary" without colon
    if (!title && (line.startsWith('#') || (!line.includes(':') && line.toLowerCase().includes('summary')))) {
      title = line.replace(/^#{1,4}\s*/, '').replace(/\*+/g, '').trim();
      continue;
    }

    // Bullet point with bold topic: - **Topic**: Detail
    const bulletMatch = line.match(/^[-*•]?\s*\*\*(.*?)\*\*[:\-]?\s*(.*)$/);
    if (bulletMatch) {
      const heading = bulletMatch[1].replace(/[:\-]$/, '').trim();
      const text = bulletMatch[2].trim();
      bullets.push({
        heading,
        text,
        topic: heading,
        detail: text,
      });
      continue;
    }

    // Generic bullet: - Detail or Topic: Detail
    if (line.startsWith('-') || line.startsWith('*') || line.startsWith('•') || /^\d+[\.\)]\s*/.test(line)) {
      const content = line.replace(/^[-*•]\s*|^\d+[\.\)]\s*/, '').trim();
      const colonIdx = content.indexOf(':');
      if (colonIdx > 0 && colonIdx < 45) {
        const heading = content.slice(0, colonIdx).replace(/\*+/g, '').trim();
        const text = content.slice(colonIdx + 1).trim();
        bullets.push({
          heading,
          text,
          topic: heading,
          detail: text,
        });
      } else {
        bullets.push({
          heading: '',
          text: content,
          topic: '',
          detail: content,
        });
      }
      continue;
    }

    // If we have no title yet and line has no colon, it could be the title
    if (!title && !line.includes(':') && line.length < 90) {
      title = line;
      continue;
    }

    // Line with colon
    if (line.includes(':')) {
      const colonIdx = line.indexOf(':');
      const heading = line.slice(0, colonIdx).replace(/^[-*•\s#]+/, '').replace(/\*+/g, '').trim();
      const text = line.slice(colonIdx + 1).trim();
      bullets.push({
        heading,
        text,
        topic: heading,
        detail: text,
      });
    } else {
      bullets.push({
        heading: '',
        text: line,
        topic: '',
        detail: line,
      });
    }
  }

  const finalTitle = title || fallbackTitle;
  const finalBullets = bullets.length > 0 ? bullets : [{ heading: 'Overview', text: cleanRaw, topic: 'Overview', detail: cleanRaw }];
  const finalQuestions = suggestedQuestions.length > 0 ? suggestedQuestions : [
    'What are the key conclusions and outcomes?',
    'What are the important dates and deadlines mentioned?',
    'What are the specific numerical details or fees involved?'
  ];

  const formattedMarkdown = `${finalTitle}\n\n` + finalBullets.map((b) => `• ${b.heading ? `**${b.heading}**: ` : ''}${b.text}`).join('\n') + (finalQuestions.length > 0 ? `\n\n### Suggested questions:\n` + finalQuestions.map(q => `- ${q}`).join('\n') : '');

  return {
    title: finalTitle,
    document_type: 'general',
    bullets: finalBullets,
    suggestedQuestions: finalQuestions,
    rawText: cleanRaw,
    formattedMarkdown,
  };
}

class AIService {
  public getCustomApiKey(): string {
    try {
      return localStorage.getItem(STORAGE_CUSTOM_KEY) || '';
    } catch {
      return '';
    }
  }

  public setCustomApiKey(key: string): void {
    try {
      if (key) {
        localStorage.setItem(STORAGE_CUSTOM_KEY, key);
      } else {
        localStorage.removeItem(STORAGE_CUSTOM_KEY);
      }
    } catch {
      // ignore
    }
  }

  public clearCustomApiKey(): void {
    try {
      localStorage.removeItem(STORAGE_CUSTOM_KEY);
    } catch {
      // ignore
    }
  }

  public getCustomModel(): string {
    try {
      const stored = localStorage.getItem(STORAGE_CUSTOM_MODEL) || '';
      if (stored === 'nex-agi/nex-n2.5-pro:free') return 'nex-agi/nex-n2.5-mini:free';
      return stored;
    } catch {
      return '';
    }
  }

  public setCustomModel(model: string): void {
    try {
      if (model) {
        localStorage.setItem(STORAGE_CUSTOM_MODEL, model);
      } else {
        localStorage.removeItem(STORAGE_CUSTOM_MODEL);
      }
    } catch {
      // ignore
    }
  }

  public clearCustomModel(): void {
    try {
      localStorage.removeItem(STORAGE_CUSTOM_MODEL);
    } catch {
      // ignore
    }
  }

  /**
   * Test current or provided API key
   */
  public async testConnection(apiKey?: string, model?: string): Promise<{ success: boolean; sampleText?: string; error?: string }> {
    try {
      const activeKey = apiKey !== undefined ? apiKey : this.getCustomApiKey();
      const activeModel = model || this.getCustomModel() || DEFAULT_MODEL;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeKey) {
        headers['X-OpenRouter-Key'] = activeKey;
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: 'Say "AI Ready" in 2 words.',
          gptModel: activeModel,
          maxOutputTokens: 20,
          apiKey: activeKey || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `Status ${response.status}: ${errorText}` };
      }

      const data = await response.json();
      if (data?.text) {
        return { success: true, sampleText: data.text.trim() };
      }
      return { success: false, error: data?.error || 'Empty response from model' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to connect to AI server' };
    }
  }

  /**
   * Core API dispatcher
   */
  public async callAPI(
    prompt: string,
    options: {
      gptModel?: string;
      maxTokens?: number;
      requireJson?: boolean;
      temperature?: number;
      featureType?: string;
      systemPrompt?: string;
    } = {}
  ): Promise<{ text: string; json?: any }> {
    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const modelToUse = options.gptModel || customModel || DEFAULT_MODEL;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (customKey) {
      headers['X-OpenRouter-Key'] = customKey;
    }

    const payload: Record<string, any> = {
      prompt,
      gptModel: modelToUse,
      maxOutputTokens: options.maxTokens || 1800,
      requireJson: Boolean(options.requireJson),
      temperature: options.temperature ?? 0.3,
      featureType: options.featureType || 'general',
    };

    if (options.systemPrompt) {
      payload.systemPrompt = options.systemPrompt;
    }
    if (customKey) {
      payload.apiKey = customKey;
    }

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Error ${response.status}`;
        try {
          const errJson = await response.json();
          errMessage = errJson.error || errJson.message || errMessage;
        } catch {
          const errText = await response.text();
          if (errText) errMessage = errText;
        }
        throw new Error(errMessage);
      }

      const data = await response.json();
      return {
        text: data?.text || '',
        json: data?.json,
      };
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : 'AI request failed';
      throw new Error(message);
    }
  }

  /**
   * Generate Summary of PDF content
   */
  public async generateSummary(text: string, options: SummaryOptions): Promise<string> {
    const { type = 'executive', language = 'en', length = 'standard' } = options;

    const langInstruction =
      language === 'hi'
        ? 'in pure Hindi (Devanagari script)'
        : language === 'hinglish'
        ? 'in conversational Hinglish (Hindi written in Roman/English alphabet, easy to understand)'
        : language === 'es'
        ? 'in Spanish'
        : language === 'fr'
        ? 'in French'
        : language === 'de'
        ? 'in German'
        : 'in English';

    const lengthGuide =
      length === 'concise'
        ? 'around 100-150 words. Very concise and direct.'
        : length === 'in_depth'
        ? 'around 500-750 words. Thorough and comprehensive.'
        : 'around 250-350 words. Balanced and structured.';

    let stylePrompt = '';
    switch (type) {
      case 'executive':
        stylePrompt = `Provide a structured Executive Summary ${langInstruction}. Include:
1. Executive Overview (Core purpose of document)
2. Critical Findings & Highlights
3. Strategic Implications & Recommendations
Length: ${lengthGuide}`;
        break;
      case 'keypoints':
        stylePrompt = `Extract the most important Key Takeaways from this document ${langInstruction}.
Format as clear, numbered or bulleted points with bold lead-ins for each point.
Focus on factual data, conclusions, and core concepts.
Length: ${lengthGuide}`;
        break;
      case 'action_items':
        stylePrompt = `Identify all Action Items, Next Steps, Decisions, Dates, and Deadlines ${langInstruction}.
Organize into:
- Action Items & Who is responsible
- Key Dates & Deadlines
- Decisions Made
Length: ${lengthGuide}`;
        break;
      case 'tldr':
        stylePrompt = `Provide a rapid "TL;DR" summary ${langInstruction}.
Start with a 1-sentence bottom-line takeaway, followed by 3-4 ultra-concise bullets explaining why it matters.
Length: ${lengthGuide}`;
        break;
      case 'detailed':
      default:
        stylePrompt = `Provide a comprehensive chapter-by-chapter or section-by-section breakdown of this document ${langInstruction}.
Highlight important terminology, methodologies, data points, and final outcomes.
Length: ${lengthGuide}`;
        break;
    }

    const maxTextChars = 14000;
    const documentExcerpt = text.slice(0, maxTextChars);

    const prompt = `${stylePrompt}

--- DOCUMENT CONTENT ---
${documentExcerpt}
--- END DOCUMENT ---

Produce the summary with clean markdown formatting (headings, bold points, bullet lists). Avoid filler phrases.`;

    const res = await this.callAPI(prompt, {
      featureType: 'summary',
      temperature: 0.2,
      maxTokens: length === 'in_depth' ? 1800 : 1000,
    });

    return res.text;
  }

  /**
   * Automatic Main Topics & Core Insights Summary (Zero friction, beautifully formatted)
   */
  public async generateMainTopicsSummary(
    text: string,
    fileName?: string
  ): Promise<StructuredSummaryData> {
    if (!text || text.trim().length === 0) {
      throw new Error("No readable text found in this document to summarize.");
    }
    const maxTextChars = 9000;
    const documentExcerpt = text.slice(0, maxTextChars);

    const prompt = `You are LakPDF AI Summary Engine.

Your job is to analyze the provided PDF content and create a
short, accurate, easy-to-scan summary.

IMPORTANT RULES:

1. Use ONLY information present in the provided document.
2. Never invent, assume, or add information that is not present.
3. Preserve important names, numbers, dates, fees, requirements,
   definitions, conditions and terminology.
4. Remove unnecessary repetition, examples that are not important,
   long explanations, decorative text and irrelevant content.
5. The result must be significantly shorter than the original document.
6. Write in simple, clear language.
7. Prefer short sentences.
8. Each summary point should normally be 1–2 sentences.
9. Do not create a point if the document does not contain useful
   information for that point.
10. Do not force a fixed number of points.
11. Generate 4–8 important points depending on document length.
12. Identify the document type before creating the summary.
13. Adapt the summary points to the document type.
14. Preserve the document's original terminology when necessary.
15. Do not provide medical, legal, financial or academic claims
    beyond what the document itself states.

DOCUMENT TYPE OPTIONS:

- academic
- syllabus
- study_notes
- research_paper
- resume
- business
- report
- legal
- policy
- form
- invoice
- manual
- article
- book_chapter
- general

OUTPUT REQUIREMENT:

Return ONLY valid JSON.

Use this exact structure:

{
  "title": "",
  "document_type": "",
  "summary": [
    {
      "heading": "",
      "text": ""
    }
  ],
  "suggested_questions": []
}

TITLE RULES:

Create a short title based on the actual document.
Do not use generic titles such as "PDF Summary" if a meaningful
document title can be identified.

SUMMARY RULES:

- Select only the most important information.
- Use 4–8 points.
- Keep heading short: 2–6 words.
- Keep text concise.
- Preserve important numbers, dates, fees and requirements.
- Combine closely related information where appropriate.
- Avoid repeating the title.

SUGGESTED QUESTIONS:

Generate 2–4 questions that a user would naturally ask after
reading the summary.

Questions must be directly answerable from the document.

Do not create questions about information that is absent.

If useful questions cannot be generated, return an empty array.

QUALITY CHECK BEFORE OUTPUT:

- Is every statement supported by the document?
- Is the summary shorter than the source?
- Are the most important facts included?
- Are numbers and requirements preserved?
- Are there any repeated points?
- Are suggested questions actually answerable from the document?
- Is the JSON valid?
Return JSON only.

--- DOCUMENT CONTENT ---
${documentExcerpt}
--- END DOCUMENT ---`;

    const res = await this.callAPI(prompt, {
      featureType: 'summary',
      temperature: 0.2,
      maxTokens: 2200,
      requireJson: true,
    });

    let data: StructuredSummaryData | null = null;

    if (res.json && typeof res.json === 'object') {
      const j = res.json;
      const title =
        String(j.title || '').trim() ||
        (fileName ? `${fileName.replace(/\.[^/.]+$/, '')} Summary` : 'Document Summary');
      const document_type = String(j.document_type || 'general').trim();

      const rawItems = Array.isArray(j.summary)
        ? j.summary
        : Array.isArray(j.bullets)
        ? j.bullets
        : [];
      const bullets: StructuredSummaryItem[] = rawItems
        .map((b: any) => {
          const heading = String(b?.heading || b?.topic || '').trim();
          const text = String(b?.text || b?.detail || '').trim();
          return {
            heading,
            text,
            topic: heading,
            detail: text,
          };
        })
        .filter((b: StructuredSummaryItem) => b.heading || b.text);

      const rawQuestions = Array.isArray(j.suggested_questions)
        ? j.suggested_questions
        : Array.isArray(j.suggestedQuestions)
        ? j.suggestedQuestions
        : [];
      const suggestedQuestions: string[] = rawQuestions
        .map((q: any) => String(q).trim())
        .filter(Boolean);

      if (bullets.length > 0) {
        const formattedMarkdown =
          `${title}\n\n` +
          bullets.map((b) => `• ${b.heading ? `**${b.heading}**: ` : ''}${b.text}`).join('\n') +
          (suggestedQuestions.length > 0
            ? `\n\n### Suggested questions:\n` + suggestedQuestions.map((q) => `- ${q}`).join('\n')
            : '');
        data = {
          title,
          document_type,
          bullets,
          suggestedQuestions,
          rawText: res.text,
          formattedMarkdown,
        };
      }
    }

    if (!data) {
      data = parseStructuredSummaryText(res.text, fileName);
    }

    return data;
  }

  /**
   * Conversational Chat with Document
   */
  public async chatWithDocument(
    contextText: string,
    history: ChatMessage[],
    userQuestion: string,
    options: QuestionOptions = {}
  ): Promise<string> {
    const { language = 'en' } = options;

    const langInstruction =
      language === 'hi'
        ? 'Respond in Hindi (Devanagari script).'
        : language === 'hinglish'
        ? 'Respond in friendly Hinglish (Hindi in Roman alphabet).'
        : 'Respond in clear English.';

    const maxContextChars = 12000;
    const excerpt = contextText.slice(0, maxContextChars);

    const formattedHistory = history
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `You are an expert document assistant. Answer the user's question based strictly on the provided document context.
${langInstruction}
If the answer cannot be found in the document, politely state that the provided document does not contain that information.

--- DOCUMENT CONTEXT ---
${excerpt}
--- END CONTEXT ---

${formattedHistory ? `Recent Conversation:\n${formattedHistory}\n` : ''}
User Question: ${userQuestion}

Accurate Answer:`;

    const res = await this.callAPI(prompt, {
      featureType: 'qa',
      temperature: 0.25,
      maxTokens: 800,
    });

    return res.text;
  }

  /**
   * Generate multiple choice questions (MCQ) from document
   */
  public async generateMCQs(text: string, options: MCQGenerationOptions): Promise<MCQItem[]> {
    const {
      count = 20,
      difficulty = 'mixed',
      topic = '',
      language = 'en',
      optionCount = 4,
      documentTitle = 'Practice Question Paper',
    } = options;

    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) headers['X-OpenRouter-Key'] = customKey;

    // 1. Try dedicated /api/mcq/generate endpoint
    try {
      const resp = await fetch(`${API_BASE_URL}/mcq/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          documentText: text,
          count,
          difficulty,
          topicFocus: topic,
          language,
          optionCount,
          documentTitle,
          gptModel: customModel,
          apiKey: customKey,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.paper?.questions && Array.isArray(data.paper.questions) && data.paper.questions.length > 0) {
          return data.paper.questions.map((q: any, idx: number) => {
            const optsObj: Record<string, string> = {};
            if (Array.isArray(q.options)) {
              q.options.forEach((o: any) => {
                optsObj[o.label] = o.text;
              });
            } else if (q.options && typeof q.options === 'object') {
              Object.assign(optsObj, q.options);
            }

            return {
              id: q.id || idx + 1,
              question: q.question,
              options: optsObj,
              optionsList: Array.isArray(q.options) ? q.options : Object.keys(optsObj).map(lbl => ({ label: lbl, text: optsObj[lbl] })),
              correctOption: q.correct_answer || q.correctOption || 'A',
              correct_answer: q.correct_answer || q.correctOption || 'A',
              explanation: q.explanation || '',
              difficulty: q.difficulty || difficulty,
              topic: q.topic || topic || 'General',
            } as MCQItem;
          });
        }
      }
    } catch {
      // Fall through to fallback
    }

    // 2. Direct fallback via callAPI
    const isHindi = language === 'hi';
    const isHinglish = language === 'hinglish';
    const langInstruction = isHindi
      ? `STRICTLY IN HINDI (देवनागरी लिपि / Hindi language).
All question text, options (A, B, C, D), and explanations must be in fluent Hindi.`
      : isHinglish
      ? `in Hinglish (Conversational mix of Hindi & English as used by Indian students). Keep technical terms in standard English.`
      : 'in English';

    const prompt = `You are a professional exam paper creator.
Generate exactly ${count} multiple choice questions (MCQs) ${langInstruction} based ONLY on the document below.
Difficulty: ${difficulty.toUpperCase()}.
Options per question: ${optionCount} (A-${optionCount === 5 ? 'E' : 'D'}).
Return ONLY valid JSON matching:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": {
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"${optionCount === 5 ? ',\n        "E": "Option E"' : ''}
      },
      "correctOption": "B",
      "explanation": "Clear factual explanation based only on the document",
      "topic": "Topic heading"
    }
  ]
}

--- DOCUMENT CONTENT ---
${text.slice(0, 13000)}
--- END DOCUMENT ---`;

    const res = await this.callAPI(prompt, {
      systemPrompt: 'You are an expert educator and exam paper creator.',
      requireJson: true,
      featureType: 'mcq',
      temperature: 0.25,
      maxTokens: Math.min(4000, Math.max(1400, count * 220)),
    });

    if (res.json) {
      const qList = Array.isArray(res.json.questions) ? res.json.questions : Array.isArray(res.json) ? res.json : [];
      if (qList.length > 0) return qList;
    }

    const textResponse = res.text || '';
    try {
      const match = textResponse.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.questions)) return parsed.questions;
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }

    throw new Error('Could not parse generated MCQs. Please try generating again or reduce question count.');
  }

  /**
   * Validate MCQs and detect duplicates
   */
  public async validateMCQs(questions: MCQItem[]): Promise<{
    validCount: number;
    duplicateCount: number;
    questions: MCQItem[];
  }> {
    const seen = new Set<string>();
    const validated: MCQItem[] = [];
    let duplicates = 0;

    for (const q of questions) {
      const key = String(q.question || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) {
        duplicates++;
      } else {
        seen.add(key);
        validated.push(q);
      }
    }

    return {
      validCount: validated.length,
      duplicateCount: duplicates,
      questions: validated,
    };
  }

  /**
   * Generate Interview Prep Kit from Resume or Role
   */
  public async generateInterviewKit(text: string, options: InterviewOptions): Promise<InterviewKit> {
    const { role = 'Professional', experienceLevel = 'mid', count = 6 } = options;

    const maxTextChars = 12000;
    const excerpt = text.slice(0, maxTextChars);

    const prompt = `You are an expert technical interviewer and hiring manager.
Generate an interview preparation kit for:
Target Role: ${role}
Experience Level: ${experienceLevel.toUpperCase()}
Total Questions: ${count}

Cover Technical, Behavioral (STAR method), and HR situational scenarios.
Keep explanations and benchmark answers concise and high impact (under 80 words per answer).

Return ONLY valid JSON matching this schema:
{
  "candidateOverview": "Brief 2-sentence summary of candidate focus",
  "keyStrengths": ["Strength 1", "Strength 2", "Strength 3"],
  "areasToScrutinize": ["Question area 1", "Question area 2"],
  "questions": [
    {
      "id": 1,
      "category": "technical",
      "difficulty": "Intermediate",
      "question": "Question text here",
      "evaluationCriteria": "What interviewer evaluates",
      "idealAnswer": "Crisp model answer",
      "starBreakdown": {
        "situation": "Context",
        "task": "Goal",
        "action": "Key action",
        "result": "Impact"
      }
    }
  ]
}

--- RESUME / DOCUMENT CONTENT ---
${excerpt}
--- END CONTENT ---`;

    const res = await this.callAPI(prompt, {
      requireJson: true,
      featureType: 'interview',
      temperature: 0.3,
      maxTokens: Math.min(3200, Math.max(1400, count * 380)),
    });

    if (res.json) {
      if (Array.isArray(res.json.questions) && res.json.questions.length > 0) {
        return res.json as InterviewKit;
      }
      if (Array.isArray(res.json) && res.json.length > 0) {
        return { questions: res.json } as InterviewKit;
      }
    }

    try {
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.questions)) {
          return parsed as InterviewKit;
        }
        if (Array.isArray(parsed)) {
          return { questions: parsed } as InterviewKit;
        }
      }
    } catch {
      // fallback
    }

    throw new Error('Failed to generate complete interview kit. Please try again or select fewer questions.');
  }

  /**
   * Evaluate user's practice answer in Mock Interview mode
   */
  public async evaluateInterviewAnswer(
    question: string,
    userAnswer: string,
    idealAnswer: string
  ): Promise<AnswerEvaluation> {
    const prompt = `You are an expert interview coach evaluating a candidate's practice response.
Question: "${question}"
Benchmark Answer: "${idealAnswer.slice(0, 800)}"
Candidate's Answer: "${userAnswer.slice(0, 2000)}"

Evaluate the candidate's answer constructively. Return ONLY a valid JSON object matching this schema:
{
  "score": 8,
  "feedback": "Overall 2-sentence summary of candidate performance",
  "strengths": ["What the candidate did well 1", "What the candidate did well 2"],
  "improvements": ["Specific improvement recommendation 1", "Specific improvement recommendation 2"],
  "modelAnswerSnippet": "A polished, crisp version of how they could say it even better"
}`;

    const res = await this.callAPI(prompt, {
      requireJson: true,
      featureType: 'interview-eval',
      temperature: 0.2,
      maxTokens: 800,
    });

    if (res.json && typeof res.json.score === 'number') {
      return res.json as AnswerEvaluation;
    }

    try {
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]) as AnswerEvaluation;
      }
    } catch {
      // fallback
    }

    return {
      score: 7,
      feedback: res.text.slice(0, 200) || 'Good attempt. Focus on providing measurable impact and clear structure.',
      strengths: ['Direct communication', 'Addressed the core question'],
      improvements: ['Include quantitative results', 'Use the STAR format (Situation, Task, Action, Result)'],
      modelAnswerSnippet: idealAnswer.slice(0, 300),
    };
  }

  /**
   * Deep Analysis of Resume facts (Role, Skills, Projects, Experience, Claims)
   */
  public async analyzeResume(
    resumeText: string,
    options: { language?: string } = {}
  ): Promise<ResumeAnalysisData> {
    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) headers['X-OpenRouter-Key'] = customKey;

    try {
      const resp = await fetch(`${API_BASE_URL}/interview/analyze-resume`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resumeText,
          language: options.language || 'en',
          gptModel: customModel,
          apiKey: customKey,
        }),
      });
 
       if (resp.ok) {
         const data = await resp.json();
         if (data?.analysis?.candidate) {
           return data.analysis as ResumeAnalysisData;
         }
       } else {
         const errJson = await resp.json().catch(() => ({}));
         console.warn('[analyzeResume] Primary endpoint returned non-OK status:', resp.status, errJson);
       }
     } catch (fetchErr) {
       console.warn('[analyzeResume] Primary endpoint fetch error:', fetchErr);
     }
 
     // Direct fallback via callAPI
     const systemPrompt = `You are a strict, objective, professional HR and technical interviewer.
 Extract factual information explicitly stated in the resume. NEVER invent skills, projects, degrees, dates, achievements, or employment history.
 Return STRICT VALID JSON matching:
 {
   "candidate": {
     "name": "Full Name or Candidate",
     "target_role": "Primary Role Detected",
     "experience_level": "Fresher" | "Junior" | "Mid-Level" | "Senior" | "Lead",
     "education": ["Education details"],
     "skills": {
       "programming_languages": [],
       "frameworks": [],
       "tools": [],
       "databases": [],
       "cloud": []
     },
     "projects": [
       { "name": "Project Name", "description": "Summary", "tech_stack": [] }
     ],
     "work_experience": [
       { "role": "Title", "company": "Company", "duration": "Dates", "responsibilities": [] }
     ],
     "internships": [],
     "certifications": [],
     "achievements": [],
     "resume_claims": []
   },
   "summary": {
     "overview": "2-sentence overview",
     "strengths": ["Strength 1", "Strength 2"],
     "areas_to_prepare": ["Key area candidate must review"]
   }
 }`;
 
     const res = await this.callAPI(
       `Analyze this resume text:\n${resumeText.slice(0, 6000)}`,
       {
         requireJson: true,
         temperature: 0.1,
         maxTokens: 1800,
         systemPrompt,
         featureType: 'interview',
       }
     );

    if (res.json?.candidate) {
      return res.json as ResumeAnalysisData;
    }
    try {
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as ResumeAnalysisData;
    } catch {
      // Fallback
    }

    throw new Error("Could not parse resume profile. Please try uploading a text-based resume.");
  }

  /**
   * Generate personalized interview preparation kit with categories, difficulty, priority, and deep dives
   */
  public async generatePersonalizedQuestions(
    resumeText: string,
    analysis: ResumeAnalysisData,
    options: {
      role?: string;
      experienceLevel?: string;
      language?: 'en' | 'hi' | 'hinglish';
      count?: number;
    } = {}
  ): Promise<InterviewPrepKit> {
    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) headers['X-OpenRouter-Key'] = customKey;

    try {
      const resp = await fetch(`${API_BASE_URL}/interview/generate-questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          resumeText,
          analysis,
          role: options.role || analysis?.candidate?.target_role,
          experienceLevel: options.experienceLevel || analysis?.candidate?.experience_level,
          language: options.language || 'en',
          gptModel: customModel,
          apiKey: customKey,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.questions && Array.isArray(data.data.questions)) {
          return data.data as InterviewPrepKit;
        }
      }
    } catch {
      // Fallback
    }

    // Direct fallback via callAPI
    const systemPrompt = `You are an elite interview coach and principal hiring engineer.
Create a personalized interview preparation curriculum for this candidate based STRICTLY on their resume and detected profile.
Rules:
1. Technical questions only cover technologies listed in profile.
2. Resume-based questions quote actual claims.
3. Every question must have difficulty ('easy'|'medium'|'advanced'), priority ('must_prepare'|'important'|'additional_practice'), why_ask, prepare array (3-5 concepts to understand), sample_answer object (answer, key_points, common_mistakes, better_approach), follow_ups array.
4. For each project, generate deep dive core questions (problem solved, tech choices, challenge).
Return STRICT VALID JSON matching:
{
  "readiness": { "technical_coverage_pct": 75, "projects_coverage_pct": 80, "hr_coverage_pct": 70, "resume_based_pct": 85, "overall_pct": 78 },
  "weak_areas": ["Area 1", "Area 2"],
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "category": "Technical",
      "difficulty": "easy",
      "priority": "must_prepare",
      "source": "technical",
      "why_ask": "Why interviewer asks this",
      "prepare": ["Concept 1", "Concept 2"],
      "sample_answer": {
        "answer": "Sample answer",
        "key_points": ["Point 1"],
        "common_mistakes": ["Mistake 1"],
        "better_approach": "Approach 1"
      },
      "follow_ups": ["Follow up 1", "Follow up 2"]
    }
  ],
  "project_deep_dives": []
}`;

    const res = await this.callAPI(
      `Candidate Profile:\n${JSON.stringify(analysis.candidate)}\nResume Excerpt:\n${resumeText.slice(0, 8000)}`,
      {
        requireJson: true,
        temperature: 0.25,
        maxTokens: 3500,
        systemPrompt,
        featureType: 'interview',
      }
    );

    if (res.json?.questions && Array.isArray(res.json.questions)) {
      return res.json as InterviewPrepKit;
    }
    try {
      const match = res.text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as InterviewPrepKit;
    } catch {
      // Fallback
    }

    throw new Error("Failed to generate personalized questions. Please try again.");
  }

  /**
   * Detailed evaluation of candidate's practice answer
   */
  public async evaluateInterviewAnswerDetailed(
    question: string,
    userAnswer: string,
    options: { whyAsk?: string; prepare?: string[]; language?: string } = {}
  ): Promise<AnswerEvaluation> {
    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) headers['X-OpenRouter-Key'] = customKey;

    try {
      const resp = await fetch(`${API_BASE_URL}/interview/evaluate-answer`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question,
          userAnswer,
          whyAsk: options.whyAsk,
          prepare: options.prepare,
          language: options.language,
          gptModel: customModel,
          apiKey: customKey,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.evaluation) {
          return data.evaluation as AnswerEvaluation;
        }
      }
    } catch {
      // Fallback
    }

    return this.evaluateInterviewAnswer(question, userAnswer, options.whyAsk || '');
  }

  /**
   * Step-by-step interactive Mock Interview Session runner
   */
  public async getMockInterviewStep(options: {
    action: 'start' | 'next';
    candidateName?: string;
    role?: string;
    currentStep?: number;
    questions?: any[];
    language?: string;
  }): Promise<{
    greeting: string;
    interviewer_note: string;
    question: string;
    category: string;
    phase: string;
  }> {
    const customKey = this.getCustomApiKey();
    const customModel = this.getCustomModel();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (customKey) headers['X-OpenRouter-Key'] = customKey;

    try {
      const resp = await fetch(`${API_BASE_URL}/interview/mock`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...options,
          gptModel: customModel,
          apiKey: customKey,
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data?.data?.question) {
          return data.data;
        }
      }
    } catch {
      // Fallback
    }

    const currentQ = options.questions?.[options.currentStep || 0];
    return {
      greeting: `Welcome ${options.candidateName || 'Candidate'}! Let's examine your experience for the ${options.role || 'Software'} position.`,
      interviewer_note: 'Structure your answer with clarity and specific examples.',
      question: currentQ?.question || 'Tell me about yourself and your primary technical skills.',
      category: currentQ?.category || 'HR',
      phase: options.action === 'start' ? 'Introduction' : 'Core Interview',
    };
  }

  /**
   * Export Full Interview Prep Kit to PDF with Candidate Profile, Questions, and Deep Dives
   */
  public async exportInterviewPrepKitToPdf(
    title: string,
    role: string,
    candidate: CandidateProfile | null,
    questions: PrepQuestionItem[],
    projectDeepDives?: ProjectDeepDive[]
  ): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;

    // Header banner
    doc.setFillColor(225, 29, 72); // Rose primary #e11d48
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LAKPDF — AI Interview Preparation Kit', margin, 12);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Target Role: ${role}  |  Generated: ${new Date().toLocaleDateString()}`, margin, 18);

    let y = 32;

    // Candidate Profile Box
    if (candidate) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`Candidate Profile: ${candidate.name || 'Candidate'} (${candidate.experience_level || 'General'})`, margin + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      const allSkills = [
        ...(candidate.skills?.programming_languages || []),
        ...(candidate.skills?.frameworks || []),
        ...(candidate.skills?.databases || []),
      ].slice(0, 8).join(', ');

      const projects = (candidate.projects || []).map(p => p.name).slice(0, 4).join(', ');

      doc.text(`Core Skills: ${allSkills || 'Not specified'}`, margin + 4, y + 12);
      doc.text(`Key Projects: ${projects || 'Not specified'}`, margin + 4, y + 18);

      y += 30;
    }

    // Questions Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Personalized Interview Questions', margin, y);
    y += 6;

    questions.forEach((q, idx) => {
      if (y > pageHeight - 35) {
        doc.addPage();
        y = 18;
      }

      // Priority tag + Category
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const priorityLabel = q.priority === 'must_prepare' ? '[MUST PREPARE]' : q.priority === 'important' ? '[IMPORTANT]' : '[PRACTICE]';
      doc.setTextColor(q.priority === 'must_prepare' ? 225 : 71, q.priority === 'must_prepare' ? 29 : 85, q.priority === 'must_prepare' ? 72 : 105);
      doc.text(`${priorityLabel} [${q.category.toUpperCase()} - ${q.difficulty.toUpperCase()}]`, margin, y);
      y += 4.5;

      // Question text
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      const qLines = doc.splitTextToSize(`Q${idx + 1}. ${q.question}`, contentWidth);
      doc.text(qLines, margin, y);
      y += qLines.length * 4.8 + 2;

      // Why ask
      if (q.why_ask) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        const whyLines = doc.splitTextToSize(`Why they ask: ${q.why_ask}`, contentWidth);
        doc.text(whyLines, margin, y);
        y += whyLines.length * 4 + 1.5;
      }

      // What to prepare checklist
      if (q.prepare && q.prepare.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const prepStr = `Prepare concepts: • ${q.prepare.join('  • ')}`;
        const prepLines = doc.splitTextToSize(prepStr, contentWidth);
        doc.text(prepLines, margin, y);
        y += prepLines.length * 3.8 + 2;
      }

      // Sample answer if available
      if (q.sample_answer?.answer) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        const ansLines = doc.splitTextToSize(`Sample delivery: "${q.sample_answer.answer}"`, contentWidth);
        doc.text(ansLines, margin, y);
        y += ansLines.length * 4 + 4;
      } else {
        y += 3;
      }

      // Divider line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4.5;
    });

    // Project Deep-Dives
    if (projectDeepDives && projectDeepDives.length > 0) {
      if (y > pageHeight - 45) {
        doc.addPage();
        y = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text('Project Deep-Dive Questions', margin, y);
      y += 6;

      projectDeepDives.forEach((p) => {
        if (y > pageHeight - 35) {
          doc.addPage();
          y = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(225, 29, 72);
        doc.text(`Project: ${p.project_name}`, margin, y);
        y += 5;

        p.core_questions.forEach((cq, cIdx) => {
          if (y > pageHeight - 25) {
            doc.addPage();
            y = 18;
          }
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          const cqLines = doc.splitTextToSize(`${cIdx + 1}. ${cq.question}`, contentWidth);
          doc.text(cqLines, margin, y);
          y += cqLines.length * 4.2 + 2;
        });

        y += 4;
      });
    }

    doc.save(`${(title || role).toLowerCase().replace(/[^a-z0-9]/g, '-')}-interview-prep.pdf`);
  }

  /**
   * Export Summary as a formatted PDF using jsPDF
   */
  /**
   * Export Summary as a formatted PDF using jsPDF (with Hindi Devanagari support)
   */
  public async exportSummaryToPdf(title: string, summaryText: string, sourceName?: string): Promise<void> {
    const isHindi = /[\u0900-\u097F]/.test(title + summaryText + (sourceName || ''));

    if (isHindi && typeof document !== 'undefined') {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.top = '0';
      container.style.width = '794px';
      container.style.background = '#f8fafc';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.fontFamily = "'Noto Sans Devanagari', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

      const cleanLines = summaryText
        .replace(/###\s*/g, '\n')
        .replace(/##\s*/g, '\n')
        .replace(/#\s*/g, '\n')
        .replace(/\*\*/g, '')
        .split('\n')
        .filter((l) => l.trim().length > 0);

      const pageHtml = `
        <div class="summary-pdf-page" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative; font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;">
          <div style="background: #2563eb; color: #ffffff; padding: 18px 24px; border-radius: 12px; margin-bottom: 24px;">
            <h1 style="margin: 0; font-size: 20px; font-weight: bold;">LAK PDF — AI Document Summary (दस्तावेज़ सारांश)</h1>
            <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} ${sourceName ? `| स्रोत: ${sourceName}` : ''}</p>
          </div>

          <div style="border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px;">
            <h2 style="margin: 0; font-size: 17px; font-weight: bold; color: #1e293b;">${title}</h2>
          </div>

          <div style="font-size: 13.5px; line-height: 1.8; color: #334155;">
            ${cleanLines.map((line) => `<p style="margin: 0 0 12px 0; text-align: justify;">${line}</p>`).join('')}
          </div>

          <div style="position: absolute; bottom: 25px; left: 40px; right: 40px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
            <span>LAK PDF — lakpdf.com</span>
            <span>Document Summary</span>
          </div>
        </div>
      `;

      container.innerHTML = pageHtml;
      document.body.appendChild(container);

      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }

        const pageEl = container.querySelector('.summary-pdf-page') as HTMLElement;
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        doc.save(`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-summary.pdf`);
        return;
      } finally {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;

    // Header bar
    doc.setFillColor(37, 99, 235); // primary-600
    doc.rect(0, 0, pageWidth, 24, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('LAK PDF — AI Document Summary', margin, 15);

    // Meta details
    doc.setTextColor(71, 85, 105); // slate-600
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let y = 34;

    if (sourceName) {
      doc.text(`Source Document: ${sourceName}`, margin, y);
      y += 6;
    }
    doc.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, y);
    y += 10;

    // Title
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, y);
    y += 8;

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Summary Content (wrapped text)
    doc.setTextColor(30, 41, 59); // slate-800
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'normal');

    const cleanLines = summaryText
      .replace(/###\s*/g, '\n')
      .replace(/##\s*/g, '\n')
      .replace(/#\s*/g, '\n')
      .replace(/\*\*/g, '')
      .split('\n');

    for (const rawLine of cleanLines) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }

      const trimmed = rawLine.trim();
      if (!trimmed) {
        y += 4;
        continue;
      }

      const wrapped = doc.splitTextToSize(trimmed, contentWidth);
      for (const line of wrapped) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 5.5;
      }
    }

    doc.save(`${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-summary.pdf`);
  }

  /**
   * Generates MCQ PDF with pristine Hindi (Devanagari) & English support via HTML canvas
   */
  private async createMcqPdfViaHtml(
    title: string,
    questions: MCQItem[],
    includeAnswersAtEnd: boolean = true,
    options?: McqPdfExportOptions
  ): Promise<any> {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const institution = options?.schoolName || 'EXAMINATION / CLASS TEST';
    const isAnswersOnly = Boolean(options?.answersOnly);
    const isHindiDoc = /[\u0900-\u097F]/.test(
      title + institution + questions.map((q) => q.question + q.explanation + Object.values(q.options).join('')).join('')
    );

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px';
    container.style.background = '#ffffff';
    container.style.padding = '0';
    container.style.margin = '0';
    container.style.fontFamily = "'Noto Sans Devanagari', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif";

    // Escape helper
    const esc = (s: string) =>
      String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    let pagesHtml = '';

    if (isAnswersOnly) {
      // Teacher Solution Key Mode
      const itemsPerPage = 5;
      const totalPages = Math.ceil(questions.length / itemsPerPage);

      for (let p = 0; p < totalPages; p++) {
        const pageQuestions = questions.slice(p * itemsPerPage, (p + 1) * itemsPerPage);
        pagesHtml += `
          <div class="mcq-pdf-page" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative; font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;">
            <!-- Header -->
            <div style="background: #0f172a; border-bottom: 3px solid #f59e0b; padding: 18px 24px; border-radius: 12px; margin-bottom: 24px;">
              <div style="color: #f59e0b; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">
                ${isHindiDoc ? 'शिक्षक उत्तरमाला एवं विस्तृत हल (TEACHER MARKING SCHEME)' : 'TEACHER MARKING SCHEME & SOLUTION KEY'}
              </div>
              <h1 style="color: #ffffff; margin: 4px 0 0 0; font-size: 18px; font-weight: bold;">
                ${esc(title)} — ${isHindiDoc ? 'उत्तरमाला' : 'Answer Key'}
              </h1>
            </div>

            ${
              p === 0
                ? `
            <!-- Quick Answer Key Grid -->
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin-bottom: 24px;">
              <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">
                ${isHindiDoc ? 'त्वरित उत्तर तालिका (Quick Answer Key):' : 'Quick Answer Key (All Questions):'}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${questions
                  .map(
                    (q, idx) => `
                  <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 4px 10px; font-size: 11.5px; font-weight: bold; color: #334155;">
                    Q${idx + 1}: <span style="color: #059669;">(${q.correctOption})</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
            `
                : ''
            }

            <!-- Detailed Solutions -->
            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 12px;">
              ${isHindiDoc ? 'विस्तृत व्याख्या एवं हल:' : 'Detailed Explanations & Model Solutions:'}
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${pageQuestions
                .map((q, idx) => {
                  const globalIdx = p * itemsPerPage + idx;
                  const correctText = q.options[q.correctOption] || '';
                  return `
                  <div style="border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 12px 16px;">
                    <div style="font-size: 12.5px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">
                      Q${globalIdx + 1}. ${isHindiDoc ? 'सही उत्तर:' : 'Correct Answer:'} <span style="color: #059669;">(${q.correctOption}) ${esc(correctText)}</span>
                    </div>
                    ${
                      q.explanation
                        ? `
                      <div style="font-size: 12px; color: #475569; line-height: 1.5; background: #f8fafc; border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 0 6px 6px 0; margin-top: 4px;">
                        <strong>${isHindiDoc ? 'स्पष्टीकरण:' : 'Explanation:'}</strong> ${esc(q.explanation)}
                      </div>
                    `
                        : ''
                    }
                  </div>
                `;
                })
                .join('')}
            </div>

            <!-- Footer -->
            <div style="position: absolute; bottom: 25px; left: 40px; right: 40px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
              <span>LAK PDF — lakpdf.com (Teacher Solution Sheet)</span>
              <span>Page ${p + 1} of ${totalPages}</span>
            </div>
          </div>
        `;
      }
    } else {
      // Standard Classroom Exam Paper
      // Page 1: Header + Student info + 3 questions
      // Following pages: 4 questions per page
      // Solution pages at the end
      const qPage1Count = options?.studentHeader !== false ? 3 : 4;
      const qPerPage = 4;

      const questionPages: MCQItem[][] = [];
      questionPages.push(questions.slice(0, qPage1Count));

      let remaining = questions.slice(qPage1Count);
      while (remaining.length > 0) {
        questionPages.push(remaining.slice(0, qPerPage));
        remaining = remaining.slice(qPerPage);
      }

      let answerPages: MCQItem[][] = [];
      if (includeAnswersAtEnd && questions.length > 0) {
        const aPerPage = 4;
        let remAns = [...questions];
        while (remAns.length > 0) {
          answerPages.push(remAns.slice(0, aPerPage));
          remAns = remAns.slice(aPerPage);
        }
      }

      const totalExamPages = questionPages.length + answerPages.length;
      let globalQIndex = 0;

      // Render Question Pages
      questionPages.forEach((pageQs, pIdx) => {
        const isFirstPage = pIdx === 0;
        pagesHtml += `
          <div class="mcq-pdf-page" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative; font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;">
            ${
              isFirstPage
                ? `
            <!-- Top Exam Banner -->
            <div style="background: #0f172a; border-bottom: 3px solid #f59e0b; padding: 18px 24px; border-radius: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="color: #f59e0b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px;">
                  ${esc(institution)}
                </div>
                <h1 style="color: #ffffff; margin: 0; font-size: 19px; font-weight: bold; letter-spacing: -0.01em;">
                  ${esc(title)}
                </h1>
                <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">
                  ${isHindiDoc ? 'वस्तुनिष्ठ प्रश्न पत्र' : 'Multiple Choice Examination Paper'} • ${questions.length} ${isHindiDoc ? 'प्रश्न' : 'Questions'}
                </p>
              </div>
              <div style="text-align: right;">
                <span style="background: #f59e0b; color: #0f172a; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 6px; text-transform: uppercase;">
                  ${isHindiDoc ? 'कक्षा परीक्षा' : 'Classroom Exam'}
                </span>
              </div>
            </div>

            ${
              options?.studentHeader !== false
                ? `
            <!-- Student Information Box -->
            <div style="border: 1.5px solid #cbd5e1; background: #f8fafc; border-radius: 10px; padding: 12px 18px; margin-bottom: 16px; font-size: 12px; color: #334155;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <strong>${isHindiDoc ? 'विद्यार्थी का नाम (Student Name):' : 'Student Name:'}</strong> __________________________
                </div>
                <div>
                  <strong>${isHindiDoc ? 'अनुक्रमांक (Roll No):' : 'Roll Number:'}</strong> ______________
                </div>
                <div>
                  <strong>${isHindiDoc ? 'कक्षा / वर्ग (Class):' : 'Class / Batch:'}</strong> __________________________
                </div>
                <div>
                  <strong>${isHindiDoc ? 'दिनांक (Date):' : 'Date:'}</strong> ${new Date().toLocaleDateString()} &nbsp;&nbsp;&nbsp; <strong>${isHindiDoc ? 'प्राप्तांक:' : 'Marks:'}</strong> ___ / ${questions.length}
                </div>
              </div>
            </div>
            `
                : ''
            }

            <!-- Instructions Bar -->
            <div style="background: #f1f5f9; border-radius: 8px; padding: 8px 14px; margin-bottom: 18px; font-size: 11px; color: #475569; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong>${isHindiDoc ? 'निर्देश:' : 'Instructions:'}</strong> ${
                  isHindiDoc
                    ? 'प्रत्येक प्रश्न के लिए सही विकल्प चुनें और दाईं ओर बने बॉक्स [  ] में सही (✓) का निशान लगाएं।'
                    : 'Choose the single best option. Put a tick mark [✓] in the box beside your selected option.'
                }
              </div>
              <div style="font-weight: bold; color: #0f172a; white-space: nowrap; margin-left: 12px;">
                ${questions.length} Qs • ${questions.length} ${isHindiDoc ? 'अंक' : 'Marks'}
              </div>
            </div>

            <!-- Section A Heading -->
            <div style="font-size: 13.5px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 16px; text-transform: uppercase;">
              ${isHindiDoc ? "खण्ड 'अ': बहुविकल्पीय प्रश्न (SECTION A: MCQs)" : 'SECTION A: MULTIPLE CHOICE QUESTIONS'}
            </div>
            `
                : `
            <!-- Secondary Header for subsequent pages -->
            <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
              <span style="font-weight: bold; color: #1e293b;">${esc(title)}</span>
              <span>${isHindiDoc ? "खण्ड 'अ' (जारी...)" : 'SECTION A (Continued)'}</span>
            </div>
            `
            }

            <!-- Questions -->
            <div style="display: flex; flex-direction: column; gap: 18px;">
              ${pageQs
                .map((q) => {
                  globalQIndex++;
                  const currentQNum = globalQIndex;
                  return `
                  <div style="border-bottom: 1px solid #f1f5f9; padding-bottom: 14px;">
                    <!-- Question Title -->
                    <div style="font-size: 13.5px; font-weight: 600; color: #0f172a; line-height: 1.45; margin-bottom: 10px;">
                      <span style="color: #b45309; font-weight: bold; margin-right: 4px;">Q${currentQNum}.</span> ${esc(q.question)}
                    </div>

                    <!-- 4 Options with Right-Aligned Tick Brackets -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding-left: 16px;">
                      ${(['A', 'B', 'C', 'D'] as const)
                        .map(
                          (key) => `
                        <div style="border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 7px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12.5px;">
                          <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
                            <span style="background: #f1f5f9; color: #475569; font-weight: bold; font-size: 11px; border-radius: 4px; padding: 2px 6px; shrink: 0;">
                              ${key}
                            </span>
                            <span style="color: #334155; line-height: 1.35; word-break: break-word;">
                              ${esc(q.options[key] || '')}
                            </span>
                          </div>
                          <!-- Clean Right Aligned Tick Box -->
                          <div style="border: 1.5px solid #64748b; border-radius: 4px; padding: 2px 10px; font-family: monospace; font-size: 11px; color: #94a3b8; font-weight: bold; background: #f8fafc; flex-shrink: 0;">
                            [&nbsp;&nbsp;&nbsp;&nbsp;]
                          </div>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `;
                })
                .join('')}
            </div>

            <!-- Page Footer -->
            <div style="position: absolute; bottom: 25px; left: 40px; right: 40px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
              <span>LAK PDF — lakpdf.com (Classroom Exam Engine)</span>
              <span>Page ${pIdx + 1} of ${totalExamPages}</span>
            </div>
          </div>
        `;
      });

      // Render Answer Key Pages (Section B)
      let ansGlobalIdx = 0;
      answerPages.forEach((pageAns, aIdx) => {
        const pageNumber = questionPages.length + aIdx + 1;
        const isFirstAnsPage = aIdx === 0;

        pagesHtml += `
          <div class="mcq-pdf-page" style="width: 794px; min-height: 1123px; padding: 40px; box-sizing: border-box; background: #ffffff; color: #0f172a; position: relative; font-family: 'Noto Sans Devanagari', 'Inter', sans-serif;">
            ${
              isFirstAnsPage
                ? `
            <!-- Section B Banner -->
            <div style="background: #fef3c7; border: 1.5px solid #fde68a; border-radius: 10px; padding: 14px 20px; margin-bottom: 20px;">
              <div style="color: #92400e; font-size: 11px; font-weight: bold; text-transform: uppercase;">
                ${isHindiDoc ? 'शिक्षक एवं स्व-मूल्यांकन हेतु' : 'TEACHER & SELF-CHECK SECTION'}
              </div>
              <h2 style="margin: 2px 0 0 0; font-size: 16px; font-weight: bold; color: #78350f;">
                ${
                  isHindiDoc
                    ? "खण्ड 'ब': उत्तरमाला एवं विस्तृत हल (SECTION B: ANSWER KEY & SOLUTIONS)"
                    : 'SECTION B: ANSWER KEY & DETAILED SOLUTIONS'
                }
              </h2>
            </div>

            <!-- Quick Answer Key Summary -->
            <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;">
              <div style="font-size: 12px; font-weight: bold; color: #1e293b; margin-bottom: 8px;">
                ${isHindiDoc ? 'त्वरित उत्तर तालिका (Quick Answer Key):' : 'Quick Answer Key:'}
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${questions
                  .map(
                    (q, idx) => `
                  <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: bold; color: #334155;">
                    Q${idx + 1}: <span style="color: #059669;">(${q.correctOption})</span>
                  </div>
                `
                  )
                  .join('')}
              </div>
            </div>
            `
                : `
            <!-- Subsequent Answer Page Header -->
            <div style="border-bottom: 1.5px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #64748b;">
              <span style="font-weight: bold; color: #1e293b;">${esc(title)} — ${isHindiDoc ? 'उत्तरमाला' : 'Answer Key'}</span>
              <span>${isHindiDoc ? "खण्ड 'ब' (जारी...)" : 'SECTION B (Continued)'}</span>
            </div>
            `
            }

            <div style="font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 12px;">
              ${isHindiDoc ? 'विस्तृत व्याख्या एवं हल:' : 'Detailed Solutions (Line by Line):'}
            </div>

            <div style="display: flex; flex-direction: column; gap: 14px;">
              ${pageAns
                .map((q) => {
                  ansGlobalIdx++;
                  const currentAnsNum = ansGlobalIdx;
                  const correctText = q.options[q.correctOption] || '';
                  return `
                  <div style="border: 1px solid #e2e8f0; background: #ffffff; border-radius: 8px; padding: 12px 16px;">
                    <div style="font-size: 12.5px; font-weight: bold; color: #0f172a; margin-bottom: 4px;">
                      Q${currentAnsNum}. ${isHindiDoc ? 'सही विकल्प:' : 'Correct Answer:'} <span style="color: #059669;">(${q.correctOption}) ${esc(correctText)}</span>
                    </div>
                    ${
                      q.explanation
                        ? `
                      <div style="font-size: 12px; color: #475569; line-height: 1.5; background: #f8fafc; border-left: 3px solid #f59e0b; padding: 6px 10px; border-radius: 0 6px 6px 0; margin-top: 4px;">
                        <strong>${isHindiDoc ? 'स्पष्टीकरण:' : 'Explanation:'}</strong> ${esc(q.explanation)}
                      </div>
                    `
                        : ''
                    }
                  </div>
                `;
                })
                .join('')}
            </div>

            <!-- Page Footer -->
            <div style="position: absolute; bottom: 25px; left: 40px; right: 40px; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8;">
              <span>LAK PDF — lakpdf.com (Teacher Solution Sheet)</span>
              <span>Page ${pageNumber} of ${totalExamPages}</span>
            </div>
          </div>
        `;
      });
    }

    container.innerHTML = pagesHtml;
    document.body.appendChild(container);

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    try {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const pageElements = container.querySelectorAll<HTMLElement>('.mcq-pdf-page');
      for (let i = 0; i < pageElements.length; i++) {
        const pageEl = pageElements[i];
        const canvas = await html2canvas(pageEl, {
          scale: 2, // High resolution crisp 300 DPI
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) {
          doc.addPage();
        }
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      return doc;
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  }

  /**
   * Creates a structured jsPDF document for MCQ Exam Paper:
   * 1. Questions & Options (A, B, C, D) in Section A
   * 2. Complete Answer Key & Line-by-line Explanations at the end in Section B
   */
  public async createMcqPdfDocument(
    title: string,
    questions: MCQItem[],
    includeAnswersAtEnd: boolean = true,
    options?: McqPdfExportOptions
  ): Promise<any> {
    const institution = options?.schoolName || '';
    const isHindiDoc =
      options?.language === 'hi' ||
      options?.language === 'hinglish' ||
      /[\u0900-\u097F]/.test(
        title + institution + questions.map((q) => q.question + q.explanation + Object.values(q.options).join('')).join('')
      );

    // If Hindi or Hinglish text is present or in browser environment, use pristine HTML-to-canvas PDF renderer
    if ((isHindiDoc || typeof document !== 'undefined') && typeof document !== 'undefined') {
      return this.createMcqPdfViaHtml(title, questions, includeAnswersAtEnd, options);
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;
    const bottomMargin = 22;

    let y = 0;

    // Teacher Answer Key Only Mode
    if (options?.answersOnly) {
      // Header Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 28, 'F');
      doc.setFillColor(245, 158, 11); // amber-500
      doc.rect(0, 28, pageWidth, 2, 'F');

      doc.setTextColor(245, 158, 11);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TEACHER MARKING SCHEME & SOLUTION KEY', margin, 11);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      const cleanTitle = title.length > 55 ? title.substring(0, 53) + '...' : title;
      doc.text(`${cleanTitle} — Answer Key`, margin, 20);

      y = 38;

      // Quick Answer Key Grid
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Quick Answer Key (All Questions):', margin, y);
      y += 5;

      const itemsPerRow = Math.min(5, Math.max(1, questions.length));
      const colWidth = contentWidth / itemsPerRow;
      const numRows = Math.ceil(questions.length / itemsPerRow);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, numRows * 8 + 4, 2, 2, 'FD');

      questions.forEach((q, idx) => {
        const colIdx = idx % itemsPerRow;
        const rIdx = Math.floor(idx / itemsPerRow);
        const curX = margin + colIdx * colWidth + 4;
        const curY = y + 5.5 + rIdx * 8;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`Q${idx + 1}: `, curX, curY);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129);
        doc.text(`(${q.correctOption})`, curX + 8.5, curY);
      });

      y += numRows * 8 + 12;

      // Line by line detailed explanations
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('Detailed Explanations & Model Solutions:', margin, y);
      y += 6;

      questions.forEach((q, idx) => {
        if (y + 25 > pageHeight - bottomMargin) {
          doc.addPage();
          y = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(15, 23, 42);
        const optText = q.options[q.correctOption] ? ` — ${q.options[q.correctOption]}` : '';
        const ansTitle = `Q${idx + 1}. Correct Answer: Option (${q.correctOption})${optText}`;
        const wrappedAns = doc.splitTextToSize(ansTitle, contentWidth);
        doc.text(wrappedAns, margin, y);
        y += wrappedAns.length * 4.2 + 1;

        if (q.explanation) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          const expText = `Explanation: ${q.explanation}`;
          const wrappedExp = doc.splitTextToSize(expText, contentWidth - 4);
          doc.text(wrappedExp, margin + 4, y);
          y += wrappedExp.length * 4 + 3;
        } else {
          y += 2.5;
        }
      });

      // Footers
      const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        doc.text('LAK PDF — lakpdf.com (Teacher Solution Sheet)', margin, pageHeight - 7);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
      }

      return doc;
    }

    // Standard / Classroom Exam Paper Header
    const defaultInstitution = options?.schoolName || 'EXAMINATION / CLASS TEST';

    // Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, pageWidth, 28, 'F');

    // Amber decorative bottom stripe
    doc.setFillColor(245, 158, 11); // amber-500
    doc.rect(0, 28, pageWidth, 2, 'F');

    // School / Exam Header
    doc.setTextColor(245, 158, 11);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(defaultInstitution.toUpperCase(), margin, 11);

    // Subject / Exam Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    const cleanTitle = title.length > 55 ? title.substring(0, 53) + '...' : title;
    doc.text(cleanTitle, margin, 20);

    y = 36;

    // Student Information Header Box
    if (options?.studentHeader !== false) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      doc.text('Student Name: _________________________________', margin + 4, y + 6);
      doc.text('Roll No: __________________', margin + 112, y + 6);

      doc.text('Class / Batch: _________________________________', margin + 4, y + 14);
      doc.text(`Date: ${new Date().toLocaleDateString()}    Marks: ___ / ${questions.length}`, margin + 112, y + 14);

      y += 26;
    }

    // Exam Info & Instructions Strip
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 11, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Questions: ${questions.length}  |  Max Marks: ${questions.length}  |  Time Allowed: ${Math.max(5, Math.ceil(questions.length * 1.5))} Mins`, margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Instructions: Choose the single best option. Put a tick mark [✓] in the box beside your selected option.', margin + 4, y + 9);

    y += 17;

    // Section A Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('SECTION A: MULTIPLE CHOICE QUESTIONS', margin, y);
    y += 6;

    // Render Questions & Options (A, B, C, D) with Tick Boxes [ ]
    questions.forEach((q, idx) => {
      // Check if question header fits
      if (y + 36 > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const qNumText = `Q${idx + 1}. `;
      const wrappedQ = doc.splitTextToSize(`${qNumText}${q.question}`, contentWidth);
      doc.text(wrappedQ, margin, y);
      y += wrappedQ.length * 4.6 + 2;

      const optKeys = q.options.E ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'];
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      optKeys.forEach((key) => {
        if (!q.options[key]) return;
        if (y + 9 > pageHeight - bottomMargin) {
          doc.addPage();
          y = 20;
        }

        // Option text on the LEFT
        const optText = `   (${key})  ${q.options[key] || ''}`;
        const maxTextWidth = contentWidth - 22; // reserve right side space for the bracket
        const wrappedOpt = doc.splitTextToSize(optText, maxTextWidth);
        doc.text(wrappedOpt, margin, y);

        // Tick bracket box cleanly positioned on the RIGHT side of the answer
        const rightBoxX = margin + contentWidth - 14;
        const boxY = y - 3.3;

        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.35);
        doc.roundedRect(rightBoxX, boxY, 12, 4.6, 0.8, 0.8, 'S');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('[       ]', rightBoxX + 1.2, y);

        // Reset text styling for next item
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);

        y += Math.max(wrappedOpt.length * 4.3, 5.2);
      });

      y += 4; // spacing between questions
    });

    // SECTION B: ANSWER KEY (At the end on a fresh page)
    const shouldIncludeAnswerKey = includeAnswersAtEnd && options?.includeAnswerKey !== false;
    const shouldIncludeExplanations = Boolean(options?.includeExplanations);

    if ((shouldIncludeAnswerKey || shouldIncludeExplanations) && questions.length > 0) {
      // Clean page break so answer sheet starts on a separate page
      doc.addPage();
      y = 20;

      // Section B Banner
      doc.setFillColor(254, 243, 199); // amber-100
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(180, 83, 9); // amber-700
      doc.text(
        shouldIncludeExplanations
          ? 'SECTION B: ANSWER KEY & DETAILED EXPLANATIONS'
          : 'SECTION B: OFFICIAL ANSWER KEY',
        margin + 5,
        y + 8
      );
      y += 18;

      if (shouldIncludeAnswerKey) {
        // Quick Answer Key Summary Grid
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('Answer Key Matrix:', margin, y);
        y += 4.5;

        const itemsPerRow = Math.min(5, Math.max(1, questions.length));
        const colWidth = contentWidth / itemsPerRow;
        const numRows = Math.ceil(questions.length / itemsPerRow);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, numRows * 8 + 4, 2, 2, 'FD');

        questions.forEach((q, idx) => {
          const colIdx = idx % itemsPerRow;
          const rIdx = Math.floor(idx / itemsPerRow);
          const curX = margin + colIdx * colWidth + 4;
          const curY = y + 5.5 + rIdx * 8;

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(71, 85, 105);
          doc.text(`Q${idx + 1}: `, curX, curY);

          doc.setFont('helvetica', 'bold');
          doc.setTextColor(16, 185, 129); // emerald
          doc.text(`(${q.correctOption})`, curX + 8.5, curY);
        });

        y += numRows * 8 + 12;
      }

      // Detailed Solutions line by line (Only when enabled)
      if (shouldIncludeExplanations) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text('Detailed Explanations & Reference Solutions:', margin, y);
        y += 5.5;

        questions.forEach((q, idx) => {
          if (y + 24 > pageHeight - bottomMargin) {
            doc.addPage();
            y = 20;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          const optText = q.options[q.correctOption] ? ` — ${q.options[q.correctOption]}` : '';
          const ansTitle = `Q${idx + 1}. Correct Answer: Option (${q.correctOption})${optText}`;
          const wrappedAns = doc.splitTextToSize(ansTitle, contentWidth);
          doc.text(wrappedAns, margin, y);
          y += wrappedAns.length * 4.2 + 1;

          if (q.explanation) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            const expText = `Explanation: ${q.explanation}`;
            const wrappedExp = doc.splitTextToSize(expText, contentWidth - 4);
            doc.text(wrappedExp, margin + 4, y);
            y += wrappedExp.length * 4 + 3;
          } else {
            y += 2.5;
          }
        });
      }
    }

    // Footers
    const totalPages = (doc as any).getNumberOfPages ? (doc as any).getNumberOfPages() : (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

      doc.text('LAK PDF — lakpdf.com (Classroom Exam Engine)', margin, pageHeight - 7);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 18, pageHeight - 7);
    }

    return doc;
  }

  /**
   * Export MCQ Paper to PDF file download
   */
  public async exportMcqPaperToPdf(
    title: string,
    questions: MCQItem[],
    includeAnswers: boolean = true,
    options?: McqPdfExportOptions
  ): Promise<void> {
    const doc = await this.createMcqPdfDocument(title, questions, includeAnswers, options);
    const filePrefix = includeAnswers ? 'exam-with-answers' : 'student-question-paper';
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    doc.save(`${safeTitle || 'mcq-exam'}-${filePrefix}.pdf`);
  }

  /**
   * Export Teacher Answer Key Only to PDF
   */
  public async exportTeacherAnswerKeyPdf(
    title: string,
    questions: MCQItem[],
    options?: McqPdfExportOptions
  ): Promise<void> {
    const doc = await this.createMcqPdfDocument(title, questions, true, { ...options, answersOnly: true });
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    doc.save(`${safeTitle || 'mcq-exam'}-teacher-answer-key.pdf`);
  }

  /**
   * Generate MCQ PDF as a downloadable Blob URL
   */
  public async generateMcqPdfBlob(
    title: string,
    questions: MCQItem[],
    includeAnswers: boolean = true,
    options?: McqPdfExportOptions
  ): Promise<{ blob: Blob; url: string; filename: string }> {
    const doc = await this.createMcqPdfDocument(title, questions, includeAnswers, options);
    const blob = doc.output('blob') as Blob;
    const url = URL.createObjectURL(blob);
    const filePrefix = includeAnswers ? 'exam-with-answers' : 'student-question-paper';
    const safeTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const filename = `${safeTitle || 'mcq-exam'}-${filePrefix}.pdf`;
    return { blob, url, filename };
  }

  /**
   * Export Interview Kit to PDF
   */
  public async exportInterviewKitToPdf(title: string, role: string, kit: InterviewKit): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    // Header
    doc.setFillColor(16, 185, 129); // emerald-600
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('LAK PDF — AI Interview Preparation Kit', margin, 14);

    let y = 32;
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.text(`Role: ${role}`, margin, y);
    y += 6;

    if (kit.candidateOverview) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(71, 85, 105);
      const wrappedOverview = doc.splitTextToSize(kit.candidateOverview, contentWidth);
      doc.text(wrappedOverview, margin, y);
      y += wrappedOverview.length * 5 + 4;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Questions
    kit.questions.forEach((item, idx) => {
      if (y > 245) {
        doc.addPage();
        y = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      const qText = `${idx + 1}. [${item.category.toUpperCase()} - ${item.difficulty}] ${item.question}`;
      const wrappedQ = doc.splitTextToSize(qText, contentWidth);
      doc.text(wrappedQ, margin, y);
      y += wrappedQ.length * 5.5 + 2;

      // Evaluation criteria
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const criteria = `Interviewer evaluates: ${item.evaluationCriteria}`;
      const wrappedCriteria = doc.splitTextToSize(criteria, contentWidth);
      doc.text(wrappedCriteria, margin, y);
      y += wrappedCriteria.length * 4.5 + 2;

      // Ideal Answer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const answer = `Benchmark Answer: ${item.idealAnswer}`;
      const wrappedAnswer = doc.splitTextToSize(answer, contentWidth);
      doc.text(wrappedAnswer, margin, y);
      y += wrappedAnswer.length * 4.8 + 6;
    });

    doc.save(`${role.toLowerCase().replace(/[^a-z0-9]/g, '-')}-interview-kit.pdf`);
  }
}

export const aiService = new AIService();
