import type {
  MCQItem,
  MCQOption,
  MCQPaper,
  MCQGenerationOptions,
  McqPdfExportOptions,
} from '../../services/aiService';

export type McqDifficulty = 'easy' | 'medium' | 'hard' | 'mixed';
export type McqLanguage = 'en' | 'hi' | 'hinglish';
export type McqOptionCount = 4 | 5;

export interface McqFormSettings {
  questionCount: number | 'custom';
  customCount?: number;
  difficulty: McqDifficulty;
  language: McqLanguage;
  optionCount: McqOptionCount;
  topicFocus: string;
  schoolName: string;
}

export type {
  MCQItem,
  MCQOption,
  MCQPaper,
  MCQGenerationOptions,
  McqPdfExportOptions,
};
