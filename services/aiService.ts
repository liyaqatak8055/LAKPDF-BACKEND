import { API_BASE_URL } from "../utils/apiBase";

const MODEL = import.meta.env.VITE_AI_MODEL || 'openai/gpt-4-turbo';
const API_URL = `${API_BASE_URL}/ask`;

export interface SummaryOptions {
    type: 'short' | 'paragraph' | 'executive' | 'keypoints';
    language?: 'en' | 'hi';
    maxTokens?: number;
}

export interface QuestionOptions {
    language?: 'en' | 'hi';
    includePageNumbers?: boolean;
}

export interface EntityType {
    type: 'person' | 'organization' | 'date' | 'money' | 'location';
    value: string;
    context?: string;
    count?: number;
}

export interface SemanticSearchResult {
    chunk: string;
    relevance: number;
    pageNumber?: number;
}

class AIService {
    private async callAPI(messages: any[], maxTokens: number = 1000): Promise<string> {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            body: JSON.stringify({
                prompt: messages.map((m) => `${m.role}: ${m.content}`).join('\n\n'),
                gptModel: MODEL,
                maxOutputTokens: maxTokens,
            }),
        });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`AI API error: ${error || response.status}`);
            }

            const data = await response.json();
            return data?.text || '';
        } catch (error: any) {
            const message = typeof error?.message === 'string' ? error.message : 'AI API request failed';
            throw new Error(message);
        }
    }

    /**
     * Generate AI-powered summary of PDF content
     */
    async summarize(text: string, options: SummaryOptions): Promise<string> {
        const { type, language = 'en', maxTokens = 500 } = options;

        const prompts = {
            short: `Provide a concise 2-3 sentence summary (50-100 words) of the following document${language === 'hi' ? ' in Hindi' : ''}:`,
            paragraph: `Provide a comprehensive paragraph summary (150-250 words) of the following document${language === 'hi' ? ' in Hindi' : ''}:`,
            executive: `Provide an executive summary (300-500 words) with key findings, main points, and conclusions${language === 'hi' ? ' in Hindi' : ''}:`,
            keypoints: `Extract the key points from the following document as a bullet list${language === 'hi' ? ' in Hindi' : ''}. Focus on the most important information:`,
        };

        const messages = [
            {
                role: 'system',
                content: `You are a professional document analyst. Provide accurate, concise summaries${language === 'hi' ? ' in Hindi' : ''}.`,
            },
            {
                role: 'user',
                content: `${prompts[type]}\n\n${text.substring(0, 15000)}`, // Limit to avoid token limits
            },
        ];

        return await this.callAPI(messages, maxTokens);
    }

    /**
     * Answer questions about PDF content
     */
    async answerQuestion(context: string, question: string, options: QuestionOptions = {}): Promise<string> {
        const { language = 'en', includePageNumbers = false } = options;

        const messages = [
            {
                role: 'system',
                content: `You are a helpful assistant that answers questions about documents. Provide accurate, concise answers based only on the given context${language === 'hi' ? '. Respond in Hindi' : ''}.${includePageNumbers ? ' Include page references when possible.' : ''}`,
            },
            {
                role: 'user',
                content: `Context:\n${context.substring(0, 12000)}\n\nQuestion: ${question}\n\nAnswer:`,
            },
        ];

        return await this.callAPI(messages, 300);
    }

    /**
     * Extract entities from PDF text
     */
    async extractEntities(text: string): Promise<EntityType[]> {
        const messages = [
            {
                role: 'system',
                content: 'You are an expert at extracting structured information from documents. Extract entities and return them in JSON format.',
            },
            {
                role: 'user',
                content: `Extract the following entities from this text and return as JSON array with format: [{"type": "person|organization|date|money|location", "value": "entity value", "context": "surrounding context"}]\n\nText:\n${text.substring(0, 10000)}\n\nReturn only valid JSON array:`,
            },
        ];

        const response = await this.callAPI(messages, 1500);

        try {
            // Try to parse JSON from response
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const entities = JSON.parse(jsonMatch[0]);

                // Count occurrences
                const entityMap = new Map<string, EntityType>();
                entities.forEach((entity: EntityType) => {
                    const key = `${entity.type}:${entity.value}`;
                    if (entityMap.has(key)) {
                        const existing = entityMap.get(key)!;
                        existing.count = (existing.count || 1) + 1;
                    } else {
                        entityMap.set(key, { ...entity, count: 1 });
                    }
                });

                return Array.from(entityMap.values());
            }
        } catch (error) {
            console.error('Failed to parse entities:', error);
        }

        return [];
    }

    /**
     * Perform semantic search on document chunks
     */
    async semanticSearch(query: string, chunks: string[]): Promise<SemanticSearchResult[]> {
        const messages = [
            {
                role: 'system',
                content: 'You are a search assistant. Rank the given text chunks by relevance to the query. Return results as JSON array with format: [{"chunkIndex": 0, "relevance": 0.95, "reason": "why relevant"}]',
            },
            {
                role: 'user',
                content: `Query: "${query}"\n\nChunks:\n${chunks.map((chunk, i) => `[${i}] ${chunk.substring(0, 500)}`).join('\n\n')}\n\nReturn top 5 most relevant chunks as JSON array:`,
            },
        ];

        const response = await this.callAPI(messages, 800);

        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);
                return results
                    .map((r: any) => ({
                        chunk: chunks[r.chunkIndex] || '',
                        relevance: r.relevance || 0,
                        pageNumber: r.chunkIndex + 1, // Approximate
                    }))
                    .filter((r: SemanticSearchResult) => r.chunk)
                    .slice(0, 5);
            }
        } catch (error) {
            console.error('Failed to parse search results:', error);
        }

        return [];
    }
}

export const aiService = new AIService();
